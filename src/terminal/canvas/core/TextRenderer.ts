/**
 * Canvas Text Renderer
 * Handles all text rendering operations for the CRT terminal
 */

import type { CRTConfig, FontMetrics, TerminalChar, RenderContext } from '../types/interfaces';
import { FontMetricsCalculator } from '../utils/FontMetrics';
import { ScrollingAnimation } from './ScrollingAnimation';

export interface ScrollingViewport {
  offsetY: number;
  viewportHeight: number;
  totalHeight: number;
}

export class TextRenderer {
  private fontMetrics: FontMetricsCalculator;
  private currentMetrics: FontMetrics | null = null;
  private textBuffer: TerminalChar[] = [];
  private cols: number = 0;
  private rows: number = 0;
  private scrolling: ScrollingAnimation;
  private autoScroll: boolean = true;
  
  // Buffer virtualization settings
  private maxBufferLines: number = 2000;
  private virtualBufferLines: number = 1000;
  private textBufferHistory: TerminalChar[][] = [];
  private currentLineCount: number = 0;

  constructor() {
    this.fontMetrics = new FontMetricsCalculator();
    this.scrolling = new ScrollingAnimation();
  }

  /**
   * Initialize text renderer with canvas context and configuration
   */
  initialize(renderContext: RenderContext, config: CRTConfig): void {
    // Calculate font metrics
    this.currentMetrics = this.fontMetrics.calculateMetrics(
      config.fontFamily, 
      config.fontSize
    );

    // Calculate terminal dimensions in characters
    this.cols = Math.floor(renderContext.width / this.currentMetrics.width);
    this.rows = Math.floor(renderContext.height / config.lineHeight);

    // Verify font is monospaced (warn if not)
    if (!this.fontMetrics.isMonospace(config.fontFamily, config.fontSize)) {
      console.warn('Non-monospace font detected. Terminal layout may be inconsistent.');
    }
  }

  /**
   * Add text to the terminal buffer
   */
  addText(text: string, startX: number = 0, startY: number = 0): void {
    if (!this.currentMetrics) {
      console.error('TextRenderer not initialized');
      return;
    }

    const timestamp = performance.now();
    let x = startX;
    let y = startY;

    for (const char of text) {
      if (char === '\n') {
        x = 0;
        y++;
        this.currentLineCount++;
        continue;
      }

      if (char === '\r') {
        x = 0;
        continue;
      }

      // Add character to buffer
      this.textBuffer.push({
        char,
        x,
        y,
        timestamp,
        brightness: 1.0
      });

      x++;

      // Handle line wrapping
      if (x >= this.cols) {
        x = 0;
        y++;
        this.currentLineCount++;
      }

      // Handle vertical scrolling
      if (y >= this.rows) {
        this.scrollUp();
        y = this.rows - 1;
      }
    }
    
    // Check if we need to trim the buffer
    this.trimBufferIfNeeded();
  }

  /**
   * Update scrolling animation
   */
  update(deltaTime: number): void {
    if (!this.currentMetrics) return;

    const totalLines = this.getTotalLines();
    this.scrolling.update(deltaTime, totalLines);
    
    // Auto-scroll to bottom when new content is added
    if (this.autoScroll && totalLines > this.rows) {
      this.scrolling.scrollToBottom(this.rows);
    }
  }

