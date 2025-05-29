/**
 * Flicker Effect
 * Simulates the random brightness and position fluctuations of CRT displays
 */

import type { CRTConfig, EffectRenderer } from '../types/interfaces';

export class Flicker {
  private flickerPhase: number = 0;
  private brightnessFluctuation: number = 1;
  private positionFluctuation: { x: number; y: number } = { x: 0, y: 0 };
  private lastFlickerTime: number = 0;
  private flickerInterval: number = 50; // ms between flicker updates

  // Flicker patterns for different types of CRT issues
  private patterns = {
    subtle: { brightness: 0.02, position: 0.1, frequency: 0.5 },
    moderate: { brightness: 0.05, position: 0.3, frequency: 1.0 },
    heavy: { brightness: 0.1, position: 0.8, frequency: 2.0 },
    interference: { brightness: 0.15, position: 1.5, frequency: 3.0 }
  };

  constructor() {}

  /**
   * Update flicker state
   */
  update(deltaTime: number, config: CRTConfig): void {
    if (!config.flicker || config.flickerIntensity <= 0) return;

    const currentTime = performance.now();
    
    // Update at specific intervals for realistic flicker
    if (currentTime - this.lastFlickerTime >= this.flickerInterval) {
      this.updateFlickerState(config.flickerIntensity);
      this.lastFlickerTime = currentTime;
    }
    
    // Smooth animation between flicker states
    this.flickerPhase += deltaTime * 0.001;
  }

  /**
   * Update internal flicker state
   */
  private updateFlickerState(intensity: number): void {
    // Select pattern based on intensity
    let pattern = this.patterns.subtle;
    if (intensity > 0.7) pattern = this.patterns.heavy;
    else if (intensity > 0.4) pattern = this.patterns.moderate;
    else if (intensity > 0.8) pattern = this.patterns.interference;

    // Random brightness fluctuation
    const brightnessFactor = pattern.brightness * intensity;
    this.brightnessFluctuation = 1 + (Math.random() - 0.5) * brightnessFactor * 2;
    this.brightnessFluctuation = Math.max(0.3, Math.min(1.2, this.brightnessFluctuation));

    // Random position fluctuation (simulates poor signal sync)
    const positionFactor = pattern.position * intensity;
    this.positionFluctuation = {
      x: (Math.random() - 0.5) * positionFactor,
      y: (Math.random() - 0.5) * positionFactor
    };

    // Adjust flicker interval based on frequency
    this.flickerInterval = Math.max(10, 100 / pattern.frequency);
  }

  /**
   * Apply brightness flicker to context
   */
  applyBrightnessFlicker(ctx: CanvasRenderingContext2D, config: CRTConfig): void {
    if (!config.flicker || config.flickerIntensity <= 0) return;

    // Apply global alpha based on brightness fluctuation
    const currentAlpha = ctx.globalAlpha;
    ctx.globalAlpha = currentAlpha * this.brightnessFluctuation;
  }

  /**
   * Apply position flicker to context
   */
  applyPositionFlicker(ctx: CanvasRenderingContext2D, config: CRTConfig): void {
    if (!config.flicker || config.flickerIntensity <= 0) return;

    // Apply small translation for position flicker
    ctx.translate(this.positionFluctuation.x, this.positionFluctuation.y);
  }

  /**
   * Render rolling interference lines
   */
  renderInterference: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    if (!config.flicker || config.flickerIntensity < 0.5) return;

    ctx.save();

    const canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = ctx.canvas.height / (window.devicePixelRatio || 1);

    // Random interference lines
    if (Math.random() < config.flickerIntensity * 0.02) {
      const numLines = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numLines; i++) {
        const y = Math.random() * canvasHeight;
        const height = Math.random() * 4 + 1;
        const opacity = Math.random() * 0.3;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fillRect(0, y, canvasWidth, height);
      }
    }

    ctx.restore();
  };

  /**
   * Render signal noise
   */
  renderNoise: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    if (!config.flicker || config.flickerIntensity < 0.3) return;

    ctx.save();

    const canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = ctx.canvas.height / (window.devicePixelRatio || 1);

    // Create noise pattern
    if (Math.random() < config.flickerIntensity * 0.1) {
      const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imageData.data;
      
      // Add random noise to some pixels
      const noiseAmount = config.flickerIntensity * 0.1;
      
      for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < noiseAmount) {
          const noise = (Math.random() - 0.5) * 50;
          data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
    }

    ctx.restore();
  };

  /**
   * Get current flicker state for debugging
   */
  getFlickerState(): {
    brightness: number;
    position: { x: number; y: number };
    phase: number;
  } {
    return {
      brightness: this.brightnessFluctuation,
      position: { ...this.positionFluctuation },
      phase: this.flickerPhase
    };
  }

  /**
   * Reset flicker state
   */
  reset(): void {
    this.flickerPhase = 0;
    this.brightnessFluctuation = 1;
    this.positionFluctuation = { x: 0, y: 0 };
    this.lastFlickerTime = 0;
  }

  /**
   * Set custom flicker pattern
   */
  setCustomPattern(name: string, pattern: {
    brightness: number;
    position: number;
    frequency: number;
  }): void {
    this.patterns[name as keyof typeof this.patterns] = pattern;
  }
}