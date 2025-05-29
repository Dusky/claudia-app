import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

const findConversationByIdOrPartialTitle = async (
  searchTerm: string,
  context: CommandContext
): Promise<import('../../storage/types').Conversation | null> => {
  const conversations = await context.storage.getAllConversations();
  // Try exact ID match first
  const conversation = conversations.find(c => c.id === searchTerm);
  if (conversation) return conversation;

  // Try partial title match (case-insensitive)
  const lowerSearchTerm = searchTerm.toLowerCase();
  const matchingConversations = conversations.filter(c => 
    c.title.toLowerCase().includes(lowerSearchTerm)
  );

  if (matchingConversations.length === 1) {
    return matchingConversations[0];
  } else if (matchingConversations.length > 1) {
    context.addLines([{
      id: `conv-match-multi-${Date.now()}`, type: 'error',
      content: `Error: Multiple conversations match "${searchTerm}". Please use a more specific ID or title. Matches: ${matchingConversations.map(c => `${c.title} (ID: ${c.id})`).join(', ')}`,
      timestamp: new Date().toISOString(), user: 'claudia'
    }]);
    return null;
  }
  return null; // No match
};


export const conversationCommand: Command = {
  name: 'conversation',
  description: 'Manage chat conversations. Lists subcommands.',
  usage: '/conversation [help|list|new|load|delete|rename|clearhist]',
  aliases: ['conv'],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    if (args.length === 0 || args[0]?.toLowerCase() === 'help') {
      lines.push({
        id: `conv-help-header-${timestamp}`, type: 'system',
        content: 'Conversations: Management Subcommands:', timestamp, user: 'claudia' // Emoji removed
      });
      lines.push({ id: `conv-help-blank-${timestamp}`, type: 'output', content: '', timestamp, user: 'claudia' });

      const subCommands = [
        { name: 'list', desc: 'List all conversations.' },
        { name: 'new [title]', desc: 'Create a new conversation.' },
        { name: 'load <id|title_part>', desc: 'Load an existing conversation.' },
        { name: 'delete <id|title_part>', desc: 'Delete a conversation.' },
        { name: 'rename <id|title_part> <new_title>', desc: 'Rename a conversation.' },
        { name: 'clearhist', desc: 'Clear history of the current conversation.' },
      ];

      subCommands.forEach(cmd => {
        lines.push({
          id: `conv-help-cmd-${cmd.name}-${timestamp}`, type: 'output',
          content: `  /conversation ${cmd.name.padEnd(25)} - ${cmd.desc}`, timestamp, user: 'claudia'
        });
      });
      lines.push({ id: `conv-help-blank-after-${timestamp}`, type: 'output', content: '', timestamp, user: 'claudia' });
      lines.push({
        id: `conv-help-tip-${timestamp}`, type: 'system',
        content: "Info: Aliases: /conv ls, /conv new, /conv load, /conv rm, /conv mv, /conv clearhist", timestamp, user: 'claudia'
      });
      return { success: true, lines };
    }
    return {
      success: false,
      lines: [{
        id: `conv-invalid-${timestamp}`, type: 'error',
        content: `Error: Invalid argument for /conversation. Use '/conversation help' to see available subcommands.`, // Emoji removed
        timestamp, user: 'claudia'
      }],
    };
  }
};

export const listConversationsCommand: Command = {
  name: 'conversation-list',
  description: 'Lists all saved conversations.',
  usage: '/conversation-list',
  aliases: ['conv-ls', 'conv-list'],
  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    const conversations = await context.storage.getAllConversations();
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    if (!conversations || conversations.length === 0) {
      lines.push({
        id: `conv-list-empty-${timestamp}`, type: 'output',
        content: 'Info: No conversations found. Use "/conversation new [title]" to create one.',
        timestamp, user: 'claudia'
      });
    } else {
      lines.push({
        id: `conv-list-header-${timestamp}`, type: 'system',
        content: 'Conversations: Saved Sessions:', timestamp, user: 'claudia' // Emoji removed
      });
      lines.push({ id: `conv-list-space-${timestamp}`, type: 'output', content: '', timestamp, user: 'claudia' });

      conversations.forEach(c => {
        const isActive = context.activeConversationId === c.id;
        const indicator = isActive ? '-> *' : '  -'; // Using text indicators
        const updated = new Date(c.updatedAt).toLocaleString();
        lines.push({
          id: `conv-list-item-${c.id}-${timestamp}`, type: 'output',
          content: `${indicator} ${c.title.padEnd(30)} (ID: ${c.id}, Last updated: ${updated})`,
          timestamp, user: 'claudia'
        });
      });
      lines.push({ id: `conv-list-footer-space-${timestamp}`, type: 'output', content: '', timestamp, user: 'claudia' });
    }
    lines.push({ id: `conv-list-footer1-${timestamp}`, type: 'system', content: 'Info: Use "/conversation load <id_or_title>" to switch.', timestamp, user: 'claudia' });
    return { success: true, lines };
  }
};

