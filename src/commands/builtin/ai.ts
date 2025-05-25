import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import type { LLMMessage } from '../../providers/llm/types';

export const askCommand: Command = {
  name: 'ask',
  description: 'Ask the AI a question',
  usage: '/ask <question>',
  aliases: ['ai', 'question'],
  requiresAI: true,
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    
    if (args.length === 0) {
      lines.push({
        id: `ask-${Date.now()}`,
        type: 'error',
        content: '❌ Please provide a question. Usage: /ask <question>',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      return { success: false, lines };
    }
    
    const question = args.join(' ');
    const provider = context.llmManager.getActiveProvider();
    
    if (!provider) {
      lines.push({
        id: `ask-${Date.now()}`,
        type: 'error',
        content: '❌ No AI provider is configured.',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      return { success: false, lines };
    }
    
    try {
      context.setLoading(true);
      
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: question
        }
      ];
      
      const response = await provider.generateResponse(messages);
      
      // Parse avatar commands from the response
      const { cleanText, commands } = context.avatarController.parseAvatarCommands(response.content);
      
      // Execute avatar commands
      if (commands.length > 0) {
        await context.avatarController.executeCommands(commands);
      }
      
      // Add AI response to terminal
      const responseLines = cleanText.split('\n').map((line, index) => ({
        id: `ask-response-${Date.now()}-${index}`,
        type: 'output' as const,
        content: line,
        timestamp: new Date().toISOString(),
        user: 'claudia' as const
      }));
      
      lines.push(...responseLines);
      
      return { success: true, lines };
      
    } catch (error) {
      lines.push({
        id: `ask-${Date.now()}`,
        type: 'error',
        content: `❌ AI Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      return { success: false, lines };
    } finally {
      context.setLoading(false);
    }
  }
};

// This will handle direct messages to AI (non-commands)
export async function handleAIMessage(
  message: string, 
  context: CommandContext
): Promise<CommandResult> {
  const lines: TerminalLine[] = [];
  const provider = context.llmManager.getActiveProvider();
  
  if (!provider) {
    lines.push({
      id: `ai-${Date.now()}`,
      type: 'error',
      content: '❌ No AI provider configured. Please set up an API key.',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    
    return { success: false, lines };
  }
  
  try {
    context.setLoading(true);
    
    // Get active personality or fallback to default
    const activePersonality = await context.storage.getActivePersonality();
    
    // Create system prompt using personality or fallback
    let systemPrompt = '';
    if (activePersonality && activePersonality.system_prompt) {
      systemPrompt = activePersonality.system_prompt;
    } else {
      // Fallback system prompt if no personality is set
      systemPrompt = `You are Claudia, a helpful AI terminal companion. You are friendly, knowledgeable, and always ready to assist with questions and tasks.`;
    }
    
    // Add avatar commands instructions to any personality
    const avatarInstructions = `

Avatar Commands (use these to enhance your responses):
- Use [AVATAR:expression=happy] to show emotions (happy, curious, focused, thinking, surprised, confused, excited, confident, mischievous, sleepy, shocked)
- Use [AVATAR:position=center] to change position (center, top-left, top-right, bottom-left, bottom-right, beside-text, overlay-left, overlay-right, floating, peeking)
- Use [AVATAR:action=wave] for actions (idle, type, search, read, wave, nod, shrug, point, think, work)
- Use [AVATAR:pose=standing] for poses (standing, sitting, leaning, crossed-arms, hands-on-hips, casual)
- Use [AVATAR:show=true] or [AVATAR:hide=true] to control visibility
- Combine multiple attributes: [AVATAR:expression=excited,action=wave,position=center]

Respond naturally to the user's message while optionally incorporating avatar commands to enhance the interaction.`;
    
    const fullSystemPrompt = systemPrompt + avatarInstructions;
    
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: fullSystemPrompt
      },
      {
        role: 'user',
        content: message
      }
    ];
    
    const response = await provider.generateResponse(messages, {
      temperature: 0.8,
      maxTokens: 500
    });
    
    // Parse avatar commands from the response
    const { cleanText, commands } = context.avatarController.parseAvatarCommands(response.content);
    
    // Execute avatar commands
    if (commands.length > 0) {
      await context.avatarController.executeCommands(commands);
    }
    
    // Add AI response to terminal
    const responseLines = cleanText.split('\n').map((line, index) => ({
      id: `ai-response-${Date.now()}-${index}`,
      type: 'output' as const,
      content: line,
      timestamp: new Date().toISOString(),
      user: 'claudia' as const
    }));
    
    lines.push(...responseLines);
    
    return { success: true, lines };
    
  } catch (error) {
    lines.push({
      id: `ai-${Date.now()}`,
      type: 'error',
      content: `❌ AI Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    
    return { success: false, lines };
  } finally {
    context.setLoading(false);
  }
}