/**
 * Bloom Effect
 * Creates an intense glow/bloom effect around bright text elements
 */

import type { CRTConfig, EffectRenderer } from '../types/interfaces';
import { ColorUtils } from '../utils/ColorUtils';

export class BloomEffect {
  private bloomCanvas: HTMLCanvasElement | null = null;
  private bloomCtx: CanvasRenderingContext2D | null = null;
  private blurRadius: number = 8;
  private bloomThreshold: number = 0.7; // Brightness threshold for bloom
  private bloomIntensity: number = 1.5;

  constructor() {}

  /**
   * Initialize bloom effect resources
   */
  initialize(width: number, height: number): void {
    if (!this.bloomCanvas) {
      this.bloomCanvas = document.createElement('canvas');
      this.bloomCtx = this.bloomCanvas.getContext('2d')!;
    }
    
    this.bloomCanvas.width = width;
    this.bloomCanvas.height = height;
  }

  /**
   * Extract bright areas for bloom processing
   */
  extractBrightAreas(ctx: CanvasRenderingContext2D, config: CRTConfig): ImageData | null {
    if (!this.bloomCanvas || !this.bloomCtx) return null;
    
    const canvas = ctx.canvas;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    
    // Ensure bloom canvas is properly sized
    if (this.bloomCanvas.width !== width || this.bloomCanvas.height !== height) {
      this.initialize(width, height);
    }
    
    // Get source image data
    const sourceImageData = ctx.getImageData(0, 0, width, height);
    const sourceData = sourceImageData.data;
    
    // Create bright areas extraction
    const brightImageData = this.bloomCtx.createImageData(width, height);
    const brightData = brightImageData.data;
    
    const phosphorRgb = ColorUtils.hexToRgb(config.phosphorColor);
    
    for (let i = 0; i < sourceData.length; i += 4) {
      const r = sourceData[i];
      const g = sourceData[i + 1];
      const b = sourceData[i + 2];
      const a = sourceData[i + 3];
      
      // Calculate luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Extract only bright areas above threshold
      if (luminance > this.bloomThreshold && a > 0) {
        // Enhance bright colors
        const enhancement = (luminance - this.bloomThreshold) / (1 - this.bloomThreshold);
        
        brightData[i] = Math.min(255, r * this.bloomIntensity * enhancement);
        brightData[i + 1] = Math.min(255, g * this.bloomIntensity * enhancement);
        brightData[i + 2] = Math.min(255, b * this.bloomIntensity * enhancement);
        brightData[i + 3] = a;
      } else {
        // Non-bright areas are transparent
        brightData[i] = 0;
        brightData[i + 1] = 0;
        brightData[i + 2] = 0;
        brightData[i + 3] = 0;
      }
    }
    
    return brightImageData;
  }

