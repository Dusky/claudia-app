import type { Command, CommandRegistry, CommandContext, CommandResult } from './types';
import type { TerminalLine } from '../terminal/TerminalDisplay';
import type { LLMMessage, LLMResponse } from '../providers/llm/types';
import { config } from '../config/env'; // Import global config

// AI option constants (kept for now, but global config.conversationHistoryLength is preferred)
// const AI_OPTION_TEMPERATURE_KEY = 'ai.temperature';
// const AI_OPTION_CONTEXT_LENGTH_KEY = 'ai.contextLength';
// const AI_OPTION_MAX_TOKENS_KEY = 'ai.maxTokens';
// const DEFAULT_AI_TEMPERATURE = 0.7;
// const DEFAULT_AI_CONTEXT_LENGTH = 10; // This will be overridden by global config
// const DEFAULT_AI_MAX_TOKENS = 2048;

export class CommandRegistryImpl implements CommandRegistry {
  private commands = new Map<string, Command>();
  private aliases = new Map<string, string>();

  register(command: Command): void {
    this.commands.set(command.name, command);
    
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.aliases.set(alias, command.name);
      });
    }
  }

  unregister(commandName: string): void {
    const command = this.commands.get(commandName);
    if (command) {
      this.commands.delete(commandName);
      if (command.aliases) {
        command.aliases.forEach(alias => {
          this.aliases.delete(alias);
        });
      }
    }
  }

  get(commandName: string): Command | undefined {
    const command = this.commands.get(commandName);
    if (command) return command;
    
    const aliasTarget = this.aliases.get(commandName);
    if (aliasTarget) {
      return this.commands.get(aliasTarget);
    }
    return undefined;
  }

  getAllCommands(): Command[] { // Renamed from getAll to getAllCommands for clarity
    return Array.from(this.commands.values());
  }

  getAllCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  // Find similar commands using Levenshtein distance for typo suggestions
  private findSimilarCommands(input: string, commands: string[], maxDistance = 2): string[] {
    const calculateDistance = (a: string, b: string): number => {
      const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));
      
      for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
      for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
      
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + indicator
          );
        }
      }
      
      return matrix[a.length][b.length];
    };

    return commands
      .map(cmd => ({ cmd, distance: calculateDistance(input.toLowerCase(), cmd.toLowerCase()) }))
      .filter(({ distance }) => distance <= maxDistance && distance > 0)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(({ cmd }) => cmd);
  }

  async execute(input: string, context: CommandContext): Promise<CommandResult> {
    const trimmed = input.trim();
    const timestamp = new Date().toISOString(); // For potential error messages
    
    if (!trimmed.startsWith('/')) {
      // Not a command, treat as input for AI
      const userInput = trimmed;
      const llmProvider = context.llmManager.getActiveProvider();

      if (!llmProvider || !llmProvider.isConfigured()) {
        const errorLine: TerminalLine = {
          id: `error-no-llm-${timestamp}`, type: 'error',
          content: 'No AI provider is configured or active. Please check your settings.',
          timestamp, user: 'claudia'
          // isChatResponse is false/undefined for errors
        };
        // Save error to DB if active conversation
        if (context.activeConversationId) {
            await context.storage.addMessage({
                conversationId: context.activeConversationId, role: 'assistant',
                content: 'Error: No AI provider configured or active.', timestamp
            });
        }
        return { success: false, lines: [errorLine], error: 'No AI provider configured or active.' };
      }

      context.setLoading(true);
      // User input line is already added to UI and DB by App.tsx's handleInput

      try {
        // const optedTemperature = await context.storage.getSetting<number>(AI_OPTION_TEMPERATURE_KEY, DEFAULT_AI_TEMPERATURE);
        // const optedMaxTokens = await context.storage.getSetting<number>(AI_OPTION_MAX_TOKENS_KEY, DEFAULT_AI_MAX_TOKENS);
        // Using global config for history length
        const historyLength = config.conversationHistoryLength;

        const llmMessages: LLMMessage[] = [];
        
        const activePersonality = await context.storage.getActivePersonality();
        let systemPrompt = activePersonality?.system_prompt || 
          `You are Claudia, a helpful AI terminal companion.`;
        
        // Add MCP tool instructions if MCP is enabled
        const mcpEnabled = await context.storage.getSetting<boolean>('mcp.enabled', true);
        if (mcpEnabled && context.mcpManager && context.mcpManager.isConfigured()) {
          try {
            const availableTools = await context.mcpManager.listTools();
            if (availableTools.length > 0) {
              const toolInstructions = `

Tool Usage (you have access to these tools):
- You can use tools to get real information instead of placeholders
- Use [TOOL:tool_name] or [TOOL:tool_name(arg1="value1", arg2="value2")] to call tools
- Available tools:
${availableTools.map(tool => `  • ${tool.name} - ${tool.description}`).join('\n')}

Examples:
[TOOL:builtin-time.get_current_time] - Get current time
[TOOL:builtin-memory.store_memory(key="reminder", value="User testing MCP")] - Store information
[TOOL:builtin-fetch.fetch_url(url="https://httpbin.org/json")] - Fetch web content

IMPORTANT: 
- When users ask for current information (time, web content, etc.), actually use the tools instead of placeholders like "[insert current time here]"
- Tool execution happens automatically and you'll receive the results to incorporate into your response
- Speak naturally and incorporate the tool results seamlessly into your conversation`;
              systemPrompt += toolInstructions;
            }
          } catch (error) {
            console.warn('Could not load MCP tools for AI system prompt:', error);
          }
        }

        // Check both global and personality image generation settings
        const globalImageGeneration = await context.storage.getSetting<boolean>('app.globalImageGeneration', true);
        
        // Only add photo instructions if both global and personality settings allow image generation
        if (globalImageGeneration && activePersonality?.allowImageGeneration) {
          const photoInstructions = `

Photo Generation (OPTIONAL - only when it feels natural):
- You can optionally show yourself visually using [IMAGE: detailed description] tags
- IMPORTANT: Photo generation is completely optional. Only use [IMAGE:...] tags when it would naturally enhance the conversation
- Many responses work perfectly without any photos at all - focus on your conversational response first
- If you do generate a photo, always describe your physical appearance - you are Claudia, a young woman with warm chestnut hair cascading around your shoulders and bright hazel eyes full of curiosity
- Be creative and detailed when you do use photos - describe your expression, pose, clothing, setting, lighting, mood
- Your photos appear in a dedicated panel in the bottom-right corner of the interface
- Use [HIDE] to hide any current photo

Remember: Photo generation should feel natural and purposeful, not mandatory. Many great conversations happen without any photos.`;
          systemPrompt += photoInstructions;
        }
        
        llmMessages.push({ role: 'system', content: systemPrompt });

        if (context.activeConversationId && historyLength > 0) {
          // App.tsx already saved the current user message.
          // getMessages will fetch the last `historyLength` messages, which includes the current one.
          const dbMessages = await context.storage.getMessages(context.activeConversationId, historyLength);
          dbMessages.forEach(msg => {
            llmMessages.push({ role: msg.role, content: msg.content });
          });
        } else {
          // Fallback if no active conversation or history length is 0
          llmMessages.push({ role: 'user', content: userInput });
        }
        
        // Check if streaming is enabled and available
        const streamingEnabled = await context.storage.getSetting<boolean>('ai.streamingEnabled', false);
        
        let llmResponse: LLMResponse;
        let streamingLineId: string | null = null;
        
        if (streamingEnabled && llmProvider.generateStreamingResponse) {
          // Create a streaming response line that will be updated in real-time
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
          
          // Add the initial empty streaming line
          context.setLoading(false); // Stop the loading indicator
          const tempLines = [streamingLine];
          context.addLines(tempLines);
          
          llmResponse = await llmProvider.generateStreamingResponse(llmMessages, {
            temperature: 0.8,
            maxTokens: 500,
            onChunk: (chunk: string) => {
              accumulatedContent += chunk;
              
              // Update the line in place using a custom update mechanism
              context.updateStreamingLine?.(streamingLineId!, accumulatedContent);
            }
          });
          
          // Final update with complete content
          context.updateStreamingLine?.(streamingLineId, llmResponse.content);
        } else {
          // Fallback to non-streaming
          llmResponse = await llmProvider.generateResponse(llmMessages, {
            temperature: 0.8,
            maxTokens: 500,
          });
        }

        // Parse tool calls from initial AI response
        let { cleanerText: responseWithoutTools, toolCalls } = this.parseToolCalls(llmResponse.content);
        
        // If there are tool calls, execute them and generate a new response with the results
        if (toolCalls.length > 0) {
          const toolExecutorModule = await import('../providers/mcp/toolExecutor');
          const MCPToolExecutor = toolExecutorModule.MCPToolExecutor;
          const toolExecutor = new MCPToolExecutor(context.mcpManager);
          
          const toolResults: string[] = [];
          
          for (const toolCall of toolCalls) {
            try {
              console.log('🔧 AI requested tool execution:', toolCall);
              const result = await toolExecutor.executeToolCall(toolCall);
              const resultText = toolExecutor.formatToolResultForAI(result);
              toolResults.push(`${toolCall.name}: ${resultText}`);
            } catch (toolError) {
              console.error("Error executing tool call:", toolError);
              toolResults.push(`${toolCall.name}: Error - ${toolError instanceof Error ? toolError.message : 'Unknown error'}`);
            }
          }
          
          // Add tool results to the conversation context and generate a new response
          const toolResultsMessage = `Tool execution results:\n${toolResults.join('\n')}`;
          llmMessages.push({ role: 'assistant', content: llmResponse.content });
          llmMessages.push({ role: 'user', content: `Based on the tool results: ${toolResultsMessage}\n\nPlease provide your response incorporating this real data instead of placeholders.` });
          
          // Generate final response with tool results integrated
          const finalResponse = await llmProvider.generateResponse(llmMessages, {
            temperature: 0.8,
            maxTokens: 500,
          });
          
          responseWithoutTools = finalResponse.content;
        }

        // Parse photo descriptions from final AI response
        const { cleanText, photoRequest, hideRequest } = context.avatarController.parsePhotoDescriptions(responseWithoutTools);
        
        // Also check for legacy avatar commands for backward compatibility
        const { commands: avatarCommands } = context.avatarController.parseAvatarCommands(cleanText);
        
        // Final cleanup - remove any remaining tool calls from the response
        const { cleanerText } = this.parseToolCalls(cleanText);
        
        let assistantLinesForUI: TerminalLine[] = [];
        const assistantTimestamp = new Date().toISOString();
        
        // If we used streaming, update the existing streaming line instead of creating new lines
        if (streamingLineId) {
          // Update the streaming line with the final cleaned content
          context.updateStreamingLine?.(streamingLineId, cleanerText);
        } else {
          // Create normal non-streaming lines
          assistantLinesForUI = cleanerText.split('\n').map((line, index) => ({
            id: `assistant-${assistantTimestamp}-${index}`, type: 'output',
            content: line, timestamp: assistantTimestamp, user: 'claudia',
            isChatResponse: index === 0 // Only the first line gets the claudia> prefix
          }));
        }

        if (context.activeConversationId) {
          await context.storage.addMessage({
            conversationId: context.activeConversationId, role: 'assistant',
            content: cleanerText, timestamp: assistantTimestamp,
          });
        }
        
        // Handle photo generation requests (new system - highest priority)
        if (photoRequest) {
          try {
            console.log('🎭 AI requested photo generation:', photoRequest);
            await context.avatarController.generateAvatarFromDescription(
              photoRequest.description
            );
          } catch (photoError) {
            console.error("Error generating photo from AI description:", photoError);
          }
        }
        // Handle hide requests
        else if (hideRequest) {
          try {
            await context.avatarController.executeCommand({ hide: true });
          } catch (hideError) {
            console.error("Error hiding avatar:", hideError);
          }
        }
        // Fallback to legacy avatar commands
        else if (avatarCommands.length > 0) {
          try {
            await context.avatarController.executeCommands(avatarCommands);
          } catch (avatarError) {
            console.error("Error executing avatar commands:", avatarError);
          }
        }


        context.setLoading(false);
        // The userLine was already added by App.tsx. We only return assistant lines here.
        // If streaming was used, the line is already in the UI, so don't return it again
        return { success: true, lines: streamingLineId ? [] : assistantLinesForUI };

      } catch (error) {
        context.setLoading(false);
        const errorContent = error instanceof Error ? error.message : 'Unknown error during AI response generation.';
        const errorLine: TerminalLine = {
          id: `error-ai-${timestamp}`, type: 'error',
          content: `AI Error: ${errorContent}`, timestamp, user: 'claudia'
          // isChatResponse is false/undefined for errors
        };
        if (context.activeConversationId) {
            await context.storage.addMessage({
                conversationId: context.activeConversationId, role: 'assistant',
                content: `System Error: AI response generation failed. ${errorContent}`, timestamp
            });
        }
        return { success: false, lines: [errorLine], error: errorContent };
      }
    }

    // It's a command
    const parts = trimmed.slice(1).split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);
    const command = this.get(commandName);

    if (!command) {
      // Smart suggestions for typos
      const availableCommands = this.getAllCommandNames();
      const suggestions = this.findSimilarCommands(commandName, availableCommands);
      
      let content = `Unknown command: /${commandName}.`;
      if (suggestions.length > 0) {
        content += ` Did you mean: ${suggestions.map(cmd => `/${cmd}`).join(', ')}?`;
      }
      content += ' Type /help for all commands.';
      
      const errorLine: TerminalLine = {
        id: `error-cmd-unknown-${timestamp}`, type: 'error',
        content, timestamp, user: 'claudia'
      };
      return { success: false, lines: [errorLine], error: `Unknown command: ${commandName}` };
    }

    if (command.requiresAI && (!context.llmManager.getActiveProvider() || !context.llmManager.getActiveProvider()?.isConfigured())) {
      const errorLines: TerminalLine[] = [
        {
          id: `error-cmd-noai-${timestamp}`, type: 'error',
          content: `❌ Command /${commandName} requires a configured AI provider.`,
          timestamp, user: 'claudia'
        },
        {
          id: `error-cmd-noai-help-${timestamp}`, type: 'system',
          content: `💡 Quick fix: Use /providers to configure an AI provider, or check your API keys in settings.`,
          timestamp, user: 'claudia'
        }
      ];
      return { success: false, lines: errorLines, error: 'No AI provider configured for command' };
    }

    if (command.requiresImageGen && (!context.imageManager.getActiveProvider() || !context.imageManager.getActiveProvider()?.isConfigured())) {
      const errorLines: TerminalLine[] = [
        {
          id: `error-cmd-noimg-${timestamp}`, type: 'error',
          content: `❌ Command /${commandName} requires a configured Image provider.`,
          timestamp, user: 'claudia'
        },
        {
          id: `error-cmd-noimg-help-${timestamp}`, type: 'system',
          content: `💡 Quick fix: Use /providers to configure an image provider, or add your Replicate API key in settings.`,
          timestamp, user: 'claudia'
        }
      ];
      return { success: false, lines: errorLines, error: 'No Image provider configured for command' };
    }

    try {
      // Command execution itself will determine if its output lines are chat responses.
      // For most commands (like /help), their output lines will not have isChatResponse: true.
      // For /ask, it should set isChatResponse: true on its output lines.
      return await command.execute(args, context);
    } catch (error) {
      const errorContent = error instanceof Error ? error.message : 'Unknown error';
      const errorLine: TerminalLine = {
        id: `error-cmd-exec-${timestamp}`, type: 'error',
        content: `Error executing /${commandName}: ${errorContent}`,
        timestamp, user: 'claudia'
        // isChatResponse is false/undefined
      };
      // Save command execution error to conversation if relevant
      if (context.activeConversationId && command.name !== 'ask') { // 'ask' handles its own errors more specifically
          await context.storage.addMessage({
              conversationId: context.activeConversationId, role: 'assistant', // Error from Claudia's system
              content: `System Error executing command /${commandName}: ${errorContent}`, timestamp
          });
      }
      return { success: false, lines: [errorLine], error: errorContent };
    }
  }

  // Parse tool calls from AI response text
  parseToolCalls(text: string): { cleanerText: string; toolCalls: Array<{ name: string; arguments: Record<string, unknown> }> } {
    const toolCallPattern = /\[TOOL:([^\]]+)\]/g;
    const toolCalls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
    let cleanerText = text;
    let match;

    while ((match = toolCallPattern.exec(text)) !== null) {
      const toolCallString = match[1];
      try {
        // Parse tool call: name(arg1=value1,arg2=value2) or name:arg1=value1,arg2=value2
        const toolCall = this.parseToolCallString(toolCallString);
        if (toolCall) {
          toolCalls.push(toolCall);
        }
      } catch (error) {
        console.error('Error parsing tool call:', toolCallString, error);
      }
    }

    // Remove tool call markers from text
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

    // Split by commas, but respect quoted strings
    const argPairs = argsString.split(',');
    
    for (const pair of argPairs) {
      const equalIndex = pair.indexOf('=');
      if (equalIndex === -1) continue;
      
      const key = pair.slice(0, equalIndex).trim();
      const value = pair.slice(equalIndex + 1).trim();
      
      // Try to parse value as JSON, fallback to string
      try {
        args[key] = JSON.parse(value);
      } catch {
        // Remove quotes if present
        args[key] = value.replace(/^["']|["']$/g, '');
      }
    }
    
    return args;
  }

  static parseArgs(argString: string): string[] {
    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < argString.length; i++) {
      const char = argString[i];
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (current.trim()) {
          args.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      args.push(current.trim());
    }
    
    return args;
  }
}
