import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

export const helpCommand: Command = {
  name: 'help',
  description: 'Show available commands and usage information',
  usage: '/help [command_name]',
  aliases: ['h', '?'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    if (args.length === 0) {
      // Display help for all commands
      lines.push({
        id: `help-all-header-${timestamp}`,
        type: 'system',
        content: '◈ CLAUDIA AI TERMINAL COMPANION - AVAILABLE COMMANDS:',
        timestamp,
      });
       lines.push({
        id: `help-all-blank-${timestamp}`,
        type: 'output',
        content: '',
        timestamp,
      });

      const commands = context.commandRegistry.getAll().sort((a, b) => a.name.localeCompare(b.name));
      commands.forEach(cmd => {
        lines.push({
          id: `help-cmd-${cmd.name}-${timestamp}`,
          type: 'output',
          content: `  /${cmd.name.padEnd(20)} - ${cmd.description}`,
          timestamp,
        });
        if (cmd.aliases && cmd.aliases.length > 0) {
          lines.push({
            id: `help-cmd-aliases-${cmd.name}-${timestamp}`,
            type: 'output',
            // Ensure aliases are displayed nicely, e.g., indented or on the same line if space permits
            content: `    Aliases: /${cmd.aliases.join(', /')}`,
            timestamp,
          });
        }
      });
      lines.push({
        id: `help-all-blank-after-${timestamp}`,
        type: 'output',
        content: '',
        timestamp,
      });
      lines.push({
        id: `help-tip-${timestamp}`,
        type: 'system',
        content: "▶ Type '/help [command_name]' for more details on a specific command.",
        timestamp,
      });
      lines.push({
        id: `help-tip-chat-${timestamp}`,
        type: 'system',
        content: "▶ Any message without / will be sent directly to the AI!",
        timestamp,
      });

    } else {
      // Display help for a specific command
      const commandName = args[0].startsWith('/') ? args[0].substring(1) : args[0];
      const command = context.commandRegistry.get(commandName);

      if (command) {
        lines.push({
          id: `help-spec-header-${command.name}-${timestamp}`,
          type: 'system',
          content: `▣ Help for /${command.name}:`,
          timestamp,
        });
        lines.push({
          id: `help-spec-desc-${command.name}-${timestamp}`,
          type: 'output',
          content: `  Description: ${command.description}`,
          timestamp,
        });
        lines.push({
          id: `help-spec-usage-${command.name}-${timestamp}`,
          type: 'output',
          content: `  Usage: ${command.usage}`,
          timestamp,
        });
        if (command.aliases && command.aliases.length > 0) {
          lines.push({
            id: `help-spec-aliases-${command.name}-${timestamp}`,
            type: 'output',
            content: `  Aliases: /${command.aliases.join(', /')}`,
            timestamp,
          });
        }
      } else {
        lines.push({
          id: `help-unknown-${commandName}-${timestamp}`,
          type: 'error',
          content: `❌ Command '/${commandName}' not found. Type '/help' to see all available commands.`,
          timestamp,
        });
      }
    }

    return { success: true, lines };
  }
};
