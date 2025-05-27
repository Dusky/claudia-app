import type { AvatarGenerationParams, AvatarExpression, AvatarPose, AvatarAction } from '../../avatar/types';

// Helper for simple seeded random number (0 to 1)
function seededRandom(seed: number): number {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

export interface ImagePromptComponents {
  character: string;
  expression: string;
  pose: string;
  action: string;
  style: string;
  lighting: string;
  background: string;
  quality: string;
  negativePrompt?: string;
  // New fields for more dynamic prompting
  aiDescription?: string; // Holds the raw AI description if provided
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
  // New fields
  isAIDescription?: boolean;
  variationSeed?: number;
  contextualKeywords?: string[];
}

// Extended AvatarGenerationParams for internal use by composer
interface ExtendedAvatarGenerationParams extends AvatarGenerationParams {
  aiDescription?: string;
  variationSeed?: number;
  contextualKeywords?: string[];
}

export class ImagePromptComposer {
  private basePrompts: Omit<ImagePromptComponents, 'aiDescription' | 'variationSeed' | 'contextualKeywords'> = {
    character: 'Claudia, a young woman with warm chestnut hair cascading around her shoulders, bright hazel eyes full of curiosity',
    expression: 'a warm inviting smile, playful energy',
    pose: 'relaxed approachable stance, naturally graceful',
    action: 'casual welcoming gesture, effortlessly charming',
    style: 'realistic digital art, warm illustration style, cozy atmosphere, detailed character design',
    lighting: 'soft warm lighting, cozy ambient glow, gentle highlights',
    background: 'a cozy digital nook environment, warm comfortable space with soft furnishings, hints of bookshelves or plants',
    quality: 'high quality, detailed, beautiful composition, inviting scene, masterpiece',
    negativePrompt: 'blurry, low quality, distorted, harsh lighting, cold atmosphere, cyberpunk, neon, ugly, deformed, disfigured, extra limbs, missing limbs, bad anatomy, watermark, signature, text'
  };

  private expressionPrompts: Record<AvatarExpression, Partial<ImagePromptComponents>> = {
    neutral: { expression: 'a calm neutral expression, thoughtful and serene' },
    happy: { expression: 'a bright genuine smile, sparkling eyes, joyful and radiant expression', lighting: 'warm golden hour lighting, cheerful atmosphere' },
    curious: { expression: 'an inquisitive raised eyebrow, slightly tilted head, interested and engaged gaze', pose: 'leaning forward slightly, attentive posture' },
    focused: { expression: 'an intense concentrated look, narrowed eyes, determined and sharp expression', lighting: 'clear focused lighting, subtle dramatic shadows' },
    thinking: { expression: 'a thoughtful contemplative look, perhaps a finger gently touching her chin or temple', action: 'thinking pose, pondering gesture', lighting: 'soft, slightly dimmed thoughtful lighting' },
    surprised: { expression: 'wide surprised eyes, slightly raised eyebrows, mouth slightly agape in astonishment', action: 'surprised gesture, perhaps hands near face' },
    confused: { expression: 'a puzzled look, furrowed brow, slightly tilted head in confusion', lighting: 'neutral, slightly diffused lighting' },
    excited: { expression: 'an energetic excited smile, bright wide eyes, beaming with enthusiasm', action: 'animated gesture, perhaps a slight bounce or open body language', lighting: 'dynamic, bright energetic lighting' },
    confident: { expression: 'a confident assured smile, steady direct gaze, strong posture', pose: 'confident upright posture, perhaps hands on hips or a determined stance', lighting: 'strong, clear, confident lighting' },
    // Add other expressions as needed
    mischievous: { expression: 'a playful smirk, a knowing glint in her eyes, sly and impish smile', action: 'a subtle playful gesture, perhaps a finger to her lips or a wink' },

  };

  private posePrompts: Record<AvatarPose, Partial<ImagePromptComponents>> = {
    standing: { pose: 'standing naturally, balanced and approachable stance' },
    sitting: { pose: 'sitting comfortably, relaxed yet engaged posture', background: 'a cozy chair or soft surface within her digital nook' },
    leaning: { pose: 'leaning casually against a subtle background element, relaxed and informal stance' },
    'crossed-arms': { pose: 'arms crossed confidently, thoughtful or assertive posture' },
    'hands-on-hips': { pose: 'hands on hips, conveying confidence or readiness' },
    // Add other poses
    casual: { pose: 'a relaxed casual stance, at ease in her environment' },
  };

  private actionPrompts: Record<AvatarAction, Partial<ImagePromptComponents>> = {
    idle: { action: 'at ease, observing or waiting calmly' },
    type: { action: 'typing on a sleek holographic keyboard, focused on a floating display screen', background: 'her digital workspace with subtle data streams or interface elements' },
    search: { action: ' intently searching through data streams, analyzing information on a holographic display', expression: 'focused and curious expression' },
    read: { action: 'reading from a floating digital tablet or holographic document, absorbed in the content', expression: 'focused or thoughtful expression' },
    wave: { action: 'a friendly waving gesture, welcoming and open pose', expression: 'a warm friendly smile' },
    nod: { action: 'nodding in agreement or understanding, attentive expression' },
    shrug: { action: 'a light shrug, conveying uncertainty or a casual "who knows?" expression' },
    point: { action: 'pointing towards something off-screen or at a holographic element, guiding attention', expression: 'focused or explanatory look' },
    think: { action: 'deep in thought, perhaps with a hand to her chin or looking upwards contemplatively', expression: 'thinking or contemplative expression' },
    // Add other actions
    work: { action: 'interacting with complex digital interfaces, manipulating holographic elements with focus', background: 'an advanced digital workspace with multiple floating displays and data flows'}
  };

  generatePromptComponents(params: ExtendedAvatarGenerationParams): ImagePromptComponents {
    let components = { ...this.basePrompts, aiDescription: params.aiDescription, variationSeed: params.variationSeed, contextualKeywords: params.contextualKeywords };

    if (params.expression && this.expressionPrompts[params.expression]) {
      components = this.mergeComponents(components, this.expressionPrompts[params.expression]);
    }
    if (params.pose && this.posePrompts[params.pose]) {
      components = this.mergeComponents(components, this.posePrompts[params.pose]);
    }
    if (params.action && this.actionPrompts[params.action]) {
      components = this.mergeComponents(components, this.actionPrompts[params.action]);
    }
    
    // Apply variations if not an AI-driven description and seed is provided
    if (!params.aiDescription && params.variationSeed) {
      const rand = seededRandom(params.variationSeed);
      if (rand < 0.33) {
        components.lighting = `gentle ambient glow, ${components.lighting}`;
      } else if (rand < 0.66) {
        components.lighting = `${components.lighting}, subtle rim lighting`;
      }
      // Add more subtle variations for background, style, etc.
      if (components.background.includes("digital nook")) {
         if (rand > 0.5) components.background += ", with glowing data particles floating gently";
         else components.background += ", with soft holographic plants nearby";
      }
    }

    // Apply contextual keywords if not an AI-driven description
    if (!params.aiDescription && params.contextualKeywords && params.contextualKeywords.length > 0) {
        if (params.contextualKeywords.some(kw => kw === 'night' || kw === 'dark')) {
            components.lighting = `moody night lighting, ${components.lighting}`;
            if (components.background.includes("digital nook")) {
                components.background = components.background.replace("digital nook", "digital nook at night");
            }
        }
        if (params.contextualKeywords.some(kw => kw === 'code' || kw === 'programming' || kw === 'technical')) {
            if (!params.action || params.action === 'idle') components.action = 'focused on a holographic code display';
            components.background += ', futuristic coding interface elements';
        }
    }
    
    // If a specific style is requested in params, it should override parts of the base style
    if (params.style && params.style !== this.basePrompts.style) {
        components.style = `${params.style}, ${this.basePrompts.style}`; // Blend, or decide on override logic
    }
    if (params.background && params.background !== 'none' && params.background !== this.basePrompts.background) {
        components.background = params.background;
    }
    if (params.lighting && params.lighting !== this.basePrompts.lighting) {
        components.lighting = params.lighting;
    }


    return components;
  }

  async applyPersonalityModifications(
    components: ImagePromptComponents,
    context: PromptModificationContext
  ): Promise<ImagePromptComponents> {
    const modifiedComponents = { ...components };
    const systemPrompt = context.personality.systemPrompt.toLowerCase();

    // Example: If personality is "technical expert"
    if (systemPrompt.includes('technical expert') || systemPrompt.includes('highly analytical')) {
      modifiedComponents.style += ', sharp focus, clean lines, professional attire';
      if (!context.isAIDescription || !modifiedComponents.background.includes('technical')) { // Avoid override if AI specified something else
        modifiedComponents.background = 'a minimalist high-tech environment, server racks, glowing data nodes';
      }
      modifiedComponents.character = modifiedComponents.character.replace('cute sundress with floral patterns or comfortable casual top', 'sleek professional attire, perhaps a modern blouse or smart jacket');
    }

    // Example: If personality is "whimsical storyteller"
    if (systemPrompt.includes('whimsical storyteller') || systemPrompt.includes('dreamer')) {
      modifiedComponents.style += ', fantastical elements, soft painterly style, imaginative details';
      if (!context.isAIDescription) {
        modifiedComponents.background = 'an enchanted digital forest, glowing flora, magical atmosphere';
      }
      modifiedComponents.character = modifiedComponents.character.replace('cute sundress with floral patterns or comfortable casual top', 'flowing ethereal dress or whimsical outfit');
    }
    
    // If it's an AI description, personality mods should be more about ensuring core Claudia traits
    if (context.isAIDescription) {
        if (!modifiedComponents.character.toLowerCase().includes('claudia')) {
            modifiedComponents.character = `Claudia, ${modifiedComponents.character}`;
        }
        // Ensure core visual traits are present if AI description is vague on character
        if (!modifiedComponents.character.toLowerCase().includes('chestnut hair')) {
            modifiedComponents.character += ', warm chestnut hair';
        }
        if (!modifiedComponents.character.toLowerCase().includes('hazel eyes')) {
            modifiedComponents.character += ', bright hazel eyes';
        }
    }

    // Use contextualKeywords from personality context if available
    if (context.contextualKeywords && context.contextualKeywords.length > 0) {
        if (context.contextualKeywords.some(kw => kw === 'formal' || kw === 'meeting')) {
            modifiedComponents.character = modifiedComponents.character.replace('cute sundress with floral patterns or comfortable casual top', 'smart business casual attire');
            modifiedComponents.pose = 'attentive and professional pose';
        }
    }

    return modifiedComponents;
  }

  compilePrompt(components: ImagePromptComponents): string {
    if (components.aiDescription && components.aiDescription.trim().length > 0) {
      // AI Description Driven Prompt
      // Prioritize AI description, supplement with essential character and style details.
      // Ensure core character description is present.
      let coreCharacter = this.basePrompts.character;
      if (components.character && !components.character.toLowerCase().includes('claudia')) {
        coreCharacter = `Claudia, ${components.character}`;
      } else if (components.character) {
        coreCharacter = components.character; // Use the component if it already has Claudia
      }


      const promptParts = [
        components.aiDescription, // The main scene/action from AI
        coreCharacter,            // Ensure Claudia's core look is there
        components.expression,    // Expression derived from AI description or default
        components.pose,          // Pose derived from AI description or default
        // Add key style elements, but don't let them overpower the AI's description too much
        `(${components.style.split(',').slice(0, 3).join(',')})`, // Take first few style keywords
        components.lighting,
        components.quality
      ].filter(part => part && part.trim() !== '');
      return promptParts.join(', ');

    } else {
      // Command/Emotion Driven Prompt (classic compilation)
      const promptParts = [
        components.character,
        components.expression,
        components.pose,
        components.action,
        components.style,
        components.lighting,
        components.background,
        components.quality
      ].filter(part => part && part.trim() !== '');
      return promptParts.join(', ');
    }
  }

  getNegativePrompt(components: ImagePromptComponents): string {
    let baseNegative = components.negativePrompt || this.basePrompts.negativePrompt || '';
    if (components.aiDescription) {
        const lowerDesc = components.aiDescription.toLowerCase();
        if (lowerDesc.includes("no text") || lowerDesc.includes("remove text")) baseNegative += ", text, watermark, signature, letters";
        if (lowerDesc.includes("not blurry")) baseNegative += ", blurry, motion blur";
        if (lowerDesc.includes("not dark")) baseNegative += ", too dark, underexposed";
    }
    return baseNegative;
  }

  setBasePrompts(newBasePrompts: Partial<Omit<ImagePromptComponents, 'aiDescription' | 'variationSeed' | 'contextualKeywords'>>): void {
    this.basePrompts = { ...this.basePrompts, ...newBasePrompts };
  }

  addExpressionPrompt(expression: AvatarExpression, components: Partial<ImagePromptComponents>): void {
    this.expressionPrompts[expression] = this.mergeComponents(this.expressionPrompts[expression] || {}, components);
  }
  
  addActionPrompt(action: AvatarAction, components: Partial<ImagePromptComponents>): void {
    this.actionPrompts[action] = this.mergeComponents(this.actionPrompts[action] || {}, components);
  }

  addPosePrompt(pose: AvatarPose, components: Partial<ImagePromptComponents>): void {
    this.posePrompts[pose] = this.mergeComponents(this.posePrompts[pose] || {}, components);
  }

  private mergeComponents(
    base: Partial<ImagePromptComponents>,
    override: Partial<ImagePromptComponents>
  ): Partial<ImagePromptComponents> {
    const merged = { ...base };
    for (const key in override) {
      if (Object.prototype.hasOwnProperty.call(override, key)) {
        const k = key as keyof ImagePromptComponents;
        if (override[k]) { // Check if the value is not undefined or null
          // For string concatenation, ensure base part exists or initialize
          if (typeof merged[k] === 'string' && typeof override[k] === 'string') {
            merged[k] = `${merged[k]}, ${override[k]}`; // Append, or define smarter logic
          } else {
            (merged as any)[k] = override[k];
          }
        }
      }
    }
    return merged;
  }

  getAvailableExpressions(): string[] {
    return Object.keys(this.expressionPrompts) as AvatarExpression[];
  }

  getAvailablePoses(): string[] {
    return Object.keys(this.posePrompts) as AvatarPose[];
  }

  getAvailableActions(): string[] {
    return Object.keys(this.actionPrompts) as AvatarAction[];
  }
}
