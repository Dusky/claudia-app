import type { AvatarCommand, AvatarState, AvatarGenerationParams, AvatarExpression, AvatarAction, AvatarPose, AvatarPosition, AvatarGesture } from './types';
import { ImageProviderManager, type ImageGenerationRequest } from '../providers';
import { ClaudiaDatabase } from '../storage';
import { ImagePromptComposer } from '../providers/image/promptComposer';
import type { PromptModificationContext, ImagePromptComponents } from '../providers/image/types';
// import { imageStorage } from '../utils/imageStorage'; // Remove global import
import type { ImageStorageManager } from '../utils/imageStorage'; // Import type
import type { Personality } from '../types/personality';
import type { LLMProviderManager } from '../providers/llm/manager'; 
import { useAppStore } from '../store/appStore';
import { memoryManager } from '../utils/memoryManager'; 

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

interface InternalAvatarGenerationParams extends AvatarGenerationParams {
  aiDescription?: string; 
  variationSeed?: number;
  contextualKeywords?: string[];
  metaGeneratedImagePrompt?: string; 
}


export class AvatarController {
  private state: AvatarState;
  private imageProvider: ImageProviderManager;
  private llmManager: LLMProviderManager; 
  private database: ClaudiaDatabase;
  private promptComposer: ImagePromptComposer;
  private imageStorageManager: ImageStorageManager; // Add imageStorageManager instance
  private onStateChange?: (state: AvatarState) => void;
  private previousImageUrl: string | null = null; // Track previous image for cleanup

  constructor(
    imageProvider: ImageProviderManager, 
    llmManager: LLMProviderManager, 
    database: ClaudiaDatabase,
    imageStorageManager: ImageStorageManager, // Inject ImageStorageManager
    onStateChange?: (state: AvatarState) => void
  ) {
    this.imageProvider = imageProvider;
    this.llmManager = llmManager; 
    this.database = database;
    this.promptComposer = new ImagePromptComposer();
    this.imageStorageManager = imageStorageManager; // Store instance
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
    if (command.action) this.state.action = command.action; 
    if (command.gesture) this.state.gesture = command.gesture;
    if (command.scale) this.state.scale = command.scale;
    if (command.fade) this.state.opacity = 0.5;
    
    if (needsNewImage && this.state.visible) {
      await this.generateAvatarImage(undefined, { seed: Date.now() });
    }

    this.state.lastUpdate = new Date().toISOString();
    this.state.isAnimating = true; 
    this.notifyStateChange();
    setTimeout(() => {
      this.state.isAnimating = false;
      this.notifyStateChange();
    }, command.duration || 500);
  }

