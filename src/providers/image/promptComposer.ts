import type { AvatarGenerationParams, AvatarExpression, AvatarPose, AvatarAction } from '../../avatar/types';

// Helper for simple seeded random number (0 to 1)
function seededRandom(seed: number): number {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

export interface ImagePromptComponents {
  subjectDescription: string;        
  poseAndExpression: string;       
  settingDescription: string;      
  atmosphereAndStyle: string;      
  lightingDescription: string;     
  cameraPerspectiveAndComposition: string; 
  realismAndDetails: string;       
  
  styleKeywords: string;           
  qualityKeywords: string;         
  negativePrompt: string;

  primaryDescription?: string; 

  baseCharacterReference: string; 
  expressionKeywords: string;
  poseKeywords: string;
  actionKeywords: string;

  variationSeed?: number;
  contextualKeywords?: string[];
}

export interface PromptModificationContext {
  personality: {
    name: string;
    systemPrompt: string;
  };
  currentMood?: string;
  previousActions?: string[];
  conversationContext?: string;
  isAIDescription?: boolean; 
  isMetaPrompted?: boolean; 
  variationSeed?: number;
  contextualKeywords?: string[];
}

interface ExtendedAvatarGenerationParams extends AvatarGenerationParams {
  aiDescription?: string; 
  variationSeed?: number;
  contextualKeywords?: string[];
  metaGeneratedImagePrompt?: string; 
}

export class ImagePromptComposer {
  private baseCharacterIdentity = "Claudia, a petite woman in her early 20s, softly wavy chestnut hair to her shoulders, bright hazel eyes, light freckles across her cheeks, subtle natural makeup.";
  
  private basePrompts: Omit<ImagePromptComponents, 
    'primaryDescription' | 
    'expressionKeywords' | 'poseKeywords' | 'actionKeywords' | 
    'variationSeed' | 'contextualKeywords'
  > = {
    subjectDescription: `${this.baseCharacterIdentity} She wears a flirty, above-knee floral sundress with a deep but tasteful V-neck (small bust, visible space between breasts, no push-up), thin spaghetti straps, light fabric.`,
    poseAndExpression: "Standing three-quarters toward camera, gazing calmly into the lens with a faint, knowing smile.",
    settingDescription: "A cozy digital nook environment, warm comfortable space with soft furnishings, hints of bookshelves or plants.",
    atmosphereAndStyle: "Warm illustration style, cozy atmosphere, detailed character design. Fine film-grain texture; slight background motion blur and bokeh.",
    lightingDescription: "Soft warm lighting, cozy ambient glow, gentle highlights. No harsh studio flash.",
    cameraPerspectiveAndComposition: "Eye-level medium shot, subject centered. Shallow depth of field.",
    realismAndDetails: "Subtle clothing wrinkles, natural hair strands.",
    styleKeywords: "realistic digital art, cinematic",
    qualityKeywords: "high quality, detailed, beautiful composition, masterpiece, sharp focus, ultra-realistic photograph",
    negativePrompt: "blurry, low quality, distorted, ugly, deformed, disfigured, extra limbs, missing limbs, bad anatomy, watermark, signature, text, noise, grain, jpeg artifacts, poorly drawn, amateur, monochrome, grayscale, signature, username, artist name, logo, anime, cartoon, CGI, plastic skin, over-smoothness, over-sharpening, lens distortions, overly saturated colors, invasive text",
    baseCharacterReference: "Claudia" 
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

    if (params.style) components.styleKeywords = params.style;
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
    const systemPrompt = context.personality.systemPrompt.toLowerCase();
    const isPrimaryDescriptionDriven = !!(context.isAIDescription || context.isMetaPrompted || modifiedComponents.primaryDescription);

    if (systemPrompt.includes('technical expert') || systemPrompt.includes('highly analytical')) {
      modifiedComponents.styleKeywords += ', precise, sharp focus, clean aesthetic';
      if (!isPrimaryDescriptionDriven) { 
        modifiedComponents.settingDescription = "Setting: a minimalist high-tech lab or modern data center, glowing server racks.";
        modifiedComponents.subjectDescription = modifiedComponents.subjectDescription.replace("flirty, above-knee floral sundress", "sleek professional attire, perhaps a modern dark blazer and smart trousers");
      } else {
         modifiedComponents.subjectDescription = this.ensureBaseCharacter(modifiedComponents.subjectDescription) + " She's dressed in smart, functional clothing.";
      }
    } else if (systemPrompt.includes('whimsical storyteller') || systemPrompt.includes('dreamer')) {
      modifiedComponents.styleKeywords += ', fantastical elements, soft painterly style, imaginative details';
      if (!isPrimaryDescriptionDriven) {
        modifiedComponents.settingDescription = "Setting: an enchanted digital forest with glowing flora, or a library filled with ancient, magical tomes.";
        modifiedComponents.subjectDescription = modifiedComponents.subjectDescription.replace("flirty, above-knee floral sundress", "flowing ethereal dress or a whimsical, layered outfit with unique accessories");
      } else {
        modifiedComponents.subjectDescription = this.ensureBaseCharacter(modifiedComponents.subjectDescription) + " Her attire has a touch of whimsy.";
      }
    }
    
    if (isPrimaryDescriptionDriven) {
        modifiedComponents.subjectDescription = this.ensureBaseCharacter(modifiedComponents.primaryDescription || modifiedComponents.subjectDescription);
    }

    return modifiedComponents;
  }
  
  private ensureBaseCharacter = (description: string): string => {
      if (!description.toLowerCase().includes('claudia')) {
          return `${this.baseCharacterIdentity} ${description}`;
      }
      let ensuredDesc = description;
      if (!description.toLowerCase().includes('chestnut hair')) ensuredDesc += ", chestnut hair";
      if (!description.toLowerCase().includes('hazel eyes')) ensuredDesc += ", hazel eyes";
      return ensuredDesc;
  }

  compilePrompt = (components: ImagePromptComponents): string => {
    if (components.primaryDescription && components.primaryDescription.trim().length > 0) {
      let finalPrompt = components.primaryDescription;
      if (!finalPrompt.toLowerCase().includes('claudia')) {
          finalPrompt = `${components.baseCharacterReference}, ${finalPrompt}`;
      }
      finalPrompt += `, ${components.styleKeywords}, ${components.qualityKeywords}`;
      return finalPrompt;
    } else {
      const promptParts = [
        `Subject: ${components.subjectDescription}`,
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
