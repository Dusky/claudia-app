import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

export const helpCommand: Command = {
  name: 'help',
  description: 'Show available commands and usage information',
  usage: '/help [command_name]',
  aliases: ['h', '?'],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    
    // Trigger the help modal instead of terminal output
    window.dispatchEvent(new CustomEvent('showHelpModal', { 
      detail: { commandName: args[0] || null } 
    }));
    
    return { 
      success: true, 
      lines: [{
        id: `help-modal-${timestamp}`,
        type: 'system',
        content: 'Opening help modal...',
        timestamp,
        user: 'claudia'
      } as TerminalLine]
    };
  }
};