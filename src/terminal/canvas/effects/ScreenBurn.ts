/**
 * Screen Burn Effect
 * Simulates subtle burn-in effects from static elements on CRT displays
 */

import type { CRTConfig, TerminalChar, EffectRenderer } from '../types/interfaces';
import { ColorUtils } from '../utils/ColorUtils';

interface BurnPixel {
  x: number;
  y: number;
  character: string;
  burnIntensity: number;
  lastSeen: number;
  totalExposure: number; // Cumulative exposure time
}

export class ScreenBurn {
  private burnMap: Map<string, BurnPixel> = new Map();
  private burnThreshold: number = 5000; // ms before burn starts
  private maxBurnIntensity: number = 0.15; // Maximum burn opacity
  private burnDecayRate: number = 0.0001; // How fast burn fades when not displayed
  private exposureRate: number = 0.0002; // How fast burn accumulates

  constructor() {}

  /**
   * Update burn-in effect based on displayed characters
   */
  update(textBuffer: TerminalChar[], deltaTime: number): void {
    const currentTime = performance.now();
    
    // Track static characters
    const activePositions = new Set<string>();
    
    textBuffer.forEach(char => {
      const key = `${char.x},${char.y}`;
      activePositions.add(key);
      
      const existing = this.burnMap.get(key);
      
      if (existing && existing.character === char.character) {
        // Same character in same position - increase burn
        const exposureTime = currentTime - existing.lastSeen;
        
        if (exposureTime > this.burnThreshold) {
          existing.totalExposure += deltaTime;
          existing.burnIntensity = Math.min(
            this.maxBurnIntensity,
            existing.totalExposure * this.exposureRate
          );
        }
        
        existing.lastSeen = currentTime;
      } else {
        // New character or changed character
        this.burnMap.set(key, {
          x: char.x,
          y: char.y,
          character: char.character,
          burnIntensity: 0,
          lastSeen: currentTime,
          totalExposure: 0
        });
      }
    });
    
    // Decay burn for positions without active characters
    for (const [key, pixel] of this.burnMap) {
      if (!activePositions.has(key)) {
        const timeSinceLastSeen = currentTime - pixel.lastSeen;
        
        // Start decaying after character disappears
        if (timeSinceLastSeen > 1000) { // 1 second grace period
          pixel.burnIntensity -= this.burnDecayRate * deltaTime;
          pixel.burnIntensity = Math.max(0, pixel.burnIntensity);
          
          // Remove completely faded pixels
          if (pixel.burnIntensity <= 0.001) {
            this.burnMap.delete(key);
          }
        }
      }
    }
  }

  /**
   * Render burn-in effect
   */
  render: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    if (this.burnMap.size === 0) return;

    ctx.save();
    
    // Set font for rendering burn characters
    ctx.font = `${config.fontSize}px ${config.fontFamily}`;
    ctx.textBaseline = 'top';
    
    const charWidth = config.fontSize * 0.6; // Approximate monospace character width
    
    // Create burn color (darker version of phosphor color)
    const phosphorRgb = ColorUtils.hexToRgb(config.phosphorColor);
    const burnColor = {
      r: Math.floor(phosphorRgb.r * 0.3),
      g: Math.floor(phosphorRgb.g * 0.3),
      b: Math.floor(phosphorRgb.b * 0.3)
    };
    
    // Render each burned pixel
    for (const pixel of this.burnMap.values()) {
      if (pixel.burnIntensity <= 0.001) continue;
      
      const pixelX = pixel.x * charWidth;
      const pixelY = pixel.y * config.lineHeight;
      
      // Set burn color with appropriate opacity
      ctx.fillStyle = ColorUtils.rgbToCss(burnColor, pixel.burnIntensity);
      ctx.fillText(pixel.character, pixelX, pixelY);
    }
    
