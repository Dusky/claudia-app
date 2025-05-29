/**
 * CRT Canvas Terminal Emulator
 * Main class that orchestrates the canvas-based terminal
 */

import type { CRTConfig, RenderContext, PrintOptions } from '../types/interfaces';
import { AnimationFrameManager } from '../utils/AnimationFrame';
import { TextRenderer } from './TextRenderer';
import { EffectsEngine } from './EffectsEngine';
import { CursorRenderer } from './CursorRenderer';
import { TypewriterEffect } from './TypewriterEffect';
import { InputHandler } from './InputHandler';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { AccessibilityManager, type AccessibilityOptions } from './AccessibilityManager';
import { MobileSupport, type MobileConfig } from '../utils/MobileSupport';

export class CRTCanvasTerminal {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: CRTConfig;
  private renderContext: RenderContext;
  private animationManager: AnimationFrameManager;
  private textRenderer: TextRenderer;
  private effectsEngine: EffectsEngine;
  private cursorRenderer: CursorRenderer;
  private typewriterEffect: TypewriterEffect;
  private inputHandler: InputHandler;
  private performanceMonitor: PerformanceMonitor;
  private accessibilityManager: AccessibilityManager;
  private mobileSupport: MobileSupport | null = null;
  private isInitialized: boolean = false;
  
  // Input state
  private inputEnabled: boolean = false;
  private prompt: string = '$ ';
  
  // Performance and accessibility
  private lastFrameTime: number = 0;
  private isMobile: boolean = false;

  // Default configuration
  private static readonly DEFAULT_CONFIG: CRTConfig = {
    phosphorColor: '#00FF00',
    fontSize: 16,
    fontFamily: 'Monaco, "Courier New", monospace',
    lineHeight: 20,
    backgroundColor: '#000000',
    curvature: false,
    curvatureAmount: 0.15,
    scanlines: true,
    scanlineOpacity: 0.08,
    flicker: false,
    flickerIntensity: 0.03,
    glowIntensity: 0.6,
    targetFPS: 60,
    enableAntialiasing: true,
    typewriterSpeed: 30,
    cursorBlinkRate: 1.0,
    cursorBlink: true
  };

  constructor(canvas: HTMLCanvasElement, userConfig: Partial<CRTConfig> = {}, accessibilityOptions: Partial<AccessibilityOptions> = {}, mobileConfig: Partial<MobileConfig> = {}) {
    this.canvas = canvas;
    this.config = { ...CRTCanvasTerminal.DEFAULT_CONFIG, ...userConfig };
    
    // Get 2D context
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to get 2D canvas context');
    }
    this.ctx = context;

    // Detect mobile device
    this.isMobile = MobileSupport.isMobileDevice();
    
    // Apply mobile-specific config optimizations
    if (this.isMobile) {
      const deviceOptimizations = MobileSupport.getDeviceOptimizations();
      const mobileConfigAdjustments = {
        targetFPS: 30, // Lower FPS for mobile
        glowIntensity: 0.4, // Reduced glow for performance
        flickerIntensity: 0.01, // Minimal flicker
        ...userConfig
      };
      this.config = { ...this.config, ...mobileConfigAdjustments };
    }

    // Initialize components
    this.animationManager = new AnimationFrameManager(this.config.targetFPS);
    this.textRenderer = new TextRenderer();
    this.effectsEngine = new EffectsEngine();
    this.cursorRenderer = new CursorRenderer();
    this.typewriterEffect = new TypewriterEffect();
    this.inputHandler = new InputHandler(this.canvas);
    this.performanceMonitor = new PerformanceMonitor(this.config.targetFPS);
    this.accessibilityManager = new AccessibilityManager(this.canvas, accessibilityOptions);
    
    // Initialize mobile support if on mobile device
    if (this.isMobile) {
      this.mobileSupport = new MobileSupport(this.canvas, {
        ...MobileSupport.getDeviceOptimizations(),
        ...mobileConfig
      });
    }
    
    // Setup render context
    this.renderContext = this.createRenderContext();
    
