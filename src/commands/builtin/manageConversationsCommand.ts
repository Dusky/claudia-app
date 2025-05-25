import type { Command, CommandContext, CommandResult } from '../types';

export const manageConversationsCommand: Command = {
  name: 'conversationsui',
  description: 'Open the conversation management UI.',
  usage: '/conversationsui',
  aliases: ['convoui', 'chatmanage'],
  
  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    context.openConversationManager();
    return { 
      success: true,
      lines: [{
        id: `convoui-${Date.now()}`,
        type: 'system',
        content: 'Opening conversation manager...',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      }]
    };
  }
};
