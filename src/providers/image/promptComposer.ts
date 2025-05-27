import type { AvatarGenerationParams, AvatarExpression, AvatarPose, AvatarAction } from '../../avatar/types';

// Helper for simple seeded random number (0 to 1)
function seededRandom(seed: number): number {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

export interface ImagePromptComponents {
  character: string; // Core, consistent character description
  style: string; // Core stylistic keywords
  quality: string; // Core quality keywords
  negativePrompt?: string;

  // Fields for dynamic prompting
  situationalDescription: string; // Main description, either AI-provided or generated from state
  expressionKeywords: string; // Keywords for current expression
  poseKeywords: string; // Keywords for current pose
  actionKeywords: string; // Keywords for current action
  lightingKeywords: string; // Keywords for lighting
  backgroundKeywords: string; // Keywords for background

  // For variation
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
  isAIDescription?: boolean; // True if situationalDescription comes directly from AI's [IMAGE:] tag
  isMetaPrompted?: boolean; // True if using meta-prompting
  variationSeed?: number;
  contextualKeywords?: string[];
}

// Extended AvatarGenerationParams for internal use by composer
interface ExtendedAvatarGenerationParams extends AvatarGenerationParams {
  aiDescription?: string; // This is the raw description from [IMAGE: ...] tag
  variationSeed?: number;
  contextualKeywords?: string[];
}

export class ImagePromptComposer {
  private basePrompts = {
    character: 'Claudia, a young woman with warm chestnut hair cascading around her shoulders, bright hazel eyes full of curiosity',
    style: 'realistic digital art, warm illustration style, detailed character design, cinematic lighting',
    quality: 'high quality, detailed, beautiful composition, masterpiece, sharp focus',
    negativePrompt: 'blurry, low quality, distorted, ugly, deformed, disfigured, extra limbs, missing limbs, bad anatomy, watermark, signature, text, noise, grain, jpeg artifacts, poorly drawn, amateur, monochrome, grayscale'
  };

  // These now provide keywords/short phrases rather than full prompt segments
  private expressionKeywordsMap: Record<AvatarExpression, string> = {
    neutral: 'calm, neutral expression',
    happy: 'bright genuine smile, joyful',
    curious: 'inquisitive look, slightly tilted head',
    focused: 'intense concentrated look',
    thinking: 'thoughtful, contemplative expression',
    surprised: 'wide surprised eyes, astonished',
    confused: 'puzzled look, furrowed brow',
    excited: 'energetic excited smile, beaming',
    confident: 'confident assured smile, steady gaze',
    mischievous: 'playful smirk, knowing glint in eyes',
    sleepy: 'drowsy, tired expression, half-closed eyes',
    shocked: 'shocked expression, wide eyes, open mouth',
  };

  private poseKeywordsMap: Record<AvatarPose, string> = {
    standing: 'standing naturally',
    sitting: 'sitting comfortably',
    leaning: 'leaning casually',
    'crossed-arms': 'arms crossed confidently',
    'hands-on-hips': 'hands on hips',
    casual: 'relaxed casual stance',
  };

  private actionKeywordsMap: Record<AvatarAction, string> = {
    idle: 'at ease, observing',
    type: 'typing on a holographic keyboard',
    search: 'searching data on a holographic display',
    read: 'reading from a digital tablet',
    wave: 'friendly waving gesture',
    nod: 'nodding in agreement',
    shrug: 'light shrug',
    point: 'pointing towards something',
    think: 'deep in thought',
    work: 'interacting with digital interfaces',
  };

  generatePromptComponents(params: ExtendedAvatarGenerationParams): ImagePromptComponents {
    let situationalDesc = "";
    // If AI provides a description, that's our primary situational description
    if (params.aiDescription && params.aiDescription.trim().length > 0) {
      situationalDesc = params.aiDescription;
    } else {
      // Otherwise, generate a concise description from state
      const descParts = ['Claudia'];
      if (params.expression && this.expressionKeywordsMap[params.expression]) {
        descParts.push(this.expressionKeywordsMap[params.expression]);
      }
      if (params.pose && this.poseKeywordsMap[params.pose]) {
        descParts.push(this.poseKeywordsMap[params.pose]);
      }
      if (params.action && this.actionKeywordsMap[params.action]) {
        descParts.push(this.actionKeywordsMap[params.action]);
      }
      situationalDesc = descParts.join(', ');
    }

    let lighting = params.lighting || 'soft warm lighting';
    let background = params.background && params.background !== 'none' ? params.background : 'a cozy digital nook environment';

    // Apply variations if a seed is provided (typically for non-AI descriptions)
    if (params.variationSeed) {
      const rand = seededRandom(params.variationSeed);
      if (rand < 0.2) lighting = `dramatic ${lighting}`;
      else if (rand < 0.4) lighting = `cinematic ${lighting}`;
      else if (rand < 0.6) lighting = `studio ${lighting}`;
      
      if (rand > 0.7 && background.includes("digital nook")) {
        background += (rand > 0.85) ? ", with subtle futuristic city view" : ", with abstract data patterns";
      }
    }

    // Apply contextual keywords
    if (params.contextualKeywords && params.contextualKeywords.length > 0) {
        if (params.contextualKeywords.some(kw => kw === 'night' || kw === 'dark')) {
            lighting = `moody night lighting, ${lighting}`;
            if (background.includes("digital nook")) background = background.replace("digital nook", "digital nook at night");
        }
        if (params.contextualKeywords.some(kw => kw === 'code' || kw === 'programming')) {
            if (!params.action || params.action === 'idle') situationalDesc += ', focused on a holographic code display';
            background += ', futuristic coding interface elements';
        }
    }
    
    return {
      character: this.basePrompts.character,
      style: params.style || this.basePrompts.style, // Allow overriding base style
      quality: this.basePrompts.quality,
      negativePrompt: this.basePrompts.negativePrompt,
      situationalDescription: situationalDesc,
      expressionKeywords: params.expression ? this.expressionKeywordsMap[params.expression] || '' : '',
      poseKeywords: params.pose ? this.poseKeywordsMap[params.pose] || '' : '',
      actionKeywords: params.action ? this.actionKeywordsMap[params.action] || '' : '',
      lightingKeywords: lighting,
      backgroundKeywords: background,
      variationSeed: params.variationSeed,
      contextualKeywords: params.contextualKeywords,
    };
  }

  async applyPersonalityModifications(
    components: ImagePromptComponents,
    context: PromptModificationContext
  ): Promise<ImagePromptComponents> {
    const modifiedComponents = { ...components };
    const systemPrompt = context.personality.systemPrompt.toLowerCase();

    // If AI provided the description, personality mods are more about ensuring consistency
    // and adding subtle thematic elements rather than wholesale changes.
    if (context.isAIDescription) {
      if (!modifiedComponents.situationalDescription.toLowerCase().includes('claudia')) {
        // Prepend Claudia if AI didn't mention her by name in the description
        modifiedComponents.situationalDescription = `Claudia, ${modifiedComponents.situationalDescription}`;
      }
      // Ensure core character traits are subtly reinforced if not contradictory
      modifiedComponents.character = `${this.basePrompts.character}`; // Keep base character desc for style part
      
      if (systemPrompt.includes('technical expert') || systemPrompt.includes('highly analytical')) {
        modifiedComponents.style += ', precise details, clean aesthetic';
      } else if (systemPrompt.includes('whimsical storyteller') || systemPrompt.includes('dreamer')) {
        modifiedComponents.style += ', imaginative flair, slightly stylized';
      }

    } else { // Not an AI description, personality can have more influence
      if (systemPrompt.includes('technical expert') || systemPrompt.includes('highly analytical')) {
        modifiedComponents.style += ', sharp focus, clean lines, professional attire';
        modifiedComponents.backgroundKeywords = 'a minimalist high-tech environment, server racks, glowing data nodes';
        modifiedComponents.character = modifiedComponents.character.replace('warm chestnut hair', 'neatly styled chestnut hair');
      }
      if (systemPrompt.includes('whimsical storyteller') || systemPrompt.includes('dreamer')) {
        modifiedComponents.style += ', fantastical elements, soft painterly style, imaginative details';
        modifiedComponents.backgroundKeywords = 'an enchanted digital forest, glowing flora, magical atmosphere';
      }
    }
    
    // Use contextualKeywords from personality context if available
    if (context.contextualKeywords && context.contextualKeywords.length > 0) {
        if (context.contextualKeywords.some(kw => kw === 'formal' || kw === 'meeting')) {
            modifiedComponents.character = this.basePrompts.character.replace('young woman', 'professional young woman in smart attire');
            if (!context.isAIDescription) { // Don't override AI's pose if it specified one
                modifiedComponents.poseKeywords = 'attentive and professional pose';
            }
        }
    }

    return modifiedComponents;
  }

  compilePrompt(components: ImagePromptComponents): string {
    // Defensive checks for required properties
    const situationalDesc = components.situationalDescription || '';
    const character = components.character || '';
    const expressionKeywords = components.expressionKeywords || '';
    const poseKeywords = components.poseKeywords || '';
    const actionKeywords = components.actionKeywords || '';
    
    const promptParts = [
      situationalDesc, // This is the core: either AI's description or state-based
      character,       // Always include core character description for consistency
      // Add other components selectively to enhance, not override, situationalDescription
      // If situationalDescription is from AI, these might be redundant or less important
      // If situationalDescription is state-based, these add necessary detail
    ];

    // Only add additional keywords if they're not already included in the description
    if (situationalDesc && expressionKeywords) {
      const firstExpressionKeyword = expressionKeywords.split(',')[0]?.trim();
      if (firstExpressionKeyword && !situationalDesc.toLowerCase().includes(firstExpressionKeyword.toLowerCase())) {
        promptParts.push(expressionKeywords);
      }
    } else if (expressionKeywords) {
      promptParts.push(expressionKeywords);
    }
    
    if (situationalDesc && poseKeywords) {
      const firstPoseKeyword = poseKeywords.split(',')[0]?.trim();
      if (firstPoseKeyword && !situationalDesc.toLowerCase().includes(firstPoseKeyword.toLowerCase())) {
        promptParts.push(poseKeywords);
      }
    } else if (poseKeywords) {
      promptParts.push(poseKeywords);
    }
    
    if (situationalDesc && actionKeywords) {
      const firstActionKeyword = actionKeywords.split(',')[0]?.trim();
      if (firstActionKeyword && !situationalDesc.toLowerCase().includes(firstActionKeyword.toLowerCase())) {
        promptParts.push(actionKeywords);
      }
    } else if (actionKeywords) {
      promptParts.push(actionKeywords);
    }


    promptParts.push(components.style || '');
    promptParts.push(components.lightingKeywords || '');
    
    // Only add background if situationalDescription doesn't seem to imply one heavily
    if (!situationalDesc || !situationalDesc.match(/in a|at a|on a|inside|outside|background of/i)) {
        promptParts.push(components.backgroundKeywords || '');
    }
    promptParts.push(components.quality || '');

    return promptParts.filter(part => part && part.trim() !== '').join(', ');
  }

  getNegativePrompt(components: ImagePromptComponents): string {
    let baseNegative = components.negativePrompt || this.basePrompts.negativePrompt || '';
    if (components.situationalDescription) {
        const lowerDesc = components.situationalDescription.toLowerCase();
        if (lowerDesc.includes("no text") || lowerDesc.includes("remove text")) baseNegative += ", text, watermark, signature, letters, words, typography";
        if (lowerDesc.includes("not blurry")) baseNegative += ", blurry, motion blur, unclear, fuzzy";
        if (lowerDesc.includes("not dark")) baseNegative += ", too dark, underexposed, shadow";
    }
    return baseNegative;
  }

  setBasePrompts(newBasePrompts: Partial<typeof this.basePrompts>): void {
    this.basePrompts = { ...this.basePrompts, ...newBasePrompts };
  }
  
  // These are less critical now but can be kept for fine-tuning specific state keywords
  addExpressionPrompt(expression: AvatarExpression, keywords: string): void {
    this.expressionKeywordsMap[expression] = keywords;
  }
  addActionPrompt(action: AvatarAction, keywords: string): void {
    this.actionKeywordsMap[action] = keywords;
  }
  addPosePrompt(pose: AvatarPose, keywords: string): void {
    this.poseKeywordsMap[pose] = keywords;
  }


  getAvailableExpressions(): string[] {
    return Object.keys(this.expressionKeywordsMap) as AvatarExpression[];
  }
  getAvailablePoses(): string[] {
    return Object.keys(this.poseKeywordsMap) as AvatarPose[];
  }
  getAvailableActions(): string[] {
    return Object.keys(this.actionKeywordsMap) as AvatarAction[];
  }
}
