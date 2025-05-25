import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { fmt } from '../../utils/formatting';

export const retryCommand: Command = {
  name: 'retry',
  description: 'Ask Claudia to try her last response again',
  usage: '/retry',
  aliases: ['redo'],
  requiresAI: true,

  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    if (!context.activeConversationId) {
      lines.push({
        id: `retry-error-${timestamp}`, type: 'error',
        content: 'Error: No active conversation to retry.',
        timestamp, user: 'claudia'
      });
      return { success: false, lines };
    }

    try {
      // Get the last few messages to find the last user message and AI response
      const recentMessages = await context.storage.getMessages(context.activeConversationId, 10);
      
      if (recentMessages.length < 2) {
        lines.push({
          id: `retry-nomsgs-${timestamp}`, type: 'error',
          content: 'Error: Not enough conversation history to retry.',
          timestamp, user: 'claudia'
        });
        return { success: false, lines };
      }

      // Find the last AI response
      const lastAIMessage = recentMessages.reverse().find(m => m.role === 'assistant');
      
      if (!lastAIMessage) {
        lines.push({
          id: `retry-noai-${timestamp}`, type: 'error',
          content: 'Error: No previous response to retry.',
          timestamp, user: 'claudia'
        });
        return { success: false, lines };
      }

      // Remove the last AI response from database
      if (lastAIMessage.id !== undefined) {
        await context.storage.deleteMessage(lastAIMessage.id.toString());
      }

      // Find the user message that prompted it
      const allMessages = await context.storage.getMessages(context.activeConversationId, 50);
      const userMessage = allMessages.reverse().find(m => m.role === 'user' && m.timestamp <= lastAIMessage.timestamp);

      if (!userMessage) {
        lines.push({
          id: `retry-nouser-${timestamp}`, type: 'error',
          content: 'Error: Could not find the original message to retry.',
          timestamp, user: 'claudia'
        });
        return { success: false, lines };
      }

      // Show retry indicator
      lines.push({
        id: `retry-${timestamp}`, type: 'system',
        content: fmt.combine(fmt.spinner(), ' ', fmt.bold('System:'), ' Retrying last response...'),
        timestamp, user: 'claudia'
      });

      // Generate new response
      context.setLoading(true);
      const llmProvider = context.llmManager.getActiveProvider();
      if (!llmProvider) {
        throw new Error('No AI provider available');
      }

      const personality = await context.storage.getActivePersonality();
      const conversationHistory = await context.storage.getMessages(context.activeConversationId, 20);
      
      const systemPrompt = personality?.system_prompt || 'You are a helpful AI assistant.';
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      ];

      const response = await llmProvider.generateResponse(messages);
      
      // Save new response to database
      await context.storage.addMessage({
        conversationId: context.activeConversationId,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString()
      });

      // Parse avatar commands from response
      if (context.avatarController) {
        const { commands } = context.avatarController.parseAvatarCommands(response.content);
        await context.avatarController.executeCommands(commands);
      }

      lines.push({
        id: `retry-response-${timestamp}`, type: 'output',
        content: response.content, timestamp: new Date().toISOString(),
        user: 'claudia', isChatResponse: true
      });

    } catch (error) {
      lines.push({
        id: `retry-error-${timestamp}`, type: 'error',
        content: `Error: Failed to retry - ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp, user: 'claudia'
      });
      return { success: false, lines };
    } finally {
      context.setLoading(false);
    }

    return { success: true, lines };
  }
};

export const continueCommand: Command = {
  name: 'continue',
  description: 'Ask Claudia to continue her last response',
  usage: '/continue',
  aliases: ['more', 'go'],
  requiresAI: true,

  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    if (!context.activeConversationId) {
      lines.push({
        id: `continue-error-${timestamp}`, type: 'error',
        content: 'Error: No active conversation to continue.',
        timestamp, user: 'claudia'
      });
      return { success: false, lines };
    }

    try {
      lines.push({
        id: `continue-${timestamp}`, type: 'system',
        content: fmt.combine(fmt.chat(), ' ', fmt.bold('System:'), ' Asking Claudia to continue...'),
        timestamp, user: 'claudia'
      });

      // Add a user message asking to continue
      await context.storage.addMessage({
        conversationId: context.activeConversationId,
        role: 'user',
        content: 'Please continue.',
        timestamp: new Date().toISOString()
      });

      context.setLoading(true);
      const llmProvider = context.llmManager.getActiveProvider();
      if (!llmProvider) {
        throw new Error('No AI provider available');
      }

      const personality = await context.storage.getActivePersonality();
      const conversationHistory = await context.storage.getMessages(context.activeConversationId, 20);
      
      const systemPrompt = personality?.system_prompt || 'You are a helpful AI assistant.';
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      ];

      const response = await llmProvider.generateResponse(messages);
      
      // Save response to database
      await context.storage.addMessage({
        conversationId: context.activeConversationId,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString()
      });

      // Parse avatar commands from response
      if (context.avatarController) {
        const { commands } = context.avatarController.parseAvatarCommands(response.content);
        await context.avatarController.executeCommands(commands);
      }

      lines.push({
        id: `continue-response-${timestamp}`, type: 'output',
        content: response.content, timestamp: new Date().toISOString(),
        user: 'claudia', isChatResponse: true
      });

    } catch (error) {
      lines.push({
        id: `continue-error-${timestamp}`, type: 'error',
        content: `Error: Failed to continue - ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp, user: 'claudia'
      });
      return { success: false, lines };
    } finally {
      context.setLoading(false);
    }

    return { success: true, lines };
  }
};

