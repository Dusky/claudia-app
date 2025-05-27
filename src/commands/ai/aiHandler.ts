import type { CommandContext } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import type { LLMMessage, LLMResponse } from '../../providers/llm/types';
import { estimateTokens } from '../../utils/tokenCounter';
import { MCPToolExecutor } from '../../providers/mcp/toolExecutor';

/**
 * Handles AI conversation processing
 * Separated from command registry for better modularity
 */
export class AIHandler {
  /**
   * Process non-command input as AI conversation
   */
  async handleAIInput(input: string, context: CommandContext): Promise<{
    success: boolean;
    lines: TerminalLine[];
    error?: string;
  }> {
    const timestamp = new Date().toISOString();
    const llmProvider = context.llmManager.getActiveProvider();

    if (!llmProvider || !llmProvider.isConfigured()) {
      const errorLine: TerminalLine = {
        id: `error-no-llm-${timestamp}`,
        type: 'error',
        content: 'No AI provider is configured or active. Please check your settings.',
        timestamp,
        user: 'claudia'
      };

      // Save error to DB if active conversation
      if (context.activeConversationId) {
        await context.storage.addMessage({
          conversationId: context.activeConversationId,
          role: 'assistant',
          content: 'Error: No AI provider configured or active.',
          timestamp
        });
      }
      return { success: false, lines: [errorLine], error: 'No AI provider configured or active.' };
    }

    context.setLoading(true);

    // Store user message in database
    if (context.activeConversationId) {
      const userTokens = estimateTokens(input);
      await context.storage.addMessage({
        conversationId: context.activeConversationId,
        role: 'user',
        content: input,
        timestamp: new Date().toISOString(),
        tokens: userTokens
      });

      // Update conversation token count
      await this.updateConversationTokenCount(context.storage, context.activeConversationId, userTokens);
    }

    try {
      // Load AI settings with validation
      const aiSettings = await this.getValidatedAISettings(context);
      
      // Build LLM messages with system prompt and conversation history
      const llmMessages = await this.buildLLMMessages(input, context, aiSettings);

      // Generate AI response with streaming support
      const { response, streamingLineId } = await this.generateAIResponse(
        llmProvider,
        llmMessages,
        aiSettings,
        context
      );

      // Process tool calls if any
      const finalResponse = await this.processToolCalls(response, context);

      // Handle avatar/photo commands
      await this.processAvatarCommands(finalResponse, context);

      // Store assistant response
      if (context.activeConversationId) {
        const responseTokens = estimateTokens(finalResponse);
        await context.storage.addMessage({
          conversationId: context.activeConversationId,
          role: 'assistant',
          content: finalResponse,
          timestamp,
          tokens: responseTokens
        });

        await this.updateConversationTokenCount(context.storage, context.activeConversationId, responseTokens);
      }

      context.setLoading(false);

      // Return appropriate lines
      if (streamingLineId) {
        return { success: true, lines: [] }; // Streaming line already in UI
      } else {
        const assistantLines = this.createAssistantLines(finalResponse, timestamp);
        return { success: true, lines: assistantLines };
      }

    } catch (error) {
      context.setLoading(false);
      const errorContent = error instanceof Error ? error.message : 'Unknown error during AI response generation.';
      const errorLine: TerminalLine = {
        id: `error-ai-${timestamp}`,
        type: 'error',
        content: `AI Error: ${errorContent}`,
        timestamp,
        user: 'claudia'
      };

      if (context.activeConversationId) {
        await context.storage.addMessage({
          conversationId: context.activeConversationId,
          role: 'assistant',
          content: `System Error: AI response generation failed. ${errorContent}`,
          timestamp
        });
      }

      return { success: false, lines: [errorLine], error: errorContent };
    }
  }

