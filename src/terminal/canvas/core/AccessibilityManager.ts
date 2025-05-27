import { TerminalChar, CRTConfig } from '../types/interfaces.js';

export interface AccessibilityOptions {
  enableScreenReader: boolean;
  announceNewText: boolean;
  enableKeyboardNavigation: boolean;
  enableHighContrast: boolean;
  reduceMotion: boolean;
  announceDelay: number;
}

export interface AccessibilityState {
  readingPosition: { x: number; y: number };
  selectedRegion: { start: { x: number; y: number }; end: { x: number; y: number } } | null;
  isNavigating: boolean;
  lastAnnouncedText: string;
  lastAnnouncementTime: number;
}

/**
 * AccessibilityManager provides screen reader support and keyboard navigation
 * for the CRT terminal, ensuring compliance with accessibility standards.
 */
export class AccessibilityManager {
  private options: AccessibilityOptions;
  private state: AccessibilityState;
  private ariaLiveRegion: HTMLElement | null = null;
  private canvas: HTMLCanvasElement;
  private textBuffer: TerminalChar[] = [];
  private onNavigationChange?: (position: { x: number; y: number }) => void;

  constructor(canvas: HTMLCanvasElement, options: Partial<AccessibilityOptions> = {}) {
    this.canvas = canvas;
    this.options = {
      enableScreenReader: true,
      announceNewText: true,
      enableKeyboardNavigation: true,
      enableHighContrast: false,
      reduceMotion: false,
      announceDelay: 500,
      ...options
    };

    this.state = {
      readingPosition: { x: 0, y: 0 },
      selectedRegion: null,
      isNavigating: false,
      lastAnnouncedText: '',
      lastAnnouncementTime: 0
    };

    this.initializeAccessibility();
  }

  private initializeAccessibility(): void {
    this.setupARIAAttributes();
    this.createLiveRegion();
    this.setupKeyboardNavigation();
  }

  private setupARIAAttributes(): void {
    // Set canvas accessibility attributes
    this.canvas.setAttribute('role', 'textbox');
    this.canvas.setAttribute('aria-label', 'CRT Terminal Display');
    this.canvas.setAttribute('aria-multiline', 'true');
    this.canvas.setAttribute('aria-readonly', 'false');
    this.canvas.setAttribute('tabindex', '0');
    
    // Add screen reader instructions
    this.canvas.setAttribute('aria-description', 
      'Terminal display. Use arrow keys to navigate text, Enter to select lines, Escape to exit navigation mode.');
  }

  private createLiveRegion(): void {
    if (!this.options.enableScreenReader) return;

    // Create hidden live region for screen reader announcements
    this.ariaLiveRegion = document.createElement('div');
    this.ariaLiveRegion.setAttribute('aria-live', 'polite');
    this.ariaLiveRegion.setAttribute('aria-atomic', 'true');
    this.ariaLiveRegion.style.position = 'absolute';
    this.ariaLiveRegion.style.left = '-10000px';
    this.ariaLiveRegion.style.width = '1px';
    this.ariaLiveRegion.style.height = '1px';
    this.ariaLiveRegion.style.overflow = 'hidden';
    
    document.body.appendChild(this.ariaLiveRegion);
  }

  private setupKeyboardNavigation(): void {
    if (!this.options.enableKeyboardNavigation) return;

    this.canvas.addEventListener('keydown', this.handleNavigationKeyDown.bind(this));
    this.canvas.addEventListener('focus', this.handleFocus.bind(this));
    this.canvas.addEventListener('blur', this.handleBlur.bind(this));
  }

  private handleNavigationKeyDown(event: KeyboardEvent): void {
    if (!this.state.isNavigating) {
      // Enter navigation mode with F6 or when using arrow keys
      if (event.key === 'F6' || event.key.startsWith('Arrow')) {
        this.enterNavigationMode();
      } else {
        return;
      }
    }

    switch (event.key) {
      case 'ArrowUp':
        this.moveReadingPosition(0, -1);
        event.preventDefault();
        break;
      case 'ArrowDown':
        this.moveReadingPosition(0, 1);
        event.preventDefault();
        break;
      case 'ArrowLeft':
        this.moveReadingPosition(-1, 0);
        event.preventDefault();
        break;
      case 'ArrowRight':
        this.moveReadingPosition(1, 0);
        event.preventDefault();
        break;
      case 'Home':
        this.moveToLineStart();
        event.preventDefault();
        break;
      case 'End':
        this.moveToLineEnd();
        event.preventDefault();
        break;
      case 'PageUp':
        this.moveReadingPosition(0, -10);
        event.preventDefault();
        break;
      case 'PageDown':
        this.moveReadingPosition(0, 10);
        event.preventDefault();
        break;
      case 'Enter':
        this.selectCurrentLine();
        event.preventDefault();
        break;
      case 'Escape':
        this.exitNavigationMode();
        event.preventDefault();
        break;
    }
  }

  private handleFocus(): void {
    this.announceToScreenReader('Terminal focused. Press F6 to navigate text content.');
  }

  private handleBlur(): void {
    this.exitNavigationMode();
  }

  private enterNavigationMode(): void {
    this.state.isNavigating = true;
    this.canvas.setAttribute('aria-description', 
      'Navigation mode active. Use arrow keys to move, Enter to select, Escape to exit.');
    this.announceToScreenReader('Navigation mode active');
    this.announceCurrentPosition();
  }

  private exitNavigationMode(): void {
    this.state.isNavigating = false;
    this.state.selectedRegion = null;
    this.canvas.setAttribute('aria-description', 
      'Terminal display. Press F6 to navigate text content.');
    this.announceToScreenReader('Navigation mode inactive');
  }

