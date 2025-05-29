import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

export const helpCommand: Command = {
  name: 'help',
  description: 'Access system documentation and command reference',
  usage: '/help [command_name]',
  aliases: ['h', '?'],
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        content: 'System: Accessing documentation subsystem...',
        timestamp,
        user: 'claudia'
      } as TerminalLine]
    };
  }
};