  /**
   * Render all text characters to canvas with smooth scrolling
   */
  render(renderContext: RenderContext, config: CRTConfig): void {
    if (!this.currentMetrics) return;

    const { ctx } = renderContext;

    // Set font properties
    ctx.font = `${config.fontSize}px ${config.fontFamily}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = config.phosphorColor;
    
    // Enable/disable antialiasing
    if (!config.enableAntialiasing) {
      ctx.imageSmoothingEnabled = false;
    }

    // Get current scroll position
    const scrollState = this.scrolling.getScrollState();
    const scrollOffset = scrollState.offsetY;

    // Calculate visible line range
    const firstVisibleLine = Math.floor(scrollOffset / config.lineHeight);
    const lastVisibleLine = Math.ceil((scrollOffset + renderContext.height) / config.lineHeight);

    // Save context for clipping
    ctx.save();
    
    // Set up viewport clipping
    ctx.beginPath();
    ctx.rect(0, 0, renderContext.width, renderContext.height);
    ctx.clip();

    // Render each character with scroll offset
    this.textBuffer.forEach(termChar => {
      // Skip characters outside visible area
      if (termChar.y < firstVisibleLine || termChar.y > lastVisibleLine) {
        return;
      }

      const pixelX = termChar.x * this.currentMetrics!.width;
      const pixelY = termChar.y * config.lineHeight - scrollOffset;

      // Apply brightness for fade effects
      if (termChar.brightness < 1.0) {
        ctx.globalAlpha = termChar.brightness;
      }

      ctx.fillText(termChar.char, pixelX, pixelY);

      // Reset alpha if it was changed
      if (termChar.brightness < 1.0) {
        ctx.globalAlpha = 1.0;
      }
    });

    // Restore context
    ctx.restore();
  }

  /**
   * Clear the text buffer
   */
  clear(): void {
    this.textBuffer = [];
    this.textBufferHistory = [];
    this.currentLineCount = 0;
  }

  /**
   * Scroll the terminal up by one line
   */
  private scrollUp(): void {
    // Remove all characters from the top row
    this.textBuffer = this.textBuffer.filter(char => char.y > 0);
    
    // Move all remaining characters up one row
    this.textBuffer.forEach(char => {
      char.y--;
    });
  }

  /**
   * Get current cursor position (end of text)
   */
  getCursorPosition(): { x: number; y: number } {
    if (this.textBuffer.length === 0) {
      return { x: 0, y: 0 };
    }

    const lastChar = this.textBuffer[this.textBuffer.length - 1];
    return {
      x: lastChar.x + 1,
      y: lastChar.y
    };
  }

  /**
   * Get terminal dimensions in characters
   */
  getDimensions(): { cols: number; rows: number } {
    return { cols: this.cols, rows: this.rows };
  }

  /**
   * Get all characters for effects processing
   */
  getTextBuffer(): TerminalChar[] {
    return [...this.textBuffer]; // Return copy to prevent external mutation
  }

  /**
   * Update character brightness for phosphor effects
   */
  updateCharacterBrightness(x: number, y: number, brightness: number): void {
    const char = this.textBuffer.find(c => c.x === x && c.y === y);
    if (char) {
      char.brightness = Math.max(0, Math.min(1, brightness));
    }
  }

  /**
   * Get total number of lines in the buffer
   */
  private getTotalLines(): number {
    if (this.textBuffer.length === 0) return 0;
    return Math.max(...this.textBuffer.map(char => char.y)) + 1;
  }

  /**
   * Get current scrolling viewport information
   */
  getScrollingViewport(): ScrollingViewport {
    const scrollState = this.scrolling.getScrollState();
    const totalLines = this.getTotalLines();
    
    return {
      offsetY: scrollState.offsetY,
      viewportHeight: this.rows * (this.currentMetrics?.height || 16),
      totalHeight: totalLines * (this.currentMetrics?.height || 16)
    };
  }

  /**
   * Enable or disable auto-scrolling to bottom
   */
  setAutoScroll(enabled: boolean): void {
    this.autoScroll = enabled;
  }

  /**
   * Manually scroll to a specific line
   */
  scrollToLine(lineNumber: number): void {
    if (!this.currentMetrics) return;
    const targetY = lineNumber * this.currentMetrics.height;
    this.scrolling.scrollTo(targetY);
  }

  /**
   * Scroll by a number of lines (positive = down, negative = up)
   */
  scrollByLines(lines: number): void {
    if (!this.currentMetrics) return;
    const deltaY = lines * this.currentMetrics.height;
    this.scrolling.scrollBy(deltaY);
  }

  /**
   * Check if the terminal is currently scrolled to the bottom
   */
  isScrolledToBottom(): boolean {
    const scrollState = this.scrolling.getScrollState();
    const totalLines = this.getTotalLines();
    const maxScrollY = Math.max(0, (totalLines - this.rows) * (this.currentMetrics?.height || 16));
    
    return Math.abs(scrollState.offsetY - maxScrollY) < 1; // Allow for small floating point differences
  }

  /**
   * Get scrolling animation instance for external control
   */
  getScrollingAnimation(): ScrollingAnimation {
    return this.scrolling;
  }

  /**
   * Trim buffer to prevent memory overflow
   */
  private trimBufferIfNeeded(): void {
    if (this.currentLineCount <= this.maxBufferLines) {
      return;
    }
    
    const linesToTrim = this.currentLineCount - this.virtualBufferLines;
    const trimmedChars: TerminalChar[] = [];
    const remainingChars: TerminalChar[] = [];
    
    // Separate characters by line number
    this.textBuffer.forEach(char => {
      if (char.y < linesToTrim) {
        trimmedChars.push(char);
      } else {
        // Adjust y position for remaining characters
        remainingChars.push({
          ...char,
          y: char.y - linesToTrim
        });
      }
    });
    
    // Store trimmed lines in compressed history if needed
    if (trimmedChars.length > 0) {
      const compressedLine = this.compressLine(trimmedChars);
      this.textBufferHistory.push(compressedLine);
      
      // Limit history storage to prevent unbounded growth
      if (this.textBufferHistory.length > 100) {
        this.textBufferHistory.shift();
      }
    }
    
    this.textBuffer = remainingChars;
    this.currentLineCount = this.virtualBufferLines;
    
    console.log(`Buffer trimmed: removed ${linesToTrim} lines, ${trimmedChars.length} characters`);
  }
  
  /**
   * Compress a line of characters for history storage
   */
  private compressLine(chars: TerminalChar[]): TerminalChar[] {
    // Simple compression: only store first and last few characters of each line
    // Group by line
    const lineMap = new Map<number, TerminalChar[]>();
    chars.forEach(char => {
      if (!lineMap.has(char.y)) {
        lineMap.set(char.y, []);
      }
      lineMap.get(char.y)!.push(char);
    });
    
    const compressed: TerminalChar[] = [];
    lineMap.forEach((lineChars, y) => {
      if (lineChars.length <= 10) {
        // Store short lines completely
        compressed.push(...lineChars);
      } else {
        // Store first 5 and last 5 characters
        compressed.push(...lineChars.slice(0, 5));
        compressed.push(...lineChars.slice(-5));
      }
    });
    
    return compressed;
  }
  
  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    currentBuffer: number;
    historyBuffer: number;
    totalLines: number;
    virtualizedLines: number;
  } {
    const currentBufferSize = this.textBuffer.length * 64; // Approximate bytes per char
    const historyBufferSize = this.textBufferHistory.reduce((acc, line) => acc + line.length * 64, 0);
    
    return {
      currentBuffer: currentBufferSize,
      historyBuffer: historyBufferSize,
      totalLines: this.currentLineCount,
      virtualizedLines: this.textBufferHistory.length
    };
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clear();
    this.fontMetrics.destroy();
    this.scrolling.destroy();
  }
}