  private moveReadingPosition(deltaX: number, deltaY: number): void {
    const newX = Math.max(0, this.state.readingPosition.x + deltaX);
    const newY = Math.max(0, this.state.readingPosition.y + deltaY);
    
    this.state.readingPosition = { x: newX, y: newY };
    this.announceCurrentPosition();
    
    if (this.onNavigationChange) {
      this.onNavigationChange(this.state.readingPosition);
    }
  }

  private moveToLineStart(): void {
    this.state.readingPosition.x = 0;
    this.announceCurrentPosition();
  }

  private moveToLineEnd(): void {
    const lineChars = this.getLineChars(this.state.readingPosition.y);
    this.state.readingPosition.x = Math.max(0, lineChars.length - 1);
    this.announceCurrentPosition();
  }

  private selectCurrentLine(): void {
    const lineText = this.getLineText(this.state.readingPosition.y);
    this.state.selectedRegion = {
      start: { x: 0, y: this.state.readingPosition.y },
      end: { x: lineText.length, y: this.state.readingPosition.y }
    };
    this.announceToScreenReader(`Line selected: ${lineText}`);
  }

  private announceCurrentPosition(): void {
    const char = this.getCharAtPosition(this.state.readingPosition.x, this.state.readingPosition.y);
    const lineText = this.getLineText(this.state.readingPosition.y);
    const position = `Line ${this.state.readingPosition.y + 1}, Column ${this.state.readingPosition.x + 1}`;
    
    if (char) {
      this.announceToScreenReader(`${position}: ${char.char === ' ' ? 'space' : char.char}`);
    } else if (lineText.length === 0) {
      this.announceToScreenReader(`${position}: empty line`);
    } else {
      this.announceToScreenReader(`${position}: end of line`);
    }
  }

  public updateTextBuffer(textBuffer: TerminalChar[]): void {
    const previousLength = this.textBuffer.length;
    this.textBuffer = [...textBuffer];
    
    // Announce new text if enabled and text was added
    if (this.options.announceNewText && textBuffer.length > previousLength) {
      const newChars = textBuffer.slice(previousLength);
      const newText = newChars.map(char => char.char).join('');
      this.announceNewContent(newText);
    }
  }

  private announceNewContent(text: string): void {
    const now = performance.now();
    if (now - this.state.lastAnnouncementTime < this.options.announceDelay) {
      return; // Rate limit announcements
    }

    const trimmedText = text.trim();
    if (trimmedText && trimmedText !== this.state.lastAnnouncedText) {
      this.announceToScreenReader(trimmedText);
      this.state.lastAnnouncedText = trimmedText;
      this.state.lastAnnouncementTime = now;
    }
  }

  private announceToScreenReader(message: string): void {
    if (!this.ariaLiveRegion || !this.options.enableScreenReader) return;
    
    // Clear and set new message
    this.ariaLiveRegion.textContent = '';
    setTimeout(() => {
      if (this.ariaLiveRegion) {
        this.ariaLiveRegion.textContent = message;
      }
    }, 10);
  }

  private getCharAtPosition(x: number, y: number): TerminalChar | null {
    return this.textBuffer.find(char => char.x === x && char.y === y) || null;
  }

  private getLineChars(y: number): TerminalChar[] {
    return this.textBuffer.filter(char => char.y === y).sort((a, b) => a.x - b.x);
  }

  private getLineText(y: number): string {
    const lineChars = this.getLineChars(y);
    if (lineChars.length === 0) return '';
    
    // Fill in gaps with spaces to maintain proper spacing
    const maxX = Math.max(...lineChars.map(char => char.x));
    const line = new Array(maxX + 1).fill(' ');
    lineChars.forEach(char => {
      line[char.x] = char.char;
    });
    
    return line.join('').trimEnd();
  }

  public getFullText(): string {
    if (this.textBuffer.length === 0) return '';
    
    const maxY = Math.max(...this.textBuffer.map(char => char.y));
    const lines: string[] = [];
    
    for (let y = 0; y <= maxY; y++) {
      lines.push(this.getLineText(y));
    }
    
    return lines.join('\n');
  }

  public setNavigationChangeCallback(callback: (position: { x: number; y: number }) => void): void {
    this.onNavigationChange = callback;
  }

  public applyAccessibilityConfig(config: CRTConfig): CRTConfig {
    if (this.options.enableHighContrast) {
      return {
        ...config,
        phosphorColor: '#ffffff',
        backgroundColor: '#000000',
        glowIntensity: 0.2, // Reduce glow for better contrast
        scanlines: false,   // Disable scanlines for clarity
        flicker: false      // Disable flicker for stability
      };
    }

    if (this.options.reduceMotion) {
      return {
        ...config,
        flicker: false,
        cursorBlink: false,
        typewriterVariation: 0 // No timing variation
      };
    }

    return config;
  }

  public getCurrentState(): AccessibilityState {
    return { ...this.state };
  }

  public setOptions(options: Partial<AccessibilityOptions>): void {
    this.options = { ...this.options, ...options };
    
    if (!this.options.enableScreenReader && this.ariaLiveRegion) {
      document.body.removeChild(this.ariaLiveRegion);
      this.ariaLiveRegion = null;
    } else if (this.options.enableScreenReader && !this.ariaLiveRegion) {
      this.createLiveRegion();
    }
  }

  public destroy(): void {
    if (this.ariaLiveRegion) {
      document.body.removeChild(this.ariaLiveRegion);
      this.ariaLiveRegion = null;
    }
    
    this.canvas.removeEventListener('keydown', this.handleNavigationKeyDown.bind(this));
    this.canvas.removeEventListener('focus', this.handleFocus.bind(this));
    this.canvas.removeEventListener('blur', this.handleBlur.bind(this));
  }
}