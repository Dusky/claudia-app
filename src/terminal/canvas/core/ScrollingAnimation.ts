/**
 * Smooth Scrolling Animation System
 * Handles smooth scrolling transitions and viewport management
 */

import type { CRTConfig } from '../types/interfaces';

export interface ScrollState {
  offsetY: number;           // Current scroll position
  targetOffsetY: number;     // Target scroll position
  velocity: number;          // Current scroll velocity
  isScrolling: boolean;      // Whether actively scrolling
  lastScrollTime: number;    // Timestamp of last scroll update
}

export interface ViewportInfo {
  visibleLines: number;      // Lines visible in viewport
  totalLines: number;        // Total lines in buffer
  scrollProgress: number;    // Scroll progress (0-1)
  canScrollUp: boolean;      // Can scroll up
  canScrollDown: boolean;    // Can scroll down
}

export class ScrollingAnimation {
  private scrollState: ScrollState;
  private lineHeight: number = 20;
  private viewportHeight: number = 0;
  private totalContentHeight: number = 0;
  
  // Animation parameters
  private scrollDamping: number = 0.15;      // Scroll smoothing factor
  private scrollSpeed: number = 3;           // Lines per scroll
  private autoScrollMargin: number = 2;      // Lines from bottom to trigger auto-scroll
  private maxScrollVelocity: number = 10;    // Maximum scroll velocity
  
  // Smooth scrolling settings
  private enableSmoothScrolling: boolean = true;
  private scrollAcceleration: number = 0.8;
  private scrollDeceleration: number = 0.92;

  constructor() {
    this.scrollState = {
      offsetY: 0,
      targetOffsetY: 0,
      velocity: 0,
      isScrolling: false,
      lastScrollTime: 0
    };
  }

  /**
   * Initialize scrolling system with viewport dimensions
   */
  initialize(viewportHeight: number, lineHeight: number): void {
    this.viewportHeight = viewportHeight;
    this.lineHeight = lineHeight;
    this.scrollState.lastScrollTime = performance.now();
  }

  /**
   * Update scroll animation
   */
  update(deltaTime: number, totalLines: number): void {
    this.totalContentHeight = totalLines * this.lineHeight;
    
    if (!this.enableSmoothScrolling) {
      this.scrollState.offsetY = this.scrollState.targetOffsetY;
      this.scrollState.velocity = 0;
      this.scrollState.isScrolling = false;
      return;
    }

    const currentTime = performance.now();
    const timeDelta = Math.min(deltaTime, 16); // Cap at 16ms for stability
    
    // Calculate distance to target
    const distance = this.scrollState.targetOffsetY - this.scrollState.offsetY;
    
    if (Math.abs(distance) < 0.1 && Math.abs(this.scrollState.velocity) < 0.1) {
      // Close enough to target - snap to final position
      this.scrollState.offsetY = this.scrollState.targetOffsetY;
      this.scrollState.velocity = 0;
      this.scrollState.isScrolling = false;
    } else {
      // Apply smooth scrolling physics
      this.scrollState.isScrolling = true;
      
      // Calculate acceleration towards target
      const acceleration = distance * this.scrollAcceleration;
      
      // Update velocity with acceleration and damping
      this.scrollState.velocity += acceleration * (timeDelta / 16);
      this.scrollState.velocity *= this.scrollDeceleration;
      
      // Clamp velocity
      this.scrollState.velocity = Math.max(
        -this.maxScrollVelocity,
        Math.min(this.maxScrollVelocity, this.scrollState.velocity)
      );
      
      // Update position
      this.scrollState.offsetY += this.scrollState.velocity * (timeDelta / 16);
    }
    
    // Ensure scroll bounds
    this.enforceScrollBounds();
    this.scrollState.lastScrollTime = currentTime;
  }

  /**
   * Scroll by a specific number of lines
   */
  scrollByLines(lines: number): void {
    const scrollAmount = lines * this.lineHeight;
    this.scrollState.targetOffsetY += scrollAmount;
    this.enforceScrollBounds();
  }

  /**
   * Scroll to a specific line
   */
  scrollToLine(line: number): void {
    this.scrollState.targetOffsetY = line * this.lineHeight;
    this.enforceScrollBounds();
  }

