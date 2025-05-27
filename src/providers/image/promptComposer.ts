import type { AvatarGenerationParams, AvatarExpression, AvatarPose, AvatarAction } from '../../avatar/types';
import type { Personality } from '../../types/personality';
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
  private baseCharacterIdentity = "Claudia — early-20s, petite build; softly wavy, shoulder-length chestnut hair; bright hazel eyes; subtle freckles; natural makeup. She wears a flirty, pastel-yellow floral sundress with thin spaghetti straps and a deep-V neckline that reveals graceful collarbones and a hint of space between her small breasts (no push-up effect). The dress drapes lightly at her waist and moves gently with her pose";
  
  private basePrompts: Omit<ImagePromptComponents, 
    'expressionKeywords' | 'poseKeywords' | 'actionKeywords' | 
    'variationSeed' | 'contextualKeywords'
  > = {
    character: `${this.baseCharacterIdentity}`,
    style: "35mm full-frame mirrorless, 85mm prime lens, f/1.8, ISO 200, 1/125s, vertical 2:3 aspect ratio, Kodak Portra 400 film aesthetic",
    quality: "subtle film grain, slight vignette, soft highlights, rich midtones, timeless intimate atmosphere, dreamy yet grounded, organic textures",
    settingDescription: "A cozy bedroom at golden hour. Sunlight streams through a slightly dusty window, casting warm beams that pick up floating dust motes and create soft lens flare. The background is softly blurred (shallow depth-of-field) but hints at posters on the walls and fairy-lights whose bulbs form circular bokeh.",
    lightingKeywords: "Single natural key light from the sunlit window, balanced with faint ambient fill, natural lighting",
    backgroundKeywords: "cozy bedroom, golden hour sunlight, floating dust motes, soft lens flare, blurred background",
    negativePrompt: "blurry, low quality, distorted, ugly, deformed, disfigured, extra limbs, missing limbs, bad anatomy, watermark, signature, text, jpeg artifacts, poorly drawn, amateur, monochrome, grayscale, signature, username, artist name, logo, anime, cartoon, CGI, plastic skin, over-smoothness, harsh sharpening, digital over-processing, overly saturated colors, harsh studio lighting, artificial lighting, fluorescent lighting, invasive text, oversaturated, HDR effect"
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
    idle: 'at ease, observing her surroundings or waiting calmly',
    type: 'typing on a sleek holographic keyboard, focused on a floating display screen in her digital workspace',
    search: 'intently searching through data streams, analyzing information on a holographic display, focused and curious',
    read: 'reading from a floating digital tablet or holographic document, absorbed in the content',
    wave: 'a friendly waving gesture with a warm smile, welcoming and open',
    nod: 'nodding in agreement or understanding, attentive and engaged',
    shrug: 'a light shrug with palms slightly upturned, conveying uncertainty or a casual "who knows?"',
    point: 'pointing towards something specific, perhaps an element on a holographic display or off-screen, guiding attention',
    think: 'deep in thought, perhaps with a hand to her chin or looking upwards contemplatively',
    work: 'interacting with complex digital interfaces, manipulating holographic elements with focused precision',
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
      if (finalPrompt.length > 300) {
        finalPrompt = finalPrompt.substring(0, 300) + "...";
      }
      
      // Ensure core character identity is present and append style/quality
      finalPrompt = this.ensureBaseCharacter(finalPrompt);
      finalPrompt += `, ${components.styleKeywords}, ${components.qualityKeywords}`;
      return finalPrompt;
    } else {
      // Assemble from detailed components if no primary description
      const promptParts = [
        `Subject: ${this.ensureBaseCharacter(components.subjectDescription)}`, // Ensure base character here too
        `Pose / Expression: ${components.poseAndExpression}`,
        `Setting: ${components.settingDescription}`,
        `Atmosphere / Style: ${components.atmosphereAndStyle}, ${components.styleKeywords}`,
        `Lighting: ${components.lightingDescription}`,
        `Camera Perspective: ${components.cameraPerspectiveAndComposition}`,
        `Details & Realism Cues: ${components.realismAndDetails}`,
        components.qualityKeywords
      ];
      return promptParts.filter(part => part && part.trim() !== '').join('. ');
    }
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
}
