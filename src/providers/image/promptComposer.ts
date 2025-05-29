import type { AvatarGenerationParams, AvatarExpression, AvatarPose, AvatarAction } from '../../avatar/types';
import type { ImagePromptComponents, PromptModificationContext } from './types';

// Helper for simple seeded random number (0 to 1)
function seededRandom(seed: number): number {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}


interface ExtendedAvatarGenerationParams extends AvatarGenerationParams {
  aiDescription?: string; 
  variationSeed?: number;
  contextualKeywords?: string[];
  metaGeneratedImagePrompt?: string; 
}

export class ImagePromptComposer {
  private baseCharacterIdentity = "Claudia — early-20s woman, petite build, softly wavy shoulder-length chestnut hair, bright hazel eyes, subtle freckles, friendly appearance. She wears a casual tech-style outfit: fitted dark jeans and a comfortable light blue hoodie or sweater. Full body character sprite suitable for digital avatar";
  private customCharacterDescription?: string;
  
  private basePrompts: Omit<ImagePromptComponents, 
    'expressionKeywords' | 'poseKeywords' | 'actionKeywords' | 
    'variationSeed' | 'contextualKeywords'
  > = {
    character: `${this.baseCharacterIdentity}`,
    style: "anime style, 2d flat anime art, konosuba style, k-on style, modern anime art, flat 2d illustration, anime character design, manga style, cel-shading, transparent background, no shadows",
    quality: "clean anime lineart, sharp cel-shading, flat colors, anime character design, moe style, kawaii, high quality anime art, crisp 2d illustration",
    settingDescription: "transparent background, no environment, character isolated on transparent background, white background, studio lighting",
    lightingKeywords: "even studio lighting, soft diffused light, no dramatic shadows, clean illumination",
    backgroundKeywords: "transparent background, isolated character, no background elements, white background",
    negativePrompt: "realistic, 3d, photorealistic, photograph, real person, detailed shadows, harsh lighting, complex background, environment, landscape",
    // Additional required fields
    primaryDescription: `${this.baseCharacterIdentity}`,
    poseAndExpression: "neutral pose with calm expression",
    baseCharacterReference: `${this.baseCharacterIdentity}`,
    subjectDescription: "young woman in sundress",
    cameraPerspectiveAndComposition: "full body view, character sprite perspective, vertical composition showing complete figure from head to toe",
    realismAndDetails: "anime art style, 2d flat illustration, cel-shaded character design",
    styleKeywords: "anime, manga style, konosuba, k-on, 2d flat art, cel-shading",
    qualityKeywords: "high resolution anime art, clean lineart, flat colors, moe style",
    atmosphereAndStyle: "warm, intimate, natural lighting",
    lightingDescription: "Single natural key light from the sunlit window, balanced with faint ambient fill, natural lighting"
  };

  private expressionDetailsMap: Record<AvatarExpression, string> = {
    neutral: 'gazing calmly into the lens with a faint, knowing smile',
    happy: 'a bright genuine smile lighting up her face, eyes sparkling with joy',
    curious: 'an inquisitive raised eyebrow, head slightly tilted with keen interest',
    focused: 'intense concentrated look, eyes narrowed in determination, sharp focus',
    thinking: 'thoughtful contemplative look, perhaps a finger gently touching her temple, lost in thought',
    surprised: 'wide surprised eyes, eyebrows slightly raised, mouth forming a soft "o" of astonishment',
    confused: 'a puzzled look, furrowed brow, head tilted in slight confusion',
    excited: 'an energetic excited smile, eyes wide and bright with enthusiasm, beaming',
    confident: 'a confident assured smile, steady direct gaze, an air of self-assuredness',
    mischievous: 'a playful smirk, a knowing glint in her eyes, a hint of playful intent',
    sleepy: 'drowsy, tired expression, half-closed eyes, a soft yawn escaping',
    shocked: 'shocked expression, wide eyes, open mouth in disbelief',
  };

  private poseDetailsMap: Record<AvatarPose, string> = {
    standing: 'standing naturally, balanced and approachable',
    sitting: 'sitting comfortably in a relaxed yet engaged posture',
    leaning: 'leaning casually against a subtle background element, informal and relaxed',
    'crossed-arms': 'arms crossed confidently, projecting thoughtfulness or assertiveness',
    'hands-on-hips': 'hands on hips, conveying confidence or a moment of playful challenge',
    casual: 'in a relaxed casual stance, completely at ease in her environment',
  };

