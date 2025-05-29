/**
 * Mobile Support Utilities
 * Provides touch and mobile-specific functionality for the CRT terminal
 */

export interface TouchState {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  velocity: number;
  timestamp: number;
}

export interface MobileConfig {
  enableTouch: boolean;
  touchScrollSensitivity: number;
  pinchZoomEnabled: boolean;
  longPressDelay: number;
  swipeThreshold: number;
  momentumDecay: number;
}

/**
 * MobileSupport handles touch interactions and mobile-specific optimizations
 * for the CRT terminal on mobile devices.
 */
export class MobileSupport {
  private canvas: HTMLCanvasElement;
  private config: MobileConfig;
  private touchState: TouchState;
  private onScroll?: (deltaY: number, velocity: number) => void;
  private onZoom?: (scale: number, centerX: number, centerY: number) => void;
  private onLongPress?: (x: number, y: number) => void;
  private longPressTimer: number | null = null;
  private lastTouchTime: number = 0;
  private momentumAnimation: number | null = null;

  private static readonly DEFAULT_CONFIG: MobileConfig = {
    enableTouch: true,
    touchScrollSensitivity: 2.0,
    pinchZoomEnabled: false, // Disabled by default for terminal use
    longPressDelay: 500,
    swipeThreshold: 50,
    momentumDecay: 0.95
  };

  constructor(canvas: HTMLCanvasElement, config: Partial<MobileConfig> = {}) {
    this.canvas = canvas;
    this.config = { ...MobileSupport.DEFAULT_CONFIG, ...config };
    
    this.touchState = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
      timestamp: 0
    };

