/**
 * Effects Engine
 * Coordinates and manages all visual effects for the CRT terminal
 */

import type { CRTConfig, TerminalChar, EffectRenderer } from '../types/interfaces';
import { PhosphorGlow } from '../effects/PhosphorGlow';
import { Scanlines } from '../effects/Scanlines';
import { Flicker } from '../effects/Flicker';
import { Curvature } from '../effects/Curvature';
import { BloomEffect } from '../effects/BloomEffect';
import { ScreenBurn } from '../effects/ScreenBurn';

export class EffectsEngine {
  private phosphorGlow: PhosphorGlow;
  private scanlines: Scanlines;
  private flicker: Flicker;
  private curvature: Curvature;
  private bloomEffect: BloomEffect;
  private screenBurn: ScreenBurn;
  private enabled: boolean = true;
  private canvasCache = new Map<string, HTMLCanvasElement>();
  private imageDataCache = new Map<string, ImageData>();
  private maxCacheSize: number = 10; // Limit cache size

  constructor() {
    this.phosphorGlow = new PhosphorGlow();
    this.scanlines = new Scanlines();
    this.flicker = new Flicker();
    this.curvature = new Curvature();
    this.bloomEffect = new BloomEffect();
    this.screenBurn = new ScreenBurn();
  }

  /**
   * Update all effects
   */
  update(textBuffer: TerminalChar[], deltaTime: number, config: CRTConfig): void {
    if (!this.enabled) return;

    // Update phosphor glow
    if (config.glowIntensity > 0) {
      this.phosphorGlow.update(textBuffer, deltaTime);
    }

    // Update scanlines
    if (config.scanlines) {
      this.scanlines.update(deltaTime);
    }

    // Update flicker
    if (config.flicker) {
      this.flicker.update(deltaTime, config);
    }

    // Update screen burn
    this.screenBurn.update(textBuffer, deltaTime);
  }

  /**
   * Render all effects in proper order
   */
  render(ctx: CanvasRenderingContext2D, config: CRTConfig): void {
    if (!this.enabled) return;

    ctx.save();

    // Apply position flicker first (affects everything)
    if (config.flicker && config.flickerIntensity > 0) {
      this.flicker.applyPositionFlicker(ctx, config);
    }

    // 1. Render screen burn (deepest layer)
    this.screenBurn.render(ctx, config);

    // 2. Render phosphor persistence (behind text)
    if (config.glowIntensity > 0) {
      this.phosphorGlow.renderPersistence(ctx, config);
    }

    // 3. Apply brightness flicker to main content
    if (config.flicker && config.flickerIntensity > 0) {
      this.flicker.applyBrightnessFlicker(ctx, config);
    }

    ctx.restore();
  }

  /**
   * Render post-text effects (overlays)
   */
  renderOverlays(ctx: CanvasRenderingContext2D, config: CRTConfig): void {
    if (!this.enabled) return;

    ctx.save();

    // 1. Render phosphor glow (over text)
    if (config.glowIntensity > 0) {
      this.phosphorGlow.render(ctx, config);
    }

    // 2. Render bloom effect (intense glow)
    if (config.glowIntensity > 0.5) {
      this.bloomEffect.render(ctx, config);
    }

    // 3. Render scanlines
    if (config.scanlines) {
      this.scanlines.renderStatic(ctx, config);
    }

    // 4. Render flicker interference
    if (config.flicker && config.flickerIntensity > 0.3) {
      this.flicker.renderInterference(ctx, config);
    }

    // 5. Render signal noise
    if (config.flicker && config.flickerIntensity > 0.6) {
      this.flicker.renderNoise(ctx, config);
    }

    // 6. Apply screen curvature (final distortion)
    if (config.curvature && config.curvatureAmount > 0) {
      this.curvature.applyCurvature(ctx, config);
      this.curvature.applyVignette(ctx, config);
      this.curvature.applyScreenReflection(ctx, config);
    }

    ctx.restore();
  }

  /**
   * Clear all effect states
   */
  clear(): void {
    this.phosphorGlow.clear();
    this.scanlines.reset();
    this.flicker.reset();
    this.screenBurn.clear();
    this.curvature.clearCache();
  }

  /**
   * Enable/disable all effects
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get individual effect controllers for fine-tuning
   */
  getPhosphorGlow(): PhosphorGlow {
    return this.phosphorGlow;
  }

  getScanlines(): Scanlines {
    return this.scanlines;
  }

  getFlicker(): Flicker {
    return this.flicker;
  }

  getCurvature(): Curvature {
    return this.curvature;
  }

  getBloomEffect(): BloomEffect {
    return this.bloomEffect;
  }

  getScreenBurn(): ScreenBurn {
    return this.screenBurn;
  }