  /**
   * Get and validate AI settings
   */
  private async getValidatedAISettings(context: CommandContext): Promise<{
    contextTokenLimit: number;
    maxTokens: number;
    temperature: number;
    streamingEnabled: boolean;
  }> {
    // Use settings manager if available, fallback to direct storage
    const settingsManager = context.storage instanceof Object && 'settingsManager' in context.storage 
      ? (context.storage as any).settingsManager 
      : null;

    let contextTokenLimit: number;
    let maxTokens: number;
    let temperature: number;
    let streamingEnabled: boolean;

    if (settingsManager) {
      contextTokenLimit = await settingsManager.getAIContextLength();
      maxTokens = await settingsManager.getAIMaxTokens();
      temperature = await settingsManager.getAITemperature();
      streamingEnabled = await settingsManager.getStreamingEnabled();
    } else {
      // Fallback to direct storage access
      contextTokenLimit = (await context.storage.getSetting<number>('ai.contextLength')) ?? 8000;
      maxTokens = (await context.storage.getSetting<number>('ai.maxTokens')) ?? 1000;
      temperature = (await context.storage.getSetting<number>('ai.temperature')) ?? 0.8;
      streamingEnabled = (await context.storage.getSetting<boolean>('ai.streamingEnabled')) ?? false;

      // Validate settings
      if (maxTokens <= 0 || maxTokens > 100000) {
        console.warn('Invalid maxTokens value:', maxTokens, 'using default 1000');
        maxTokens = 1000;
      }
      if (temperature < 0 || temperature > 2) {
        console.warn('Invalid temperature value:', temperature, 'using default 0.8');
        temperature = 0.8;
      }
    }

    return { contextTokenLimit, maxTokens, temperature, streamingEnabled };
  }

  /**
   * Build LLM messages with system prompt and conversation history
   */
  private async buildLLMMessages(
    userInput: string,
    context: CommandContext,
    aiSettings: { contextTokenLimit: number }
  ): Promise<LLMMessage[]> {
    const llmMessages: LLMMessage[] = [];

    // Build system prompt
    const activePersonality = await context.storage.getActivePersonality();
    let systemPrompt = activePersonality?.system_prompt || 'You are Claudia, a helpful AI terminal companion.';

    // Add MCP tool instructions if enabled
    const mcpEnabled = await context.storage.getSetting<boolean>('mcp.enabled', true);
    if (mcpEnabled && context.mcpManager && context.mcpManager.isConfigured()) {
      try {
        const availableTools = await context.mcpManager.listTools();
        if (availableTools.length > 0) {
          systemPrompt += this.buildToolInstructions(availableTools);
        }
      } catch (error) {
        console.warn('Could not load MCP tools for AI system prompt:', error);
      }
    }

    // Add image generation instructions if enabled
    const globalImageGeneration = await context.storage.getSetting<boolean>('app.globalImageGeneration', true);
    if (globalImageGeneration && activePersonality?.allowImageGeneration) {
      systemPrompt += this.buildImageInstructions();
    }

    llmMessages.push({ role: 'system', content: systemPrompt });

    // Add conversation history with token limiting
    if (context.activeConversationId && aiSettings.contextTokenLimit > 0) {
      const contextMessages = await this.loadContextWithTokenLimit(
        context.storage,
        context.activeConversationId,
        aiSettings.contextTokenLimit,
        systemPrompt.length
      );
      contextMessages.forEach(msg => {
        llmMessages.push({ role: msg.role, content: msg.content });
      });
    }
    
    // Always add the current user input
    llmMessages.push({ role: 'user', content: userInput });

    return llmMessages;
  }

  /**
   * Generate AI response with streaming support
   */
  private async generateAIResponse(
    llmProvider: any,
    llmMessages: LLMMessage[],
    aiSettings: { maxTokens: number; temperature: number; streamingEnabled: boolean },
    context: CommandContext
  ): Promise<{ response: LLMResponse; streamingLineId: string | null }> {
    let streamingLineId: string | null = null;

    if (aiSettings.streamingEnabled && llmProvider.generateStreamingResponse) {
      streamingLineId = `streaming-${Date.now()}`;
      let accumulatedContent = '';

      const streamingLine: TerminalLine = {
        id: streamingLineId,
        type: 'output',
        content: '',
        timestamp: new Date().toISOString(),
        user: 'claudia',
        isChatResponse: true
      };

      try {
        context.setLoading(false);
        context.addLines([streamingLine]);

        const response = await llmProvider.generateStreamingResponse(llmMessages, {
          temperature: aiSettings.temperature,
          maxTokens: aiSettings.maxTokens,
          onChunk: (chunk: string) => {
            accumulatedContent += chunk;
            context.updateStreamingLine?.(streamingLineId!, accumulatedContent);
          }
        });

        context.updateStreamingLine?.(streamingLineId, response.content);
        return { response, streamingLineId };
      } catch (streamError) {
        context.setLoading(true);
        // Fall back to non-streaming
        const response = await llmProvider.generateResponse(llmMessages, {
          temperature: aiSettings.temperature,
          maxTokens: aiSettings.maxTokens,
        });
        return { response, streamingLineId: null };
      }
    } else {
      const response = await llmProvider.generateResponse(llmMessages, {
        temperature: aiSettings.temperature,
        maxTokens: aiSettings.maxTokens,
      });
      return { response, streamingLineId: null };
    }
  }

