import type { Command, CommandRegistry, CommandContext, CommandResult } from './types';
import type { TerminalLine } from '../terminal/TerminalDisplay';
import type { LLMMessage } from '../providers/llm/types';
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
        const avatarInstructions = `

Avatar Commands (use these to enhance your responses):
- Use [AVATAR:expression=happy] to show emotions (happy, curious, focused, thinking, surprised, confused, excited, confident, mischievous, sleepy, shocked)
- Use [AVATAR:position=center] to change position (center, top-left, top-right, bottom-left, bottom-right, beside-text, overlay-left, overlay-right, floating, peeking)
- Use [AVATAR:action=wave] for actions (idle, type, search, read, wave, nod, shrug, point, think, work)
- Use [AVATAR:pose=standing] for poses (standing, sitting, leaning, crossed-arms, hands-on-hips, casual)
- Use [AVATAR:show=true] or [AVATAR:hide=true] to control visibility
- Combine multiple attributes: [AVATAR:expression=excited,action=wave,position=center]

Respond naturally to the user's message while optionally incorporating avatar commands to enhance the interaction.`;
        llmMessages.push({ role: 'system', content: systemPrompt + avatarInstructions });

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
        
        const llmResponse = await llmProvider.generateResponse(llmMessages, {
          temperature: 0.8, // Example, could be from personality
          maxTokens: 500,
        });

        const { cleanText, commands: avatarCommands } = context.avatarController.parseAvatarCommands(llmResponse.content);
        const assistantTimestamp = new Date().toISOString();
        
        const assistantLinesForUI: TerminalLine[] = cleanText.split('\n').map((line, index) => ({
          id: `assistant-${assistantTimestamp}-${index}`, type: 'output',
          content: line, timestamp: assistantTimestamp, user: 'claudia',
          isChatResponse: true // Mark these as direct AI chat responses
        }));

        if (context.activeConversationId) {
          await context.storage.addMessage({
            conversationId: context.activeConversationId, role: 'assistant',
            content: cleanText, timestamp: assistantTimestamp,
          });
        }
        
        if (avatarCommands.length > 0) {
          try {
            await context.avatarController.executeCommands(avatarCommands);
          } catch (avatarError) {
            console.error("Error executing avatar commands:", avatarError);
          }
        }

        context.setLoading(false);
        // The userLine was already added by App.tsx. We only return assistant lines here.
        return { success: true, lines: assistantLinesForUI };

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
      const errorLine: TerminalLine = {
        id: `error-cmd-unknown-${timestamp}`, type: 'error',
        content: `Unknown command: /${commandName}. Type /help for available commands.`,
        timestamp, user: 'claudia'
        // isChatResponse is false/undefined for command errors
      };
      return { success: false, lines: [errorLine], error: `Unknown command: ${commandName}` };
    }

    if (command.requiresAI && (!context.llmManager.getActiveProvider() || !context.llmManager.getActiveProvider()?.isConfigured())) {
      const errorLine: TerminalLine = {
        id: `error-cmd-noai-${timestamp}`, type: 'error',
        content: `Command /${commandName} requires a configured AI provider.`,
        timestamp, user: 'claudia'
        // isChatResponse is false/undefined
      };
      return { success: false, lines: [errorLine], error: 'No AI provider configured for command' };
    }

    if (command.requiresImageGen && (!context.imageManager.getActiveProvider() || !context.imageManager.getActiveProvider()?.isConfigured())) {
      const errorLine: TerminalLine = {
        id: `error-cmd-noimg-${timestamp}`, type: 'error',
        content: `Command /${commandName} requires a configured Image provider.`,
        timestamp, user: 'claudia'
        // isChatResponse is false/undefined
      };
      return { success: false, lines: [errorLine], error: 'No Image provider configured for command' };
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