  private actionDetailsMap: Record<AvatarAction, string> = {
    idle: 'standing naturally with arms at her sides, relaxed neutral pose',
    type: 'hands positioned as if typing, fingers slightly curved, focused working pose',
    search: 'one hand raised near her face in a searching gesture, looking attentive and curious',
    read: 'holding an invisible tablet or device, looking down with concentration',
    wave: 'one hand raised in a friendly waving gesture, warm and welcoming',
    nod: 'head tilted slightly forward in a nodding motion, engaged and agreeable',
    shrug: 'shoulders slightly raised with palms turned upward, casual uncertain gesture',
    point: 'one arm extended pointing forward, directing attention with confidence',
    think: 'one hand near her chin or temple, thoughtful contemplative pose',
    work: 'hands positioned for interaction, focused productive stance',
  };

  generatePromptComponents = (params: ExtendedAvatarGenerationParams): ImagePromptComponents => {
    const components = { ...this.basePrompts } as ImagePromptComponents; 

    if (params.metaGeneratedImagePrompt) {
      components.primaryDescription = params.metaGeneratedImagePrompt;
    } else if (params.aiDescription) {
      components.primaryDescription = params.aiDescription;
    }
    
    let poseExpr = `${this.poseDetailsMap[params.pose || 'standing']}. Her expression is ${this.expressionDetailsMap[params.expression || 'neutral']}.`;
    if (params.action && params.action !== 'idle' && this.actionDetailsMap[params.action]) {
      poseExpr += ` She is currently ${this.actionDetailsMap[params.action]}.`;
    }
    components.poseAndExpression = poseExpr;

    if (params.style) components.style = params.style;
    if (params.lighting) components.lightingDescription = `Lighting: ${params.lighting}. ${this.basePrompts.lightingDescription}`;
    if (params.background && params.background !== 'none') {
      components.settingDescription = `Setting: ${params.background}. ${this.basePrompts.settingDescription}`;
    }
    
    components.expressionKeywords = this.expressionDetailsMap[params.expression || 'neutral'];
    components.poseKeywords = this.poseDetailsMap[params.pose || 'standing'];
    components.actionKeywords = this.actionDetailsMap[params.action || 'idle'];
    components.baseCharacterReference = this.basePrompts.baseCharacterReference;

    if (params.variationSeed && !components.primaryDescription) {
      const rand = seededRandom(params.variationSeed);
      if (rand < 0.3) components.lightingDescription = `Lighting: dramatic highlights. ${components.lightingDescription}`;
      else if (rand < 0.6) components.cameraPerspectiveAndComposition = `Camera Perspective: slightly low angle shot. ${components.cameraPerspectiveAndComposition}`;
      if (rand > 0.5) components.realismAndDetails += " A few stray hairs catch the light.";
    }

    if (params.contextualKeywords && params.contextualKeywords.length > 0 && !components.primaryDescription) {
        if (params.contextualKeywords.some(kw => kw === 'night' || kw === 'dark')) {
            components.lightingDescription = `Lighting: moody night lighting, neon reflections. ${components.lightingDescription}`;
            components.settingDescription = components.settingDescription.replace("digital nook environment", "digital nook environment at night, glowing city lights visible through a window");
        }
    }
    
    components.variationSeed = params.variationSeed;
    components.contextualKeywords = params.contextualKeywords;

    return components;
  }