  /**
   * Process tool calls from AI response
   */
  private async processToolCalls(response: LLMResponse, context: CommandContext): Promise<string> {
    const { cleanerText, toolCalls } = this.parseToolCalls(response.content);

    if (toolCalls.length === 0) {
      return cleanerText;
    }

    const toolExecutor = new MCPToolExecutor(context.mcpManager);
    const toolResults: string[] = [];

    for (const toolCall of toolCalls) {
      try {
        console.log('🔧 AI requested tool execution:', toolCall);
        const result = await toolExecutor.executeToolCall(toolCall);
        const resultText = toolExecutor.formatToolResultForAI(result);
        toolResults.push(`${toolCall.name}: ${resultText}`);
      } catch (toolError) {
        console.error('Error executing tool call:', toolError);
        toolResults.push(`${toolCall.name}: Error - ${toolError instanceof Error ? toolError.message : 'Unknown error'}`);
      }
    }

    // Generate final response with tool results
    const llmProvider = context.llmManager.getActiveProvider();
    if (llmProvider) {
      const toolResultsMessage = `Tool execution results:\n${toolResults.join('\n')}`;
      const finalResponse = await llmProvider.generateResponse([
        { role: 'assistant', content: response.content },
        { role: 'user', content: `Based on the tool results: ${toolResultsMessage}\n\nPlease provide your response incorporating this real data instead of placeholders.` }
      ], {
        temperature: 0.8,
        maxTokens: 1000,
      });
      return finalResponse.content;
    }

    return cleanerText;
  }

  /**
   * Process avatar and photo commands
   */
  private async processAvatarCommands(responseText: string, context: CommandContext): Promise<void> {
    const { cleanText, photoRequest, hideRequest } = context.avatarController.parsePhotoDescriptions(responseText);
    const { commands: avatarCommands } = context.avatarController.parseAvatarCommands(cleanText);

    if (photoRequest) {
      try {
        console.log('🎭 AI requested photo generation:', photoRequest);
        await context.avatarController.generateAvatarFromDescription(photoRequest.description);
      } catch (photoError) {
        console.error('Error generating photo from AI description:', photoError);
      }
    } else if (hideRequest) {
      try {
        await context.avatarController.executeCommand({ hide: true });
      } catch (hideError) {
        console.error('Error hiding avatar:', hideError);
      }
    } else if (avatarCommands.length > 0) {
      try {
        await context.avatarController.executeCommands(avatarCommands);
      } catch (avatarError) {
        console.error('Error executing avatar commands:', avatarError);
      }
    }
  }

  // Helper methods
  private buildToolInstructions(availableTools: any[]): string {
    return `\n\nTool Usage (you have access to these tools when needed):
- Use [TOOL:tool_name] or [TOOL:tool_name(arg1="value1", arg2="value2")] to call tools
- Available tools:
${availableTools.map(tool => `  • ${tool.name} - ${tool.description}`).join('\n')}

Examples:
[TOOL:builtin-time.get_current_time] - When user asks for current time
[TOOL:builtin-memory.store_memory(key="reminder", value="User testing MCP")] - When storing information
[TOOL:builtin-fetch.fetch_url(url="https://httpbin.org/json")] - When fetching web content

IMPORTANT: 
- Only use tools when the user specifically requests information that requires them
- Don't automatically call tools unless the user's question clearly needs real-time data
- For general conversation, respond normally without using tools
- Tool execution happens automatically and you'll receive the results to incorporate into your response`;
  }

  private buildImageInstructions(): string {
    return `\n\nPhoto Generation (OPTIONAL - only when it feels natural):
- You can optionally show yourself visually using [IMAGE: detailed description] tags
- IMPORTANT: Photo generation is completely optional. Only use [IMAGE:...] tags when it would naturally enhance the conversation
- Many responses work perfectly without any photos at all - focus on your conversational response first
- If you do generate a photo, always describe your physical appearance - you are Claudia, a young woman with warm chestnut hair cascading around your shoulders and bright hazel eyes full of curiosity
- Be creative and detailed when you do use photos - describe your expression, pose, clothing, setting, lighting, mood
- Your photos appear in a dedicated panel in the bottom-right corner of the interface
- Use [HIDE] to hide any current photo

Remember: Photo generation should feel natural and purposeful, not mandatory. Many great conversations happen without any photos.`;
  }

