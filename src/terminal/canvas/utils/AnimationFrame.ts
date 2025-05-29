/**
 * Animation Frame Manager
 * Centralized RAF loop with FPS targeting and callback management
 */

import type { AnimationCallback } from '../types/interfaces';

export class AnimationFrameManager {
  private callbacks: Set<AnimationCallback> = new Set();
  private rafId: number | null = null;
  private lastTime: number = 0;
  private targetFPS: number = 60;
  private frameInterval: number;
  private isRunning: boolean = false;

  constructor(targetFPS: number = 60) {
    this.targetFPS = targetFPS;
    this.frameInterval = 1000 / targetFPS;
  }

  /**
   * Add a callback to the animation loop
   */
  addCallback(callback: AnimationCallback): void {
    this.callbacks.add(callback);
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Remove a callback from the animation loop
   */
  removeCallback(callback: AnimationCallback): void {
    this.callbacks.delete(callback);
    if (this.callbacks.size === 0) {
      this.stop();
    }
  }

  /**
   * Update target FPS
   */
  setTargetFPS(fps: number): void {
    this.targetFPS = fps;
    this.frameInterval = 1000 / fps;
  }

  /**
   * Start the animation loop
   */
  private start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick();
  }

  /**
   * Stop the animation loop
   */
  private stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isRunning = false;
  }

  /**
   * Main animation loop tick
   */
  private tick = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;

    // Frame rate limiting
    if (deltaTime >= this.frameInterval) {
      // Execute all callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(deltaTime);
        } catch (error) {
          console.error('Animation callback error:', error);
        }
      });

      this.lastTime = currentTime - (deltaTime % this.frameInterval);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  /**
   * Force stop all animations and cleanup
   */
  destroy(): void {
    this.stop();
    this.callbacks.clear();
  }

  /**
   * Get current FPS (approximate)
   */
  getCurrentFPS(): number {
    return this.targetFPS; // Simplified for now
  }

  /**
   * Check if animation loop is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }
}