  applyPersonalityModifications = async (
    components: ImagePromptComponents,
    context: PromptModificationContext
  ): Promise<ImagePromptComponents> => {
    const modifiedComponents = { ...components };
    const personality = context.personality; // Now full PersonalityData
    const isPrimaryDescriptionDriven = !!(context.isAIDescription || context.isMetaPrompted || modifiedComponents.primaryDescription);

    // Apply structured visual preferences from personality
    if (personality.preferredClothingStyle) {
      if (isPrimaryDescriptionDriven) {
        // If AI/Meta described clothing, just ensure Claudia's base is there and append style hint
        modifiedComponents.subjectDescription = this.ensureBaseCharacter(modifiedComponents.primaryDescription || modifiedComponents.subjectDescription) + ` She is wearing ${personality.preferredClothingStyle}.`;
      } else {
        modifiedComponents.subjectDescription = `${this.baseCharacterIdentity} She is wearing ${personality.preferredClothingStyle}.`;
      }
    }
    if (personality.typicalEnvironmentKeywords && !isPrimaryDescriptionDriven) { // Don't override AI/Meta scene
      modifiedComponents.settingDescription = `Setting: ${personality.typicalEnvironmentKeywords}. ${this.basePrompts.settingDescription}`;
    }
    if (personality.artStyleModifiers) {
      modifiedComponents.styleKeywords += `, ${personality.artStyleModifiers}`;
    }
    
    // Existing system prompt keyword logic (can be kept for broader strokes or refined)
    const systemPrompt = personality.system_prompt.toLowerCase();
    if (systemPrompt.includes('technical expert') || systemPrompt.includes('highly analytical')) {
      modifiedComponents.styleKeywords += ', precise, sharp focus, clean aesthetic';
      if (!isPrimaryDescriptionDriven) { 
        modifiedComponents.settingDescription = `Setting: a minimalist high-tech lab or modern data center, glowing server racks. ${modifiedComponents.settingDescription}`;
      }
    } else if (systemPrompt.includes('whimsical storyteller') || systemPrompt.includes('dreamer')) {
      modifiedComponents.styleKeywords += ', fantastical elements, soft painterly style, imaginative details';
      if (!isPrimaryDescriptionDriven) {
        modifiedComponents.settingDescription = `Setting: an enchanted digital forest with glowing flora, or a library filled with ancient, magical tomes. ${modifiedComponents.settingDescription}`;
      }
    }
    
    if (isPrimaryDescriptionDriven) {
        modifiedComponents.subjectDescription = this.ensureBaseCharacter(modifiedComponents.primaryDescription || modifiedComponents.subjectDescription);
    } else {
        // Ensure base character is set if not primary description driven
        modifiedComponents.subjectDescription = this.ensureBaseCharacter(modifiedComponents.subjectDescription);
    }

    return modifiedComponents;
  }
  
  private ensureBaseCharacter = (description: string): string => {
      let currentDesc = description || "";
      if (!currentDesc.toLowerCase().includes('claudia')) {
          currentDesc = `${this.baseCharacterIdentity} ${currentDesc}`;
      } else {
        // Ensure core traits are present if "Claudia" is mentioned but details are missing
        if (!currentDesc.toLowerCase().includes('chestnut hair')) currentDesc += ", chestnut hair";
        if (!currentDesc.toLowerCase().includes('hazel eyes')) currentDesc += ", hazel eyes";
        if (!currentDesc.toLowerCase().includes('freckles')) currentDesc += ", light freckles";
      }
      return currentDesc;
  }

  compilePrompt = (components: ImagePromptComponents): string => {
    if (components.primaryDescription && components.primaryDescription.trim().length > 0) {
      let finalPrompt = components.primaryDescription;
      
      // Limit AI description length to prevent overwhelming the prompt
      if (finalPrompt.length > 400) {
        finalPrompt = finalPrompt.substring(0, 400) + "...";
      }
      
      // Ensure core character identity is present and validate prompt quality
      finalPrompt = this.ensureBaseCharacter(finalPrompt);
      finalPrompt = this.validatePromptCoherence(finalPrompt);
      finalPrompt += `. Photography style: ${components.styleKeywords}. Quality: ${components.qualityKeywords}`;
      return finalPrompt;
    } else {
      // Assemble from detailed components if no primary description
      const promptParts = [
        `Subject: ${this.ensureBaseCharacter(components.subjectDescription)}`,
        `Pose and Expression: ${components.poseAndExpression}`,
        `Setting: ${components.settingDescription}`,
        `Style: ${components.styleKeywords}`,
        `Lighting: ${components.lightingDescription}`,
        `Camera: ${components.cameraPerspectiveAndComposition}`,
        `Quality: ${components.qualityKeywords}`
      ];
      return promptParts.filter(part => part && part.trim() !== '' && !part.includes('undefined')).join(', ');
    }
  }

  private validatePromptCoherence = (prompt: string): string => {
    let cleanPrompt = prompt;
    
    // Remove contradictory or problematic phrases
    const problematicPhrases = [
      'low quality', 'bad anatomy', 'blurry', 'distorted', 
      'deformed', 'ugly', 'amateur', 'jpeg artifacts'
    ];
    
    problematicPhrases.forEach(phrase => {
      const regex = new RegExp(phrase, 'gi');
      cleanPrompt = cleanPrompt.replace(regex, '');
    });
    
    // Clean up extra commas and spaces
    cleanPrompt = cleanPrompt.replace(/,+/g, ',').replace(/\s+/g, ' ').trim();
    cleanPrompt = cleanPrompt.replace(/^,+|,+$/g, ''); // Remove leading/trailing commas
    
    return cleanPrompt;
  }

