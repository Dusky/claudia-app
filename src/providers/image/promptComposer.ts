import type { AvatarGenerationParams } from '../../avatar/types';

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
}

export interface PromptModificationContext {
  personality: {
    name: string;
    systemPrompt: string;
  };
  currentMood?: string;
  previousActions?: string[];
  conversationContext?: string;
}

export class ImagePromptComposer {
  // Base prompts that can be modified by personality
  private basePrompts: ImagePromptComponents = {
    character: 'young woman named Claudia with warm chestnut hair cascading around shoulders, bright hazel eyes full of curiosity, wearing cute sundress with floral patterns or comfortable casual top',
    expression: 'warm inviting smile with playful energy',
    pose: 'relaxed approachable stance, naturally graceful',
    action: 'casual welcoming gesture, effortlessly charming',
    style: 'realistic digital art, warm illustration style, cozy atmosphere',
    lighting: 'soft warm lighting, cozy ambient glow, firefly-inspired atmosphere',
    background: 'cozy digital nook environment, warm comfortable space with bookshelves, soft furnishings, firefly-inspired ambiance',
    quality: 'high quality, detailed, beautiful composition, inviting scene',
    negativePrompt: 'blurry, low quality, distorted, harsh lighting, cold atmosphere, cyberpunk, neon'
  };

  // Expression-specific modifications
  private expressionPrompts: Record<string, Partial<ImagePromptComponents>> = {
    happy: {
      expression: 'bright genuine smile, sparkling eyes, joyful expression',
      lighting: 'warm golden lighting, cheerful atmosphere'
    },
    curious: {
      expression: 'inquisitive raised eyebrow, tilted head, interested gaze',
      pose: 'leaning forward slightly, engaged posture'
    },
    focused: {
      expression: 'intense concentrated look, narrowed eyes, determined expression',
      lighting: 'sharp focused lighting, dramatic shadows'
    },
    thinking: {
      expression: 'thoughtful contemplative look, finger on chin',
      action: 'thinking pose, pondering gesture',
      lighting: 'soft thoughtful lighting'
    },
    surprised: {
      expression: 'wide surprised eyes, raised eyebrows, open mouth',
      action: 'surprised gesture, hands slightly raised'
    },
    confident: {
      expression: 'confident assured smile, steady gaze',
      pose: 'confident upright posture, hands on hips',
      lighting: 'strong confident lighting'
    },
    mischievous: {
      expression: 'playful smirk, glinting eyes, sly smile',
      action: 'playful gesture, finger to lips'
    },
    excited: {
      expression: 'energetic excited smile, bright eyes',
      action: 'animated gesture, slight bounce in posture',
      lighting: 'dynamic energetic lighting'
    }
  };

  // Pose-specific modifications
  private posePrompts: Record<string, Partial<ImagePromptComponents>> = {
    sitting: {
      pose: 'sitting comfortably, relaxed posture',
      background: 'cozy chair or soft surface, warm digital nook with bookshelf'
    },
    leaning: {
      pose: 'leaning casually against surface, relaxed stance'
    },
    'crossed-arms': {
      pose: 'arms crossed confidently, assertive posture'
    },
    'hands-on-hips': {
      pose: 'hands on hips, confident stance'
    }
  };

  // Action-specific modifications
  private actionPrompts: Record<string, Partial<ImagePromptComponents>> = {
    typing: {
      action: 'typing on holographic keyboard, focused on screen',
      background: 'digital interface, code streams, futuristic workspace'
    },
    searching: {
      action: 'searching through data streams, analyzing information',
      background: 'data visualization, digital networks, flowing information'
    },
    reading: {
      action: 'reading digital information, scanning data',
      background: 'floating text displays, digital documents'
    },
    wave: {
      action: 'friendly waving gesture, welcoming pose',
      expression: 'warm friendly smile'
    },
    point: {
      action: 'pointing gesture, directing attention',
      expression: 'focused explanatory look'
    },
    work: {
      action: 'working with digital interfaces, manipulating holograms',
      background: 'advanced digital workspace, floating interfaces'
    }
  };

  /**
   * Generate prompt components based on avatar parameters
   */
  generatePromptComponents(params: AvatarGenerationParams): ImagePromptComponents {
    let components = { ...this.basePrompts };

    // Apply expression-specific modifications
    if (params.expression && this.expressionPrompts[params.expression]) {
      components = this.mergeComponents(components, this.expressionPrompts[params.expression]);
    }

    // Apply pose-specific modifications
    if (params.pose && this.posePrompts[params.pose]) {
      components = this.mergeComponents(components, this.posePrompts[params.pose]);
    }

    // Apply action-specific modifications
    if (params.action && this.actionPrompts[params.action]) {
      components = this.mergeComponents(components, this.actionPrompts[params.action]);
    }

    return components;
  }