    // Initialize the terminal
    this.initialize();
  }

  /**
   * Initialize the terminal
   */
  private initialize(): void {
    // Setup canvas for high-DPI displays
    this.setupHighDPI();
    
    // Apply accessibility config adjustments
    this.config = this.accessibilityManager.applyAccessibilityConfig(this.config);
    
    // Initialize text renderer
    this.textRenderer.initialize(this.renderContext, this.config);
    
    // Setup input handling
    this.setupInputHandling();
    
    // Setup accessibility callbacks
    this.setupAccessibilityCallbacks();
    
    // Setup mobile callbacks if on mobile device
    if (this.mobileSupport) {
      this.setupMobileCallbacks();
    }
    
    // Start the render loop
    this.animationManager.addCallback(this.render);
    
    this.isInitialized = true;
    
    console.log('CRT Canvas Terminal initialized', {
      dimensions: `${this.renderContext.width}x${this.renderContext.height}`,
      charDimensions: this.textRenderer.getDimensions(),
      dpr: this.renderContext.dpr
    });
  }

  /**
   * Setup input event handling
   */
  private setupInputHandling(): void {
    this.inputHandler.setCallbacks({
      onCommand: (command: string) => {
        this.handleCommand(command);
      },
      onInput: (currentLine: string, cursorPos: number) => {
        this.updateInputLine(currentLine, cursorPos);
      },
      onSpecialKey: (key: string, modifiers) => {
        this.handleSpecialKey(key, modifiers);
      }
    });
  }

  /**
   * Handle command execution
   */
  private handleCommand(command: string): void {
    // Echo the command
    this.print(`${this.prompt}${command}`);
    
    // Process command (can be overridden by setting a command handler)
    // For now, just echo back
    this.print(`Command executed: ${command}`);
    
    // Show new prompt if input is enabled
    if (this.inputEnabled) {
      this.showPrompt();
    }
  }

  /**
   * Update current input line
   */
  private updateInputLine(currentLine: string, cursorPos: number): void {
    // Update cursor position
    const promptLength = this.prompt.length;
    const cursorX = promptLength + cursorPos;
    const cursorY = this.textRenderer.getDimensions().rows - 1; // Last line
    
    this.cursorRenderer.setPosition(cursorX, cursorY);
    
    // Update display if needed (for live input display)
    // This is a simplified version - in practice you'd want to update just the current line
  }

  /**
   * Handle special key combinations
   */
  private handleSpecialKey(key: string, modifiers: { ctrl: boolean; alt: boolean; shift: boolean }): void {
    switch (key) {
      case 'clear':
        this.clear();
        if (this.inputEnabled) {
          this.showPrompt();
        }
        break;
      case 'interrupt':
        this.print('^C');
        if (this.inputEnabled) {
          this.showPrompt();
        }
        break;
    }
  }

  /**
   * Show command prompt
   */
  private showPrompt(): void {
    this.print(this.prompt, { newline: false });
    
    // Position cursor after prompt
    const cursorPos = this.textRenderer.getCursorPosition();
    this.cursorRenderer.setPosition(cursorPos.x, cursorPos.y);
  }

  /**
   * Setup high-DPI canvas rendering
   */
  private setupHighDPI(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    // Set actual canvas size in memory (scaled up for high-DPI)
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    // Scale the canvas back down using CSS
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    // Scale the drawing context to match device pixel ratio
    this.ctx.scale(dpr, dpr);
    
    // Update render context
    this.renderContext.width = rect.width;
    this.renderContext.height = rect.height;
    this.renderContext.dpr = dpr;
  }

  /**
   * Create render context object
   */
  private createRenderContext(): RenderContext {
    return {
      canvas: this.canvas,
      ctx: this.ctx,
      width: this.canvas.clientWidth,
      height: this.canvas.clientHeight,
      dpr: window.devicePixelRatio || 1
    };
  }

  /**
   * Main render loop
   */
  private render = (deltaTime: number): void => {
    if (!this.isInitialized) return;

    // Start performance frame measurement
    const frameStartTime = performance.now();
    this.performanceMonitor.startFrame();

    // Calculate actual delta time
    const actualDeltaTime = frameStartTime - this.lastFrameTime;
    this.lastFrameTime = frameStartTime;

    // Update text renderer with smooth scrolling
    this.textRenderer.update(actualDeltaTime);

    // Update typewriter effects
    this.typewriterEffect.update(deltaTime);
    
    // Update cursor animation
    this.cursorRenderer.update(deltaTime, this.config);

    // Get text buffer for effects and accessibility
    const textBuffer = this.textRenderer.getTextBuffer();
    this.accessibilityManager.updateTextBuffer(textBuffer);

    // Update effects
    this.effectsEngine.update(textBuffer, deltaTime, this.config);

    // Clear canvas
    this.clearCanvas();
    
    // Render background effects
    this.effectsEngine.render(this.ctx, this.config);
    
    // Render text with smooth scrolling
    this.textRenderer.render(this.renderContext, this.config);
    
    // Render cursor
    this.cursorRenderer.render(this.ctx, this.config);
    
    // Render overlay effects
    this.effectsEngine.renderOverlays(this.ctx, this.config);

    // End performance frame measurement
    this.performanceMonitor.endFrame();
    
    // Apply auto-optimization if enabled
    if (this.performanceMonitor.isAutoOptimizationEnabled()) {
      const suggestions = this.performanceMonitor.getOptimizationSuggestions();
      this.applyPerformanceOptimizations(suggestions);
    }
  };

  /**
   * Clear the canvas with background color
   */
  private clearCanvas(): void {
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.renderContext.width, this.renderContext.height);
  }

  /**
   * Print text to the terminal
   */
  print(text: string, options: PrintOptions = {}): void {
    if (!this.isInitialized) {
      console.warn('Terminal not initialized');
      return;
    }

    // Add newline if requested
    const textToPrint = options.newline !== false ? text + '\n' : text;
    
    if (options.typewriter) {
      // Use typewriter effect
      const speed = options.speed || this.config.typewriterSpeed;
      this.typewriterEffect.startAnimation(
        `print_${Date.now()}`,
        textToPrint,
        speed,
        {
          onCharacter: (char: string) => {
            const cursorPos = this.textRenderer.getCursorPosition();
            this.textRenderer.addText(char, cursorPos.x, cursorPos.y);
          }
        }
      );
    } else {
      // Immediate text rendering
      const cursorPos = this.textRenderer.getCursorPosition();
      this.textRenderer.addText(textToPrint, cursorPos.x, cursorPos.y);
    }
    
    // Update cursor position
    const newCursorPos = this.textRenderer.getCursorPosition();
    this.cursorRenderer.setPosition(newCursorPos.x, newCursorPos.y);
  }

  /**
   * Clear the terminal screen
   */
  clear(): void {
    if (!this.isInitialized) return;
    
    this.textRenderer.clear();
    this.effectsEngine.clear();
  }

  /**
   * Print text with typewriter effect
   */
  typewrite(text: string, speed?: number, onComplete?: () => void): void {
    this.print(text, { 
      typewriter: true, 
      speed: speed || this.config.typewriterSpeed 
    });
    
    if (onComplete) {
      // Set up completion callback
      setTimeout(onComplete, (text.length / (speed || this.config.typewriterSpeed)) * 1000);
    }
  }

  /**
   * Enable/disable interactive input mode
   */
  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
    this.inputHandler.setEnabled(enabled);
    
    if (enabled) {
      this.showPrompt();
      this.inputHandler.focus();
    }
  }

  /**
   * Set command prompt string
   */
  setPrompt(prompt: string): void {
    this.prompt = prompt;
  }

  /**
   * Set cursor style
   */
  setCursorStyle(style: 'block' | 'underline' | 'bar' | 'hollow'): void {
    this.cursorRenderer.setCursorStyle(style);
  }

  /**
   * Set custom command handler
   */
  setCommandHandler(handler: (command: string) => void): void {
    this.inputHandler.setCallbacks({
      onCommand: handler,
      onInput: (currentLine: string, cursorPos: number) => {
        this.updateInputLine(currentLine, cursorPos);
      },
      onSpecialKey: (key: string, modifiers) => {
        this.handleSpecialKey(key, modifiers);
      }
    });
  }

  /**
   * Focus the terminal for input
   */
  focus(): void {
    this.inputHandler.focus();
  }

  /**
   * Get input handler for advanced configuration
   */
  getInputHandler(): InputHandler {
    return this.inputHandler;
  }

  /**
   * Get cursor renderer for advanced configuration
   */
  getCursorRenderer(): CursorRenderer {
    return this.cursorRenderer;
  }

  /**
   * Get typewriter effect engine
   */
  getTypewriterEffect(): TypewriterEffect {
    return this.typewriterEffect;
  }

  /**
   * Update configuration at runtime
   */
  setConfig(newConfig: Partial<CRTConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update FPS if changed
    if (newConfig.targetFPS) {
      this.animationManager.setTargetFPS(newConfig.targetFPS);
    }
    
    // Re-initialize text renderer if font settings changed
    if (newConfig.fontSize || newConfig.fontFamily || newConfig.lineHeight) {
      this.textRenderer.initialize(this.renderContext, this.config);
    }
  }

  /**
   * Handle canvas resize
   */
  resize(): void {
    this.setupHighDPI();
    this.textRenderer.initialize(this.renderContext, this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): CRTConfig {
    return { ...this.config };
  }

  /**
   * Get terminal dimensions in characters
   */
  getDimensions(): { cols: number; rows: number } {
    return this.textRenderer.getDimensions();
  }

  /**
   * Check if terminal is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get effects engine for advanced configuration
   */
  getEffectsEngine(): EffectsEngine {
    return this.effectsEngine;
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    fps: number;
    dimensions: { cols: number; rows: number };
    effects: any;
  } {
    return {
      fps: this.animationManager.getCurrentFPS(),
      dimensions: this.textRenderer.getDimensions(),
      effects: this.effectsEngine.getStats()
    };
  }

  /**
   * Setup accessibility callbacks
   */
  private setupAccessibilityCallbacks(): void {
    this.accessibilityManager.setNavigationChangeCallback((position) => {
      // Highlight the character at the reading position
      const { x, y } = position;
      this.cursorRenderer.setPosition(x, y);
    });
  }

  /**
   * Setup mobile touch callbacks
   */
  private setupMobileCallbacks(): void {
    if (!this.mobileSupport) return;

    // Set up touch scrolling
    this.mobileSupport.setScrollCallback((deltaY: number, velocity: number) => {
      // Convert touch scroll to line-based scrolling
      const lineHeight = this.config.lineHeight;
      const lineScroll = deltaY / lineHeight;
      this.textRenderer.scrollByLines(lineScroll);
    });

    // Set up long press for context menu or selection
    this.mobileSupport.setLongPressCallback((x: number, y: number) => {
      // Calculate character position from pixel coordinates
      if (!this.currentMetrics) return;
      
      const charX = Math.floor(x / this.currentMetrics.width);
      const charY = Math.floor(y / this.config.lineHeight);
      
      // Show virtual keyboard or selection interface
      this.showMobileContextMenu(charX, charY);
    });
  }

  /**
   * Show mobile context menu at character position
   */
  private showMobileContextMenu(charX: number, charY: number): void {
    // Simple implementation - focus the canvas to show virtual keyboard
    this.canvas.focus();
    
    // In a real implementation, you might show a custom context menu
    // with options like "Paste", "Select All", "Copy", etc.
    
    // For now, just position the cursor at the touch point
    this.cursorRenderer.setPosition(charX, charY);
  }

  /**
   * Get current font metrics (needed for mobile calculations)
   */
  private get currentMetrics() {
    const dims = this.textRenderer.getDimensions();
    return {
      width: this.config.fontSize * 0.6, // Approximate monospace character width
      height: this.config.lineHeight
    };
  }

  /**
   * Apply performance optimizations based on suggestions
   */
  private applyPerformanceOptimizations(suggestions: string[]): void {
    suggestions.forEach(suggestion => {
      switch (suggestion) {
        case 'reduce_glow':
          this.config.glowIntensity = Math.max(0.1, this.config.glowIntensity - 0.1);
          break;
        case 'disable_scanlines':
          this.config.scanlines = false;
          break;
        case 'disable_flicker':
          this.config.flicker = false;
          break;
        case 'reduce_fps':
          this.config.targetFPS = Math.max(30, this.config.targetFPS - 10);
          this.animationManager.setTargetFPS(this.config.targetFPS);
          break;
        case 'disable_antialiasing':
          this.config.enableAntialiasing = false;
          break;
      }
    });
  }

  /**
   * Get performance monitor for external access
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor;
  }

  /**
   * Get accessibility manager for external configuration
   */
  getAccessibilityManager(): AccessibilityManager {
    return this.accessibilityManager;
  }

  /**
   * Get text renderer for advanced operations
   */
  getTextRenderer(): TextRenderer {
    return this.textRenderer;
  }

  /**
   * Enable smooth scrolling to a specific line
   */
  scrollToLine(lineNumber: number): void {
    this.textRenderer.scrollToLine(lineNumber);
  }

  /**
   * Scroll by a number of lines
   */
  scrollByLines(lines: number): void {
    this.textRenderer.scrollByLines(lines);
  }

  /**
   * Enable or disable auto-scrolling
   */
  setAutoScroll(enabled: boolean): void {
    this.textRenderer.setAutoScroll(enabled);
  }

  /**
   * Get comprehensive terminal statistics
   */
  getDetailedStats(): {
    performance: any;
    accessibility: any;
    scrolling: any;
    effects: any;
    dimensions: { cols: number; rows: number };
  } {
    return {
      performance: this.performanceMonitor.getDetailedMetrics(),
      accessibility: this.accessibilityManager.getCurrentState(),
      scrolling: this.textRenderer.getScrollingViewport(),
      effects: this.effectsEngine.getStats(),
      dimensions: this.textRenderer.getDimensions()
    };
  }

  /**
   * Get mobile support instance (if available)
   */
  getMobileSupport(): MobileSupport | null {
    return this.mobileSupport;
  }

  /**
   * Check if running on mobile device
   */
  isMobileDevice(): boolean {
    return this.isMobile;
  }

  /**
   * Destroy the terminal and cleanup resources
   */
  destroy(): void {
    this.animationManager.removeCallback(this.render);
    this.textRenderer.destroy();
    this.effectsEngine.destroy();
    this.inputHandler.destroy();
    this.animationManager.destroy();
    this.performanceMonitor.destroy();
    this.accessibilityManager.destroy();
    
    if (this.mobileSupport) {
      this.mobileSupport.destroy();
    }
    
    this.isInitialized = false;
    
    console.log('CRT Canvas Terminal destroyed');
  }
}