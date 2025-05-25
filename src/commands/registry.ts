import type { Command, CommandRegistry, CommandContext, CommandResult } from './types';
import type { TerminalLine } from '../terminal/TerminalDisplay';

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
      return {
        success: false,
        error: 'Not a command - should be handled by AI'
      };
    }

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