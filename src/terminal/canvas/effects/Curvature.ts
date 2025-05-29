/**
 * Screen Curvature Effect
 * Simulates the curved glass surface of CRT monitors with barrel distortion
 */

import type { CRTConfig, EffectRenderer } from '../types/interfaces';

export class Curvature {
  private tempCanvas: HTMLCanvasElement | null = null;
  private tempCtx: CanvasRenderingContext2D | null = null;
  private curvatureCache: Map<string, ImageData> = new Map();
  private lastCurvatureAmount: number = 0;
  private lastCanvasSize: string = '';

  constructor() {}

  /**
   * Initialize curvature effect with canvas dimensions
   */
  initialize(width: number, height: number): void {
    // Create temporary canvas for distortion processing
    if (!this.tempCanvas) {
      this.tempCanvas = document.createElement('canvas');
      this.tempCtx = this.tempCanvas.getContext('2d')!;
    }
    
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;
  }

  /**
   * Apply barrel distortion to simulate CRT curvature
   */
  applyCurvature: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    if (!config.curvature || config.curvatureAmount <= 0 || !this.tempCanvas || !this.tempCtx) {
      return;
    }

    const canvas = ctx.canvas;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    
    // Check if we need to reinitialize
    const currentSize = `${width}x${height}`;
    if (currentSize !== this.lastCanvasSize) {
      this.initialize(width, height);
      this.lastCanvasSize = currentSize;
    }

    // Copy current canvas content to temp canvas
    this.tempCtx.clearRect(0, 0, width, height);
    this.tempCtx.drawImage(canvas, 0, 0, width, height);
    
    // Get image data for distortion
    const sourceImageData = this.tempCtx.getImageData(0, 0, width, height);
    const targetImageData = ctx.createImageData(width, height);
    
    // Apply barrel distortion
    this.applyBarrelDistortion(
      sourceImageData,
      targetImageData,
      width,
      height,
      config.curvatureAmount
    );
    
    // Clear and draw distorted image
    ctx.clearRect(0, 0, width, height);
    ctx.putImageData(targetImageData, 0, 0);
  };

  /**
   * Apply barrel distortion algorithm
   */
  private applyBarrelDistortion(
    source: ImageData,
    target: ImageData,
    width: number,
    height: number,
    amount: number
  ): void {
    const sourceData = source.data;
    const targetData = target.data;
    
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    
    // Distortion strength (negative for barrel, positive for pincushion)
    const k1 = -amount * 0.1; // Primary distortion coefficient
    const k2 = amount * 0.05;  // Secondary distortion coefficient
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Normalize coordinates to [-1, 1]
        const nx = (x - centerX) / centerX;
        const ny = (y - centerY) / centerY;
        
        // Calculate radius from center
        const r = Math.sqrt(nx * nx + ny * ny);
        
        if (r === 0) {
          // No distortion at center
          const targetIndex = (y * width + x) * 4;
          const sourceIndex = targetIndex;
          targetData[targetIndex] = sourceData[sourceIndex];
          targetData[targetIndex + 1] = sourceData[sourceIndex + 1];
          targetData[targetIndex + 2] = sourceData[sourceIndex + 2];
          targetData[targetIndex + 3] = sourceData[sourceIndex + 3];
          continue;
        }
        
        // Apply distortion formula
        const r2 = r * r;
        const r4 = r2 * r2;
        const distortionFactor = 1 + k1 * r2 + k2 * r4;
        
        // Calculate source coordinates
        const sourceX = centerX + (nx * centerX * distortionFactor);
        const sourceY = centerY + (ny * centerY * distortionFactor);
        
        // Bounds checking
        if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) {
          // Bilinear interpolation for smooth result
          const color = this.bilinearInterpolation(sourceData, width, height, sourceX, sourceY);
          
          const targetIndex = (y * width + x) * 4;
          targetData[targetIndex] = color.r;
          targetData[targetIndex + 1] = color.g;
          targetData[targetIndex + 2] = color.b;
          targetData[targetIndex + 3] = color.a;
        } else {
          // Outside bounds - use black
          const targetIndex = (y * width + x) * 4;
          targetData[targetIndex] = 0;
          targetData[targetIndex + 1] = 0;
          targetData[targetIndex + 2] = 0;
          targetData[targetIndex + 3] = 255;
        }
      }
    }
  }

  /**
   * Bilinear interpolation for smooth pixel sampling
   */
  private bilinearInterpolation(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number
  ): { r: number; g: number; b: number; a: number } {
    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const x2 = Math.min(x1 + 1, width - 1);
    const y2 = Math.min(y1 + 1, height - 1);
    
    const fx = x - x1;
    const fy = y - y1;
    
    const getPixel = (px: number, py: number) => {
      const index = (py * width + px) * 4;
      return {
        r: data[index],
        g: data[index + 1],
        b: data[index + 2],
        a: data[index + 3]
      };
    };
    
    const p11 = getPixel(x1, y1);
    const p21 = getPixel(x2, y1);
    const p12 = getPixel(x1, y2);
    const p22 = getPixel(x2, y2);
    
    // Interpolate
    const r = p11.r * (1 - fx) * (1 - fy) + p21.r * fx * (1 - fy) + 
              p12.r * (1 - fx) * fy + p22.r * fx * fy;
    const g = p11.g * (1 - fx) * (1 - fy) + p21.g * fx * (1 - fy) + 
              p12.g * (1 - fx) * fy + p22.g * fx * fy;
    const b = p11.b * (1 - fx) * (1 - fy) + p21.b * fx * (1 - fy) + 
              p12.b * (1 - fx) * fy + p22.b * fx * fy;
    const a = p11.a * (1 - fx) * (1 - fy) + p21.a * fx * (1 - fy) + 
              p12.a * (1 - fx) * fy + p22.a * fx * fy;
    
    return {
      r: Math.round(r),
      g: Math.round(g),
      b: Math.round(b),
      a: Math.round(a)
    };
  }

  /**
   * Apply edge vignetting effect
   */
  applyVignette: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    if (!config.curvature || config.curvatureAmount <= 0) return;

    const canvas = ctx.canvas;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    
    ctx.save();
    
    // Create radial gradient for vignetting
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, maxRadius
    );
    
    const vignetteStrength = config.curvatureAmount * 0.3;
    
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.8, `rgba(0, 0, 0, ${vignetteStrength * 0.3})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${vignetteStrength})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.restore();
  };

  /**
   * Apply screen edge reflection effect
   */
  applyScreenReflection: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    if (!config.curvature || config.curvatureAmount <= 0.5) return;

    const canvas = ctx.canvas;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = config.curvatureAmount * 0.1;
    
    // Add subtle highlights to simulate glass reflection
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.restore();
  };

  /**
   * Clear curvature cache
   */
  clearCache(): void {
    this.curvatureCache.clear();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearCache();
    this.tempCanvas = null;
    this.tempCtx = null;
  }
}