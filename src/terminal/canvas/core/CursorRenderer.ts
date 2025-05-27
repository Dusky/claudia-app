/**
 * Cursor Renderer
 * Handles authentic CRT-style cursor rendering with various styles and animations
 */

import type { CRTConfig, CursorState, EffectRenderer } from '../types/interfaces';
import { ColorUtils } from '../utils/ColorUtils';

export type CursorStyle = 'block' | 'underline' | 'bar' | 'hollow';

export class CursorRenderer {
  private cursorState: CursorState;
  private blinkTimer: number = 0;
  private cursorStyle: CursorStyle = 'block';
  private cursorChar: string = ' '; // Character to show in hollow cursor mode

  constructor() {
    this.cursorState = {
      x: 0,
      y: 0,
      visible: true,
      blinkPhase: 0
    };
  }

  /**
   * Update cursor animation and blinking
   */
  update(deltaTime: number, config: CRTConfig): void {
    // Update blink timer
    this.blinkTimer += deltaTime;
    
    // Calculate blink phase (0 to 1 and back)
    const blinkCycle = 1000 / config.cursorBlinkRate; // ms per blink cycle
    const blinkProgress = (this.blinkTimer % blinkCycle) / blinkCycle;
    
    // Smooth sine wave blink
    this.cursorState.blinkPhase = Math.sin(blinkProgress * Math.PI * 2);
    
    // Simple on/off blink (alternative)
    this.cursorState.visible = blinkProgress < 0.5;
  }

  /**
   * Set cursor position
   */
  setPosition(x: number, y: number): void {
    this.cursorState.x = x;
    this.cursorState.y = y;
  }

  /**
   * Set cursor style
   */
  setCursorStyle(style: CursorStyle): void {
    this.cursorStyle = style;
  }

  /**
   * Set character for hollow cursor mode
   */
  setCursorCharacter(char: string): void {
    this.cursorChar = char || ' ';
  }

  /**
   * Render block cursor (classic CRT style)
   */
  private renderBlockCursor(ctx: CanvasRenderingContext2D, config: CRTConfig): void {
    const charWidth = config.fontSize * 0.6;
    const charHeight = config.lineHeight;
    
    const x = this.cursorState.x * charWidth;
    const y = this.cursorState.y * charHeight;
    
    // Calculate opacity based on blink phase
    const opacity = this.cursorState.visible ? 0.8 : 0.1;
    
    // Create cursor color
    const cursorColor = ColorUtils.createGlowColor(config.phosphorColor, 0.2);
    
    ctx.fillStyle = ColorUtils.rgbToCss(
      ColorUtils.hexToRgb(cursorColor), 
      opacity
    );
    
    ctx.fillRect(x, y, charWidth, charHeight);
    
    // Add glow effect for block cursor
    if (config.glowIntensity > 0 && this.cursorState.visible) {
      const gradient = ColorUtils.createGlowGradient(
        ctx,
        x + charWidth / 2,
        y + charHeight / 2,
        Math.max(charWidth, charHeight) * 0.8,
        config.phosphorColor
      );
      
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = opacity * config.glowIntensity * 0.3;
      ctx.fillStyle = gradient;
      ctx.fillRect(
        x - charWidth * 0.2,
        y - charHeight * 0.2,
        charWidth * 1.4,
        charHeight * 1.4
      );
      ctx.restore();
    }
  }

  /**
   * Render underline cursor
   */
  private renderUnderlineCursor(ctx: CanvasRenderingContext2D, config: CRTConfig): void {
    if (!this.cursorState.visible) return;
    
    const charWidth = config.fontSize * 0.6;
    const charHeight = config.lineHeight;
    const underlineHeight = Math.max(2, config.fontSize * 0.1);
    
    const x = this.cursorState.x * charWidth;
    const y = this.cursorState.y * charHeight + charHeight - underlineHeight;
    
    ctx.fillStyle = config.phosphorColor;
    ctx.fillRect(x, y, charWidth, underlineHeight);
  }

  /**
   * Render bar cursor (vertical line)
   */
  private renderBarCursor(ctx: CanvasRenderingContext2D, config: CRTConfig): void {
    if (!this.cursorState.visible) return;
    
    const charWidth = config.fontSize * 0.6;
    const charHeight = config.lineHeight;
    const barWidth = Math.max(2, config.fontSize * 0.1);
    
    const x = this.cursorState.x * charWidth;
    const y = this.cursorState.y * charHeight;
    
    ctx.fillStyle = config.phosphorColor;
    ctx.fillRect(x, y, barWidth, charHeight);
  }

