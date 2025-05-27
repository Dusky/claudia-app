import type { AvatarCommand, AvatarState, AvatarGenerationParams, AvatarExpression, AvatarAction, AvatarPose, AvatarPosition, AvatarGesture } from './types';
import { ImageProviderManager, type ImageGenerationRequest } from '../providers';
import { ClaudiaDatabase } from '../storage';
import { ImagePromptComposer, type PromptModificationContext, type ImagePromptComponents } from '../providers/image/promptComposer';
import { imageStorage } from '../utils/imageStorage';
import type { Personality } from '../types/personality';

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

interface VariationOptions {
  seed?: number;
  contextualKeywords?: string[];
}

// Extended AvatarGenerationParams for internal use by controller
interface InternalAvatarGenerationParams extends AvatarGenerationParams {
  aiDescription?: string; // For AI-driven descriptions
  variationSeed?: number;
  contextualKeywords?: string[];
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

  parseAvatarCommands(text: string): { cleanText: string; commands: AvatarCommand[] } {
    const avatarRegex = /\[AVATAR:([^\]]+)\]/g;
    const commands: AvatarCommand[] = [];
    let cleanText = text;
    let match;
    while ((match = avatarRegex.exec(text)) !== null) {
      const commandStr = match[1];
      const command = this.parseCommandString(commandStr);
      commands.push(command);
      cleanText = cleanText.replace(match[0], '');
    }
    return { cleanText: cleanText.trim(), commands };
  }

  parsePhotoDescriptions(response: string): { cleanText: string; photoRequest?: { description: string; position?: AvatarPosition }; hideRequest?: boolean } {
    let cleanText = response;
    let photoRequest: { description: string; position?: AvatarPosition } | undefined;
    let hideRequest = false;

    if (cleanText.includes('[HIDE]')) {
      hideRequest = true;
      cleanText = cleanText.replace(/\[HIDE\]/g, '').trim();
    }

    const imageMatches = cleanText.match(/\[IMAGE:\s*([^\]]+)\]/g);
    if (imageMatches && imageMatches.length > 0) {
      const imageMatch = imageMatches[0]; 
      const description = imageMatch.replace(/\[IMAGE:\s*/, '').replace(/\]$/, '').trim();
      if (description) {
        photoRequest = { description };
        cleanText = cleanText.replace(/\[IMAGE:\s*[^\]]+\]/g, '').trim();
      }
    }

    const positionMatches = cleanText.match(/\[POSITION:\s*([^\]]+)\]/g);
    if (positionMatches && positionMatches.length > 0 && photoRequest) {
      const positionMatch = positionMatches[0];
      const position = positionMatch.replace(/\[POSITION:\s*/, '').replace(/\]$/, '').trim();
      const validPositions: AvatarPosition[] = [
        'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right',
        'beside-text', 'overlay-left', 'overlay-right', 'floating', 'peeking'
      ];
      if (validPositions.includes(position as AvatarPosition)) {
        photoRequest.position = position as AvatarPosition;
      }
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
        case 'position': command.position = value as AvatarPosition; break;
        case 'expression': command.expression = value as AvatarExpression; break;
        case 'action': command.action = value as AvatarAction; break;
        case 'gesture': command.gesture = value as AvatarGesture; break;
        case 'pose': command.pose = value as AvatarPose; break;
        case 'hide': command.hide = value.toLowerCase() === 'true'; break;
        case 'show': command.show = value.toLowerCase() === 'true'; break;
        case 'fade': command.fade = value.toLowerCase() === 'true'; break;
        case 'pulse': command.pulse = value.toLowerCase() === 'true'; break;
        case 'scale': command.scale = parseFloat(value); break;
        case 'duration': command.duration = parseInt(value); break;
      }
    });
    return command;
  }

  async executeCommands(commands: AvatarCommand[]): Promise<void> {
    for (const command of commands) {
      await this.executeCommand(command);
    }
  }

  async executeCommand(command: AvatarCommand): Promise<void> {
    let needsNewImage = false;
    if (command.hide) this.state.visible = false;
    if (command.show) this.state.visible = true;

    if (command.expression && command.expression !== this.state.expression) {
      this.state.expression = command.expression;
      needsNewImage = true;
    }
    if (command.pose && command.pose !== this.state.pose) {
      this.state.pose = command.pose;
      needsNewImage = true;
    }
    if (command.action) this.state.action = command.action; // Action change doesn't always need new image if minor
    if (command.gesture) this.state.gesture = command.gesture;
    if (command.scale) this.state.scale = command.scale;
    if (command.fade) this.state.opacity = 0.5;
    
    if (needsNewImage && this.state.visible) {
      await this.generateAvatarImage(undefined, { seed: Date.now() });
    }

    this.state.lastUpdate = new Date().toISOString();
    this.state.isAnimating = true; // For CSS animations or transitions
    this.notifyStateChange();
    setTimeout(() => {
      this.state.isAnimating = false;
      this.notifyStateChange();
    }, command.duration || 500);
  }

  private async generateAvatarImage(
    conversationContext?: string,
    variationOptions?: VariationOptions,
    aiProvidedDescription?: string // New: For AI's direct description
  ): Promise<void> {
    const { configManager } = await import('../config/env');
    const configuredStyle = configManager.getImageStyle();
    
    const params: InternalAvatarGenerationParams = {
      expression: this.state.expression,
      pose: this.state.pose,
      action: this.state.action,
      style: configuredStyle,
      background: 'none', 
      lighting: 'soft',
      quality: 'high',
      aiDescription: aiProvidedDescription, // Pass AI description if available
      variationSeed: variationOptions?.seed,
      contextualKeywords: variationOptions?.contextualKeywords,
    };

    let promptComponents = this.promptComposer.generatePromptComponents(params);
    let activePersonality: Personality | null = null;

    try {
      activePersonality = await this.database.getActivePersonality();
      if (activePersonality) {
        const context: PromptModificationContext = {
          personality: { name: activePersonality.name, systemPrompt: activePersonality.system_prompt },
          conversationContext,
          isAIDescription: !!aiProvidedDescription,
          variationSeed: variationOptions?.seed,
          contextualKeywords: variationOptions?.contextualKeywords,
        };
        promptComponents = await this.promptComposer.applyPersonalityModifications(promptComponents, context);
      }
    } catch (error) {
      console.warn('Could not get personality for prompt modification:', error);
    }

    const finalPrompt = this.promptComposer.compilePrompt(promptComponents);
    const negativePrompt = this.promptComposer.getNegativePrompt(promptComponents);
    
    const promptHash = this.generatePromptHash({ ...params, prompt: finalPrompt, negativePrompt });
    
    const cached = await this.database.getCachedAvatar(promptHash);
    if (cached) {
      this.state.imageUrl = cached.imageUrl;
      this.notifyStateChange(); 
      return;
    }

    this.state.isGenerating = true;
    this.state.hasError = false;
    this.notifyStateChange();

    try {
      const provider = this.imageProvider.getActiveProvider();
      if (!provider) {
        console.warn('No active image provider configured');
        this.state.isGenerating = false;
        this.notifyStateChange();
        return;
      }

      const imageRequest: ImageGenerationRequest = {
        prompt: finalPrompt,
        negativePrompt,
        width: 512, height: 512, steps: 25, guidance: 7.0 
      };

      console.log('Generating avatar with prompt:', { finalPrompt, negativePrompt, params });
      const response = await provider.generateImage(imageRequest);
      
      this.database.cacheAvatarImage(promptHash, response.imageUrl, params as unknown as Record<string, unknown>);
      this.state.imageUrl = response.imageUrl;
    } catch (error) {
      console.error('Failed to generate avatar image:', error);
      this.state.hasError = true;
      this.state.errorMessage = error instanceof Error ? error.message : 'Unknown image generation error.';
    } finally {
      this.state.isGenerating = false;
      this.notifyStateChange();
    }
  }

  getPromptComposer(): ImagePromptComposer {
    return this.promptComposer;
  }

  async generateAvatarWithContext(conversationContext?: string): Promise<void> {
    const keywords = conversationContext?.toLowerCase().match(/\b(\w{4,})\b/g)?.slice(0, 5) || [];
    await this.generateAvatarImage(conversationContext, { seed: Date.now(), contextualKeywords: keywords });
  }

  async generateAvatarFromDescription(description: string, position?: AvatarPosition): Promise<void> {
    console.log('🎨 Generating avatar from AI description:', { description, position });

    // Update internal state based on description for consistency, even if image prompt is different
    const parsedParams = await this.parseDescriptionToParams(description);
    if (parsedParams.expression) this.state.expression = parsedParams.expression;
    if (parsedParams.pose) this.state.pose = parsedParams.pose;
    if (parsedParams.action) this.state.action = parsedParams.action;
    
    this.state.visible = true;
    this.state.opacity = 0.9;
    this.state.lastUpdate = new Date().toISOString();
    // Position is handled by AvatarPanel

    // Call generateAvatarImage, passing the AI's description directly
    await this.generateAvatarImage(description, { seed: Date.now() }, description);

    // Save the image with metadata (this part can remain similar)
    if (this.state.imageUrl && !this.state.hasError) {
      try {
        const provider = this.imageProvider.getActiveProvider();
        const metadata = imageStorage.createImageMetadata(description, this.state.imageUrl, {
          description: description, // The AI's original description
          style: parsedParams.style, // Style used for generation
          model: (provider as any)?.config?.model || 'unknown',
          provider: provider?.name || 'unknown',
          dimensions: { width: 512, height: 512 },
          tags: ['avatar', 'ai-generated', 'claudia', 'description-driven'],
        });
        await imageStorage.saveImage(this.state.imageUrl, metadata);
        console.log('📸 Avatar image from AI description saved:', metadata.filename);
        if (Math.random() < 0.1) imageStorage.cleanupOldImages(100);
      } catch (saveError) {
        console.warn('Failed to save avatar image from AI description:', saveError);
      }
    }
    // Note: isGenerating and hasError states are handled within generateAvatarImage
    this.notifyStateChange(); // Ensure final state is notified
  }
  
  async generateAvatarFromResponse(aiResponse: string, _personality?: Personality): Promise<void> {
    const emotionalContext = this.analyzeResponseForEmotion(aiResponse);
    let stateChanged = false;

    if (emotionalContext.expression && emotionalContext.expression !== this.state.expression) {
      this.state.expression = emotionalContext.expression;
      stateChanged = true;
    }
    if (emotionalContext.action && emotionalContext.action !== this.state.action) {
      this.state.action = emotionalContext.action;
      stateChanged = true; // Action changes might warrant a new image
    }
    if (emotionalContext.pose && emotionalContext.pose !== this.state.pose) {
      this.state.pose = emotionalContext.pose;
      stateChanged = true;
    }

    if (emotionalContext.shouldShow && !this.state.visible) {
      this.state.visible = true;
      this.state.opacity = 0.9;
      stateChanged = true;
    }

    if (stateChanged || (!this.state.imageUrl && this.state.visible)) { 
      console.log('🎭 Generating avatar for response:', { ...this.state, shouldShow: emotionalContext.shouldShow });
      const contextString = `Claudia responding: ${aiResponse.substring(0, 150)}...`;
      const keywords = aiResponse.toLowerCase().match(/\b(\w{4,})\b/g)?.slice(0, 5) || [];
      // Generate image based on current state, no AI description here
      await this.generateAvatarImage(contextString, { seed: Date.now(), contextualKeywords: keywords });
    }
    
    if (stateChanged) this.notifyStateChange();
  }

  private analyzeResponseForEmotion(response: string): {
    expression?: AvatarExpression;
    action?: AvatarAction;
    pose?: AvatarPose;
    shouldShow: boolean;
  } {
    const lowerResponse = response.toLowerCase();
    const result: {
      expression?: AvatarExpression; action?: AvatarAction; pose?: AvatarPose;
      shouldShow: boolean;
    } = { shouldShow: false };

    const bracketMatches = response.match(/『([^』]+)』/g);
    if (bracketMatches) {
      result.shouldShow = true;
      bracketMatches.forEach(match => {
        const action = match.replace(/『|』/g, '').toLowerCase();
        if (action.includes('smile') || action.includes('grin') || action.includes('happy')) result.expression = 'happy';
        else if (action.includes('curious') || action.includes('wonder') || action.includes('tilt')) result.expression = 'curious';
        else if (action.includes('excited') || action.includes('bounce') || action.includes('energetic')) result.expression = 'excited';
        else if (action.includes('mischievous') || action.includes('smirk') || action.includes('playful')) result.expression = 'mischievous';
        else if (action.includes('think') || action.includes('ponder') || action.includes('contempl')) result.expression = 'thinking';
        else if (action.includes('surprised') || action.includes('shock') || action.includes('gasp')) result.expression = 'surprised';
        else if (action.includes('confident') || action.includes('assertive')) result.expression = 'confident';

        if (action.includes('sit') || action.includes('cross-legged')) result.pose = 'sitting';
        else if (action.includes('lean') || action.includes('against')) result.pose = 'leaning';
        else if (action.includes('hands on hips') || action.includes('assertive')) result.pose = 'hands-on-hips';
        else if (action.includes('crossed arms') || action.includes('arms crossed')) result.pose = 'crossed-arms';

        if (action.includes('wave') || action.includes('greet')) result.action = 'wave';
        else if (action.includes('point') || action.includes('direct')) result.action = 'point';
        else if (action.includes('nod') || action.includes('agree')) result.action = 'nod';
        else if (action.includes('shrug') || action.includes('uncertain')) result.action = 'shrug';
        else if (action.includes('type') || action.includes('work') || action.includes('keyboard')) result.action = 'type';
        else if (action.includes('read') || action.includes('look at')) result.action = 'read';
      });
    }

    if (!result.expression) {
      if (lowerResponse.includes('!') && (lowerResponse.includes('great') || lowerResponse.includes('awesome'))) {
        result.expression = 'excited'; result.shouldShow = true;
      } else if (lowerResponse.includes('?') && (lowerResponse.includes('what') || lowerResponse.includes('how'))) {
        result.expression = 'curious'; result.shouldShow = true;
      } else if (lowerResponse.includes('hmm') || lowerResponse.includes('let me think')) {
        result.expression = 'thinking'; result.shouldShow = true;
      } else if (lowerResponse.includes('welcome') || lowerResponse.includes('hello')) {
        result.expression = 'happy'; result.action = 'wave'; result.shouldShow = true;
      }
    }
    return result;
  }

  private async parseDescriptionToParams(description: string): Promise<Partial<AvatarGenerationParams>> {
    const lowerDesc = description.toLowerCase();
    const params: Partial<AvatarGenerationParams> = {};
    const expressionMap: Record<string, AvatarExpression> = {
      happy: 'happy', smile: 'happy', joyful: 'happy', glad: 'happy', cheerful: 'happy',
      curious: 'curious', wonder: 'curious', intrigued: 'curious', inquisitive: 'curious',
      thinking: 'thinking', ponder: 'thinking', contemplative: 'thinking', thoughtful: 'thinking',
      excited: 'excited', energetic: 'excited', enthusiastic: 'excited', thrilled: 'excited',
      confident: 'confident', determined: 'confident', assertive: 'confident', sure: 'confident',
      mischievous: 'mischievous', playful: 'mischievous', sly: 'mischievous', impish: 'mischievous',
      surprised: 'surprised', shocked: 'surprised', amazed: 'surprised', astonished: 'surprised',
      confused: 'confused', perplexed: 'confused', bewildered: 'confused', puzzled: 'confused',
      focused: 'focused', concentrated: 'focused', intent: 'focused', absorbed: 'focused',
      neutral: 'neutral', calm: 'neutral',
    };
    for (const keyword in expressionMap) {
      if (lowerDesc.includes(keyword)) {
        params.expression = expressionMap[keyword];
        break;
      }
    }
    if (!params.expression) params.expression = 'neutral';

    const poseMap: Record<string, AvatarPose> = {
      sitting: 'sitting', "sit ": 'sitting', "cross-legged": 'sitting', seated: 'sitting',
      leaning: 'leaning', "against": 'leaning',
      "crossed-arms": 'crossed-arms', "arms crossed": 'crossed-arms',
      "hands-on-hips": 'hands-on-hips', "hands on hips": 'hands-on-hips',
      standing: 'standing', stand: 'standing', upright: 'standing',
      casual: 'casual', relaxed: 'casual',
    };
    for (const keyword in poseMap) {
      if (lowerDesc.includes(keyword)) {
        params.pose = poseMap[keyword];
        break;
      }
    }
    if (!params.pose) params.pose = 'standing';

    const actionMap: Record<string, AvatarAction> = {
      waving: 'wave', wave: 'wave', greeting: 'wave',
      typing: 'type', keyboard: 'type', "on computer": 'type',
      reading: 'read', book: 'read', "looking at screen": 'read',
      pointing: 'point', "point at": 'point',
      nodding: 'nod', nod: 'nod', agreeing: 'nod',
      shrugging: 'shrug', shrug: 'shrug', uncertain: 'shrug',
      working: 'work', busy: 'work',
      idle: 'idle', still: 'idle',
      searching: 'search', looking: 'search',
      thinking: 'think', 
    };
    for (const keyword in actionMap) {
      if (lowerDesc.includes(keyword)) {
        params.action = actionMap[keyword];
        break;
      }
    }
    if (!params.action) params.action = 'idle';
    
    const { configManager } = await import('../config/env');
    params.style = configManager.getImageStyle();
    if (lowerDesc.includes("dramatic light")) params.lighting = "dramatic";
    else if (lowerDesc.includes("soft light") || lowerDesc.includes("gentle light")) params.lighting = "soft";
    else if (lowerDesc.includes("neon light")) params.lighting = "neon";
    else params.lighting = 'soft';

    if (lowerDesc.includes("transparent background")) params.background = "transparent";
    else if (lowerDesc.includes("cyber background") || lowerDesc.includes("futuristic city")) params.background = "cyber";
    else params.background = 'none';
    
    params.quality = 'high';

    return params;
  }

  private generatePromptHash(params: InternalAvatarGenerationParams & { prompt?: string, negativePrompt?: string }): string {
    const orderedParams: Record<string, any> = {};
    Object.keys(params).sort().forEach(key => {
      orderedParams[key] = (params as any)[key];
    });
    const keyString = JSON.stringify(orderedParams);
    return simpleHash(keyString);
  }

  getState(): AvatarState {
    return { ...this.state };
  }

  setState(newState: Partial<AvatarState>): void {
    this.state = { ...this.state, ...newState, lastUpdate: new Date().toISOString() };
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  async show(): Promise<void> {
    await this.executeCommand({ show: true, expression: 'happy' });
  }

  async hide(): Promise<void> {
    await this.executeCommand({ hide: true });
  }
}
