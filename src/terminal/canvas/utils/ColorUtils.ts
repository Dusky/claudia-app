/**
 * Color Utilities
 * Helper functions for color manipulation and phosphor simulation
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export class ColorUtils {
  /**
   * Parse hex color to RGB
   */
  static hexToRgb(hex: string): RGB {
    const cleanHex = hex.replace('#', '');
    
    if (cleanHex.length === 3) {
      // Short hex format (e.g., #0F0)
      return {
        r: parseInt(cleanHex[0] + cleanHex[0], 16),
        g: parseInt(cleanHex[1] + cleanHex[1], 16),
        b: parseInt(cleanHex[2] + cleanHex[2], 16)
      };
    } else if (cleanHex.length === 6) {
      // Full hex format (e.g., #00FF00)
      return {
        r: parseInt(cleanHex.substr(0, 2), 16),
        g: parseInt(cleanHex.substr(2, 2), 16),
        b: parseInt(cleanHex.substr(4, 2), 16)
      };
    }
    
    throw new Error(`Invalid hex color: ${hex}`);
  }

  /**
   * RGB to CSS color string
   */
  static rgbToCss(rgb: RGB, alpha: number = 1): string {
    if (alpha < 1) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  }

  /**
   * Create phosphor glow color with specified intensity
   */
  static createGlowColor(baseColor: string, intensity: number): string {
    const rgb = this.hexToRgb(baseColor);
    
    // Increase brightness for glow effect
    const glowRgb = {
      r: Math.min(255, rgb.r + (255 - rgb.r) * intensity),
      g: Math.min(255, rgb.g + (255 - rgb.g) * intensity),
      b: Math.min(255, rgb.b + (255 - rgb.b) * intensity)
    };
    
    return this.rgbToCss(glowRgb);
  }

  /**
   * Create phosphor decay color (dimmed version)
   */
  static createDecayColor(baseColor: string, decayAmount: number): string {
    const rgb = this.hexToRgb(baseColor);
    const alpha = Math.max(0, 1 - decayAmount);
    
    return this.rgbToCss(rgb, alpha);
  }

  /**
   * Interpolate between two colors
   */
  static interpolateColors(color1: RGB, color2: RGB, factor: number): RGB {
    const clampedFactor = Math.max(0, Math.min(1, factor));
    
    return {
      r: Math.round(color1.r + (color2.r - color1.r) * clampedFactor),
      g: Math.round(color1.g + (color2.g - color1.g) * clampedFactor),
      b: Math.round(color1.b + (color2.b - color1.b) * clampedFactor)
    };
  }

  /**
   * Create gradient for phosphor glow effect
   */
  static createGlowGradient(
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    radius: number, 
    color: string
  ): CanvasGradient {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    
    const rgb = this.hexToRgb(color);
    
    gradient.addColorStop(0, this.rgbToCss(rgb, 0.8));
    gradient.addColorStop(0.3, this.rgbToCss(rgb, 0.4));
    gradient.addColorStop(0.7, this.rgbToCss(rgb, 0.1));
    gradient.addColorStop(1, this.rgbToCss(rgb, 0));
    
    return gradient;
  }

  /**
   * Get predefined phosphor colors for common CRT types
   */
  static getPhosphorPresets(): Record<string, string> {
    return {
      green: '#00FF00',      // P1 - Classic green phosphor
      amber: '#FFAA00',      // P3 - Amber phosphor
      white: '#FFFFFF',      // P4 - White phosphor
      blue: '#0088FF',       // P7 - Blue phosphor
      cyan: '#00FFFF',       // Cyan
      orange: '#FF6600',     // Orange
      red: '#FF3300'         // Red phosphor
    };
  }

  /**
   * Validate color string
   */
  static isValidColor(color: string): boolean {
    try {
      this.hexToRgb(color);
      return true;
    } catch {
      return false;
    }
  }
}