  /**
   * Scroll to top
   */
  scrollToTop(): void {
    this.scrollState.targetOffsetY = 0;
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom(): void {
    const maxScroll = Math.max(0, this.totalContentHeight - this.viewportHeight);
    this.scrollState.targetOffsetY = maxScroll;
  }

  /**
   * Auto-scroll to keep cursor visible (like following terminal output)
   */
  autoScrollToCursor(cursorLine: number): void {
    const cursorY = cursorLine * this.lineHeight;
    const viewportTop = this.scrollState.offsetY;
    const viewportBottom = viewportTop + this.viewportHeight;
    
    // Check if cursor is outside visible area
    if (cursorY < viewportTop) {
      // Cursor above viewport - scroll up
      this.scrollState.targetOffsetY = Math.max(0, cursorY - this.lineHeight);
    } else if (cursorY + this.lineHeight > viewportBottom) {
      // Cursor below viewport - scroll down
      const newTarget = cursorY - this.viewportHeight + (this.autoScrollMargin * this.lineHeight);
      this.scrollState.targetOffsetY = Math.min(
        this.totalContentHeight - this.viewportHeight,
        newTarget
      );
    }
  }

  /**
   * Handle wheel scroll events
   */
  handleWheelScroll(deltaY: number): void {
    // Convert wheel delta to line scrolling
    const lines = Math.sign(deltaY) * this.scrollSpeed;
    this.scrollByLines(lines);
  }

  /**
   * Handle page up/down scrolling
   */
  scrollPage(direction: 'up' | 'down'): void {
    const visibleLines = Math.floor(this.viewportHeight / this.lineHeight);
    const pageSize = Math.max(1, visibleLines - 2); // Leave 2 lines overlap
    
    this.scrollByLines(direction === 'up' ? -pageSize : pageSize);
  }

  /**
   * Enforce scroll bounds to prevent over-scrolling
   */
  private enforceScrollBounds(): void {
    const maxScroll = Math.max(0, this.totalContentHeight - this.viewportHeight);
    
    this.scrollState.targetOffsetY = Math.max(0, Math.min(maxScroll, this.scrollState.targetOffsetY));
    this.scrollState.offsetY = Math.max(0, Math.min(maxScroll, this.scrollState.offsetY));
  }

  /**
   * Get current viewport information
   */
  getViewportInfo(): ViewportInfo {
    const visibleLines = Math.floor(this.viewportHeight / this.lineHeight);
    const totalLines = Math.ceil(this.totalContentHeight / this.lineHeight);
    const maxScroll = Math.max(0, this.totalContentHeight - this.viewportHeight);
    
    return {
      visibleLines,
      totalLines,
      scrollProgress: maxScroll > 0 ? this.scrollState.offsetY / maxScroll : 0,
      canScrollUp: this.scrollState.offsetY > 0,
      canScrollDown: this.scrollState.offsetY < maxScroll
    };
  }

  /**
   * Get current scroll offset
   */
  getScrollOffset(): { x: number; y: number } {
    return {
      x: 0, // No horizontal scrolling for now
      y: this.scrollState.offsetY
    };
  }

  /**
   * Check if currently scrolling
   */
  isScrolling(): boolean {
    return this.scrollState.isScrolling;
  }

  /**
   * Get visible line range
   */
  getVisibleLineRange(): { start: number; end: number } {
    const startLine = Math.floor(this.scrollState.offsetY / this.lineHeight);
    const visibleLines = Math.ceil(this.viewportHeight / this.lineHeight);
    
    return {
      start: Math.max(0, startLine),
      end: Math.min(
        Math.ceil(this.totalContentHeight / this.lineHeight),
        startLine + visibleLines + 1 // +1 for partial lines
      )
    };
  }

  /**
   * Configure smooth scrolling parameters
   */
  configureScrolling(options: {
    smoothScrolling?: boolean;
    scrollSpeed?: number;
    damping?: number;
    autoScrollMargin?: number;
  }): void {
    if (options.smoothScrolling !== undefined) {
      this.enableSmoothScrolling = options.smoothScrolling;
    }
    if (options.scrollSpeed !== undefined) {
      this.scrollSpeed = Math.max(1, Math.min(10, options.scrollSpeed));
    }
    if (options.damping !== undefined) {
      this.scrollDamping = Math.max(0.05, Math.min(0.5, options.damping));
    }
    if (options.autoScrollMargin !== undefined) {
      this.autoScrollMargin = Math.max(0, Math.min(10, options.autoScrollMargin));
    }
  }

  /**
   * Enable/disable smooth scrolling
   */
  setSmoothScrolling(enabled: boolean): void {
    this.enableSmoothScrolling = enabled;
    
    if (!enabled) {
      // Immediately snap to target when disabling
      this.scrollState.offsetY = this.scrollState.targetOffsetY;
      this.scrollState.velocity = 0;
      this.scrollState.isScrolling = false;
    }
  }

  /**
   * Get scrolling statistics for debugging
   */
  getScrollStats(): {
    offsetY: number;
    targetOffsetY: number;
    velocity: number;
    isScrolling: boolean;
    contentHeight: number;
    viewportHeight: number;
  } {
    return {
      offsetY: this.scrollState.offsetY,
      targetOffsetY: this.scrollState.targetOffsetY,
      velocity: this.scrollState.velocity,
      isScrolling: this.scrollState.isScrolling,
      contentHeight: this.totalContentHeight,
      viewportHeight: this.viewportHeight
    };
  }

  /**
   * Reset scroll state
   */
  reset(): void {
    this.scrollState = {
      offsetY: 0,
      targetOffsetY: 0,
      velocity: 0,
      isScrolling: false,
      lastScrollTime: performance.now()
    };
  }
}