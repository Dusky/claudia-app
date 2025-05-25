import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

const BOX_INNER_WIDTH = 68; // Adjusted for better fitting
const BOX_TOTAL_WIDTH = BOX_INNER_WIDTH + 2; // For ║ content ║

const createLine = (content: string, idSuffix: string, timestamp: string, type: TerminalLine['type'] = 'system'): TerminalLine => ({
  id: `help-${idSuffix}-${timestamp}`,
  type,
  content,
  timestamp,
});

const fitToWidth = (text: string, width: number, align: 'left' | 'center' = 'left'): string => {
  if (text.length >= width) {
    return text.substring(0, width); // Truncate if too long
  }
  if (align === 'center') {
    const paddingNeeded = width - text.length;
    const padLeft = Math.floor(paddingNeeded / 2);
    const padRight = Math.ceil(paddingNeeded / 2);
    return ' '.repeat(padLeft) + text + ' '.repeat(padRight);
  }
  return text.padEnd(width);
};

export const helpCommand: Command = {
  name: 'help',
  description: 'Show available commands and usage information',
  usage: '/help [command_name]',
  aliases: ['h', '?'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    const topBorder = `╔${'═'.repeat(BOX_INNER_WIDTH)}╗`;
    const bottomBorder = `╚${'═'.repeat(BOX_INNER_WIDTH)}╝`;
    const separator = `╠${'═'.repeat(BOX_INNER_WIDTH)}╣`;

    if (args.length === 0) {
      lines.push(createLine(topBorder, 'all-top', timestamp));
      
      const title = fitToWidth('CLAUDIA AI - AVAILABLE COMMANDS', BOX_INNER_WIDTH, 'center');
      lines.push(createLine(`║${title}║`, 'all-header', timestamp));
      lines.push(createLine(separator, 'all-sep1', timestamp));
      
      const commands = context.commandRegistry.getAllCommands().sort((a, b) => a.name.localeCompare(b.name));
      
      const cmdNameMaxWidth = 18; // Max width for command name part e.g. "/command"
      // Remaining width for description: BOX_INNER_WIDTH - "║ ➤ /".length - cmdNameMaxWidth - " | ".length - "║".length
      // BOX_INNER_WIDTH - 4 - cmdNameMaxWidth - 3
      const descMaxWidth = BOX_INNER_WIDTH - 4 - cmdNameMaxWidth - 3;

      commands.forEach(cmd => {
        const cmdDisplay = ` ➤ /${cmd.name}`;
        const lineContent = `${cmdDisplay.padEnd(4 + cmdNameMaxWidth)} | ${cmd.description.substring(0, descMaxWidth)}`;
        lines.push(createLine(`║${fitToWidth(lineContent, BOX_INNER_WIDTH)}║`, `cmd-${cmd.name}`, timestamp, 'output'));
        
        if (cmd.aliases && cmd.aliases.length > 0) {
          const aliasesDisplay = `   Aliases: /${cmd.aliases.join(', /')}`;
          // BOX_INNER_WIDTH - "║ ".length - "║".length
          lines.push(createLine(`║${fitToWidth(aliasesDisplay, BOX_INNER_WIDTH)}║`, `cmd-aliases-${cmd.name}`, timestamp, 'output'));
        }
      });
      lines.push(createLine(separator, 'all-sep2', timestamp));
      
      const tip1 = fitToWidth(" ▶ Type '/help [command]' for more details.", BOX_INNER_WIDTH);
      lines.push(createLine(`║${tip1}║`, 'tip1', timestamp));
      const tip2 = fitToWidth(" ▶ Messages without '/' are sent to the AI.", BOX_INNER_WIDTH);
      lines.push(createLine(`║${tip2}║`, 'tip2', timestamp));
      
      lines.push(createLine(bottomBorder, 'all-bottom', timestamp));

    } else {
      const commandName = args[0].startsWith('/') ? args[0].substring(1) : args[0];
      const command = context.commandRegistry.get(commandName);

      if (command) {
        const titleText = `HELP FOR /${command.name.toUpperCase()}`;
        lines.push(createLine(topBorder, `spec-top-${command.name}`, timestamp));
        lines.push(createLine(`║${fitToWidth(titleText, BOX_INNER_WIDTH, 'center')}║`, `spec-title-${command.name}`, timestamp));
        lines.push(createLine(separator, `spec-sep-${command.name}`, timestamp));

        const descText = ` Description: ${command.description}`;
        lines.push(createLine(`║${fitToWidth(descText, BOX_INNER_WIDTH)}║`, `spec-desc-${command.name}`, timestamp, 'output'));
        
        const usageText = ` Usage: ${command.usage}`;
        lines.push(createLine(`║${fitToWidth(usageText, BOX_INNER_WIDTH)}║`, `spec-usage-${command.name}`, timestamp, 'output'));
        
        if (command.aliases && command.aliases.length > 0) {
          const aliasesText = ` Aliases: /${command.aliases.join(', /')}`;
          lines.push(createLine(`║${fitToWidth(aliasesText, BOX_INNER_WIDTH)}║`, `spec-aliases-${command.name}`, timestamp, 'output'));
        }
        lines.push(createLine(bottomBorder, `spec-bottom-${command.name}`, timestamp));
      } else {
        lines.push(createLine(topBorder, 'unknown-top', timestamp, 'error'));
        const errorMsg = `Command '/${commandName}' not found.`;
        lines.push(createLine(`║${fitToWidth(errorMsg, BOX_INNER_WIDTH, 'center')}║`, `unknown-msg-${commandName}`, timestamp, 'error'));
        const tipMsg = `Type '/help' to see all available commands.`;
        lines.push(createLine(`║${fitToWidth(tipMsg, BOX_INNER_WIDTH, 'center')}║`, `unknown-tip-${commandName}`, timestamp, 'error'));
        lines.push(createLine(bottomBorder, 'unknown-bottom', timestamp, 'error'));
      }
    }

    return { success: true, lines };
  }
};
