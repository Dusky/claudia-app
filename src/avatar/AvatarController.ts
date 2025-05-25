import type { AvatarCommand, AvatarState, AvatarGenerationParams } from './types';
import { ImageProviderManager, type ImageGenerationRequest } from '../providers';
import { ClaudiaDatabase } from '../storage';
import { ImagePromptComposer, type PromptModificationContext } from '../providers/image/promptComposer';
// Simple hash function for browser environment
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

export class AvatarController {
  private state: AvatarState;
  private imageProvider: ImageProviderManager;
  private database: ClaudiaDatabase;
  private promptComposer: ImagePromptComposer;
  private onStateChange?: (state: AvatarState) => void;

  constructor(
    imageProvider: ImageProviderManager, 
    database: ClaudiaDatabase,
    onStateChange?: (state: AvatarState) => void
  ) {
    this.imageProvider = imageProvider;
    this.database = database;
    this.promptComposer = new ImagePromptComposer();
    this.onStateChange = onStateChange;
    
    this.state = {
      visible: false,
      position: 'center',
      expression: 'neutral',
      pose: 'standing',
      action: 'idle',
      scale: 1.0,
      opacity: 1.0,
      isAnimating: false,
      lastUpdate: new Date().toISOString()
    };
  }

  // Parse [AVATAR:...] commands from LLM responses
  parseAvatarCommands(text: string): { cleanText: string; commands: AvatarCommand[] } {
    const avatarRegex = /\[AVATAR:([^\]]+)\]/g;
    const commands: AvatarCommand[] = [];
    let cleanText = text;

    let match;
    while ((match = avatarRegex.exec(text)) !== null) {
      const commandStr = match[1];
      const command = this.parseCommandString(commandStr);
      commands.push(command);
      
      // Remove the avatar command from the text
      cleanText = cleanText.replace(match[0], '');
    }

    return { cleanText: cleanText.trim(), commands };
  }

  private parseCommandString(commandStr: string): AvatarCommand {
    const command: AvatarCommand = {};
    const pairs = commandStr.split(',').map(pair => pair.trim());

    pairs.forEach(pair => {
      const [key, value] = pair.split('=').map(s => s.trim());
      
      switch (key.toLowerCase()) {
        case 'position':
          command.position = value as any;
          break;
        case 'expression':
          command.expression = value as any;
          break;
        case 'action':
          command.action = value as any;
          break;
        case 'gesture':
          command.gesture = value as any;
          break;
        case 'pose':
          command.pose = value as any;
          break;
        case 'hide':
          command.hide = value.toLowerCase() === 'true';
          break;
        case 'show':
          command.show = value.toLowerCase() === 'true';
          break;
        case 'fade':
          command.fade = value.toLowerCase() === 'true';
          break;
        case 'pulse':
          command.pulse = value.toLowerCase() === 'true';
          break;
        case 'scale':
          command.scale = parseFloat(value);
          break;
        case 'duration':
          command.duration = parseInt(value);
          break;
      }
    });

    return command;
  }

  // Execute avatar commands
  async executeCommands(commands: AvatarCommand[]): Promise<void> {
    for (const command of commands) {
      await this.executeCommand(command);
    }
  }

  private async executeCommand(command: AvatarCommand): Promise<void> {
    let needsNewImage = false;

    // Update state based on command
    if (command.hide) {
      this.state.visible = false;
    }

    if (command.show) {
      this.state.visible = true;
    }

    if (command.position) {
      this.state.position = command.position;
    }

    if (command.expression && command.expression !== this.state.expression) {
      this.state.expression = command.expression;
      needsNewImage = true;
    }

    if (command.pose && command.pose !== this.state.pose) {
      this.state.pose = command.pose;
      needsNewImage = true;
    }

    if (command.action) {
      this.state.action = command.action;
    }

    if (command.gesture) {
      this.state.gesture = command.gesture;
    }

    if (command.scale) {
      this.state.scale = command.scale;
    }

    if (command.fade) {
      this.state.opacity = 0.5;
    } else if (command.pulse) {
      // Pulse animation will be handled by the display component
    }

    // Generate new image if needed
    if (needsNewImage && this.state.visible) {
      await this.generateAvatarImage();
    }

    this.state.lastUpdate = new Date().toISOString();
    this.state.isAnimating = true;

    // Notify state change
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }

    // Reset animation flag after a short delay
    setTimeout(() => {
      this.state.isAnimating = false;
      if (this.onStateChange) {
        this.onStateChange(this.state);
      }
    }, command.duration || 500);
  }

  private async generateAvatarImage(conversationContext?: string): Promise<void> {
    const params: AvatarGenerationParams = {
      expression: this.state.expression,
      pose: this.state.pose,
      action: this.state.action,
      style: 'cyberpunk anime girl',
      background: 'transparent',
      lighting: 'neon',
      quality: 'standard'
    };

    // Generate prompt components using the new system
    let promptComponents = this.promptComposer.generatePromptComponents(params);

    // Get current personality for context-aware modifications
    try {
      const activePersonality = await this.database.getActivePersonality();
      if (activePersonality) {
        const context: PromptModificationContext = {
          personality: {
            name: activePersonality.name,
            systemPrompt: activePersonality.system_prompt
          },
          conversationContext
        };

        // Apply personality-based modifications to prompts
        promptComponents = await this.promptComposer.applyPersonalityModifications(promptComponents, context);
      }
    } catch (error) {
      console.warn('Could not get personality for prompt modification:', error);
    }

    // Create final prompts
    const finalPrompt = this.promptComposer.compilePrompt(promptComponents);
    const negativePrompt = this.promptComposer.getNegativePrompt(promptComponents);
    
    const promptHash = this.generatePromptHash({ ...params, prompt: finalPrompt });
    
    // Check cache first
    const cached = await this.database.getCachedAvatar(promptHash);
    if (cached) {
      this.state.imageUrl = cached.imageUrl;
      return;
    }

    // Generate new image
    try {
      const provider = this.imageProvider.getActiveProvider();
      if (!provider) {
        console.warn('No active image provider configured');
        return;
      }

      const imageRequest: ImageGenerationRequest = {
        prompt: finalPrompt,
        negativePrompt,
        width: 512,
        height: 512,
        steps: 20,
        guidance: 7.5
      };

      console.log('Generating avatar with enhanced prompt:', {
        prompt: finalPrompt,
        negativePrompt,
        params
      });

      const response = await provider.generateImage(imageRequest);
      
      // Cache the result
      this.database.cacheAvatarImage(promptHash, response.imageUrl, params);
      this.state.imageUrl = response.imageUrl;

    } catch (error) {
      console.error('Failed to generate avatar image:', error);
      // Could fall back to a default image here
    }
  }

  // Methods to access the new prompt composer system
  getPromptComposer(): ImagePromptComposer {
    return this.promptComposer;
  }

  // Generate avatar with conversation context
  async generateAvatarWithContext(conversationContext?: string): Promise<void> {
    await this.generateAvatarImage(conversationContext);
  }

  private generatePromptHash(params: AvatarGenerationParams): string {
    const keyString = JSON.stringify(params, Object.keys(params).sort());
    return simpleHash(keyString);
  }

  // Get current state
  getState(): AvatarState {
    return { ...this.state };
  }

  // Set state directly (for initialization)
  setState(newState: Partial<AvatarState>): void {
    this.state = { ...this.state, ...newState };
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  // Show avatar with default settings
  async show(): Promise<void> {
    await this.executeCommand({ show: true, expression: 'happy', position: 'center' });
  }

  // Hide avatar
  async hide(): Promise<void> {
    await this.executeCommand({ hide: true });
  }
}