  private async generateMetaPrompt(
    baseParams: InternalAvatarGenerationParams,
    personality: Personality | null,
    conversationContext?: string
  ): Promise<string> {
    const appConfig = useAppStore.getState().config;
    if (!appConfig.useMetaPromptingForImages || !this.llmManager || !this.llmManager.getActiveProvider()) {
      const components = this.promptComposer.generatePromptComponents(baseParams);
      const modifiedComponents = personality 
        ? await this.promptComposer.applyPersonalityModifications(components, {
            personality, 
            conversationContext,
            isAIDescription: !!baseParams.aiDescription,
            isMetaPrompted: false, 
            variationSeed: baseParams.variationSeed,
            contextualKeywords: baseParams.contextualKeywords,
          })
        : components;
      return this.promptComposer.compilePrompt(modifiedComponents);
    }

    let metaInputContext = `Current Avatar State: Expression is ${baseParams.expression}, Pose is ${baseParams.pose}, Action is ${baseParams.action}.`;
    if (baseParams.aiDescription) {
      metaInputContext += `\nAI's Specific Image Request: "${baseParams.aiDescription}" (This is the primary creative direction for the scene).`;
    }
    if (conversationContext) {
      metaInputContext += `\nRecent Conversation Context (for thematic inspiration): "${conversationContext.substring(0, 250)}..."`;
    }
    if (personality) {
      metaInputContext += `\nClaudia's Current Personality: ${personality.name}. Description: "${personality.description.substring(0,150)}...". System Prompt Hint: "${personality.system_prompt.substring(0,200)}..."`;
      if(personality.preferredClothingStyle) metaInputContext += `\nPreferred Clothing: ${personality.preferredClothingStyle}.`;
      if(personality.typicalEnvironmentKeywords) metaInputContext += `\nTypical Environment: ${personality.typicalEnvironmentKeywords}.`;
      if(personality.artStyleModifiers) metaInputContext += `\nArt Style Modifiers: ${personality.artStyleModifiers}.`;
    }
    metaInputContext += `\nDesired Base Artistic Style: "${baseParams.style}".`;
    if (baseParams.contextualKeywords && baseParams.contextualKeywords.length > 0) {
      metaInputContext += `\nAdditional Contextual Keywords: ${baseParams.contextualKeywords.join(', ')}.`;
    }

    const metaSystemPrompt = `You are an expert creative director and prompt engineer for an advanced text-to-image AI.
Your task is to generate a highly detailed, vivid, and artistic image prompt based on the provided context.
The main subject is ALWAYS Claudia. Claudia is a petite woman in her early 20s, with softly wavy chestnut hair to her shoulders, bright hazel eyes, and light freckles across her cheeks. She has subtle natural makeup. Her clothing should be appropriate for the scene and personality.

Follow this structure for your output prompt, ensuring each section is detailed:
1.  **Subject:** Describe Claudia, including her specific clothing for this scene, ensuring it aligns with the context and personality's preferred clothing. Reiterate her core features (chestnut hair, hazel eyes, freckles).
2.  **Pose / Expression:** Detail her exact pose and facial expression based on the current avatar state.
3.  **Setting:** Describe the environment in detail. If an "AI's Specific Image Request" is provided, use that as the primary setting. Otherwise, create a setting that fits her state, personality (typical environment), and conversation context.
4.  **Atmosphere / Style:** Define the mood, overall artistic style (e.g., photorealistic, oil painting, cinematic), and any relevant textures or visual treatments. Incorporate the "Desired Base Artistic Style" and any "Art Style Modifiers" from the personality.
5.  **Lighting:** Describe the lighting conditions (type, direction, color, mood).
6.  **Camera Perspective / Composition:** Specify shot type (e.g., medium shot, close-up), camera angle, composition, and lens characteristics (e.g., shallow depth of field, 50mm lens look).
7.  **Details & Realism Cues:** Add specific small details that enhance realism or the artistic vision (e.g., rain droplets, lens flare, specific textures).

If an "AI's Specific Image Request" is given, that is the primary creative direction for the scene, pose, and action. Adapt Claudia's expression and other details to fit this request while maintaining her core identity and personality's visual preferences.
If no "AI's Specific Image Request" is given, create a compelling scene based on Claudia's current state, personality, and conversation context.
The final output prompt should be a single block of text, with each section clearly delineated if possible, or as a continuous descriptive paragraph. Aim for a rich, comma-separated list of phrases.
Output ONLY the generated image prompt. Do not include any preambles, apologies, or explanations.`;

    console.log("🤖 Generating image prompt via meta-LLM with context:", metaInputContext);

    try {
      const llmResponse = await this.llmManager.generateText(
        metaInputContext,
        { systemMessage: metaSystemPrompt, temperature: 0.75, maxTokens: 400 } 
      );
      console.log("✨ Meta-LLM generated image prompt:", llmResponse);
      return llmResponse.trim();
    } catch (error) {
      console.error("Meta-prompting LLM call failed:", error);
      const components = this.promptComposer.generatePromptComponents(baseParams);
      return this.promptComposer.compilePrompt(components);
    }
  }


