import type { Command, CommandContext, CommandResult } from '../types';

export const configCommand: Command = {
  name: 'config',
  description: 'Open terminal configuration panel',
  usage: '/config',
  aliases: ['settings', 'prefs'],
  
  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    if (context.openConfigModal) {
      context.openConfigModal();
    } else {
      return {
        success: false,
        lines: [{
          id: `config-modal-error-${Date.now()}`,
          type: 'error',
          content: 'Configuration modal functionality is not available.',
          timestamp: new Date().toISOString(),
          user: 'claudia'
        }]
      };
    }
    
    return {
      success: true,
      lines: [{
        id: `config-modal-open-${Date.now()}`,
        type: 'system',
        content: 'Opening configuration panel...',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      }]
    };
  }
};