    this.initializeTouchHandlers();
    this.setupViewportMeta();
  }

  private initializeTouchHandlers(): void {
    if (!this.config.enableTouch) return;

    // Prevent default touch behaviors that interfere with terminal
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });

    // Handle pinch zoom if enabled
    if (this.config.pinchZoomEnabled) {
      this.canvas.addEventListener('gesturestart', this.handleGestureStart.bind(this), { passive: false });
      this.canvas.addEventListener('gesturechange', this.handleGestureChange.bind(this), { passive: false });
      this.canvas.addEventListener('gestureend', this.handleGestureEnd.bind(this), { passive: false });
    }
  }

  private setupViewportMeta(): void {
    // Ensure proper viewport settings for mobile
    let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }

    // Set mobile-optimized viewport
    const zoomControl = this.config.pinchZoomEnabled ? 'user-scalable=yes' : 'user-scalable=no';
    viewport.content = `width=device-width, initial-scale=1.0, ${zoomControl}, viewport-fit=cover`;
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    
    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    
    this.touchState = {
      active: true,
      startX: touch.clientX - rect.left,
      startY: touch.clientY - rect.top,
      currentX: touch.clientX - rect.left,
      currentY: touch.clientY - rect.top,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
      timestamp: performance.now()
    };

    this.lastTouchTime = this.touchState.timestamp;

    // Start long press timer
    if (this.onLongPress) {
      this.longPressTimer = window.setTimeout(() => {
        if (this.touchState.active) {
          this.onLongPress!(this.touchState.currentX, this.touchState.currentY);
        }
      }, this.config.longPressDelay);
    }

    // Stop any ongoing momentum animation
    if (this.momentumAnimation) {
      cancelAnimationFrame(this.momentumAnimation);
      this.momentumAnimation = null;
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    
    if (!this.touchState.active || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const currentTime = performance.now();
    
    const newX = touch.clientX - rect.left;
    const newY = touch.clientY - rect.top;
    
    const deltaX = newX - this.touchState.currentX;
    const deltaY = newY - this.touchState.currentY;
    const deltaTime = currentTime - this.touchState.timestamp;
    
    // Update touch state
    this.touchState.currentX = newX;
    this.touchState.currentY = newY;
    this.touchState.deltaX = deltaX;
    this.touchState.deltaY = deltaY;
    this.touchState.velocity = deltaTime > 0 ? Math.abs(deltaY) / deltaTime : 0;
    this.touchState.timestamp = currentTime;

    // Clear long press timer (user is moving)
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Handle scrolling
    if (this.onScroll && Math.abs(deltaY) > 1) {
      const scrollDelta = deltaY * this.config.touchScrollSensitivity;
      this.onScroll(-scrollDelta, this.touchState.velocity); // Negative for natural scrolling
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    
    if (!this.touchState.active) return;

    const endTime = performance.now();
    const totalDeltaY = this.touchState.currentY - this.touchState.startY;
    const totalTime = endTime - this.lastTouchTime;

    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Check for swipe gesture
    if (Math.abs(totalDeltaY) > this.config.swipeThreshold && totalTime < 300) {
      this.handleSwipeGesture(totalDeltaY > 0 ? 'down' : 'up', Math.abs(totalDeltaY));
    }

    // Apply momentum scrolling if there was significant velocity
    if (this.touchState.velocity > 0.5 && this.onScroll) {
      this.startMomentumScrolling();
    }

    // Reset touch state
    this.touchState.active = false;
  }

  private handleTouchCancel(event: TouchEvent): void {
    event.preventDefault();
    
    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Stop momentum animation
    if (this.momentumAnimation) {
      cancelAnimationFrame(this.momentumAnimation);
      this.momentumAnimation = null;
    }

    // Reset touch state
    this.touchState.active = false;
  }

  private handleSwipeGesture(direction: 'up' | 'down', distance: number): void {
    if (!this.onScroll) return;

    // Convert swipe to scroll
    const scrollAmount = distance * this.config.touchScrollSensitivity * 2;
    const scrollDirection = direction === 'down' ? 1 : -1;
    
    this.onScroll(scrollAmount * scrollDirection, this.touchState.velocity);
  }

  private startMomentumScrolling(): void {
    if (!this.onScroll) return;

    let currentVelocity = this.touchState.velocity;
    const direction = this.touchState.deltaY > 0 ? 1 : -1;

    const animate = () => {
      if (currentVelocity < 0.1) {
        this.momentumAnimation = null;
        return;
      }

      const scrollDelta = currentVelocity * direction * this.config.touchScrollSensitivity * 0.5;
      this.onScroll!(scrollDelta, currentVelocity);
      
      currentVelocity *= this.config.momentumDecay;
      this.momentumAnimation = requestAnimationFrame(animate);
    };

    this.momentumAnimation = requestAnimationFrame(animate);
  }

  private handleGestureStart(event: any): void {
    event.preventDefault();
    // Gesture handling for pinch zoom (if enabled)
  }

  private handleGestureChange(event: any): void {
    event.preventDefault();
    
    if (!this.config.pinchZoomEnabled || !this.onZoom) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    this.onZoom(event.scale, centerX, centerY);
  }

  private handleGestureEnd(event: any): void {
    event.preventDefault();
    // Cleanup after gesture
  }

  /**
   * Set scroll callback for touch scrolling
   */
  setScrollCallback(callback: (deltaY: number, velocity: number) => void): void {
    this.onScroll = callback;
  }

  /**
   * Set zoom callback for pinch zoom (if enabled)
   */
  setZoomCallback(callback: (scale: number, centerX: number, centerY: number) => void): void {
    this.onZoom = callback;
  }

  /**
   * Set long press callback
   */
  setLongPressCallback(callback: (x: number, y: number) => void): void {
    this.onLongPress = callback;
  }

  /**
   * Check if device appears to be mobile
   */
  static isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  /**
   * Get device-specific optimizations
   */
  static getDeviceOptimizations(): Partial<MobileConfig> {
    const userAgent = navigator.userAgent;
    
    if (/iPad/i.test(userAgent)) {
      return {
        touchScrollSensitivity: 1.5,
        pinchZoomEnabled: false,
        longPressDelay: 600
      };
    }
    
    if (/iPhone/i.test(userAgent)) {
      return {
        touchScrollSensitivity: 2.0,
        pinchZoomEnabled: false,
        longPressDelay: 500
      };
    }
    
    if (/Android/i.test(userAgent)) {
      return {
        touchScrollSensitivity: 1.8,
        pinchZoomEnabled: false,
        longPressDelay: 550
      };
    }
    
    return {};
  }

  /**
   * Update mobile configuration
   */
  setConfig(newConfig: Partial<MobileConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current touch state
   */
  getTouchState(): TouchState {
    return { ...this.touchState };
  }

  /**
   * Check if touch is currently active
   */
  isTouchActive(): boolean {
    return this.touchState.active;
  }

  /**
   * Cleanup and remove event listeners
   */
  destroy(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (this.momentumAnimation) {
      cancelAnimationFrame(this.momentumAnimation);
      this.momentumAnimation = null;
    }

    // Remove event listeners
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
    
    if (this.config.pinchZoomEnabled) {
      this.canvas.removeEventListener('gesturestart', this.handleGestureStart.bind(this));
      this.canvas.removeEventListener('gesturechange', this.handleGestureChange.bind(this));
      this.canvas.removeEventListener('gestureend', this.handleGestureEnd.bind(this));
    }
  }
}