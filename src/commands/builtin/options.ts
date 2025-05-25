import type { Command, CommandResult, CommandContext } from '../types';

export const optionsCommand: Command = {
  name: 'options',
  description: 'Configure AI generation options.',
  usage: '/options',
  aliases: ['config', 'settings ai'],
  
  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    if (context.openAIOptionsModal) { // Check if the function exists on context
      context.openAIOptionsModal();
    } else {
      // Fallback or error if the function isn't provided, though it should be.
      return {
        success: false,
        lines: [{
          id: `options-modal-error-${Date.now()}`,
          type: 'error',
          content: 'AI options modal functionality is not available.',
          timestamp: new Date().toISOString(),
          user: 'claudia'
        }]
      };
    }
    
    return {
      success: true,
      lines: [{
        id: `options-modal-open-${Date.now()}`,
        type: 'system', // Or 'output'
        content: 'Opening AI generation options...',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      }]
    };
  }
};
