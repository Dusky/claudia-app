import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import type { LLMMessage } from '../../providers/llm/types';
import { config } from '../../config/env'; // Import app config

export const askCommand: Command = {
  name: 'ask',
  description: 'Ask the AI a question (uses current conversation context)',
  usage: '/ask <question>',
  aliases: ['ai', 'question'],
  requiresAI: true,
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = []; // For UI updates
    const timestamp = new Date().toISOString();
    
    if (args.length === 0) {
      lines.push({
        id: `ask-err-${timestamp}`,
        type: 'error',
        content: '❌ Please provide a question. Usage: /ask <question>',
        timestamp, user: 'claudia'
      });
      // This error line is for UI only, not saved to DB as it's a command syntax error.
      return { success: false, lines };
    }
    
    const question = args.join(' ');
    // The user's full "/ask question" line is already added to UI and DB by App.tsx.
    // The 'question' part was also saved as a user message by App.tsx.
    // Now, process the AI interaction.

    const provider = context.llmManager.getActiveProvider();
    if (!provider) {
      lines.push({
        id: `ask-err-noprovider-${timestamp}`, type: 'error',
        content: '❌ No AI provider configured for /ask.', timestamp, user: 'claudia'
      });
      if (context.activeConversationId) {
        await context.storage.addMessage({
            conversationId: context.activeConversationId, role: 'assistant',
            content: 'Error: No AI provider configured for /ask.', timestamp
        });
      }
      return { success: false, lines };
    }

    try {
      context.setLoading(true);
      
      const activePersonality = await context.storage.getActivePersonality();
      const systemPrompt = activePersonality?.system_prompt || 
        `You are Claudia, a helpful AI terminal companion.`;

      const avatarInstructions = `

Avatar Commands (OPTIONAL - only use when it feels natural):
- Use [AVATAR:expression=happy] to show emotions (happy, curious, focused, thinking, surprised, confused, excited, confident, mischievous, sleepy, shocked)
- Use [AVATAR:action=wave] for actions (idle, type, search, read, wave, nod, shrug, point, think, work)  
- Use [AVATAR:pose=standing] for poses (standing, sitting, leaning, crossed-arms, hands-on-hips, casual)
- Use [AVATAR:show=true] or [AVATAR:hide=true] to control visibility
- Combine multiple attributes: [AVATAR:expression=excited,action=wave,pose=standing]

IMPORTANT: Avatar commands are completely optional. Only use them when they would naturally enhance your response. Many responses work perfectly without any avatar commands at all. Focus primarily on your conversational response - avatar commands should feel like a natural addition, not a requirement.`;
      
      const fullSystemPrompt = systemPrompt + avatarInstructions;
      const llmMessages: LLMMessage[] = [{ role: 'system', content: fullSystemPrompt }];

      if (context.activeConversationId && config.conversationHistoryLength > 0) {
        // Fetch history. App.tsx already saved the current user's question as a message.
        // So, getMessages will include it if historyLength is large enough.
        const history = await context.storage.getMessages(
          context.activeConversationId,
          config.conversationHistoryLength 
        );
        history.forEach(msg => llmMessages.push({ role: msg.role, content: msg.content }));
      } else {
        // If no history or history length is 0, just add the current question.
        // This is already covered if activeConversationId is present and history is fetched.
        // If no activeConversationId, this command shouldn't ideally run, but as a fallback:
        llmMessages.push({ role: 'user', content: question });
      }
      
      const response = await provider.generateResponse(llmMessages, {
        temperature: 0.8,
        maxTokens: 500,
      });
      
      const { cleanText, commands: avatarCmds } = context.avatarController.parseAvatarCommands(response.content);
      
      if (avatarCmds.length > 0) {
        await context.avatarController.executeCommands(avatarCmds);
      }
      
      const responseTimestamp = new Date().toISOString();
      const responseLinesForUI = cleanText.split('\n').map((lineContent, index) => ({
        id: `ask-resp-${responseTimestamp}-${index}`, type: 'output' as const,
        content: lineContent, timestamp: responseTimestamp, user: 'claudia' as const
      }));
      
      lines.push(...responseLinesForUI); // For UI update via CommandRegistry

      if (context.activeConversationId) {
        await context.storage.addMessage({
          conversationId: context.activeConversationId, role: 'assistant',
          content: cleanText, timestamp: responseTimestamp,
        });
      }
      
      return { success: true, lines };
      
    } catch (error) {
      const errorContent = `❌ AI Error (ask): ${error instanceof Error ? error.message : 'Unknown error'}`;
      lines.push({
        id: `ask-err-runtime-${timestamp}`, type: 'error', content: errorContent,
        timestamp, user: 'claudia'
      });
      if (context.activeConversationId) {
        await context.storage.addMessage({
            conversationId: context.activeConversationId, role: 'assistant',
            content: `Error processing /ask command: ${errorContent}`, timestamp
        });
      }
      return { success: false, lines };
    } finally {
      context.setLoading(false);
    }
  }
};

// The handleAIMessage function is removed as its logic is now primarily within CommandRegistryImpl.execute
// for non-command inputs.