  getNegativePrompt = (components: ImagePromptComponents): string => {
    let finalNegativePrompt = components.negativePrompt || this.basePrompts.negativePrompt || '';
    if (components.primaryDescription) {
        const lowerDesc = components.primaryDescription.toLowerCase();
        if (lowerDesc.includes("no text") || lowerDesc.includes("remove text")) finalNegativePrompt += ", text, watermark, signature, letters, words, typography";
        if (lowerDesc.includes("not blurry")) finalNegativePrompt += ", blurry, motion blur, unclear, fuzzy";
        if (lowerDesc.includes("not dark")) finalNegativePrompt += ", too dark, underexposed, shadow";
    }
    return finalNegativePrompt;
  }

  setBasePrompts = (newBasePrompts: Partial<typeof this.basePrompts>): void => {
    this.basePrompts = { ...this.basePrompts, ...newBasePrompts };
    if (newBasePrompts.character) this.baseCharacterIdentity = newBasePrompts.character;
  }

  /**
   * Override style and quality keywords for different image styles
   */
  setStyleKeywords = (styleKeywords: string, qualityKeywords?: string): void => {
    this.basePrompts.style = styleKeywords;
    if (qualityKeywords) {
      this.basePrompts.quality = qualityKeywords;
    }
  }

  /**
   * Set a completely custom base character identity
   */
  setCharacterIdentity = (identity: string): void => {
    this.baseCharacterIdentity = identity;
  }
  
  addExpressionPrompt = (expression: AvatarExpression, details: string): void => {
    this.expressionDetailsMap[expression] = details;
  }
  addActionPrompt = (action: AvatarAction, details: string): void => {
    this.actionDetailsMap[action] = details;
  }
  addPosePrompt = (pose: AvatarPose, details: string): void => {
    this.poseDetailsMap[pose] = details;
  }

  getAvailableExpressions = (): string[] => {
    return Object.keys(this.expressionDetailsMap) as AvatarExpression[];
  }
  getAvailablePoses = (): string[] => {
    return Object.keys(this.poseDetailsMap) as AvatarPose[];
  }
  getAvailableActions = (): string[] => {
    return Object.keys(this.actionDetailsMap) as AvatarAction[];
  }

  getCustomCharacterDescription = (): string | undefined => {
    return this.customCharacterDescription;
  }

  setCustomCharacterDescription = (description: string | undefined): void => {
    this.customCharacterDescription = description;
    // Update basePrompts to reflect the new character description
    this.basePrompts.character = this.getCharacterDescription();
    this.basePrompts.primaryDescription = this.getCharacterDescription();
    this.basePrompts.baseCharacterReference = this.getCharacterDescription();
  }

  getCharacterDescription = (): string => {
    return this.customCharacterDescription || this.baseCharacterIdentity;
  }

  // Advanced prompt customization
  setCustomQualityKeywords = (keywords: string): void => {
    if (keywords.trim()) {
      this.basePrompts.quality = keywords;
      this.basePrompts.qualityKeywords = keywords;
    }
  }

  setCustomStyleKeywords = (keywords: string): void => {
    if (keywords.trim()) {
      this.basePrompts.style = keywords;
      this.basePrompts.styleKeywords = keywords;
    }
  }

  setCustomLightingKeywords = (keywords: string): void => {
    if (keywords.trim()) {
      this.basePrompts.lightingKeywords = keywords;
      this.basePrompts.lightingDescription = keywords;
    }
  }

  setCustomCompositionRules = (rules: string): void => {
    if (rules.trim()) {
      this.basePrompts.cameraPerspectiveAndComposition = rules;
    }
  }

  // Get current prompt components for UI display
  getCurrentPromptComponents = () => {
    return {
      quality: this.basePrompts.quality,
      style: this.basePrompts.style,
      lighting: this.basePrompts.lightingKeywords,
      composition: this.basePrompts.cameraPerspectiveAndComposition,
      negative: this.basePrompts.negativePrompt
    };
  }
}
