/**
 * Font Metrics Calculator
 * Accurate font measurement for consistent character positioning
 */

import type { FontMetrics } from '../types/interfaces';

export class FontMetricsCalculator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cache: Map<string, FontMetrics> = new Map();

  constructor() {
    // Create off-screen canvas for measurements
    this.canvas = document.createElement('canvas');
    this.canvas.width = 200;
    this.canvas.height = 100;
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Calculate comprehensive font metrics
   */
  calculateMetrics(fontFamily: string, fontSize: number): FontMetrics {
    const fontKey = `${fontFamily}-${fontSize}`;
    
    // Check cache first
    if (this.cache.has(fontKey)) {
      return this.cache.get(fontKey)!;
    }

    // Set font for measurement
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.textBaseline = 'alphabetic';

    // Measure a representative character
    const testChar = 'M'; // Use 'M' as it's typically the widest character
    const metrics = this.ctx.measureText(testChar);

    // Calculate height using actualBoundingBox or fallback
    const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
    const height = ascent + descent;

    // For monospace fonts, width should be consistent
    const width = metrics.width;

    // Calculate baseline position
    const baseline = ascent;

    const fontMetrics: FontMetrics = {
      width,
      height,
      baseline,
      ascent,
      descent
    };

    // Cache the result
    this.cache.set(fontKey, fontMetrics);

    return fontMetrics;
  }

  /**
   * Measure text width accurately
   */
  measureText(text: string, fontFamily: string, fontSize: number): number {
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    return this.ctx.measureText(text).width;
  }

  /**
   * Check if a font is monospaced by comparing character widths
   */
  isMonospace(fontFamily: string, fontSize: number): boolean {
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    
    const testChars = ['i', 'M', 'W', '1', '0'];
    const widths = testChars.map(char => this.ctx.measureText(char).width);
    
    // Check if all characters have the same width (within tolerance)
    const tolerance = 0.1;
    const firstWidth = widths[0];
    
    return widths.every(width => Math.abs(width - firstWidth) <= tolerance);
  }

  /**
   * Get optimal line height for readable text
   */
  getOptimalLineHeight(fontSize: number): number {
    return Math.ceil(fontSize * 1.2); // 20% extra space for readability
  }

  /**
   * Clear the metrics cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearCache();
    // Canvas will be garbage collected
  }
}