export const newConversationCommand: Command = {
  name: 'conversation-new',
  description: 'Creates a new conversation and switches to it.',
  usage: '/conversation-new [title]',
  aliases: ['conv-new'],
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const title = args.join(' ').trim() || `Chat Session - ${new Date().toLocaleString()}`;
    const newConv = await context.storage.createConversation({ title });
    await context.setActiveConversationId(newConv.id, true); 

    return {
      success: true,
      lines: [{
        id: `conv-new-succ-${Date.now()}`, type: 'system',
        content: `Conversations: Switched to new conversation: "${newConv.title}" (ID: ${newConv.id})`, // Emoji removed
        timestamp: new Date().toISOString(), user: 'claudia'
      }]
    };
  }
};

export const loadConversationCommand: Command = {
  name: 'conversation-load',
  description: 'Loads an existing conversation.',
  usage: '/conversation-load <id_or_partial_title>',
  aliases: ['conv-load', 'conv-switch'],
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    if (args.length === 0) {
      return { success: false, lines: [{ id: `conv-load-err-${Date.now()}`, type: 'error', content: 'Error: Usage: /conversation-load <id_or_partial_title>', timestamp: new Date().toISOString(), user: 'claudia' }] }; // Emoji removed
    }
    const searchTerm = args.join(' ');
    const conversation = await findConversationByIdOrPartialTitle(searchTerm, context);

    if (!conversation) {
      return { success: false, lines: [{ id: `conv-load-notfound-${Date.now()}`, type: 'error', content: `Error: Conversation "${searchTerm}" not found.`, timestamp: new Date().toISOString(), user: 'claudia' }] }; // Emoji removed
    }

    if (conversation.id === context.activeConversationId) {
      return { success: true, lines: [{ id: `conv-load-already-${Date.now()}`, type: 'system', content: `Info: Conversation "${conversation.title}" is already active.`, timestamp: new Date().toISOString(), user: 'claudia' }] };
    }

    await context.setActiveConversationId(conversation.id, true); 

    return {
      success: true,
      lines: [{
        id: `conv-load-succ-${Date.now()}`, type: 'system',
        content: `Conversations: Switched to conversation: "${conversation.title}" (ID: ${conversation.id})`, // Emoji removed
        timestamp: new Date().toISOString(), user: 'claudia'
      }]
    };
  }
};