  private async generateAvatarImage(
    conversationContext?: string,
    variationOptions?: VariationOptions,
    aiProvidedDescription?: string 
  ): Promise<void> {
    const { configManager } = await import('../config/env');
    const configuredStyle = configManager.getImageStyle();
    const appConfig = useAppStore.getState().config; 
    
    const params: InternalAvatarGenerationParams = {
      expression: this.state.expression,
      pose: this.state.pose,
      action: this.state.action,
      style: configuredStyle, 
      background: 'none', 
      lighting: 'soft',
      quality: 'high',
      aiDescription: aiProvidedDescription, 
      variationSeed: variationOptions?.seed,
      contextualKeywords: variationOptions?.contextualKeywords,
    };

    let activePersonality: Personality | null = null;
    try {
      activePersonality = await this.database.getActivePersonality();
    } catch (error) {
      console.warn('Could not get active personality for image generation:', error);
    }

    let finalImagePrompt: string;
    
    if (appConfig.useMetaPromptingForImages && this.llmManager) { 
      finalImagePrompt = await this.generateMetaPrompt(params, activePersonality, conversationContext);
      params.metaGeneratedImagePrompt = finalImagePrompt; 
    }
    
    // Apply personality-specific prompt settings before generating components
    if (activePersonality) {
      if (activePersonality.baseCharacterIdentity) {
        this.promptComposer.setCharacterIdentity(activePersonality.baseCharacterIdentity);
      }
      if (activePersonality.styleKeywords || activePersonality.qualityKeywords) {
        this.promptComposer.setStyleKeywords(
          activePersonality.styleKeywords || "realistic digital art, cinematic",
          activePersonality.qualityKeywords || "high quality, detailed, beautiful composition, masterpiece, sharp focus, ultra-realistic photograph"
        );
      }
    }

    let promptComponents = this.promptComposer.generatePromptComponents(params);
    
    if (activePersonality) { 
        const context: PromptModificationContext = {
          personality: activePersonality, 
          conversationContext,
          isAIDescription: !!aiProvidedDescription,
          isMetaPrompted: !!params.metaGeneratedImagePrompt,
          variationSeed: variationOptions?.seed,
          contextualKeywords: variationOptions?.contextualKeywords,
        };
        promptComponents = await this.promptComposer.applyPersonalityModifications(promptComponents, context);
    }
    
    if (!params.metaGeneratedImagePrompt) {
        finalImagePrompt = this.promptComposer.compilePrompt(promptComponents);
    } else {
      finalImagePrompt = this.promptComposer.compilePrompt(promptComponents); 
    }
    
    const negativePrompt = this.promptComposer.getNegativePrompt(promptComponents);
    
    const currentParamsForHash = { ...params, prompt: finalImagePrompt, negativePrompt };
    Object.keys(currentParamsForHash).forEach(key => (currentParamsForHash as any)[key] === undefined && delete (currentParamsForHash as any)[key]);
    const promptHash = this.generatePromptHash(currentParamsForHash as InternalAvatarGenerationParams & { prompt?: string, negativePrompt?: string });
    
    // Skip caching for TOS compliance - provider URLs should not be cached
    console.log('🚫 Avatar caching disabled to comply with provider Terms of Service');

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
        prompt: finalImagePrompt,
        width: 512, height: 512, steps: 30, guidance: 7.0 
      };

      // Only include negative prompt for providers that support it
      const providerSupportsNegativePrompts = this.shouldIncludeNegativePrompt(provider);
      if (providerSupportsNegativePrompts && negativePrompt) {
        imageRequest.negativePrompt = negativePrompt;
      }

      console.log('Generating avatar with final prompt:', { finalImagePrompt, negativePrompt, params });
      const response = await provider.generateImage(imageRequest);
      
      // Log prompt to file if enabled
      await this.logPromptToFile(finalImagePrompt, negativePrompt, response.imageUrl, params, promptComponents);
      
      // Skip caching to comply with provider Terms of Service - URLs should not be stored
      console.log('🚫 Avatar image caching disabled for TOS compliance');
      // Cleanup previous image URL if it's a blob URL
      if (this.previousImageUrl && this.previousImageUrl.startsWith('blob:')) {
        memoryManager.revokeObjectURL(this.previousImageUrl);
      }
      
      this.state.imageUrl = response.imageUrl;
      this.previousImageUrl = response.imageUrl;
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

    const parsedParams = await this.parseDescriptionToParams(description);
    if (parsedParams.expression) this.state.expression = parsedParams.expression;
    if (parsedParams.pose) this.state.pose = parsedParams.pose;
    if (parsedParams.action) this.state.action = parsedParams.action;
    
    this.state.visible = true;
    this.state.opacity = 0.9;
    this.state.lastUpdate = new Date().toISOString();

    await this.generateAvatarImage(description, { seed: Date.now() }, description);

