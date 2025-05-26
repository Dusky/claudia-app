import type { AvatarCommand, AvatarState, AvatarGenerationParams, AvatarExpression, AvatarAction, AvatarPose, AvatarPosition } from './types';
import { ImageProviderManager, type ImageGenerationRequest } from '../providers';
import { ClaudiaDatabase } from '../storage';
import { ImagePromptComposer, type PromptModificationContext } from '../providers/image/promptComposer';
import { imageStorage } from '../utils/imageStorage';
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
      expression: 'neutral',
      pose: 'standing',
      action: 'idle',
      scale: 1.0,
      opacity: 1.0,
      isAnimating: false,
      isGenerating: false,
      hasError: false,
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

  // Parse photo descriptions from AI response (new system)
  parsePhotoDescriptions(response: string): { cleanText: string; photoRequest?: { description: string; position?: AvatarPosition }; hideRequest?: boolean } {
    let cleanText = response;
    let photoRequest: { description: string; position?: AvatarPosition } | undefined;
    let hideRequest = false;

    // Check for [HIDE] command
    if (cleanText.includes('[HIDE]')) {
      hideRequest = true;
      cleanText = cleanText.replace(/\[HIDE\]/g, '').trim();
    }

    // Parse [IMAGE: description] tags
    const imageMatches = cleanText.match(/\[IMAGE:\s*([^\]]+)\]/g);
    if (imageMatches && imageMatches.length > 0) {
      const imageMatch = imageMatches[0]; // Take the first image description
      const description = imageMatch.replace(/\[IMAGE:\s*/, '').replace(/\]$/, '').trim();
      
      if (description) {
        photoRequest = { description };
        
        // Remove all IMAGE tags from clean text
        cleanText = cleanText.replace(/\[IMAGE:\s*[^\]]+\]/g, '').trim();
      }
    }

    // Parse [POSITION: location] tags
    const positionMatches = cleanText.match(/\[POSITION:\s*([^\]]+)\]/g);
    if (positionMatches && positionMatches.length > 0 && photoRequest) {
      const positionMatch = positionMatches[0];
      const position = positionMatch.replace(/\[POSITION:\s*/, '').replace(/\]$/, '').trim();
      
      // Validate position
      const validPositions: AvatarPosition[] = [
        'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right',
        'beside-text', 'overlay-left', 'overlay-right', 'floating', 'peeking'
      ];
      
      if (validPositions.includes(position as AvatarPosition)) {
        photoRequest.position = position as AvatarPosition;
      }
      
      // Remove all POSITION tags from clean text
      cleanText = cleanText.replace(/\[POSITION:\s*[^\]]+\]/g, '').trim();
    }

    return { cleanText, photoRequest, hideRequest };
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

  async executeCommand(command: AvatarCommand): Promise<void> {
    let needsNewImage = false;

    // Update state based on command
    if (command.hide) {
      this.state.visible = false;
    }

    if (command.show) {
      this.state.visible = true;
    }

    // Position is now handled by dedicated panel - removed position logic

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
      style: 'realistic digital art, warm cozy style',
      background: 'none',
      lighting: 'soft',
      quality: 'high'
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

  // Generate avatar directly from AI description (new system)
  async generateAvatarFromDescription(description: string, position?: AvatarPosition): Promise<void> {
    console.log('🎨 Generating avatar from AI description:', { description, position });

    // Set loading state and clear any previous errors
    this.state.isGenerating = true;
    this.state.hasError = false;
    this.state.errorMessage = undefined;
    this.notifyStateChange();

    try {
      const provider = this.imageProvider.getActiveProvider();
      if (!provider) {
        console.error('No active image provider');
        return;
      }

      // Parse description to extract avatar parameters and use sophisticated prompt composer
      const extractedParams = this.parseDescriptionToParams(description);
      
      // Generate prompt components using the sophisticated prompt composer
      let promptComponents = this.promptComposer.generatePromptComponents(extractedParams);

      // Get current personality for context-aware modifications
      try {
        const activePersonality = await this.database.getActivePersonality();
        if (activePersonality) {
          const context = {
            personality: {
              name: activePersonality.name,
              systemPrompt: activePersonality.system_prompt
            },
            conversationContext: description
          };

          // Apply personality-based modifications to prompts
          promptComponents = await this.promptComposer.applyPersonalityModifications(promptComponents, context);
        }
      } catch (error) {
        console.warn('Could not get personality for prompt modification:', error);
      }

      // Blend AI description with sophisticated styling
      const sophisticatedBase = this.promptComposer.compilePrompt(promptComponents);
      const negativePrompt = this.promptComposer.getNegativePrompt(promptComponents);
      
      // Create hybrid prompt: AI description + sophisticated styling elements
      const finalPrompt = `${description}, ${sophisticatedBase}`;
      
      console.log('🎨 Generating avatar with sophisticated prompt:', {
        originalDescription: description,
        finalPrompt,
        negativePrompt,
        extractedParams
      });
      
      const response = await provider.generateImage({
        prompt: finalPrompt,
        negativePrompt,
        width: 512,
        height: 512,
        steps: 20, // Use higher quality for consistent results
        guidance: 7.5
      });

      // Update avatar state
      this.state.imageUrl = response.imageUrl;
      this.state.visible = true;
      this.state.opacity = 0.9;
      
      // Position is now handled by dedicated panel
      
      this.state.lastUpdate = new Date().toISOString();

      // Save the image with proper file management
      try {
        const metadata = imageStorage.createImageMetadata(finalPrompt, response.imageUrl, {
          description: description,
          style: promptComponents.style,
          model: (provider as any).config?.model || 'unknown',
          provider: provider.name,
          dimensions: { width: 512, height: 512 },
          tags: ['avatar', 'ai-generated', 'claudia'],
          // Additional metadata stored in prompt field
        });

        // Save the image (downloads in browser)
        await imageStorage.saveImage(response.imageUrl, metadata);
        console.log('📸 Avatar image saved:', metadata.filename);

        // Clean up old images periodically
        if (Math.random() < 0.1) { // 10% chance to cleanup
          imageStorage.cleanupOldImages(100);
        }

      } catch (saveError) {
        console.warn('Failed to save avatar image:', saveError);
      }

      // Clear loading state
      this.state.isGenerating = false;
      
      // Notify state change
      this.notifyStateChange();
      
      console.log('✅ Avatar generated from AI description successfully');

    } catch (error) {
      console.error('Failed to generate avatar from description:', error);
      
      // Set error state
      this.state.isGenerating = false;
      this.state.hasError = true;
      this.state.errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
      this.notifyStateChange();
    }
  }

  // Automatically generate avatar based on AI response
  async generateAvatarFromResponse(aiResponse: string, _personality?: any): Promise<void> {
    // Extract emotional context and actions from AI response
    const emotionalContext = this.analyzeResponseForEmotion(aiResponse);
    
    let stateChanged = false;

    // Update avatar state based on response analysis
    if (emotionalContext.expression && emotionalContext.expression !== this.state.expression) {
      this.state.expression = emotionalContext.expression;
      stateChanged = true;
    }
    
    if (emotionalContext.action && emotionalContext.action !== this.state.action) {
      this.state.action = emotionalContext.action;
      stateChanged = true;
    }

    if (emotionalContext.pose && emotionalContext.pose !== this.state.pose) {
      this.state.pose = emotionalContext.pose;
      stateChanged = true;
    }

    // Show avatar if response seems to warrant it
    if (emotionalContext.shouldShow && !this.state.visible) {
      this.state.visible = true;
      // Position is now handled by dedicated panel
      this.state.opacity = 0.9;
      stateChanged = true;
    }

    // Only generate new image if state changed significantly or if no image exists
    if (stateChanged || !this.state.imageUrl) {
      console.log('🎭 Generating avatar for response:', {
        expression: this.state.expression,
        action: this.state.action,
        pose: this.state.pose,
        visible: this.state.visible,
        shouldShow: emotionalContext.shouldShow
      });

      // Generate new image with the updated context
      const contextString = `Claudia responding: ${aiResponse.substring(0, 200)}...`;
      await this.generateAvatarImage(contextString);
    }
    
    // Update state subscribers
    if (stateChanged) {
      this.notifyStateChange();
    }
  }

  // Analyze AI response for emotional cues and avatar commands
  private analyzeResponseForEmotion(response: string): {
    expression?: AvatarExpression;
    action?: AvatarAction;
    pose?: AvatarPose;
    position?: AvatarPosition;
    shouldShow: boolean;
  } {
    const lowerResponse = response.toLowerCase();
    let result: any = { shouldShow: false };

    // Look for Japanese brackets indicating actions/emotions
    const bracketMatches = response.match(/『([^』]+)』/g);
    if (bracketMatches) {
      result.shouldShow = true;
      
      bracketMatches.forEach(match => {
        const action = match.replace(/『|』/g, '');
        const actionLower = action.toLowerCase();
        
        // Map actions to expressions
        if (actionLower.includes('smile') || actionLower.includes('grin') || actionLower.includes('happy')) {
          result.expression = 'happy';
        } else if (actionLower.includes('curious') || actionLower.includes('wonder') || actionLower.includes('tilt')) {
          result.expression = 'curious';
        } else if (actionLower.includes('excited') || actionLower.includes('bounce') || actionLower.includes('energetic')) {
          result.expression = 'excited';
        } else if (actionLower.includes('mischievous') || actionLower.includes('smirk') || actionLower.includes('playful')) {
          result.expression = 'mischievous';
        } else if (actionLower.includes('think') || actionLower.includes('ponder') || actionLower.includes('contempl')) {
          result.expression = 'thinking';
        } else if (actionLower.includes('surprised') || actionLower.includes('shock') || actionLower.includes('gasp')) {
          result.expression = 'surprised';
        } else if (actionLower.includes('confident') || actionLower.includes('assertive')) {
          result.expression = 'confident';
        }

        // Map actions to poses
        if (actionLower.includes('sit') || actionLower.includes('cross-legged')) {
          result.pose = 'sitting';
        } else if (actionLower.includes('lean') || actionLower.includes('against')) {
          result.pose = 'leaning';
        } else if (actionLower.includes('hands on hips') || actionLower.includes('assertive')) {
          result.pose = 'hands-on-hips';
        } else if (actionLower.includes('crossed arms') || actionLower.includes('arms crossed')) {
          result.pose = 'crossed-arms';
        }

        // Map actions to actions
        if (actionLower.includes('wave') || actionLower.includes('greet')) {
          result.action = 'wave';
        } else if (actionLower.includes('point') || actionLower.includes('direct')) {
          result.action = 'point';
        } else if (actionLower.includes('nod') || actionLower.includes('agree')) {
          result.action = 'nod';
        } else if (actionLower.includes('shrug') || actionLower.includes('uncertain')) {
          result.action = 'shrug';
        } else if (actionLower.includes('type') || actionLower.includes('work') || actionLower.includes('keyboard')) {
          result.action = 'type';
        } else if (actionLower.includes('read') || actionLower.includes('look at')) {
          result.action = 'read';
        }
      });
    }

    // Fallback emotion detection from text content
    if (!result.expression) {
      if (lowerResponse.includes('!') && (lowerResponse.includes('great') || lowerResponse.includes('awesome') || lowerResponse.includes('excellent'))) {
        result.expression = 'excited';
        result.shouldShow = true;
      } else if (lowerResponse.includes('?') && (lowerResponse.includes('what') || lowerResponse.includes('how') || lowerResponse.includes('why'))) {
        result.expression = 'curious';
        result.shouldShow = true;
      } else if (lowerResponse.includes('hmm') || lowerResponse.includes('let me think') || lowerResponse.includes('considering')) {
        result.expression = 'thinking';
        result.shouldShow = true;
      } else if (lowerResponse.includes('welcome') || lowerResponse.includes('hello') || lowerResponse.includes('hi there')) {
        result.expression = 'happy';
        result.action = 'wave';
        result.shouldShow = true;
      }
    }

    // Set default position if showing
    // Position is now handled by dedicated panel

    return result;
  }

  // Parse AI description to extract avatar parameters
  private parseDescriptionToParams(description: string): AvatarGenerationParams {
    const lowerDesc = description.toLowerCase();
    
    // Extract expression from description
    let expression: AvatarExpression = 'neutral';
    if (lowerDesc.includes('smil') || lowerDesc.includes('happy') || lowerDesc.includes('joy')) {
      expression = 'happy';
    } else if (lowerDesc.includes('curious') || lowerDesc.includes('wonder') || lowerDesc.includes('intrigu')) {
      expression = 'curious';
    } else if (lowerDesc.includes('think') || lowerDesc.includes('contempl') || lowerDesc.includes('ponder')) {
      expression = 'thinking';
    } else if (lowerDesc.includes('excit') || lowerDesc.includes('energetic') || lowerDesc.includes('enthusiastic')) {
      expression = 'excited';
    } else if (lowerDesc.includes('confident') || lowerDesc.includes('determin') || lowerDesc.includes('assertive')) {
      expression = 'confident';
    } else if (lowerDesc.includes('mischiev') || lowerDesc.includes('playful') || lowerDesc.includes('sly')) {
      expression = 'mischievous';
    } else if (lowerDesc.includes('surprised') || lowerDesc.includes('shock') || lowerDesc.includes('amaz')) {
      expression = 'surprised';
    } else if (lowerDesc.includes('confus') || lowerDesc.includes('perplex') || lowerDesc.includes('bewild')) {
      expression = 'confused';
    } else if (lowerDesc.includes('focus') || lowerDesc.includes('concentrat') || lowerDesc.includes('intent')) {
      expression = 'focused';
    }

    // Extract pose from description
    let pose: AvatarPose = 'standing';
    if (lowerDesc.includes('sitting') || lowerDesc.includes('sit ') || lowerDesc.includes('cross-legged')) {
      pose = 'sitting';
    } else if (lowerDesc.includes('lean') || lowerDesc.includes('against')) {
      pose = 'leaning';
    } else if (lowerDesc.includes('arms crossed') || lowerDesc.includes('crossed arms')) {
      pose = 'crossed-arms';
    } else if (lowerDesc.includes('hands on hips') || lowerDesc.includes('hips')) {
      pose = 'hands-on-hips';
    } else if (lowerDesc.includes('casual') || lowerDesc.includes('relaxed')) {
      pose = 'casual';
    }

    // Extract action from description
    let action: AvatarAction = 'idle';
    if (lowerDesc.includes('waving') || lowerDesc.includes('wave')) {
      action = 'wave';
    } else if (lowerDesc.includes('typing') || lowerDesc.includes('keyboard')) {
      action = 'type';
    } else if (lowerDesc.includes('reading') || lowerDesc.includes('book')) {
      action = 'read';
    } else if (lowerDesc.includes('pointing') || lowerDesc.includes('point')) {
      action = 'point';
    } else if (lowerDesc.includes('nodding') || lowerDesc.includes('nod')) {
      action = 'nod';
    } else if (lowerDesc.includes('shrug') || lowerDesc.includes('uncertain')) {
      action = 'shrug';
    } else if (lowerDesc.includes('working') || lowerDesc.includes('busy')) {
      action = 'work';
    }

    return {
      expression,
      pose,
      action,
      style: 'realistic digital art, warm cozy style',
      background: 'none',
      lighting: 'soft',
      quality: 'high'
    };
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
    this.notifyStateChange();
  }

  // Notify listeners of state changes
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  // Show avatar with default settings
  async show(): Promise<void> {
    await this.executeCommand({ show: true, expression: 'happy' });
  }

  // Hide avatar
  async hide(): Promise<void> {
    await this.executeCommand({ hide: true });
  }
}