export const undoCommand: Command = {
  name: 'undo',
  description: 'Remove the last exchange from conversation',
  usage: '/undo',
  aliases: ['back'],

  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    if (!context.activeConversationId) {
      lines.push({
        id: `undo-error-${timestamp}`, type: 'error',
        content: 'Error: No active conversation to undo.',
        timestamp, user: 'claudia'
      });
      return { success: false, lines };
    }

    try {
      // Get recent messages
      const messages = await context.storage.getMessages(context.activeConversationId, 10);
      
      if (messages.length === 0) {
        lines.push({
          id: `undo-empty-${timestamp}`, type: 'error',
          content: 'Error: No messages to undo.',
          timestamp, user: 'claudia'
        });
        return { success: false, lines };
      }

      // Remove the last message (whether user or assistant)
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.id !== undefined) {
        await context.storage.deleteMessage(lastMessage.id.toString());
      }

      // If it was a user message, also remove the AI response if it exists
      if (lastMessage.role === 'user' && messages.length > 1) {
        const secondToLast = messages[messages.length - 2];
        if (secondToLast.role === 'assistant' && secondToLast.id !== undefined) {
          await context.storage.deleteMessage(secondToLast.id.toString());
          lines.push({
            id: `undo-both-${timestamp}`, type: 'system',
            content: 'System: Removed last exchange (both message and response).',
            timestamp, user: 'claudia'
          });
        } else {
          lines.push({
            id: `undo-user-${timestamp}`, type: 'system',
            content: 'System: Removed last message.',
            timestamp, user: 'claudia'
          });
        }
      } else {
        lines.push({
          id: `undo-single-${timestamp}`, type: 'system',
          content: `System: Removed last ${lastMessage.role === 'user' ? 'message' : 'response'}.`,
          timestamp, user: 'claudia'
        });
      }

    } catch (error) {
      lines.push({
        id: `undo-error-${timestamp}`, type: 'error',
        content: `Error: Failed to undo - ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp, user: 'claudia'
      });
      return { success: false, lines };
    }

    return { success: true, lines };
  }
};

export const contextCommand: Command = {
  name: 'context',
  description: 'Show what Claudia remembers about the current conversation',
  usage: '/context [clear]',
  aliases: ['memory', 'remember'],

  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    if (args.length > 0 && args[0].toLowerCase() === 'clear') {
      // Clear conversation context (but keep terminal)
      if (!context.activeConversationId) {
        lines.push({
          id: `context-clear-error-${timestamp}`, type: 'error',
          content: 'Error: No active conversation to clear.',
          timestamp, user: 'claudia'
        });
        return { success: false, lines };
      }

      try {
        // Delete all messages in current conversation
        const conversationMessages = await context.storage.getMessages(context.activeConversationId, 1000);
        for (const message of conversationMessages) {
          if (message.id !== undefined) {
            await context.storage.deleteMessage(message.id.toString());
          }
        }

        lines.push({
          id: `context-cleared-${timestamp}`, type: 'system',
          content: 'System: Conversation context cleared. Claudia has no memory of our previous chat.',
          timestamp, user: 'claudia'
        });

      } catch (error) {
        lines.push({
          id: `context-clear-error-${timestamp}`, type: 'error',
          content: `Error: Failed to clear context - ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp, user: 'claudia'
        });
        return { success: false, lines };
      }

      return { success: true, lines };
    }

    // Show current context
    if (!context.activeConversationId) {
      lines.push({
        id: `context-none-${timestamp}`, type: 'output',
        content: 'Context: No active conversation. Claudia has no memory of previous interactions.',
        timestamp, user: 'claudia'
      });
      return { success: true, lines };
    }

    try {
      const messages = await context.storage.getMessages(context.activeConversationId, 50);
      const conversation = await context.storage.getConversation(context.activeConversationId);
      
      lines.push({
        id: `context-header-${timestamp}`, type: 'output',
        content: `Context: Current conversation "${conversation?.title || 'Untitled'}"`,
        timestamp, user: 'claudia'
      });

      if (messages.length === 0) {
        lines.push({
          id: `context-empty-${timestamp}`, type: 'output',
          content: '  Memory: Empty - this is a fresh conversation.',
          timestamp, user: 'claudia'
        });
      } else {
        const userMessages = messages.filter(m => m.role === 'user').length;
        const startTime = new Date(messages[0]?.timestamp || '').toLocaleString();
        
        lines.push({
          id: `context-stats-${timestamp}`, type: 'output',
          content: `  Memory: ${userMessages} exchanges, started ${startTime}`,
          timestamp, user: 'claudia'
        });

        // Show recent topics (first few words of recent user messages)
        const recentUserMessages = messages.filter(m => m.role === 'user').slice(-3);
        if (recentUserMessages.length > 0) {
          const topics = recentUserMessages.map(m => 
            m.content.length > 40 ? m.content.substring(0, 40) + '...' : m.content
          );
          lines.push({
            id: `context-topics-${timestamp}`, type: 'output',
            content: `  Recent topics: ${topics.join(' | ')}`,
            timestamp, user: 'claudia'
          });
        }
      }

    } catch (error) {
      lines.push({
        id: `context-error-${timestamp}`, type: 'error',
        content: `Error: Failed to show context - ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp, user: 'claudia'
      });
      return { success: false, lines };
    }

    return { success: true, lines };
  }
};