    if (this.state.imageUrl && !this.state.hasError) {
      try {
        const provider = this.imageProvider.getActiveProvider();
        const metadata = this.imageStorageManager.createImageMetadata(description, this.state.imageUrl, { // Use this.imageStorageManager
          description: description, 
          style: parsedParams.style, 
          model: (provider as any)?.config?.model || 'unknown',
          provider: provider?.name || 'unknown',
          dimensions: { width: 512, height: 512 },
          tags: ['avatar', 'ai-generated', 'claudia', 'description-driven'],
          // parameters: { ...parsedParams, prompt: description } // Temporarily disabled
        });
        await this.imageStorageManager.saveImage(this.state.imageUrl, metadata); // Use this.imageStorageManager
        console.log('📸 Avatar image from AI description saved:', metadata.filename);
        if (Math.random() < 0.1) await this.imageStorageManager.cleanupOldImages(100); // Use this.imageStorageManager
      } catch (saveError) {
        console.warn('Failed to save avatar image from AI description:', saveError);
      }
    }
    this.notifyStateChange(); 
  }
  
  async generateAvatarFromResponse(aiResponse: string): Promise<void> {
    const emotionalContext = this.analyzeResponseForEmotion(aiResponse);
    let stateChanged = false;

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

    if (emotionalContext.shouldShow && !this.state.visible) {
      this.state.visible = true;
      this.state.opacity = 0.9;
      stateChanged = true;
    }

    if (stateChanged || (!this.state.imageUrl && this.state.visible)) { 
      console.log('🎭 Generating avatar for response:', { ...this.state, shouldShow: emotionalContext.shouldShow });
      const contextString = `Claudia responding: ${aiResponse.substring(0, 150)}...`;
      const keywords = aiResponse.toLowerCase().match(/\b(\w{4,})\b/g)?.slice(0, 5) || [];
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

  /**
   * Check if the current provider supports negative prompts
   */
  private shouldIncludeNegativePrompt(provider: any): boolean {
    if (!provider) return false;
    
    // List of providers/models that support negative prompts
    const providersWithNegativePrompts = [
      'replicate',  // Most Replicate models support negative prompts
      'stability',  // Stability AI models
      'runpod'      // RunPod typically uses SDXL which supports them
    ];
    
    // Models that specifically don't support negative prompts
    const modelsWithoutNegativePrompts = [
      'minimax/video-01',
      'minimax/image-01', 
      'flux',
      'midjourney',
      'dalle',
      'imagen'
    ];
    
    const providerId = provider.id?.toLowerCase() || '';
    const modelName = provider.config?.model?.toLowerCase() || '';
    
    // Check if model specifically doesn't support negative prompts
    if (modelsWithoutNegativePrompts.some(model => modelName.includes(model))) {
      return false;
    }
    
    // Check if provider generally supports negative prompts
    return providersWithNegativePrompts.some(p => providerId.includes(p));
  }

  /**
   * Log prompt details to file if enabled in provider config
   */
  private async logPromptToFile(
    finalPrompt: string,
    negativePrompt: string,
    imageUrl: string,
    params: InternalAvatarGenerationParams,
    promptComponents: ImagePromptComponents
  ): Promise<void> {
    try {
      const provider = this.imageProvider.getActiveProvider();
      if (!provider) return;

      // Check if prompt logging is enabled (we'll need to access this from config)
      const shouldLog = await this.shouldLogPrompts();
      if (!shouldLog) return;

      const timestamp = new Date().toISOString();
      const filename = `prompt_log_${timestamp.replace(/[:.]/g, '-')}.json`;
      
      const logData = {
        timestamp,
        imageUrl,
        prompts: {
          final: finalPrompt,
          negative: negativePrompt,
        },
        parameters: params,
        promptComponents: {
          character: promptComponents.baseCharacterReference || 'unknown',
          style: promptComponents.styleKeywords || 'unknown',
          quality: promptComponents.qualityKeywords || 'unknown',
          situationalDescription: promptComponents.settingDescription || 'none',
          expressionKeywords: promptComponents.expressionKeywords || 'none',
          poseKeywords: promptComponents.poseKeywords || 'none',
          actionKeywords: promptComponents.actionKeywords || 'none',
          lightingKeywords: promptComponents.lightingDescription || 'none',
          backgroundKeywords: promptComponents.settingDescription || 'none',
          variationSeed: promptComponents.variationSeed,
          contextualKeywords: promptComponents.contextualKeywords,
        },
        provider: {
          name: provider.name,
          id: provider.id,
        },
        metadata: {
          loggedAt: timestamp,
          version: '1.0.0',
        }
      };

      // In a browser environment, we'll use the browser's download functionality
      const jsonString = JSON.stringify(logData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary download link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
      
      console.log(`📝 Prompt logged to file: ${filename}`);
      
    } catch (error) {
      console.error('Failed to log prompt to file:', error);
    }
  }

  /**
   * Check if prompt logging is enabled in the current provider config
   */
  private async shouldLogPrompts(): Promise<boolean> {
    try {
      // We'll need to access the provider config to check the setting
      // For now, let's get it from app settings or provider settings
      const setting = await this.database.getSetting<boolean>('image.logPromptsToFile', false);
      return setting ?? false;
    } catch (error) {
      console.warn('Could not check prompt logging setting:', error);
      return false;
    }
  }

  /**
   * Cleanup method for memory management
   */
  cleanup(): void {
    // Cleanup current image URL if it's a blob URL
    if (this.previousImageUrl && this.previousImageUrl.startsWith('blob:')) {
      memoryManager.revokeObjectURL(this.previousImageUrl);
      this.previousImageUrl = null;
    }
    
    if (this.state.imageUrl && this.state.imageUrl.startsWith('blob:')) {
      memoryManager.revokeObjectURL(this.state.imageUrl);
      this.state.imageUrl = undefined;
    }
    
    console.log('🧹 AvatarController cleanup completed');
  }
}
