/**
 * Canvas CRT Terminal Emulator Types
 * Defines interfaces for the canvas-based terminal system
 */

export interface CRTConfig {
  // Core display settings
  phosphorColor: string;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  backgroundColor: string;
  
  // Visual effects
  curvature: boolean;
  curvatureAmount: number;
  scanlines: boolean;
  scanlineOpacity: number;
  flicker: boolean;
  flickerIntensity: number;
  glowIntensity: number;
  
  // Performance settings
  targetFPS: number;
  enableAntialiasing: boolean;
  
  // Animation settings
  typewriterSpeed: number; // characters per second
  cursorBlinkRate: number; // blinks per second
  cursorBlink: boolean;
}

export interface FontMetrics {
  width: number;
  height: number;
  baseline: number;
  ascent: number;
  descent: number;
}

export interface TerminalChar {
  char: string;
  character: string; // alias for compatibility
  x: number;
  y: number;
  timestamp: number; // for phosphor decay
  brightness: number; // for fade effects
}

export interface CursorState {
  x: number;
  y: number;
  visible: boolean;
  blinkPhase: number;
}

export interface EffectState {
  scanlineOffset: number;
  flickerPhase: number;
  phosphorDecay: Map<string, number>; // position -> decay amount
}

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number; // device pixel ratio
}

export interface PrintOptions {
  typewriter?: boolean;
  speed?: number;
  newline?: boolean;
  color?: string;
}

// Animation frame callback type
export type AnimationCallback = (deltaTime: number) => void;

// Effect render function type
export type EffectRenderer = (ctx: CanvasRenderingContext2D, config: CRTConfig) => void;

// Additional types needed for export
export interface PhosphorPixel {
  x: number;
  y: number;
  brightness: number;
  timestamp: number;
}

export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  memoryUsage: number;
  frameDrops: number;
}

export interface OptimizationSuggestion {
  type: 'disable_effect' | 'reduce_quality' | 'optimize_rendering';
  target: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
}