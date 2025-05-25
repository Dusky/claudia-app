import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import type { AvatarAction, AvatarExpression, AvatarPosition, AvatarPose } from '../../avatar/types';

const availableExpressions: AvatarExpression[] = ['neutral', 'happy', 'curious', 'focused', 'thinking', 'surprised', 'confused', 'excited', 'confident', 'mischievous', 'sleepy', 'shocked'];
const availablePositions: AvatarPosition[] = ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'beside-text', 'overlay-left', 'overlay-right', 'floating', 'peeking'];
const availableActions: AvatarAction[] = ['idle', 'type', 'search', 'read', 'wave', 'nod', 'shrug', 'point', 'think', 'work'];
const availablePoses: AvatarPose[] = ['standing', 'sitting', 'leaning', 'crossed-arms', 'hands-on-hips', 'casual'];


export const avatarCommand: Command = {
  name: 'avatar',
  description: 'Control avatar appearance and behavior',
  usage: '/avatar <show|hide|expression|position|action|pose> [value]',
  aliases: ['av'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();
    
    if (args.length === 0) {
      const state = context.avatarController.getState();
      
      lines.push({
        id: `avatar-status-${timestamp}-header`,
        type: 'system',
        content: 'Avatar Status:', // Emoji removed
        timestamp, user: 'claudia'
      });
      
      lines.push({
        id: `avatar-status-${timestamp}-visible`,
        type: 'output',
        content: `  Visible:     ${state.visible ? 'Yes' : 'No'}`,
        timestamp, user: 'claudia'
      });
      
      lines.push({
        id: `avatar-status-${timestamp}-position`,
        type: 'output',
        content: `  Position:    ${state.position}`,
        timestamp, user: 'claudia'
      });
      
      lines.push({
        id: `avatar-status-${timestamp}-expression`,
        type: 'output',
        content: `  Expression:  ${state.expression}`,
        timestamp, user: 'claudia'
      });
      
      lines.push({
        id: `avatar-status-${timestamp}-pose`,
        type: 'output',
        content: `  Pose:        ${state.pose}`,
        timestamp, user: 'claudia'
      });
      
      lines.push({
        id: `avatar-status-${timestamp}-action`,
        type: 'output',
        content: `  Action:      ${state.action}`,
        timestamp, user: 'claudia'
      });
      
      return { success: true, lines };
    }
    
    const subCommand = args[0].toLowerCase();
    const value = args[1]?.toLowerCase();
    
    try {
      switch (subCommand) {
        case 'show':
          await context.avatarController.show();
          lines.push({
            id: `avatar-show-${timestamp}`,
            type: 'output',
            content: 'Info: Avatar is now visible!', // Emoji removed
            timestamp, user: 'claudia'
          });
          break;
          
        case 'hide':
          await context.avatarController.hide();
          lines.push({
            id: `avatar-hide-${timestamp}`,
            type: 'output',
            content: 'Info: Avatar is now hidden.', // Emoji removed
            timestamp, user: 'claudia'
          });
          break;
          
        case 'expression':
        case 'expr':
          if (!value) {
            lines.push({
              id: `avatar-expr-err-${timestamp}`, type: 'error',
              content: `Error: Expression needed. Usage: /avatar expression <value>`, timestamp, user: 'claudia' // Emoji removed
            });
            lines.push({
              id: `avatar-expr-opts-${timestamp}`, type: 'output',
              content: `   Available: ${availableExpressions.join(', ')}`, timestamp, user: 'claudia'
            });
          } else if (!availableExpressions.includes(value as AvatarExpression)) {
            lines.push({
              id: `avatar-expr-invalid-${timestamp}`, type: 'error',
              content: `Error: Invalid expression: "${value}".`, timestamp, user: 'claudia' // Emoji removed
            });
            lines.push({
              id: `avatar-expr-invalidopts-${timestamp}`, type: 'output',
              content: `   Available: ${availableExpressions.join(', ')}`, timestamp, user: 'claudia'
            });
          } else {
            await context.avatarController.executeCommands([{ expression: value as AvatarExpression }]);
            lines.push({
              id: `avatar-expr-succ-${timestamp}`, type: 'output',
              content: `Info: Avatar expression set to: ${value}`, timestamp, user: 'claudia' // Emoji removed
            });
          }
          break;
          
        case 'position':
        case 'pos':
          if (!value) {
            lines.push({
              id: `avatar-pos-err-${timestamp}`, type: 'error',
              content: `Error: Position needed. Usage: /avatar position <value>`, timestamp, user: 'claudia' // Emoji removed
            });
            lines.push({
              id: `avatar-pos-opts-${timestamp}`, type: 'output',
              content: `   Available: ${availablePositions.join(', ')}`, timestamp, user: 'claudia'
            });
          } else if (!availablePositions.includes(value as AvatarPosition)) {
            lines.push({
              id: `avatar-pos-invalid-${timestamp}`, type: 'error',
              content: `Error: Invalid position: "${value}".`, timestamp, user: 'claudia' // Emoji removed
            });
            lines.push({
              id: `avatar-pos-invalidopts-${timestamp}`, type: 'output',
              content: `   Available: ${availablePositions.join(', ')}`, timestamp, user: 'claudia'
            });
          } else {
            await context.avatarController.executeCommands([{ position: value as AvatarPosition }]);
            lines.push({
              id: `avatar-pos-succ-${timestamp}`, type: 'output',
              content: `Info: Avatar position set to: ${value}`, timestamp, user: 'claudia' // Emoji removed
            });
          }
          break;
          
        case 'action':
          if (!value) {
            lines.push({
              id: `avatar-act-err-${timestamp}`, type: 'error',
              content: `Error: Action needed. Usage: /avatar action <value>`, timestamp, user: 'claudia' // Emoji removed
            });
            lines.push({
              id: `avatar-act-opts-${timestamp}`, type: 'output',
              content: `   Available: ${availableActions.join(', ')}`, timestamp, user: 'claudia'
            });
          } else if (!availableActions.includes(value as AvatarAction)) {
            lines.push({
              id: `avatar-act-invalid-${timestamp}`, type: 'error',
              content: `Error: Invalid action: "${value}".`, timestamp, user: 'claudia' // Emoji removed
            });
            lines.push({
              id: `avatar-act-invalidopts-${timestamp}`, type: 'output',
              content: `   Available: ${availableActions.join(', ')}`, timestamp, user: 'claudia'
            });
          } else {
            await context.avatarController.executeCommands([{ action: value as AvatarAction }]);
            lines.push({
              id: `avatar-act-succ-${timestamp}`, type: 'output',
              content: `Info: Avatar action set to: ${value}`, timestamp, user: 'claudia' // Emoji removed
            });
          }
          break;
          
        case 'pose':
          if (!value) {
            lines.push({
              id: `avatar-pose-err-${timestamp}`, type: 'error',
              content: `Error: Pose needed. Usage: /avatar pose <value>`, timestamp, user: 'claudia' // Emoji removed
            });
            lines.push({
              id: `avatar-pose-opts-${timestamp}`, type: 'output',
              content: `   Available: ${availablePoses.join(', ')}`, timestamp, user: 'claudia'
            });
          } else if (!availablePoses.includes(value as AvatarPose)) {
            lines.push({
              id: `avatar-pose-invalid-${timestamp}`, type: 'error',
              content: `Error: Invalid pose: "${value}".`, timestamp, user: 'claudia' // Emoji removed
            });
            lines.push({
              id: `avatar-pose-invalidopts-${timestamp}`, type: 'output',
              content: `   Available: ${availablePoses.join(', ')}`, timestamp, user: 'claudia'
            });
          } else {
            await context.avatarController.executeCommands([{ pose: value as AvatarPose }]);
            lines.push({
              id: `avatar-pose-succ-${timestamp}`, type: 'output',
              content: `Info: Avatar pose set to: ${value}`, timestamp, user: 'claudia' // Emoji removed
            });
          }
          break;
          
        default:
          lines.push({
            id: `avatar-unknown-${timestamp}`,
            type: 'error',
            content: `Error: Unknown avatar command: ${subCommand}. Use: show, hide, expression, position, action, pose.`, // Emoji removed
            timestamp, user: 'claudia'
          });
      }
      
      return { success: true, lines };
      
    } catch (error) {
      lines.push({
        id: `avatar-error-${timestamp}`,
        type: 'error',
        content: `Error: Avatar Error: ${error instanceof Error ? error.message : 'Unknown error'}`, // Emoji removed
        timestamp, user: 'claudia'
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
    const timestamp = new Date().toISOString();
    
    if (args.length === 0) {
      lines.push({
        id: `imagine-err-${timestamp}`,
        type: 'error',
        content: 'Error: Please provide a description. Usage: /imagine <description>', // Emoji removed
        timestamp, user: 'claudia'
      });
      
      return { success: false, lines };
    }
    
    const description = args.join(' ');
    const provider = context.imageManager.getActiveProvider();
    
    if (!provider) {
      lines.push({
        id: `imagine-noprovider-${timestamp}`,
        type: 'error',
        content: 'Error: No image generation provider is configured.', // Emoji removed
        timestamp, user: 'claudia'
      });
      
      return { success: false, lines };
    }
    
    try {
      context.setLoading(true);
      
      lines.push({
        id: `imagine-start-${timestamp}`,
        type: 'output',
        content: `Image: Generating custom avatar: "${description}"... This might take a moment.`,
        timestamp, user: 'claudia'
      });
      
      // Use the new prompt composer system for enhanced prompts
      const promptComposer = context.avatarController.getPromptComposer();
      const avatarState = context.avatarController.getState();
      
      // Generate base prompt components for current avatar state
      let promptComponents = promptComposer.generatePromptComponents({
        expression: avatarState.expression,
        pose: avatarState.pose,
        action: avatarState.action,
        style: 'cyberpunk anime girl',
        background: 'transparent',
        lighting: 'neon',
        quality: 'standard'
      });
      
      // Apply personality modifications
      try {
        const activePersonality = await context.storage.getActivePersonality();
        if (activePersonality) {
          const modContext = {
            personality: {
              name: activePersonality.name,
              systemPrompt: activePersonality.system_prompt
            },
            conversationContext: `Custom avatar request: ${description}`
          };
          
          promptComponents = await promptComposer.applyPersonalityModifications(promptComponents, modContext);
        }
      } catch (error) {
        console.warn('Could not apply personality modifications:', error);
      }
      
      // Modify character component to include user's description
      promptComponents.character = `cyberpunk anime girl avatar, ${description}, digital art character`;
      
      // Compile the enhanced prompt
      const finalPrompt = promptComposer.compilePrompt(promptComponents);
      const negativePrompt = promptComposer.getNegativePrompt(promptComponents);
      
      console.log('Generating custom avatar with enhanced prompt:', {
        userDescription: description,
        finalPrompt,
        negativePrompt
      });
      
      const response = await provider.generateImage({
        prompt: finalPrompt,
        negativePrompt,
        width: 512,
        height: 512,
        steps: 20,
        guidance: 7.5
      });
      
      // Update avatar with the new image
      context.avatarController.setState({
        ...avatarState,
        imageUrl: response.imageUrl,
        visible: true
      });
      
      lines.push({
        id: `imagine-success-${timestamp}`,
        type: 'output',
        content: 'Info: Custom avatar generated successfully! Your new avatar is now visible.',
        timestamp, user: 'claudia'
      });
      
      return { success: true, lines };
      
    } catch (error) {
      lines.push({
        id: `imagine-apierr-${timestamp}`,
        type: 'error',
        content: `Error: Image Generation Error: ${error instanceof Error ? error.message : 'Unknown error'}`, // Emoji removed
        timestamp, user: 'claudia'
      });
      
      return { success: false, lines };
    } finally {
      context.setLoading(false);
    }
  }
};
