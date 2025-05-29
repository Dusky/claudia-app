/**
 * Performance Monitor
 * Tracks rendering performance and provides optimization recommendations
 */

export interface PerformanceMetrics {
  fps: number;
  averageFps: number;
  frameTime: number;
  averageFrameTime: number;
  renderTime: number;
  effectsTime: number;
  textRenderTime: number;
  memoryUsage: number;
  frameDrops: number;
  totalFrames: number;
}

export interface OptimizationSuggestion {
  type: 'warning' | 'critical';
  category: 'fps' | 'memory' | 'effects' | 'rendering';
  message: string;
  suggestion: string;
  autoFix?: () => void;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private frameHistory: number[] = [];
  private renderTimeHistory: number[] = [];
  private historySize: number = 60; // Keep 1 second of history at 60fps
  
  private lastFrameTime: number = 0;
  private frameStartTime: number = 0;
  private renderStartTime: number = 0;
  private effectsStartTime: number = 0;
  private textRenderStartTime: number = 0;
  
  private targetFPS: number = 60;
  private warningThreshold: number = 0.8; // 80% of target FPS
  private criticalThreshold: number = 0.6; // 60% of target FPS
  
  private isMonitoring: boolean = false;
  private suggestions: OptimizationSuggestion[] = [];

  constructor(targetFPS: number = 60) {
    this.targetFPS = targetFPS;
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): PerformanceMetrics {
    return {
      fps: 0,
      averageFps: 0,
      frameTime: 0,
      averageFrameTime: 0,
      renderTime: 0,
      effectsTime: 0,
      textRenderTime: 0,
      memoryUsage: 0,
      frameDrops: 0,
      totalFrames: 0
    };
  }

  /**
   * Start monitoring a frame
   */
  startFrame(): void {
    if (!this.isMonitoring) return;
    
    this.frameStartTime = performance.now();
    
    // Calculate FPS from previous frame
    if (this.lastFrameTime > 0) {
      const frameTime = this.frameStartTime - this.lastFrameTime;
      this.updateFrameMetrics(frameTime);
    }
    
    this.lastFrameTime = this.frameStartTime;
  }

  /**
   * Mark start of render phase
   */
  startRender(): void {
    if (!this.isMonitoring) return;
    this.renderStartTime = performance.now();
  }

  /**
   * Mark end of render phase
   */
  endRender(): void {
    if (!this.isMonitoring) return;
    this.metrics.renderTime = performance.now() - this.renderStartTime;
  }

  /**
   * Mark start of effects rendering
   */
  startEffects(): void {
    if (!this.isMonitoring) return;
    this.effectsStartTime = performance.now();
  }

  /**
   * Mark end of effects rendering
   */
  endEffects(): void {
    if (!this.isMonitoring) return;
    this.metrics.effectsTime = performance.now() - this.effectsStartTime;
  }

  /**
   * Mark start of text rendering
   */
  startTextRender(): void {
    if (!this.isMonitoring) return;
    this.textRenderStartTime = performance.now();
  }

  /**
   * Mark end of text rendering
   */
  endTextRender(): void {
    if (!this.isMonitoring) return;
    this.metrics.textRenderTime = performance.now() - this.textRenderStartTime;
  }

  /**
   * End frame monitoring
   */
  endFrame(): void {
    if (!this.isMonitoring) return;
    
    const totalRenderTime = performance.now() - this.renderStartTime;
    this.renderTimeHistory.push(totalRenderTime);
    
    // Keep history size manageable
    if (this.renderTimeHistory.length > this.historySize) {
      this.renderTimeHistory.shift();
    }
    
    // Update average render time
    this.metrics.renderTime = totalRenderTime;
    
    // Update memory usage (if available)
    this.updateMemoryMetrics();
    
    // Analyze performance and generate suggestions
    this.analyzePerformance();
    
    this.metrics.totalFrames++;
  }

  /**
   * Update frame-based metrics
   */
  private updateFrameMetrics(frameTime: number): void {
    this.frameHistory.push(frameTime);
    
    // Keep history size manageable
    if (this.frameHistory.length > this.historySize) {
      this.frameHistory.shift();
    }
    
    // Calculate current FPS
    this.metrics.fps = frameTime > 0 ? 1000 / frameTime : 0;
    this.metrics.frameTime = frameTime;
    
    // Calculate average FPS
    if (this.frameHistory.length > 0) {
      const avgFrameTime = this.frameHistory.reduce((sum, time) => sum + time, 0) / this.frameHistory.length;
      this.metrics.averageFps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
      this.metrics.averageFrameTime = avgFrameTime;
    }
    
    // Count frame drops
    if (frameTime > (1000 / this.targetFPS) * 1.5) {
      this.metrics.frameDrops++;
    }
  }

