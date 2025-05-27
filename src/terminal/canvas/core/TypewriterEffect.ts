/**
 * Typewriter Effect Engine
 * Handles character-by-character text animation with realistic timing
 */

import type { CRTConfig, PrintOptions } from '../types/interfaces';

export interface TypewriterState {
  isActive: boolean;
  currentText: string;
  targetText: string;
  charIndex: number;
  lastCharTime: number;
  speed: number; // characters per second
  onComplete?: () => void;
  onCharacter?: (char: string, index: number) => void;
}

export class TypewriterEffect {
  private activeAnimations: Map<string, TypewriterState> = new Map();
  private globalSpeed: number = 30; // default characters per second
  private variableSpeed: boolean = true; // Add realistic timing variation

  constructor() {}

  /**
   * Start typewriter animation for text
   */
  startAnimation(
    id: string,
    text: string,
    speed?: number,
    options?: {
      onComplete?: () => void;
      onCharacter?: (char: string, index: number) => void;
      instantPunctuation?: boolean;
      pauseOnPunctuation?: number;
    }
  ): void {
    const animation: TypewriterState = {
      isActive: true,
      currentText: '',
      targetText: text,
      charIndex: 0,
      lastCharTime: performance.now(),
      speed: speed || this.globalSpeed,
      onComplete: options?.onComplete,
      onCharacter: options?.onCharacter
    };

    this.activeAnimations.set(id, animation);
  }

  /**
   * Update all active typewriter animations
   */
  update(deltaTime: number): void {
    const currentTime = performance.now();

    for (const [id, animation] of this.activeAnimations) {
      if (!animation.isActive || animation.charIndex >= animation.targetText.length) {
        // Animation complete
        if (animation.onComplete) {
          animation.onComplete();
        }
        this.activeAnimations.delete(id);
        continue;
      }

      const timeBetweenChars = 1000 / animation.speed;
      const timeSinceLastChar = currentTime - animation.lastCharTime;

      if (timeSinceLastChar >= timeBetweenChars) {
        // Add next character
        const nextChar = animation.targetText[animation.charIndex];
        animation.currentText += nextChar;
        
        // Call character callback
        if (animation.onCharacter) {
          animation.onCharacter(nextChar, animation.charIndex);
        }

        animation.charIndex++;
        animation.lastCharTime = currentTime;

        // Add realistic timing variation
        if (this.variableSpeed) {
          const variation = this.getCharacterTimingVariation(nextChar);
          animation.lastCharTime += variation;
        }
      }
    }
  }

  /**
   * Get realistic timing variation for different characters
   */
  private getCharacterTimingVariation(char: string): number {
    // Punctuation gets longer pauses
    if ('.!?'.includes(char)) {
      return Math.random() * 200 + 300; // 300-500ms pause
    }
    
    if (',;:'.includes(char)) {
      return Math.random() * 100 + 100; // 100-200ms pause
    }
    
    if (char === ' ') {
      return Math.random() * 50 + 25; // 25-75ms pause
    }
    
    if (char === '\n') {
      return Math.random() * 150 + 200; // 200-350ms pause for new lines
    }
    
    // Regular characters get small random variation
    return (Math.random() - 0.5) * 50; // ±25ms variation
  }

  /**
   * Get current text for an animation
   */
  getCurrentText(id: string): string {
    const animation = this.activeAnimations.get(id);
    return animation ? animation.currentText : '';
  }

  /**
   * Check if animation is active
   */
  isAnimationActive(id: string): boolean {
    const animation = this.activeAnimations.get(id);
    return animation ? animation.isActive : false;
  }

  /**
   * Stop animation
   */
  stopAnimation(id: string, showComplete: boolean = false): void {
    const animation = this.activeAnimations.get(id);
    if (animation) {
      animation.isActive = false;
      
      if (showComplete) {
        animation.currentText = animation.targetText;
      }
      
      this.activeAnimations.delete(id);
    }
  }