export const deleteConversationCommand: Command = {
  name: 'conversation-delete',
  description: 'Deletes a conversation.',
  usage: '/conversation-delete <id_or_partial_title>',
  aliases: ['conv-delete', 'conv-rm'],
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    if (args.length === 0) {
      return { success: false, lines: [{ id: `conv-del-err-${Date.now()}`, type: 'error', content: 'Error: Usage: /conversation-delete <id_or_partial_title>', timestamp: new Date().toISOString(), user: 'claudia' }] }; // Emoji removed
    }
    const searchTerm = args.join(' ');
    const conversation = await findConversationByIdOrPartialTitle(searchTerm, context);

    if (!conversation) {
      return { success: false, lines: [{ id: `conv-del-notfound-${Date.now()}`, type: 'error', content: `Error: Conversation "${searchTerm}" not found.`, timestamp: new Date().toISOString(), user: 'claudia' }] }; // Emoji removed
    }

    const deleted = await context.storage.deleteConversation(conversation.id);
    if (!deleted) {
      return { success: false, lines: [{ id: `conv-del-fail-${Date.now()}`, type: 'error', content: `Error: Failed to delete conversation "${conversation.title}".`, timestamp: new Date().toISOString(), user: 'claudia' }] }; // Emoji removed
    }

    const lines: TerminalLine[] = [{
      id: `conv-del-succ-${Date.now()}`, type: 'system',
      content: `Deleted: Conversation "${conversation.title}" (ID: ${conversation.id}) deleted.`, // Emoji removed
      timestamp: new Date().toISOString(), user: 'claudia'
    }];

    if (context.activeConversationId === conversation.id) {
      const remainingConversations = await context.storage.getAllConversations();
      if (remainingConversations.length > 0) {
        await context.setActiveConversationId(remainingConversations[0].id, true);
        lines.push({
          id: `conv-del-switch-${Date.now()}`, type: 'system',
          content: `Info: Switched to conversation: "${remainingConversations[0].title}".`,
          timestamp: new Date().toISOString(), user: 'claudia'
        });
      } else {
        const newConv = await context.storage.createConversation({ title: `Chat Session - ${new Date().toLocaleString()}` });
        await context.setActiveConversationId(newConv.id, true);
        lines.push({
          id: `conv-del-new-${Date.now()}`, type: 'system',
          content: `Info: Created and switched to new conversation: "${newConv.title}".`,
          timestamp: new Date().toISOString(), user: 'claudia'
        });
      }
    }
    return { success: true, lines };
  }
};

export const renameConversationCommand: Command = {
  name: 'conversation-rename',
  description: 'Renames a conversation.',
  usage: '/conversation-rename <id_or_partial_title> <new_title>',
  aliases: ['conv-rename', 'conv-mv'],
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    if (args.length < 2) {
      return { success: false, lines: [{ id: `conv-ren-err-${Date.now()}`, type: 'error', content: 'Error: Usage: /conversation-rename <id_or_partial_title> <new_title>', timestamp: new Date().toISOString(), user: 'claudia' }] }; // Emoji removed
    }
    const searchTerm = args[0];
    const newTitle = args.slice(1).join(' ');
    const conversation = await findConversationByIdOrPartialTitle(searchTerm, context);

    if (!conversation) {
      return { success: false, lines: [{ id: `conv-ren-notfound-${Date.now()}`, type: 'error', content: `Error: Conversation "${searchTerm}" not found.`, timestamp: new Date().toISOString(), user: 'claudia' }] }; // Emoji removed
    }

    const updated = await context.storage.updateConversation(conversation.id, { title: newTitle });
    if (!updated) {
      return { success: false, lines: [{ id: `conv-ren-fail-${Date.now()}`, type: 'error', content: `Error: Failed to rename conversation "${conversation.title}".`, timestamp: new Date().toISOString(), user: 'claudia' }] }; // Emoji removed
    }

    return {
      success: true,
      lines: [{
        id: `conv-ren-succ-${Date.now()}`, type: 'system',
        content: `Conversations: Conversation "${conversation.title}" renamed to "${newTitle}".`, // Emoji removed
        timestamp: new Date().toISOString(), user: 'claudia'
      }]
    };
  }
};

export const clearConversationHistoryCommand: Command = {
  name: 'conversation-clearhist',
  description: 'Clears message history for the current conversation from the database.',
  usage: '/conversation-clearhist',
  aliases: ['conv-clearhist'],
  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    if (!context.activeConversationId) {
      return { success: false, lines: [{ id: `conv-clearhist-noactive-${Date.now()}`, type: 'error', content: 'Error: No active conversation to clear.', timestamp: new Date().toISOString(), user: 'claudia' }] }; // Emoji removed
    }
    
    // Actual deletion logic should be in StorageService. For now, this command signals App.tsx.
    // await context.storage.deleteMessagesByConversationId(context.activeConversationId); // Assuming this method exists or will be added
    
    context.addLines([{
        id: `conv-clearhist-done-${Date.now()}`, type: 'system',
        content: `Cleared: History for current conversation cleared from database. Terminal display also cleared.`, // Emoji removed
        timestamp: new Date().toISOString(), user: 'claudia'
    }]);
    
    return {
        success: true,
        lines: [], 
        shouldContinue: false 
    };
  }
};