  private parseToolCalls(text: string): { cleanerText: string; toolCalls: Array<{ name: string; arguments: Record<string, unknown> }> } {
    const toolCallPattern = /\[TOOL:([^\]]+)\]/g;
    const toolCalls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
    let cleanerText = text;
    let match;

    while ((match = toolCallPattern.exec(text)) !== null) {
      const toolCallString = match[1];
      try {
        const toolCall = this.parseToolCallString(toolCallString);
        if (toolCall) {
          toolCalls.push(toolCall);
        }
      } catch (error) {
        console.error('Error parsing tool call:', toolCallString, error);
      }
    }

    cleanerText = cleanerText.replace(toolCallPattern, '').trim();
    return { cleanerText, toolCalls };
  }

  private parseToolCallString(toolCallString: string): { name: string; arguments: Record<string, unknown> } | null {
    // Handle format: toolname(arg1=value1,arg2=value2)
    const functionMatch = toolCallString.match(/^([^(]+)\(([^)]*)\)$/);
    if (functionMatch) {
      const [, name, argsString] = functionMatch;
      return {
        name: name.trim(),
        arguments: this.parseToolArguments(argsString)
      };
    }

    // Handle format: toolname:arg1=value1,arg2=value2
    const colonMatch = toolCallString.match(/^([^:]+):(.*)$/);
    if (colonMatch) {
      const [, name, argsString] = colonMatch;
      return {
        name: name.trim(),
        arguments: this.parseToolArguments(argsString)
      };
    }

    // Handle format: just toolname
    const nameMatch = toolCallString.match(/^([a-zA-Z0-9._-]+)$/);
    if (nameMatch) {
      return {
        name: nameMatch[1].trim(),
        arguments: {}
      };
    }

    return null;
  }

  private parseToolArguments(argsString: string): Record<string, unknown> {
    const args: Record<string, unknown> = {};
    if (!argsString.trim()) return args;

    const argPairs = argsString.split(',');
    
    for (const pair of argPairs) {
      const equalIndex = pair.indexOf('=');
      if (equalIndex === -1) continue;
      
      const key = pair.slice(0, equalIndex).trim();
      const value = pair.slice(equalIndex + 1).trim();
      
      try {
        args[key] = JSON.parse(value);
      } catch {
        args[key] = value.replace(/^["']|["']$/g, '');
      }
    }
    
    return args;
  }

  private createAssistantLines(content: string, timestamp: string): TerminalLine[] {
    // Keep multi-line responses as single lines to preserve grouping
    return [{
      id: `assistant-${timestamp}`,
      type: 'output' as const,
      content: content,
      timestamp,
      user: 'claudia' as const,
      isChatResponse: true
    }];
  }

  private async updateConversationTokenCount(storage: any, conversationId: string, additionalTokens: number): Promise<void> {
    try {
      const conversation = await storage.getConversation(conversationId);
      if (conversation) {
        const newTotal = (conversation.totalTokens || 0) + additionalTokens;
        await storage.updateConversation(conversationId, { totalTokens: newTotal });
      }
    } catch (error) {
      console.error('Error updating conversation token count:', error);
    }
  }

  private async loadContextWithTokenLimit(
    storage: any,
    conversationId: string,
    tokenLimit: number,
    systemPromptTokens: number
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    try {
      const recentMessages = await storage.getMessages(conversationId, 100);
      const contextMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      let currentTokenCount = systemPromptTokens;
      
      const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
      
      for (let i = recentMessages.length - 1; i >= 0; i--) {
        const message = recentMessages[i];
        const messageTokens = estimateTokens(message.content);
        
        if (currentTokenCount + messageTokens > tokenLimit) {
          break;
        }
        
        contextMessages.unshift({
          role: message.role as 'user' | 'assistant',
          content: message.content
        });
        
        currentTokenCount += messageTokens;
      }
      
      return contextMessages;
    } catch (error) {
      console.error('Error loading context with token limit:', error);
      return [];
    }
  }
}