  /**
   * Configure effect-specific settings
   */
  configurePhosphor(decayRate?: number, glowRadius?: number): void {
    if (decayRate !== undefined) {
      this.phosphorGlow.setDecayRate(decayRate);
    }
    if (glowRadius !== undefined) {
      this.phosphorGlow.setGlowRadius(glowRadius);
    }
  }

  configureScanlines(lineSpacing?: number, animationSpeed?: number): void {
    if (lineSpacing !== undefined) {
      this.scanlines.setLineSpacing(lineSpacing);
    }
    if (animationSpeed !== undefined) {
      this.scanlines.setAnimationSpeed(animationSpeed);
    }
  }

  /**
   * Configure advanced effects
   */
  configureCurvature(amount?: number): void {
    // Curvature is configured via main config
  }

  configureBloom(threshold?: number, intensity?: number, radius?: number): void {
    if (threshold !== undefined || intensity !== undefined || radius !== undefined) {
      this.bloomEffect.setBloomParameters(
        threshold ?? 0.7,
        intensity ?? 1.5,
        radius ?? 8
      );
    }
  }

  configureScreenBurn(
    threshold?: number,
    maxIntensity?: number,
    decayRate?: number,
    exposureRate?: number
  ): void {
    if (threshold !== undefined || maxIntensity !== undefined || 
        decayRate !== undefined || exposureRate !== undefined) {
      this.screenBurn.setBurnParameters(
        threshold ?? 5000,
        maxIntensity ?? 0.15,
        decayRate ?? 0.0001,
        exposureRate ?? 0.0002
      );
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    phosphor: { activePixels: number; totalIntensity: number };
    scanlines: { offset: number; phase: number };
    flicker: { brightness: number; position: { x: number; y: number } };
    bloom: { threshold: number; intensity: number; radius: number };
    screenBurn: { burnedPixels: number; averageBurnIntensity: number; maxBurnIntensity: number };
  } {
    return {
      phosphor: this.phosphorGlow.getStats(),
      scanlines: this.scanlines.getAnimationState(),
      flicker: this.flicker.getFlickerState(),
      bloom: this.bloomEffect.getBloomStats(),
      screenBurn: this.screenBurn.getStats()
    };
  }

  /**
   * Create or get cached canvas
   */
  private getOrCreateCanvas(key: string, width: number, height: number): HTMLCanvasElement {
    const cacheKey = `${key}_${width}x${height}`;
    
    if (this.canvasCache.has(cacheKey)) {
      return this.canvasCache.get(cacheKey)!;
    }
    
    // Clean cache if it's getting too large
    if (this.canvasCache.size >= this.maxCacheSize) {
      this.clearOldestCacheEntries();
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    this.canvasCache.set(cacheKey, canvas);
    return canvas;
  }
  
  /**
   * Cache ImageData for reuse
   */
  private cacheImageData(key: string, imageData: ImageData): void {
    if (this.imageDataCache.size >= this.maxCacheSize) {
      this.clearOldestCacheEntries();
    }
    
    this.imageDataCache.set(key, imageData);
  }
  
  /**
   * Get cached ImageData
   */
  private getCachedImageData(key: string): ImageData | undefined {
    return this.imageDataCache.get(key);
  }
  
  /**
   * Clear oldest cache entries to prevent memory overflow
   */
  private clearOldestCacheEntries(): void {
    // Clear half the cache when limit is reached
    const entriesToRemove = Math.floor(this.maxCacheSize / 2);
    
    const canvasKeys = Array.from(this.canvasCache.keys());
    const imageDataKeys = Array.from(this.imageDataCache.keys());
    
    // Remove oldest canvas entries
    for (let i = 0; i < Math.min(entriesToRemove, canvasKeys.length); i++) {
      this.canvasCache.delete(canvasKeys[i]);
    }
    
    // Remove oldest ImageData entries
    for (let i = 0; i < Math.min(entriesToRemove, imageDataKeys.length); i++) {
      this.imageDataCache.delete(imageDataKeys[i]);
    }
  }
  
  /**
   * Clear all cached resources
   */
  clearCache(): void {
    this.canvasCache.clear();
    this.imageDataCache.clear();
  }
  
  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    canvasCacheSize: number;
    imageDataCacheSize: number;
    totalCacheEntries: number;
  } {
    return {
      canvasCacheSize: this.canvasCache.size,
      imageDataCacheSize: this.imageDataCache.size,
      totalCacheEntries: this.canvasCache.size + this.imageDataCache.size
    };
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear all caches
    this.clearCache();
    
    // Destroy effect renderers
    this.clear();
    this.curvature.destroy();
    this.bloomEffect.destroy();
    // Other effects are lightweight and don't need explicit cleanup
  }
}