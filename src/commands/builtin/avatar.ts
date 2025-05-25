import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

export const avatarCommand: Command = {
  name: 'avatar',
  description: 'Control avatar appearance and behavior',
  usage: '/avatar <show|hide|expression|position|action|pose> [value]',
  aliases: ['av'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    
    if (args.length === 0) {
      const state = context.avatarController.getState();
      
      lines.push({
        id: `avatar-${Date.now()}-1`,
        type: 'output',
        content: '🤖 AVATAR STATUS:',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `avatar-${Date.now()}-2`,
        type: 'output',
        content: `Visible: ${state.visible ? '✅' : '❌'}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `avatar-${Date.now()}-3`,
        type: 'output',
        content: `Position: ${state.position}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `avatar-${Date.now()}-4`,
        type: 'output',
        content: `Expression: ${state.expression}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `avatar-${Date.now()}-5`,
        type: 'output',
        content: `Pose: ${state.pose}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `avatar-${Date.now()}-6`,
        type: 'output',
        content: `Action: ${state.action}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      return { success: true, lines };
    }
    
    const subCommand = args[0].toLowerCase();
    
    try {
      switch (subCommand) {
        case 'show':
          await context.avatarController.show();
          lines.push({
            id: `avatar-${Date.now()}`,
            type: 'output',
            content: '✨ Avatar is now visible!',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
          break;
          
        case 'hide':
          await context.avatarController.hide();
          lines.push({
            id: `avatar-${Date.now()}`,
            type: 'output',
            content: '👻 Avatar is now hidden.',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
          break;
          
        case 'expression':
        case 'expr':
          if (args.length < 2) {
            lines.push({
              id: `avatar-${Date.now()}`,
              type: 'error',
              content: '❌ Please specify an expression: happy, curious, focused, thinking, surprised, confused, excited, confident, mischievous, sleepy, shocked',
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
          } else {
            const expression = args[1].toLowerCase();
            await context.avatarController.executeCommands([{ expression: expression as any }]);
            lines.push({
              id: `avatar-${Date.now()}`,
              type: 'output',
              content: `😊 Avatar expression changed to: ${expression}`,
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
          }
          break;
          
        case 'position':
        case 'pos':
          if (args.length < 2) {
            lines.push({
              id: `avatar-${Date.now()}`,
              type: 'error',
              content: '❌ Please specify a position: center, top-left, top-right, bottom-left, bottom-right, beside-text, overlay-left, overlay-right, floating, peeking',
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
          } else {
            const position = args[1].toLowerCase();
            await context.avatarController.executeCommands([{ position: position as any }]);
            lines.push({
              id: `avatar-${Date.now()}`,
              type: 'output',
              content: `📍 Avatar position changed to: ${position}`,
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
          }
          break;
          
        case 'action':
          if (args.length < 2) {
            lines.push({
              id: `avatar-${Date.now()}`,
              type: 'error',
              content: '❌ Please specify an action: idle, type, search, read, wave, nod, shrug, point, think, work',
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
          } else {
            const action = args[1].toLowerCase();
            await context.avatarController.executeCommands([{ action: action as any }]);
            lines.push({
              id: `avatar-${Date.now()}`,
              type: 'output',
              content: `⚡ Avatar action changed to: ${action}`,
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
          }
          break;
          
        case 'pose':
          if (args.length < 2) {
            lines.push({
              id: `avatar-${Date.now()}`,
              type: 'error',
              content: '❌ Please specify a pose: standing, sitting, leaning, crossed-arms, hands-on-hips, casual',
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
          } else {
            const pose = args[1].toLowerCase();
            await context.avatarController.executeCommands([{ pose: pose as any }]);
            lines.push({
              id: `avatar-${Date.now()}`,
              type: 'output',
              content: `🧍 Avatar pose changed to: ${pose}`,
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
          }
          break;
          
        default:
          lines.push({
            id: `avatar-${Date.now()}`,
            type: 'error',
            content: `❌ Unknown avatar command: ${subCommand}. Use: show, hide, expression, position, action, pose`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
      }
      
      return { success: true, lines };
      
    } catch (error) {
      lines.push({
        id: `avatar-${Date.now()}`,
        type: 'error',
        content: `❌ Avatar Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      return { success: false, lines };
    }
  }
};

export const imagineCommand: Command = {
  name: 'imagine',
  description: 'Generate a custom avatar image',
  usage: '/imagine <description>',
  aliases: ['img', 'generate'],
  requiresImageGen: true,
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    
    if (args.length === 0) {
      lines.push({
        id: `imagine-${Date.now()}`,
        type: 'error',
        content: '❌ Please provide a description. Usage: /imagine <description>',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      return { success: false, lines };
    }
    
    const description = args.join(' ');
    const provider = context.imageManager.getActiveProvider();
    
    if (!provider) {
      lines.push({
        id: `imagine-${Date.now()}`,
        type: 'error',
        content: '❌ No image generation provider is configured.',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      return { success: false, lines };
    }
    
    try {
      context.setLoading(true);
      
      lines.push({
        id: `imagine-${Date.now()}-start`,
        type: 'output',
        content: `🎨 Generating avatar image: "${description}"...`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      // Add context to make it cyberpunk and avatar-appropriate
      const enhancedPrompt = `cyberpunk anime girl avatar, ${description}, digital art, high quality, neon lighting, futuristic background, transparent background, PNG`;
      
      const response = await provider.generateImage({
        prompt: enhancedPrompt,
        width: 512,
        height: 512,
        steps: 20,
        guidance: 7.5
      });
      
      // Update avatar with the new image
      const avatarState = context.avatarController.getState();
      context.avatarController.setState({
        ...avatarState,
        imageUrl: response.imageUrl,
        visible: true
      });
      
      lines.push({
        id: `imagine-${Date.now()}-success`,
        type: 'output',
        content: '✨ Avatar image generated successfully! Your new avatar is now visible.',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      return { success: true, lines };
      
    } catch (error) {
      lines.push({
        id: `imagine-${Date.now()}`,
        type: 'error',
        content: `❌ Image Generation Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      return { success: false, lines };
    } finally {
      context.setLoading(false);
    }
  }
};
