/**
 * CRT Canvas Terminal Emulator
 * Complete canvas-based terminal with authentic CRT visual effects
 * 
 * Phase 5: Performance and Polish - COMPLETE
 * All features implemented and production-ready
 */

// Main terminal class
export { CRTCanvasTerminal } from './core/CRTCanvasTerminal.js';

// Core components
export { TextRenderer } from './core/TextRenderer.js';
export { EffectsEngine } from './core/EffectsEngine.js';
export { CursorRenderer } from './core/CursorRenderer.js';
export { TypewriterEffect } from './core/TypewriterEffect.js';
export { InputHandler } from './core/InputHandler.js';
export { AccessibilityManager } from './core/AccessibilityManager.js';
export { ScrollingAnimation } from './core/ScrollingAnimation.js';

// Effects
export { PhosphorGlow } from './effects/PhosphorGlow.js';
export { Scanlines } from './effects/Scanlines.js';
export { Flicker } from './effects/Flicker.js';
export { Curvature } from './effects/Curvature.js';
export { BloomEffect } from './effects/BloomEffect.js';
export { ScreenBurn } from './effects/ScreenBurn.js';

// Utilities
export { AnimationFrameManager } from './utils/AnimationFrame.js';
export { FontMetricsCalculator } from './utils/FontMetrics.js';
export { ColorUtils } from './utils/ColorUtils.js';
export { PerformanceMonitor } from './utils/PerformanceMonitor.js';
export { MobileSupport } from './utils/MobileSupport.js';

// Types
export type {
  CRTConfig,
  FontMetrics,
  TerminalChar,
  RenderContext,
  PrintOptions,
  CursorState,
  EffectRenderer,
  PhosphorPixel,
  AnimationCallback,
  PerformanceMetrics,
  OptimizationSuggestion
} from './types/interfaces.js';

export type {
  AccessibilityOptions,
  AccessibilityState
} from './core/AccessibilityManager.js';

export type {
  MobileConfig,
  TouchState
} from './utils/MobileSupport.js';

export type {
  ScrollingViewport
} from './core/TextRenderer.js';

// Demos
export { default as Phase1Demo } from './demo/Phase1Demo.js';
export { default as Phase2Demo } from './demo/Phase2Demo.js';
export { default as Phase3Demo } from './demo/Phase3Demo.js';
export { default as Phase4Demo } from './demo/Phase4Demo.js';
export { default as Phase5Demo } from './demo/Phase5Demo.js';

/**
 * Quick setup function for basic terminal usage
 */
export function createCRTTerminal(
  canvas: HTMLCanvasElement,
  options?: {
    theme?: 'green' | 'amber' | 'white' | 'blue';
    effects?: 'minimal' | 'moderate' | 'full';
    accessibility?: boolean;
    mobile?: boolean;
  }
): CRTCanvasTerminal {
  const { theme = 'green', effects = 'moderate', accessibility = true, mobile = true } = options || {};
  
  // Theme colors
  const themeColors = {
    green: '#00FF00',
    amber: '#FFAA00',
    white: '#FFFFFF',
    blue: '#00AAFF'
  };
  
  // Effect presets
  const effectPresets = {
    minimal: {
      curvature: false,
      scanlines: false,
      flicker: false,
      glowIntensity: 0.2
    },
    moderate: {
      curvature: true,
      curvatureAmount: 0.08,
      scanlines: true,
      scanlineOpacity: 0.05,
      flicker: true,
      flickerIntensity: 0.02,
      glowIntensity: 0.4
    },
    full: {
      curvature: true,
      curvatureAmount: 0.15,
      scanlines: true,
      scanlineOpacity: 0.08,
      flicker: true,
      flickerIntensity: 0.03,
      glowIntensity: 0.6
    }
  };
  
  return new CRTCanvasTerminal(
    canvas,
    {
      phosphorColor: themeColors[theme],
      fontSize: 14,
      fontFamily: 'Monaco, "Courier New", monospace',
      lineHeight: 18,
      backgroundColor: '#000000',
      targetFPS: 60,
      enableAntialiasing: true,
      typewriterSpeed: 40,
      cursorBlinkRate: 1.0,
      ...effectPresets[effects]
    },
    accessibility ? {
      enableScreenReader: true,
      announceNewText: true,
      enableKeyboardNavigation: true,
      announceDelay: 400
    } : {
      enableScreenReader: false,
      announceNewText: false,
      enableKeyboardNavigation: false
    },
    mobile ? {
      enableTouch: true,
      touchScrollSensitivity: 1.5,
      longPressDelay: 500
    } : {
      enableTouch: false
    }
  );
}