    ctx.restore();
  };

  /**
   * Render burn-in with glow effect
   */
  renderWithGlow: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    if (this.burnMap.size === 0) return;

    ctx.save();
    
    const charWidth = config.fontSize * 0.6;
    const phosphorRgb = ColorUtils.hexToRgb(config.phosphorColor);
    
    // First pass - glow
    ctx.globalCompositeOperation = 'screen';
    
    for (const pixel of this.burnMap.values()) {
      if (pixel.burnIntensity <= 0.001) continue;
      
      const pixelX = pixel.x * charWidth;
      const pixelY = pixel.y * config.lineHeight;
      
      // Create subtle glow around burn
      const glowRadius = 2;
      const gradient = ColorUtils.createGlowGradient(
        ctx,
        pixelX + charWidth / 2,
        pixelY + config.lineHeight / 2,
        glowRadius,
        config.phosphorColor
      );
      
      ctx.globalAlpha = pixel.burnIntensity * 0.3;
      ctx.fillStyle = gradient;
      ctx.fillRect(
        pixelX - glowRadius,
        pixelY - glowRadius,
        charWidth + glowRadius * 2,
        config.lineHeight + glowRadius * 2
      );
    }
    
    // Second pass - burn characters
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `${config.fontSize}px ${config.fontFamily}`;
    ctx.textBaseline = 'top';
    
    const burnColor = {
      r: Math.floor(phosphorRgb.r * 0.2),
      g: Math.floor(phosphorRgb.g * 0.2),
      b: Math.floor(phosphorRgb.b * 0.2)
    };
    
    for (const pixel of this.burnMap.values()) {
      if (pixel.burnIntensity <= 0.001) continue;
      
      const pixelX = pixel.x * charWidth;
      const pixelY = pixel.y * config.lineHeight;
      
      ctx.globalAlpha = pixel.burnIntensity;
      ctx.fillStyle = ColorUtils.rgbToCss(burnColor);
      ctx.fillText(pixel.character, pixelX, pixelY);
    }
    
    ctx.restore();
  };

  /**
   * Create artificial burn patterns for demonstration
   */
  createDemoBurn(text: string, x: number, y: number, intensity: number = 0.1): void {
    for (let i = 0; i < text.length; i++) {
      const key = `${x + i},${y}`;
      this.burnMap.set(key, {
        x: x + i,
        y: y,
        character: text[i],
        burnIntensity: Math.min(this.maxBurnIntensity, intensity),
        lastSeen: performance.now() - this.burnThreshold - 1000,
        totalExposure: intensity / this.exposureRate
      });
    }
  }

  /**
   * Configure burn parameters
   */
  setBurnParameters(
    threshold: number,
    maxIntensity: number,
    decayRate: number,
    exposureRate: number
  ): void {
    this.burnThreshold = Math.max(1000, threshold);
    this.maxBurnIntensity = Math.max(0.01, Math.min(0.5, maxIntensity));
    this.burnDecayRate = Math.max(0.00001, decayRate);
    this.exposureRate = Math.max(0.00001, exposureRate);
  }

  /**
   * Clear all burn data
   */
  clear(): void {
    this.burnMap.clear();
  }

  /**
   * Get burn statistics
   */
  getStats(): {
    burnedPixels: number;
    averageBurnIntensity: number;
    maxBurnIntensity: number;
  } {
    let totalIntensity = 0;
    let maxIntensity = 0;
    
    for (const pixel of this.burnMap.values()) {
      totalIntensity += pixel.burnIntensity;
      maxIntensity = Math.max(maxIntensity, pixel.burnIntensity);
    }
    
    return {
      burnedPixels: this.burnMap.size,
      averageBurnIntensity: this.burnMap.size > 0 ? totalIntensity / this.burnMap.size : 0,
      maxBurnIntensity: maxIntensity
    };
  }

  /**
   * Export burn data for persistence
   */
  exportBurnData(): any {
    const data: any = {};
    
    for (const [key, pixel] of this.burnMap) {
      if (pixel.burnIntensity > 0.01) {
        data[key] = {
          x: pixel.x,
          y: pixel.y,
          character: pixel.character,
          burnIntensity: pixel.burnIntensity,
          totalExposure: pixel.totalExposure
        };
      }
    }
    
    return data;
  }

  /**
   * Import burn data from persistence
   */
  importBurnData(data: any): void {
    this.clear();
    const currentTime = performance.now();
    
    for (const [key, pixelData] of Object.entries(data)) {
      this.burnMap.set(key, {
        x: (pixelData as any).x,
        y: (pixelData as any).y,
        character: (pixelData as any).character,
        burnIntensity: (pixelData as any).burnIntensity,
        lastSeen: currentTime,
        totalExposure: (pixelData as any).totalExposure
      });
    }
  }
}