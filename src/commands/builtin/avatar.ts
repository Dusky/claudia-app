import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import type { AvatarAction, AvatarExpression, AvatarPosition, AvatarPose } from '../../avatar/types';
import { imageStorage } from '../../utils/imageStorage';

const availableExpressions: AvatarExpression[] = ['neutral', 'happy', 'curious', 'focused', 'thinking', 'surprised', 'confused', 'excited', 'confident', 'mischievous', 'sleepy', 'shocked'];
const availablePositions: AvatarPosition[] = [
  'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 
  'center-left', 'center-right', 'top-center', 'bottom-center',
  'beside-text', 'overlay-left', 'overlay-right', 'floating', 'peeking',
  'floating-left', 'floating-right', 'peek-left', 'peek-right', 
  'peek-top', 'peek-bottom', 'center-overlay', 'custom'
];
const availableActions: AvatarAction[] = ['idle', 'type', 'search', 'read', 'wave', 'nod', 'shrug', 'point', 'think', 'work'];
const availablePoses: AvatarPose[] = ['standing', 'sitting', 'leaning', 'crossed-arms', 'hands-on-hips', 'casual'];


export const avatarCommand: Command = {
  name: 'avatar',
  description: 'Configure visual interface subsystem',
  usage: '/avatar <show|hide|expression|position|action|pose|scale|prompt> [value]',
  aliases: ['av'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();
    
    if (args.length === 0) {
      const state = context.avatarController.getState();
      
      lines.push({
        id: `avatar-status-${timestamp}-header`,
        type: 'system',
        content: 'Visual Interface Subsystem Status:',
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
        content: `  Position:    bottom-right (fixed panel)`,
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
      
      lines.push({
        id: `avatar-status-${timestamp}-scale`,
        type: 'output',
        content: `  Scale:       ${state.scale}x`,
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
          
        case 'scale':
        case 'size':
          if (!value) {
            lines.push({
              id: `avatar-scale-err-${timestamp}`, type: 'error',
              content: `Error: Scale value needed. Usage: /avatar scale <value>`, timestamp, user: 'claudia'
            });
            lines.push({
              id: `avatar-scale-opts-${timestamp}`, type: 'output',
              content: `   Range: 0.5 to 2.0 (1.0 = normal size)`, timestamp, user: 'claudia'
            });
          } else {
            const scaleValue = parseFloat(value);
            if (isNaN(scaleValue) || scaleValue < 0.5 || scaleValue > 2.0) {
              lines.push({
                id: `avatar-scale-invalid-${timestamp}`, type: 'error',
                content: `Error: Invalid scale value: "${value}". Must be between 0.5 and 2.0.`, timestamp, user: 'claudia'
              });
            } else {
              await context.avatarController.executeCommands([{ scale: scaleValue }]);
              lines.push({
                id: `avatar-scale-succ-${timestamp}`, type: 'output',
                content: `Info: Avatar scale set to: ${scaleValue}x`, timestamp, user: 'claudia'
              });
            }
          }
          break;

        case 'move':
        case 'place':
          if (!value) {
            lines.push({
              id: `avatar-move-err-${timestamp}`, type: 'error',
              content: `Error: Coordinates needed. Usage: /avatar move <x,y> (percentages 0-100)`, timestamp, user: 'claudia'
            });
            lines.push({
              id: `avatar-move-example-${timestamp}`, type: 'output',
              content: `   Examples: /avatar move 50,20 (center horizontally, 20% from top)`, timestamp, user: 'claudia'
            });
          } else {
            const coords = value.split(',').map(s => parseFloat(s.trim()));
            if (coords.length !== 2 || coords.some(isNaN) || coords.some(c => c < 0 || c > 100)) {
              lines.push({
                id: `avatar-move-invalid-${timestamp}`, type: 'error',
                content: `Error: Invalid coordinates: "${value}". Use format "x,y" with values 0-100.`, timestamp, user: 'claudia'
              });
            } else {
              await context.avatarController.executeCommands([{ 
                position: 'custom' as AvatarPosition, 
                customX: coords[0], 
                customY: coords[1] 
              }]);
              lines.push({
                id: `avatar-move-succ-${timestamp}`, type: 'output',
                content: `Info: Avatar moved to position (${coords[0]}%, ${coords[1]}%)`, timestamp, user: 'claudia'
              });
            }
          }
          break;
          
        case 'generate':
          lines.push({
            id: `avatar-generate-start-${timestamp}`,
            type: 'output',
            content: 'Info: Generating new avatar image based on current state...',
            timestamp, user: 'claudia'
          });
          
          await context.avatarController.generateAvatarWithContext('Manual generation requested');
          
          lines.push({
            id: `avatar-generate-done-${timestamp}`,
            type: 'output',
            content: 'Info: Avatar generation complete!',
            timestamp, user: 'claudia'
          });
          break;

        case 'test': {
          // Test the new AI-controlled photo description system
          const testDescription = value || 'me sitting comfortably with a warm smile, wearing my favorite sundress, cozy lighting in my digital nook';
          
          lines.push({
            id: `avatar-test-start-${timestamp}`,
            type: 'output',
            content: `Info: Testing AI photo generation: "${testDescription}"`,
            timestamp, user: 'claudia'
          });
          
          await context.avatarController.generateAvatarFromDescription(testDescription, 'center');
          
          lines.push({
            id: `avatar-test-done-${timestamp}`,
            type: 'output',
            content: 'Info: AI photo generation test complete!',
            timestamp, user: 'claudia'
          });
          break;
        }

        case 'prompt': {
          // Manage custom avatar prompt
          if (!value) {
            const currentPrompt = context.avatarController.getCustomAvatarPrompt();
            if (currentPrompt) {
              lines.push({
                id: `avatar-prompt-current-${timestamp}`,
                type: 'output',
                content: `Current custom avatar prompt:`,
                timestamp, user: 'claudia'
              });
              lines.push({
                id: `avatar-prompt-value-${timestamp}`,
                type: 'output',
                content: `"${currentPrompt}"`,
                timestamp, user: 'claudia'
              });
            } else {
              lines.push({
                id: `avatar-prompt-none-${timestamp}`,
                type: 'output',
                content: `No custom avatar prompt set. Using default Claudia description.`,
                timestamp, user: 'claudia'
              });
            }
            lines.push({
              id: `avatar-prompt-usage-${timestamp}`,
              type: 'output',
              content: `Usage: /avatar prompt set "<description>" or /avatar prompt clear`,
              timestamp, user: 'claudia'
            });
          } else if (value === 'clear' || value === 'reset') {
            await context.avatarController.setCustomAvatarPrompt(null);
            lines.push({
              id: `avatar-prompt-cleared-${timestamp}`,
              type: 'output',
              content: `Custom avatar prompt cleared. Using default Claudia description.`,
              timestamp, user: 'claudia'
            });
          } else if (value === 'set') {
            const promptText = args.slice(2).join(' ');
            if (!promptText) {
              lines.push({
                id: `avatar-prompt-setErr-${timestamp}`,
                type: 'error',
                content: `Error: Please provide a description. Usage: /avatar prompt set "<description>"`,
                timestamp, user: 'claudia'
              });
            } else {
              await context.avatarController.setCustomAvatarPrompt(promptText);
              lines.push({
                id: `avatar-prompt-set-${timestamp}`,
                type: 'output',
                content: `Custom avatar prompt set: "${promptText}"`,
                timestamp, user: 'claudia'
              });
              lines.push({
                id: `avatar-prompt-regen-${timestamp}`,
                type: 'output',
                content: `New avatar images will use this custom description.`,
                timestamp, user: 'claudia'
              });
            }
          } else {
            lines.push({
              id: `avatar-prompt-invalid-${timestamp}`,
              type: 'error',
              content: `Error: Invalid prompt command: "${value}". Use: set, clear, or no argument to view.`,
              timestamp, user: 'claudia'
            });
          }
          break;
        }

        default:
          lines.push({
            id: `avatar-unknown-${timestamp}`,
            type: 'error',
            content: `Error: Unknown avatar command: ${subCommand}. Use: show, hide, expression, position, action, pose, scale, move, generate, test, prompt.`, // Emoji removed
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
        style: 'realistic digital art, warm cozy style',
        background: 'none',
        lighting: 'soft',
        quality: 'high'
      });
      
      // Apply personality modifications
      try {
        const activePersonality = await context.storage.getActivePersonality();
        if (activePersonality) {
          const modContext = {
            personality: activePersonality, // Pass the full personality object
            conversationContext: `Custom avatar request: ${description}`
          };
          
          promptComponents = await promptComposer.applyPersonalityModifications(promptComponents, modContext);
        }
      } catch (error) {
        console.warn('Could not apply personality modifications:', error);
      }
      
      // Modify character component to include user's description
      promptComponents.character = `Claudia, young woman with chestnut hair and hazel eyes, ${description}, realistic digital art`;
      
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

      // Save the image with proper file management
      try {
        const metadata = imageStorage.createImageMetadata(finalPrompt, response.imageUrl, {
          description: description,
          style: 'custom imagine command',
          model: (provider as { config?: { model?: string } }).config?.model || 'unknown',
          provider: provider.name,
          dimensions: { width: 512, height: 512 },
          tags: ['imagine', 'custom', 'claudia', 'manual']
        });

        // Save the image (downloads in browser)
        await imageStorage.saveImage(response.imageUrl, metadata);
        console.log('📸 Custom avatar image saved:', metadata.filename);

      } catch (saveError) {
        console.warn('Failed to save custom avatar image:', saveError);
      }
      
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