  /**
   * Allow personality to modify prompt components based on context
   */
  async applyPersonalityModifications(
    components: ImagePromptComponents,
    context: PromptModificationContext
  ): Promise<ImagePromptComponents> {
    // This is where the personality system would modify the prompts
    // For now, we'll implement some basic personality-aware modifications
    
    const systemPrompt = context.personality.systemPrompt.toLowerCase();
    
    // Analyze personality traits from system prompt
    const modifiedComponents = { ...components };

    // If personality mentions being technical/professional
    if (systemPrompt.includes('technical') || systemPrompt.includes('professional') || systemPrompt.includes('expert')) {
      modifiedComponents.style += ', professional appearance, technical aesthetic';
      modifiedComponents.background = 'high-tech laboratory, advanced computers, technical environment';
    }

    // If personality mentions being friendly/casual
    if (systemPrompt.includes('friendly') || systemPrompt.includes('casual') || systemPrompt.includes('approachable')) {
      modifiedComponents.lighting = 'warm friendly lighting, welcoming atmosphere';
      modifiedComponents.character += ', approachable appearance';
    }

    // If personality mentions being mysterious/enigmatic
    if (systemPrompt.includes('mysterious') || systemPrompt.includes('enigmatic') || systemPrompt.includes('secretive')) {
      modifiedComponents.lighting = 'dramatic mysterious lighting, shadowy atmosphere';
      modifiedComponents.style += ', mysterious aura, ethereal quality';
    }

    // If personality mentions being energetic/enthusiastic
    if (systemPrompt.includes('energetic') || systemPrompt.includes('enthusiastic') || systemPrompt.includes('vibrant')) {
      modifiedComponents.lighting = 'bright energetic lighting, vibrant colors';
      modifiedComponents.style += ', dynamic energy, vibrant appearance';
    }

    // Consider conversation context
    if (context.conversationContext) {
      const contextLower = context.conversationContext.toLowerCase();
      
      if (contextLower.includes('coding') || contextLower.includes('programming')) {
        modifiedComponents.background = 'coding environment, multiple screens, code displays';
        modifiedComponents.action = 'working with code, programming gesture';
      }
      
      if (contextLower.includes('help') || contextLower.includes('assist')) {
        modifiedComponents.expression = 'helpful encouraging smile, supportive gaze';
        modifiedComponents.action = 'helpful gesture, reaching out pose';
      }
      
      if (contextLower.includes('error') || contextLower.includes('problem')) {
        modifiedComponents.expression = 'concerned understanding look, empathetic expression';
        modifiedComponents.action = 'thinking pose, problem-solving gesture';
      }
    }

    return modifiedComponents;
  }

  /**
   * Compile components into final prompt string
   */
  compilePrompt(components: ImagePromptComponents): string {
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

  /**
   * Get the negative prompt
   */
  getNegativePrompt(components: ImagePromptComponents): string {
    return components.negativePrompt || this.basePrompts.negativePrompt || '';
  }

  /**
   * Allow direct prompt component modification (for advanced users or personality system)
   */
  setBasePrompts(newBasePrompts: Partial<ImagePromptComponents>): void {
    this.basePrompts = { ...this.basePrompts, ...newBasePrompts };
  }

  /**
   * Add new expression prompts
   */
  addExpressionPrompt(expression: string, components: Partial<ImagePromptComponents>): void {
    this.expressionPrompts[expression] = components;
  }

  /**
   * Add new action prompts
   */
  addActionPrompt(action: string, components: Partial<ImagePromptComponents>): void {
    this.actionPrompts[action] = components;
  }

  /**
   * Merge two component objects, with the second taking precedence
   */
  private mergeComponents(
    base: ImagePromptComponents,
    override: Partial<ImagePromptComponents>
  ): ImagePromptComponents {
    const merged = { ...base };
    
    Object.entries(override).forEach(([key, value]) => {
      if (value) {
        merged[key as keyof ImagePromptComponents] = value;
      }
    });

    return merged;
  }

  /**
   * Get all available expressions
   */
  getAvailableExpressions(): string[] {
    return Object.keys(this.expressionPrompts);
  }

  /**
   * Get all available poses
   */
  getAvailablePoses(): string[] {
    return Object.keys(this.posePrompts);
  }

  /**
   * Get all available actions
   */
  getAvailableActions(): string[] {
    return Object.keys(this.actionPrompts);
  }
}