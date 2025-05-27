/**
 * Phosphor Glow Effect
 * Simulates the characteristic glow and persistence of CRT phosphor coating
 */

import type { CRTConfig, TerminalChar, EffectRenderer } from '../types/interfaces';
import { ColorUtils } from '../utils/ColorUtils';

export class PhosphorGlow {
  private phosphorMap: Map<string, PhosphorPixel> = new Map();
  private decayRate: number = 0.02; // How fast phosphor fades
  private glowRadius: number = 3; // Radius of glow effect

  constructor() {}

  /**
   * Update phosphor persistence for all characters
   */
  update(textBuffer: TerminalChar[], deltaTime: number): void {
    const currentTime = performance.now();
    
    // Update existing phosphor pixels
    for (const [key, pixel] of this.phosphorMap) {
      const age = currentTime - pixel.timestamp;
      const decay = Math.min(1, age / 1000 * this.decayRate);
      pixel.intensity = Math.max(0, pixel.baseIntensity - decay);
      
      // Remove completely faded pixels
      if (pixel.intensity <= 0.01) {
        this.phosphorMap.delete(key);
      }
    }
    
    // Add/update phosphor for current text
    textBuffer.forEach(char => {
      const key = `${char.x},${char.y}`;
      const existing = this.phosphorMap.get(key);
      
      if (existing) {
        // Refresh existing phosphor
        existing.timestamp = char.timestamp;
        existing.baseIntensity = Math.max(existing.baseIntensity, char.brightness);
        existing.character = char.char;
      } else {
        // Create new phosphor pixel
        this.phosphorMap.set(key, {
          x: char.x,
          y: char.y,
          character: char.char,
          timestamp: char.timestamp,
          baseIntensity: char.brightness,
          intensity: char.brightness
        });
      }
    });
  }

  /**
   * Render phosphor glow effect
   */
  render: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    if (config.glowIntensity <= 0) return;

    // Save context state
    ctx.save();
    
    // Set blend mode for glow effect
    ctx.globalCompositeOperation = 'screen';
    
    // Calculate character dimensions
    const charWidth = config.fontSize * 0.6; // Approximate monospace character width
    const charHeight = config.lineHeight;
    
    // Render glow for each phosphor pixel
    for (const pixel of this.phosphorMap.values()) {
      if (pixel.intensity <= 0.01) continue;
      
      const pixelX = pixel.x * charWidth;
      const pixelY = pixel.y * charHeight;
      
      // Create glow gradient
      const glowRadius = this.glowRadius * config.glowIntensity;
      const gradient = ColorUtils.createGlowGradient(
        ctx,
        pixelX + charWidth / 2,
        pixelY + charHeight / 2,
        glowRadius,
        config.phosphorColor
      );
      
      // Apply intensity
      ctx.globalAlpha = pixel.intensity * config.glowIntensity;
      
      // Draw glow
      ctx.fillStyle = gradient;
      ctx.fillRect(
        pixelX - glowRadius,
        pixelY - glowRadius,
        charWidth + glowRadius * 2,
        charHeight + glowRadius * 2
      );
    }
    
    // Restore context state
    ctx.restore();
  };

  /**
   * Render phosphor persistence (afterglow)
   */
  renderPersistence(ctx: CanvasRenderingContext2D, config: CRTConfig): void {
    if (config.glowIntensity <= 0) return;

    ctx.save();
    
    // Set font for rendering faded characters
    ctx.font = `${config.fontSize}px ${config.fontFamily}`;
    ctx.textBaseline = 'top';
    
    const charWidth = config.fontSize * 0.6;
    
    // Render faded phosphor characters
    for (const pixel of this.phosphorMap.values()) {
      if (pixel.intensity <= 0.1 || pixel.intensity >= 0.9) continue;
      
      const pixelX = pixel.x * charWidth;
      const pixelY = pixel.y * config.lineHeight;
      
      // Create decay color
      const decayColor = ColorUtils.createDecayColor(
        config.phosphorColor,
        1 - pixel.intensity
      );
      
      ctx.fillStyle = decayColor;
      ctx.fillText(pixel.character, pixelX, pixelY);
    }
    
    ctx.restore();
  }

  /**
   * Set decay rate (higher = faster fade)
   */
  setDecayRate(rate: number): void {
    this.decayRate = Math.max(0.001, Math.min(1, rate));
  }

  /**
   * Set glow radius
   */
  setGlowRadius(radius: number): void {
    this.glowRadius = Math.max(1, Math.min(10, radius));
  }

  /**
   * Clear all phosphor data
   */
  clear(): void {
    this.phosphorMap.clear();
  }

  /**
   * Get phosphor statistics
   */
  getStats(): { activePixels: number; totalIntensity: number } {
    let totalIntensity = 0;
    
    for (const pixel of this.phosphorMap.values()) {
      totalIntensity += pixel.intensity;
    }
    
    return {
      activePixels: this.phosphorMap.size,
      totalIntensity
    };
  }
}

interface PhosphorPixel {
  x: number;
  y: number;
  character: string;
  timestamp: number;
  baseIntensity: number;
  intensity: number;
}