  /**
   * Apply gaussian blur to bright areas
   */
  applyGaussianBlur(imageData: ImageData): ImageData {
    const width = imageData.width;
    const height = imageData.height;
    const sourceData = new Uint8ClampedArray(imageData.data);
    const targetData = imageData.data;
    
    // Gaussian kernel (approximate with simple box blur for performance)
    const radius = this.blurRadius;
    const kernelSize = radius * 2 + 1;
    const kernel = this.createGaussianKernel(kernelSize);
    
    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        let weightSum = 0;
        
        for (let k = -radius; k <= radius; k++) {
          const sampleX = Math.max(0, Math.min(width - 1, x + k));
          const sampleIndex = (y * width + sampleX) * 4;
          const weight = kernel[k + radius];
          
          r += sourceData[sampleIndex] * weight;
          g += sourceData[sampleIndex + 1] * weight;
          b += sourceData[sampleIndex + 2] * weight;
          a += sourceData[sampleIndex + 3] * weight;
          weightSum += weight;
        }
        
        const targetIndex = (y * width + x) * 4;
        targetData[targetIndex] = r / weightSum;
        targetData[targetIndex + 1] = g / weightSum;
        targetData[targetIndex + 2] = b / weightSum;
        targetData[targetIndex + 3] = a / weightSum;
      }
    }
    
    // Vertical pass
    const horizontalData = new Uint8ClampedArray(targetData);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        let weightSum = 0;
        
        for (let k = -radius; k <= radius; k++) {
          const sampleY = Math.max(0, Math.min(height - 1, y + k));
          const sampleIndex = (sampleY * width + x) * 4;
          const weight = kernel[k + radius];
          
          r += horizontalData[sampleIndex] * weight;
          g += horizontalData[sampleIndex + 1] * weight;
          b += horizontalData[sampleIndex + 2] * weight;
          a += horizontalData[sampleIndex + 3] * weight;
          weightSum += weight;
        }
        
        const targetIndex = (y * width + x) * 4;
        targetData[targetIndex] = r / weightSum;
        targetData[targetIndex + 1] = g / weightSum;
        targetData[targetIndex + 2] = b / weightSum;
        targetData[targetIndex + 3] = a / weightSum;
      }
    }
    
    return imageData;
  }

  /**
   * Create gaussian kernel for blur
   */
  private createGaussianKernel(size: number): number[] {
    const kernel: number[] = [];
    const sigma = size / 3;
    let sum = 0;
    
    for (let i = 0; i < size; i++) {
      const x = i - Math.floor(size / 2);
      const value = Math.exp(-(x * x) / (2 * sigma * sigma));
      kernel[i] = value;
      sum += value;
    }
    
    // Normalize
    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }
    
    return kernel;
  }

  /**
   * Render bloom effect
   */
  render: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    if (config.glowIntensity <= 0.5 || !this.bloomCanvas || !this.bloomCtx) return;

    const canvas = ctx.canvas;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    
    // Extract bright areas
    const brightAreas = this.extractBrightAreas(ctx, config);
    if (!brightAreas) return;
    
    // Apply blur to bright areas
    const blurredBright = this.applyGaussianBlur(brightAreas);
    
    // Render blurred bright areas to temp canvas
    this.bloomCtx.clearRect(0, 0, width, height);
    this.bloomCtx.putImageData(blurredBright, 0, 0);
    
    // Composite bloom effect onto main canvas
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = (config.glowIntensity - 0.5) * 2; // Scale from 0.5-1.0 to 0-1.0
    
    ctx.drawImage(this.bloomCanvas, 0, 0);
    
    ctx.restore();
  };

  /**
   * Render enhanced bloom with multiple passes
   */
  renderEnhanced: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    if (config.glowIntensity <= 0.7 || !this.bloomCanvas || !this.bloomCtx) return;

    // Multiple blur passes for smoother bloom
    const originalRadius = this.blurRadius;
    
    ctx.save();
    
    // First pass - tight bloom
    this.blurRadius = 4;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.3;
    this.render(ctx, config);
    
    // Second pass - wider bloom
    this.blurRadius = 8;
    ctx.globalAlpha = 0.2;
    this.render(ctx, config);
    
    // Third pass - very wide bloom
    this.blurRadius = 16;
    ctx.globalAlpha = 0.1;
    this.render(ctx, config);
    
    this.blurRadius = originalRadius;
    ctx.restore();
  };

  /**
   * Set bloom parameters
   */
  setBloomParameters(threshold: number, intensity: number, radius: number): void {
    this.bloomThreshold = Math.max(0, Math.min(1, threshold));
    this.bloomIntensity = Math.max(0.5, Math.min(3, intensity));
    this.blurRadius = Math.max(2, Math.min(32, radius));
  }

  /**
   * Get bloom statistics
   */
  getBloomStats(): {
    threshold: number;
    intensity: number;
    radius: number;
  } {
    return {
      threshold: this.bloomThreshold,
      intensity: this.bloomIntensity,
      radius: this.blurRadius
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.bloomCanvas = null;
    this.bloomCtx = null;
  }
}