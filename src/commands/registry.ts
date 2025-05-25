import type { Command, CommandRegistry, CommandContext, CommandResult } from './types';
import type { TerminalLine } from '../terminal/TerminalDisplay';
import { generateSystemPrompt } from '../types/personality'; // Import for personality system prompt

export class CommandRegistryImpl implements CommandRegistry {
  private commands = new Map<string, Command>();
  private aliases = new Map<string, string>();

  register(command: Command): void {
    this.commands.set(command.name, command);
    
    // Register aliases
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
      
      // Remove aliases
      if (command.aliases) {
        command.aliases.forEach(alias => {
          this.aliases.delete(alias);
        });
      }
    }
  }

  get(commandName: string): Command | undefined {
    // Check direct command name
    const command = this.commands.get(commandName);
    if (command) return command;
    
    // Check aliases
    const aliasTarget = this.aliases.get(commandName);
    if (aliasTarget) {
      return this.commands.get(aliasTarget);
    }
    
    return undefined;
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  async execute(input: string, context: CommandContext): Promise<CommandResult> {
    // Parse command and arguments
    const trimmed = input.trim();
    
    // Check if it's a command (starts with /)
    if (!trimmed.startsWith('/')) {
      // Not a command, treat as input for AI
      const userInput = trimmed;
      const llmProvider = context.llmManager.getActiveProvider();

      if (!llmProvider || !llmProvider.isConfigured()) {
        const errorLine: TerminalLine = {
          id: `error-no-llm-${Date.now()}`,
          type: 'error',
          content: 'No AI provider is configured or active. Please check your settings.',
          timestamp: new Date().toISOString(),
          user: 'claudia'
        };
        return {
          success: false,
          lines: [errorLine],
          error: 'No AI provider configured or active.'
        };
      }

      context.setLoading(true);

      const userLine: TerminalLine = {
        id: `user-${Date.now()}`,
        type: 'input',
        content: userInput,
        timestamp: new Date().toISOString(),
        user: 'user'
      };

      try {
        const ACTIVE_CONVERSATION_ID_KEY = 'activeConversationId';
        const CONVERSATION_HISTORY_LIMIT = 10; // Number of past messages to include

        let activeConversationId = await context.storage.getSetting<string>(ACTIVE_CONVERSATION_ID_KEY);

        if (!activeConversationId) {
          const newConversation = await context.storage.createConversation({ title: 'New Conversation' });
          activeConversationId = newConversation.id;
          await context.storage.setSetting(ACTIVE_CONVERSATION_ID_KEY, activeConversationId);
        }

        // Save user message to DB
        await context.storage.addMessage({
          conversationId: activeConversationId,
          role: 'user',
          content: userLine.content,
          timestamp: userLine.timestamp,
        });

        // Fetch conversation history
        const dbMessages = await context.storage.getMessages(activeConversationId, CONVERSATION_HISTORY_LIMIT);
        
        const llmMessages: import('../providers/llm/types').LLMMessage[] = dbMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

        // Add current user input if not already the last one from DB (it shouldn't be)
        if (llmMessages.length === 0 || llmMessages[llmMessages.length -1].content !== userInput) {
             // This check is a bit redundant if getMessages doesn't include the one just added,
             // but ensures the current input is the last one if history was empty or just fetched.
             // The primary way current message is added is by being the latest in dbMessages.
             // However, if addMessage is too slow, or if we want to ensure it's always the *absolute* last,
             // we might need to adjust. For now, assuming getMessages will include the one just added.
        }
        
        // Add system prompt from personality
        const activePersonality = await context.storage.getActivePersonality();
        if (activePersonality) {
          const systemPromptString = generateSystemPrompt(activePersonality);
          if (systemPromptString) {
            llmMessages.unshift({ role: 'system', content: systemPromptString });
          }
        }
        
        const llmResponse = await llmProvider.generateResponse(llmMessages);

        // Parse avatar commands from the LLM response
        const { cleanText, commands: avatarCommands } = context.avatarController.parseAvatarCommands(llmResponse.content);

        const assistantLine: TerminalLine = {
          id: `assistant-${Date.now()}`,
          type: 'output',
          content: cleanText, // Use cleaned text for display
          timestamp: new Date().toISOString(),
          user: 'claudia'
        };

        // Save assistant message (cleaned text) to DB
        await context.storage.addMessage({
          conversationId: activeConversationId,
          role: 'assistant',
          content: assistantLine.content, // Save cleaned text
          timestamp: assistantLine.timestamp,
        });
        
        // Execute avatar commands asynchronously (but await completion before finishing this turn)
        if (avatarCommands.length > 0) {
          try {
            await context.avatarController.executeCommands(avatarCommands);
          } catch (avatarError) {
            console.error("Error executing avatar commands:", avatarError);
            // Optionally, add a system message to the terminal about avatar command failure
            // For now, we'll just log it and not interrupt the chat flow.
          }
        }

        context.setLoading(false);
        return { success: true, lines: [userLine, assistantLine] };

      } catch (error) {
        context.setLoading(false);
        const errorContent = error instanceof Error ? error.message : 'Unknown error during AI response generation.';
        const errorLine: TerminalLine = {
          id: `error-ai-${Date.now()}`,
          type: 'error',
          content: `AI Error: ${errorContent}`,
          timestamp: new Date().toISOString(),
          user: 'claudia'
        };
        // Return userLine as well so their input isn't lost on error
        return { success: false, lines: [userLine, errorLine], error: errorContent };
      }
    }

    // It's a command, proceed with command parsing
    // Remove the / and split into parts
    const parts = trimmed.slice(1).split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Find the command
    const command = this.get(commandName);
    if (!command) {
      const errorLine: TerminalLine = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `Unknown command: /${commandName}. Type /help for available commands.`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      };
      
      return {
        success: false,
        lines: [errorLine],
        error: `Unknown command: ${commandName}`
      };
    }

    // Check if required providers are available
    if (command.requiresAI && !context.llmManager.getActiveProvider()) {
      const errorLine: TerminalLine = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `Command /${commandName} requires AI provider, but none is configured.`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      };
      
      return {
        success: false,
        lines: [errorLine],
        error: 'No AI provider configured'
      };
    }

    if (command.requiresImageGen && !context.imageManager.getActiveProvider()) {
      const errorLine: TerminalLine = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `Command /${commandName} requires image generation provider, but none is configured.`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      };
      
      return {
        success: false,
        lines: [errorLine],
        error: 'No image generation provider configured'
      };
    }

    try {
      // Execute the command
      return await command.execute(args, context);
    } catch (error) {
      const errorLine: TerminalLine = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `Error executing /${commandName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      };
      
      return {
        success: false,
        lines: [errorLine],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper method to parse command arguments with quotes support
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