  /**
   * Render hollow cursor (outline only)
   */
  private renderHollowCursor(ctx: CanvasRenderingContext2D, config: CRTConfig): void {
    if (!this.cursorState.visible) return;
    
    const charWidth = config.fontSize * 0.6;
    const charHeight = config.lineHeight;
    const lineWidth = Math.max(1, config.fontSize * 0.05);
    
    const x = this.cursorState.x * charWidth;
    const y = this.cursorState.y * charHeight;
    
    ctx.strokeStyle = config.phosphorColor;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, charWidth, charHeight);
    
    // Show character inside hollow cursor
    if (this.cursorChar && this.cursorChar !== ' ') {
      ctx.save();
      ctx.font = `${config.fontSize}px ${config.fontFamily}`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = config.phosphorColor;
      ctx.globalAlpha = 0.7;
      ctx.fillText(this.cursorChar, x, y);
      ctx.restore();
    }
  }

  /**
   * Main cursor render method
   */
  render: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    ctx.save();
    
    switch (this.cursorStyle) {
      case 'block':
        this.renderBlockCursor(ctx, config);
        break;
      case 'underline':
        this.renderUnderlineCursor(ctx, config);
        break;
      case 'bar':
        this.renderBarCursor(ctx, config);
        break;
      case 'hollow':
        this.renderHollowCursor(ctx, config);
        break;
    }
    
    ctx.restore();
  };

  /**
   * Render cursor with enhanced CRT effects
   */
  renderEnhanced: EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig): void => {
    if (!this.cursorState.visible) return;
    
    ctx.save();
    
    // Add scan-line interference effect to cursor
    if (config.scanlines && Math.random() < 0.1) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      this.renderFlickeringCursor(ctx, config);
      ctx.restore();
    }
    
    // Main cursor render
    this.render(ctx, config);
    
    // Add extra glow for enhanced mode
    if (config.glowIntensity > 0.7) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.2;
      this.renderBlockCursor(ctx, config);
      ctx.restore();
    }
    
    ctx.restore();
  };

  /**
   * Render flickering cursor effect
   */
  private renderFlickeringCursor(ctx: CanvasRenderingContext2D, config: CRTConfig): void {
    const charWidth = config.fontSize * 0.6;
    const charHeight = config.lineHeight;
    
    const x = this.cursorState.x * charWidth;
    const y = this.cursorState.y * charHeight;
    
    // Random flicker positions
    const flickerX = x + (Math.random() - 0.5) * 2;
    const flickerY = y + (Math.random() - 0.5) * 2;
    
    ctx.fillStyle = config.phosphorColor;
    ctx.fillRect(flickerX, flickerY, charWidth, charHeight);
  }

  /**
   * Get current cursor state
   */
  getCursorState(): CursorState {
    return { ...this.cursorState };
  }

  /**
   * Set cursor visibility
   */
  setVisible(visible: boolean): void {
    this.cursorState.visible = visible;
  }

  /**
   * Force cursor blink state
   */
  forceBlinkState(visible: boolean): void {
    this.cursorState.visible = visible;
    this.blinkTimer = visible ? 0 : 500; // Offset timer to maintain state
  }

  /**
   * Reset cursor animation
   */
  resetAnimation(): void {
    this.blinkTimer = 0;
    this.cursorState.blinkPhase = 0;
    this.cursorState.visible = true;
  }

  /**
   * Get cursor dimensions for positioning calculations
   */
  getCursorDimensions(config: CRTConfig): { width: number; height: number } {
    const charWidth = config.fontSize * 0.6;
    const charHeight = config.lineHeight;
    
    switch (this.cursorStyle) {
      case 'block':
      case 'hollow':
        return { width: charWidth, height: charHeight };
      case 'underline':
        return { width: charWidth, height: Math.max(2, config.fontSize * 0.1) };
      case 'bar':
        return { width: Math.max(2, config.fontSize * 0.1), height: charHeight };
      default:
        return { width: charWidth, height: charHeight };
    }
  }
}