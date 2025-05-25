import type { Command, CommandResult, CommandContext } from '../types';

export const optionsCommand: Command = {
  name: 'options',
  description: 'Configure AI generation options (deprecated - use /config)',
  usage: '/options',
  aliases: ['settings'],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    // This command is deprecated - AI options are now handled via /config
    return {
      success: false,
      lines: [{
        id: `options-deprecated-${Date.now()}`,
        type: 'error',
        content: 'This command is deprecated. Use /config instead.',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      }]
    };
  }
};