import type { Command, CommandRegistry, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { AIHandler } from '../ai/aiHandler';

/**
 * Simplified command registry focused on command execution
 * AI handling moved to separate module for better separation of concerns
 */
export class CommandRegistryImpl implements CommandRegistry {
  private commands = new Map<string, Command>();
  private aliases = new Map<string, string>();
  private aiHandler = new AIHandler();

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

  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  getAllCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  async execute(input: string, context: CommandContext): Promise<CommandResult> {
    const trimmed = input.trim();
    const timestamp = new Date().toISOString();
    
    // Handle non-command input (AI conversation)
    if (!trimmed.startsWith('/')) {
      return await this.aiHandler.handleAIInput(trimmed, context);
    }

    // Parse command
    const parts = trimmed.slice(1).split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);
    const command = this.get(commandName);

    // Handle unknown command
    if (!command) {
      const suggestions = this.findSimilarCommands(commandName, this.getAllCommandNames());
      
      let content = `Unknown command: /${commandName}.`;
      if (suggestions.length > 0) {
        content += ` Did you mean: ${suggestions.map(cmd => `/${cmd}`).join(', ')}?`;
      }
      content += ' Type /help for all commands.';
      
      const errorLine: TerminalLine = {
        id: `error-cmd-unknown-${timestamp}`,
        type: 'error',
        content,
        timestamp,
        user: 'claudia'
      };
      return { success: false, lines: [errorLine], error: `Unknown command: ${commandName}` };
    }

    // Validate command requirements
    const validationResult = this.validateCommandRequirements(command, commandName, context, timestamp);
    if (!validationResult.valid) {
      return validationResult.result!;
    }

    // Execute command
    try {
      return await command.execute(args, context);
    } catch (error) {
      const errorContent = error instanceof Error ? error.message : 'Unknown error';
      const errorLine: TerminalLine = {
        id: `error-cmd-exec-${timestamp}`,
        type: 'error',
        content: `Error executing /${commandName}: ${errorContent}`,
        timestamp,
        user: 'claudia'
      };
      
      // Save command execution error to conversation if relevant
      if (context.activeConversationId && command.name !== 'ask') {
        await context.storage.addMessage({
          conversationId: context.activeConversationId,
          role: 'assistant',
          content: `System Error executing command /${commandName}: ${errorContent}`,
          timestamp
        });
      }
      
      return { success: false, lines: [errorLine], error: errorContent };
    }
  }

  /**
   * Validate command requirements (AI, Image generation, etc.)
   */
  private validateCommandRequirements(
    command: Command,
    commandName: string,
    context: CommandContext,
    timestamp: string
  ): { valid: boolean; result?: CommandResult } {
    // Check AI requirement
    if (command.requiresAI && (!context.llmManager.getActiveProvider() || !context.llmManager.getActiveProvider()?.isConfigured())) {
      const errorLines: TerminalLine[] = [
        {
          id: `error-cmd-noai-${timestamp}`,
          type: 'error',
          content: `❌ Command /${commandName} requires a configured AI provider.`,
          timestamp,
          user: 'claudia'
        },
        {
          id: `error-cmd-noai-help-${timestamp}`,
          type: 'system',
          content: `💡 Quick fix: Use /providers to configure an AI provider, or check your API keys in settings.`,
          timestamp,
          user: 'claudia'
        }
      ];
      return {
        valid: false,
        result: { success: false, lines: errorLines, error: 'No AI provider configured for command' }
      };
    }

    // Check Image generation requirement
    if (command.requiresImageGen && (!context.imageManager.getActiveProvider() || !context.imageManager.getActiveProvider()?.isConfigured())) {
      const errorLines: TerminalLine[] = [
        {
          id: `error-cmd-noimg-${timestamp}`,
          type: 'error',
          content: `❌ Command /${commandName} requires a configured Image provider.`,
          timestamp,
          user: 'claudia'
        },
        {
          id: `error-cmd-noimg-help-${timestamp}`,
          type: 'system',
          content: `💡 Quick fix: Use /providers to configure an image provider, or add your Replicate API key in settings.`,
          timestamp,
          user: 'claudia'
        }
      ];
      return {
        valid: false,
        result: { success: false, lines: errorLines, error: 'No Image provider configured for command' }
      };
    }

    return { valid: true };
  }

  /**
   * Find similar commands using Levenshtein distance for typo suggestions
   */
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

  /**
   * Parse command arguments with quote support
   */
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