  /**
   * Pause/resume animation
   */
  pauseAnimation(id: string, paused: boolean): void {
    const animation = this.activeAnimations.get(id);
    if (animation) {
      animation.isActive = !paused;
      if (!paused) {
        // Reset timing when resuming
        animation.lastCharTime = performance.now();
      }
    }
  }

  /**
   * Set global typewriter speed
   */
  setSpeed(charactersPerSecond: number): void {
    this.globalSpeed = Math.max(1, Math.min(100, charactersPerSecond));
  }

  /**
   * Enable/disable realistic timing variation
   */
  setVariableSpeed(enabled: boolean): void {
    this.variableSpeed = enabled;
  }

  /**
   * Get animation progress (0 to 1)
   */
  getProgress(id: string): number {
    const animation = this.activeAnimations.get(id);
    if (!animation || animation.targetText.length === 0) {
      return 0;
    }
    return animation.charIndex / animation.targetText.length;
  }

  /**
   * Create typing simulation with errors and corrections
   */
  startRealisticTyping(
    id: string,
    text: string,
    options?: {
      errorRate?: number; // 0-1, chance of making a typo
      correctionDelay?: number; // ms delay before correction
      speed?: number;
      onComplete?: () => void;
    }
  ): void {
    const errorRate = options?.errorRate || 0.05;
    const correctionDelay = options?.correctionDelay || 500;
    const speed = options?.speed || this.globalSpeed;

    let processedText = '';
    let originalIndex = 0;

    const processNextChar = () => {
      if (originalIndex >= text.length) {
        if (options?.onComplete) {
          options.onComplete();
        }
        return;
      }

      const shouldMakeError = Math.random() < errorRate;
      const targetChar = text[originalIndex];

      if (shouldMakeError && targetChar.match(/[a-zA-Z]/)) {
        // Make a typo
        const wrongChar = String.fromCharCode(
          targetChar.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1)
        );
        
        // Type wrong character
        this.startAnimation(`${id}_temp`, processedText + wrongChar, speed, {
          onComplete: () => {
            // Pause, then correct
            setTimeout(() => {
              // Backspace (remove wrong character)
              processedText = processedText.slice(0, -1);
              
              // Type correct character
              processedText += targetChar;
              originalIndex++;
              
              this.startAnimation(`${id}_correct`, processedText, speed * 1.5, {
                onComplete: processNextChar
              });
            }, correctionDelay);
          }
        });
      } else {
        // Type correct character
        processedText += targetChar;
        originalIndex++;
        
        this.startAnimation(`${id}_char`, processedText, speed, {
          onComplete: processNextChar
        });
      }
    };

    processNextChar();
  }

  /**
   * Simulate command typing with cursor movement
   */
  simulateCommandTyping(
    text: string,
    onProgress: (currentText: string, cursorPos: number) => void,
    onComplete: () => void,
    speed: number = 25
  ): void {
    let currentText = '';
    let charIndex = 0;
    
    const typeNext = () => {
      if (charIndex >= text.length) {
        onComplete();
        return;
      }
      
      currentText += text[charIndex];
      onProgress(currentText, currentText.length);
      charIndex++;
      
      const delay = 1000 / speed + this.getCharacterTimingVariation(text[charIndex - 1]);
      setTimeout(typeNext, delay);
    };
    
    typeNext();
  }

  /**
   * Clear all active animations
   */
  clearAll(): void {
    this.activeAnimations.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    activeAnimations: number;
    totalCharactersTyped: number;
    averageSpeed: number;
  } {
    let totalChars = 0;
    let totalSpeed = 0;
    
    for (const animation of this.activeAnimations.values()) {
      totalChars += animation.charIndex;
      totalSpeed += animation.speed;
    }
    
    return {
      activeAnimations: this.activeAnimations.size,
      totalCharactersTyped: totalChars,
      averageSpeed: this.activeAnimations.size > 0 ? totalSpeed / this.activeAnimations.size : 0
    };
  }
}