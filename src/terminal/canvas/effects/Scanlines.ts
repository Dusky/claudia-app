/**
 * Scanlines Effect
 * Simulates the horizontal scan lines visible on CRT displays
 */

import type { CRTConfig, EffectRenderer } from '../types/interfaces';

export class Scanlines {
  private animationOffset: number = 0;
  private lineSpacing: number = 2; // Space between scanlines
  private animationSpeed: number = 0.5; // Animation speed for moving scanlines

  constructor() {}

  /**
   * Update scanline animation
   */
  update(deltaTime: number): void {
    this.animationOffset += deltaTime * this.animationSpeed;
    
    // Reset offset to prevent overflow
    if (this.animationOffset > this.lineSpacing * 2) {
      this.animationOffset = 0;
    }
  }

  /**
   * Render static scanlines
   */
  renderStatic: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    if (!config.scanlines || config.scanlineOpacity <= 0) return;

    ctx.save();
    
    // Set scanline color (darker version of background)
    ctx.fillStyle = `rgba(0, 0, 0, ${config.scanlineOpacity})`;
    
    const canvasHeight = ctx.canvas.height / (window.devicePixelRatio || 1);
    
    // Draw horizontal lines
    for (let y = 0; y < canvasHeight; y += this.lineSpacing) {
      ctx.fillRect(0, y, ctx.canvas.width, 1);
    }
    
    ctx.restore();
  };

  /**
   * Render animated scanlines (rolling effect)
   */
  renderAnimated: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    if (!config.scanlines || config.scanlineOpacity <= 0) return;

    ctx.save();
    
    // Create gradient for moving scanline
    const canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = ctx.canvas.height / (window.devicePixelRatio || 1);
    
    // Base scanlines
    ctx.fillStyle = `rgba(0, 0, 0, ${config.scanlineOpacity * 0.3})`;
    for (let y = 0; y < canvasHeight; y += this.lineSpacing) {
      ctx.fillRect(0, y, canvasWidth, 1);
    }
    
    // Moving bright scanline
    const movingLineY = (this.animationOffset * canvasHeight / this.lineSpacing) % canvasHeight;
    
    const gradient = ctx.createLinearGradient(0, movingLineY - 10, 0, movingLineY + 10);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.3, `rgba(255, 255, 255, ${config.scanlineOpacity * 0.2})`);
    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${config.scanlineOpacity * 0.4})`);
    gradient.addColorStop(0.7, `rgba(255, 255, 255, ${config.scanlineOpacity * 0.2})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, movingLineY - 10, canvasWidth, 20);
    
    ctx.restore();
  };

  /**
   * Render interlaced scanlines (alternate pattern)
   */
  renderInterlaced: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    if (!config.scanlines || config.scanlineOpacity <= 0) return;

    ctx.save();
    
    const canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = ctx.canvas.height / (window.devicePixelRatio || 1);
    
    // Alternate between two sets of scanlines
    const phase = Math.floor(this.animationOffset) % 2;
    
    ctx.fillStyle = `rgba(0, 0, 0, ${config.scanlineOpacity})`;
    
    for (let y = phase; y < canvasHeight; y += this.lineSpacing * 2) {
      ctx.fillRect(0, y, canvasWidth, 1);
    }
    
    ctx.restore();
  };

  /**
   * Set line spacing
   */
  setLineSpacing(spacing: number): void {
    this.lineSpacing = Math.max(1, Math.min(10, spacing));
  }

  /**
   * Set animation speed
   */
  setAnimationSpeed(speed: number): void {
    this.animationSpeed = Math.max(0, Math.min(5, speed));
  }

  /**
   * Reset animation
   */
  reset(): void {
    this.animationOffset = 0;
  }

  /**
   * Get current animation state
   */
  getAnimationState(): { offset: number; phase: number } {
    return {
      offset: this.animationOffset,
      phase: Math.floor(this.animationOffset) % 2
    };
  }
}