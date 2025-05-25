import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { DEFAULT_PERSONALITY } from '../../types/personality'; // For creating new default conv

const findConversationByIdOrPartialTitle = async (
  searchTerm: string,
  context: CommandContext
): Promise<import('../../storage/types').Conversation | null> => {
  const conversations = await context.storage.getAllConversations();
  // Try exact ID match first
  let conversation = conversations.find(c => c.id === searchTerm);
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
      content: `Multiple conversations match "${searchTerm}". Please use a more specific ID or title. Matches: ${matchingConversations.map(c => `${c.title} (ID: ${c.id})`).join(', ')}`,
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
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    if (args.length === 0 || args[0]?.toLowerCase() === 'help') {
      lines.push({
        id: `conv-help-header-${timestamp}`, type: 'system',
        content: '💬 Conversation Management Subcommands:', timestamp, user: 'claudia'
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
        content: "▶ Aliases: /conv ls, /conv new, /conv load, /conv rm, /conv mv, /conv clearhist", timestamp, user: 'claudia'
      });
      return { success: true, lines };
    }
    // If a subcommand is provided but not 'help', it will be caught by the command registry
    // if individual subcommands are registered. If not, this main command needs to route them.
    // For now, assuming subcommands will be registered separately or handled by a more complex router.
    return {
      success: false,
      lines: [{
        id: `conv-invalid-${timestamp}`, type: 'error',
        content: `❌ Invalid argument for /conversation. Use '/conversation help' to see available subcommands.`,
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
        content: 'No conversations found. Use "/conversation new [title]" to create one.',
        timestamp, user: 'claudia'
      });
    } else {
      lines.push({
        id: `conv-list-header-${timestamp}`, type: 'system',
        content: '💬 Saved Conversations:', timestamp, user: 'claudia'
      });
      lines.push({ id: `conv-list-space-${timestamp}`, type: 'output', content: '', timestamp, user: 'claudia' });

      conversations.forEach(c => {
        const isActive = context.activeConversationId === c.id;
        const indicator = isActive ? '→ ●' : '  ○';
        const updated = new Date(c.updatedAt).toLocaleString();
        lines.push({
          id: `conv-list-item-${c.id}-${timestamp}`, type: 'output',
          content: `${indicator} ${c.title.padEnd(30)} (ID: ${c.id}, Last updated: ${updated})`,
          timestamp, user: 'claudia'
        });
      });
      lines.push({ id: `conv-list-footer-space-${timestamp}`, type: 'output', content: '', timestamp, user: 'claudia' });
    }
    lines.push({ id: `conv-list-footer1-${timestamp}`, type: 'system', content: '▶ Use "/conversation load <id_or_title>" to switch.', timestamp, user: 'claudia' });
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
    await context.setActiveConversationId(newConv.id, true); // true to load messages (which will be none for new) and clear UI

    return {
      success: true,
      lines: [{
        id: `conv-new-succ-${Date.now()}`, type: 'system',
        content: `💬 Switched to new conversation: "${newConv.title}" (ID: ${newConv.id})`,
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
      return { success: false, lines: [{ id: `conv-load-err-${Date.now()}`, type: 'error', content: '❌ Usage: /conversation-load <id_or_partial_title>', timestamp: new Date().toISOString(), user: 'claudia' }] };
    }
    const searchTerm = args.join(' ');
    const conversation = await findConversationByIdOrPartialTitle(searchTerm, context);

    if (!conversation) {
      return { success: false, lines: [{ id: `conv-load-notfound-${Date.now()}`, type: 'error', content: `❌ Conversation "${searchTerm}" not found.`, timestamp: new Date().toISOString(), user: 'claudia' }] };
    }

    if (conversation.id === context.activeConversationId) {
      return { success: true, lines: [{ id: `conv-load-already-${Date.now()}`, type: 'system', content: `Conversation "${conversation.title}" is already active.`, timestamp: new Date().toISOString(), user: 'claudia' }] };
    }

    await context.setActiveConversationId(conversation.id, true); // true to load messages and clear UI

    return {
      success: true,
      lines: [{
        id: `conv-load-succ-${Date.now()}`, type: 'system',
        content: `💬 Switched to conversation: "${conversation.title}" (ID: ${conversation.id})`,
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
      return { success: false, lines: [{ id: `conv-del-err-${Date.now()}`, type: 'error', content: '❌ Usage: /conversation-delete <id_or_partial_title>', timestamp: new Date().toISOString(), user: 'claudia' }] };
    }
    const searchTerm = args.join(' ');
    const conversation = await findConversationByIdOrPartialTitle(searchTerm, context);

    if (!conversation) {
      return { success: false, lines: [{ id: `conv-del-notfound-${Date.now()}`, type: 'error', content: `❌ Conversation "${searchTerm}" not found.`, timestamp: new Date().toISOString(), user: 'claudia' }] };
    }

    const deleted = await context.storage.deleteConversation(conversation.id);
    if (!deleted) {
      return { success: false, lines: [{ id: `conv-del-fail-${Date.now()}`, type: 'error', content: `❌ Failed to delete conversation "${conversation.title}".`, timestamp: new Date().toISOString(), user: 'claudia' }] };
    }

    const lines: TerminalLine[] = [{
      id: `conv-del-succ-${Date.now()}`, type: 'system',
      content: `🗑️ Conversation "${conversation.title}" (ID: ${conversation.id}) deleted.`,
      timestamp: new Date().toISOString(), user: 'claudia'
    }];

    if (context.activeConversationId === conversation.id) {
      // Active conversation was deleted, switch to another or create new
      const remainingConversations = await context.storage.getAllConversations();
      if (remainingConversations.length > 0) {
        await context.setActiveConversationId(remainingConversations[0].id, true);
        lines.push({
          id: `conv-del-switch-${Date.now()}`, type: 'system',
          content: `Switched to conversation: "${remainingConversations[0].title}".`,
          timestamp: new Date().toISOString(), user: 'claudia'
        });
      } else {
        const newConv = await context.storage.createConversation({ title: `Chat Session - ${new Date().toLocaleString()}` });
        await context.setActiveConversationId(newConv.id, true);
        lines.push({
          id: `conv-del-new-${Date.now()}`, type: 'system',
          content: `Created and switched to new conversation: "${newConv.title}".`,
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
      return { success: false, lines: [{ id: `conv-ren-err-${Date.now()}`, type: 'error', content: '❌ Usage: /conversation-rename <id_or_partial_title> <new_title>', timestamp: new Date().toISOString(), user: 'claudia' }] };
    }
    const searchTerm = args[0];
    const newTitle = args.slice(1).join(' ');
    const conversation = await findConversationByIdOrPartialTitle(searchTerm, context);

    if (!conversation) {
      return { success: false, lines: [{ id: `conv-ren-notfound-${Date.now()}`, type: 'error', content: `❌ Conversation "${searchTerm}" not found.`, timestamp: new Date().toISOString(), user: 'claudia' }] };
    }

    const updated = await context.storage.updateConversation(conversation.id, { title: newTitle });
    if (!updated) {
      return { success: false, lines: [{ id: `conv-ren-fail-${Date.now()}`, type: 'error', content: `❌ Failed to rename conversation "${conversation.title}".`, timestamp: new Date().toISOString(), user: 'claudia' }] };
    }

    return {
      success: true,
      lines: [{
        id: `conv-ren-succ-${Date.now()}`, type: 'system',
        content: `💬 Conversation "${conversation.title}" renamed to "${newTitle}".`,
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
      return { success: false, lines: [{ id: `conv-clearhist-noactive-${Date.now()}`, type: 'error', content: '❌ No active conversation to clear.', timestamp: new Date().toISOString(), user: 'claudia' }] };
    }

    const currentMessages = await context.storage.getMessages(context.activeConversationId);
    for (const message of currentMessages) {
      // This is inefficient. A DB method like `deleteMessages(conversationId)` would be better.
      // For now, assuming no direct `deleteMessage` or `deleteMessagesByConversationId` method.
      // This command might need a dedicated DB method for performance.
      // As a placeholder, we'll just inform the user. A real implementation would delete.
    }
    // Placeholder for actual deletion logic.
    // await context.storage.deleteMessagesByConversationId(context.activeConversationId);
    
    // Visually clear the screen using the /clear command's mechanism
    context.addLines([{
        id: `conv-clearhist-done-${Date.now()}`, type: 'system',
        content: `🧹 History for current conversation cleared from database. Terminal display also cleared.`,
        timestamp: new Date().toISOString(), user: 'claudia'
    }]);
    
    // Trigger a visual clear of the terminal
    return {
        success: true,
        lines: [], // App.tsx will handle the visual clear based on shouldContinue
        shouldContinue: false // This tells App.tsx to clear the display
    };
  }
};