  /**
   * Update memory metrics
   */
  private updateMemoryMetrics(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
    }
  }

  /**
   * Analyze current performance and generate suggestions
   */
  private analyzePerformance(): void {
    this.suggestions = [];
    
    // FPS Analysis
    if (this.metrics.averageFps < this.targetFPS * this.criticalThreshold) {
      this.suggestions.push({
        type: 'critical',
        category: 'fps',
        message: `Very low FPS detected: ${this.metrics.averageFps.toFixed(1)} (target: ${this.targetFPS})`,
        suggestion: 'Consider disabling heavy effects or reducing quality settings'
      });
    } else if (this.metrics.averageFps < this.targetFPS * this.warningThreshold) {
      this.suggestions.push({
        type: 'warning',
        category: 'fps',
        message: `Low FPS detected: ${this.metrics.averageFps.toFixed(1)} (target: ${this.targetFPS})`,
        suggestion: 'Consider reducing effect intensity or enabling performance mode'
      });
    }
    
    // Effects Performance Analysis
    if (this.metrics.effectsTime > 8) { // 8ms is roughly half a 60fps frame
      this.suggestions.push({
        type: 'warning',
        category: 'effects',
        message: `Effects rendering is slow: ${this.metrics.effectsTime.toFixed(1)}ms`,
        suggestion: 'Reduce glow intensity, disable curvature, or lower scanline opacity'
      });
    }
    
    // Memory Analysis
    if (this.metrics.memoryUsage > 100) { // 100MB threshold
      this.suggestions.push({
        type: 'warning',
        category: 'memory',
        message: `High memory usage: ${this.metrics.memoryUsage.toFixed(1)}MB`,
        suggestion: 'Clear terminal history or reduce phosphor persistence'
      });
    }
    
    // Frame drops analysis
    const frameDropRate = this.metrics.totalFrames > 0 ? this.metrics.frameDrops / this.metrics.totalFrames : 0;
    if (frameDropRate > 0.1) { // More than 10% frame drops
      this.suggestions.push({
        type: 'warning',
        category: 'fps',
        message: `High frame drop rate: ${(frameDropRate * 100).toFixed(1)}%`,
        suggestion: 'Enable adaptive quality or reduce visual complexity'
      });
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get optimization suggestions
   */
  getSuggestions(): OptimizationSuggestion[] {
    return [...this.suggestions];
  }

  /**
   * Get critical suggestions only
   */
  getCriticalSuggestions(): OptimizationSuggestion[] {
    return this.suggestions.filter(s => s.type === 'critical');
  }

  /**
   * Get performance grade (A-F)
   */
  getPerformanceGrade(): { grade: string; score: number } {
    let score = 100;
    
    // FPS penalty
    const fpsRatio = this.metrics.averageFps / this.targetFPS;
    if (fpsRatio < 1) {
      score -= (1 - fpsRatio) * 40; // Up to 40 points for FPS
    }
    
    // Render time penalty
    const targetFrameTime = 1000 / this.targetFPS;
    if (this.metrics.averageFrameTime > targetFrameTime) {
      const timeRatio = this.metrics.averageFrameTime / targetFrameTime;
      score -= (timeRatio - 1) * 30; // Up to 30 points for frame time
    }
    
    // Frame drops penalty
    const frameDropRate = this.metrics.totalFrames > 0 ? this.metrics.frameDrops / this.metrics.totalFrames : 0;
    score -= frameDropRate * 20; // Up to 20 points for frame drops
    
    // Memory penalty
    if (this.metrics.memoryUsage > 50) {
      score -= Math.min(10, (this.metrics.memoryUsage - 50) / 10); // Up to 10 points for memory
    }
    
    score = Math.max(0, Math.min(100, score));
    
    let grade = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    
    return { grade, score: Math.round(score) };
  }

  /**
   * Enable/disable monitoring
   */
  setMonitoring(enabled: boolean): void {
    this.isMonitoring = enabled;
    
    if (enabled) {
      this.reset();
    }
  }

  /**
   * Set target FPS
   */
  setTargetFPS(fps: number): void {
    this.targetFPS = Math.max(30, Math.min(120, fps));
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = this.createEmptyMetrics();
    this.frameHistory = [];
    this.renderTimeHistory = [];
    this.suggestions = [];
    this.lastFrameTime = 0;
  }

  /**
   * Get performance summary for logging
   */
  getSummary(): string {
    const grade = this.getPerformanceGrade();
    return [
      `Performance Grade: ${grade.grade} (${grade.score}/100)`,
      `FPS: ${this.metrics.fps.toFixed(1)} (avg: ${this.metrics.averageFps.toFixed(1)})`,
      `Frame Time: ${this.metrics.frameTime.toFixed(1)}ms (avg: ${this.metrics.averageFrameTime.toFixed(1)}ms)`,
      `Render Time: ${this.metrics.renderTime.toFixed(1)}ms`,
      `Effects Time: ${this.metrics.effectsTime.toFixed(1)}ms`,
      `Memory: ${this.metrics.memoryUsage.toFixed(1)}MB`,
      `Frame Drops: ${this.metrics.frameDrops}/${this.metrics.totalFrames}`
    ].join('\n');
  }

  /**
   * Auto-optimize based on performance
   */
  autoOptimize(config: any, setConfig: (config: any) => void): boolean {
    const critical = this.getCriticalSuggestions();
    
    if (critical.length === 0) {
      return false; // No critical issues
    }
    
    let optimized = false;
    const newConfig = { ...config };
    
    // Auto-fix critical FPS issues
    if (this.metrics.averageFps < this.targetFPS * this.criticalThreshold) {
      // Reduce effects progressively
      if (newConfig.curvature) {
        newConfig.curvature = false;
        optimized = true;
      } else if (newConfig.glowIntensity > 0.3) {
        newConfig.glowIntensity = Math.max(0.3, newConfig.glowIntensity * 0.7);
        optimized = true;
      } else if (newConfig.flickerIntensity > 0.1) {
        newConfig.flickerIntensity = Math.max(0.1, newConfig.flickerIntensity * 0.5);
        optimized = true;
      } else if (newConfig.scanlineOpacity > 0.05) {
        newConfig.scanlineOpacity = Math.max(0.05, newConfig.scanlineOpacity * 0.5);
        optimized = true;
      }
    }
    
    if (optimized) {
      setConfig(newConfig);
    }
    
    return optimized;
  }
}