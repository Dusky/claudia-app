/**
 * Phase 5 Demo: Performance and Polish Features
 * Demonstrates accessibility, smooth scrolling, performance monitoring, and mobile support
 */

import { CRTCanvasTerminal } from '../core/CRTCanvasTerminal.js';
import { MobileSupport } from '../utils/MobileSupport.js';

export class Phase5Demo {
  private terminal: CRTCanvasTerminal;
  private canvas: HTMLCanvasElement;
  private demoContainer: HTMLElement;
  private performanceDisplay: HTMLElement;
  private accessibilityStatus: HTMLElement;
  private mobileInfo: HTMLElement;
  private animationId: number | null = null;

  constructor(containerId: string) {
    this.demoContainer = document.getElementById(containerId) || document.body;
    this.setupDemo();
    this.createTerminal();
    this.setupUI();
    this.startDemo();
  }

  private setupDemo(): void {
    // Create demo layout
    this.demoContainer.innerHTML = `
      <div class="phase5-demo">
        <h2>Phase 5: Performance and Polish Demo</h2>
        <div class="demo-layout">
          <div class="terminal-container">
            <canvas id="phase5-canvas" width="800" height="600"></canvas>
          </div>
          <div class="info-panel">
            <div class="performance-info">
              <h3>Performance Monitor</h3>
              <div id="performance-display"></div>
            </div>
            <div class="accessibility-info">
              <h3>Accessibility Status</h3>
              <div id="accessibility-status"></div>
            </div>
            <div class="mobile-info">
              <h3>Mobile Support</h3>
              <div id="mobile-info"></div>
            </div>
            <div class="controls">
              <h3>Controls</h3>
              <button id="scroll-test">Test Smooth Scrolling</button>
              <button id="performance-test">Performance Stress Test</button>
              <button id="accessibility-toggle">Toggle High Contrast</button>
              <button id="mobile-demo">Mobile Touch Demo</button>
              <button id="reset-demo">Reset Demo</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add demo-specific styles
    const style = document.createElement('style');
    style.textContent = `
      .phase5-demo {
        font-family: 'Monaco', 'Courier New', monospace;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .demo-layout {
        display: flex;
        gap: 20px;
        align-items: flex-start;
      }
      
      .terminal-container {
        flex: 1;
        border: 2px solid #333;
        background: #000;
        position: relative;
      }
      
      #phase5-canvas {
        display: block;
        background: #000;
        cursor: text;
      }
      
      .info-panel {
        width: 300px;
        background: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 5px;
        padding: 15px;
      }
      
      .info-panel h3 {
        margin: 0 0 10px 0;
        font-size: 14px;
        color: #333;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
      }
      
      .info-panel div {
        margin-bottom: 15px;
      }
      
      .performance-info, .accessibility-info, .mobile-info {
        font-size: 12px;
        line-height: 1.4;
      }
      
      .controls button {
        display: block;
        width: 100%;
        margin: 5px 0;
        padding: 8px;
        background: #007acc;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
      }
      
      .controls button:hover {
        background: #005999;
      }
      
      .controls button:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      
      .metric {
        display: flex;
        justify-content: space-between;
        margin: 3px 0;
      }
      
      .metric-value {
        font-weight: bold;
      }
      
      .status-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 5px;
      }
      
      .status-good { background: #28a745; }
      .status-warning { background: #ffc107; }
      .status-error { background: #dc3545; }
    `;
    document.head.appendChild(style);

    // Get references to UI elements
    this.canvas = document.getElementById('phase5-canvas') as HTMLCanvasElement;
    this.performanceDisplay = document.getElementById('performance-display')!;
    this.accessibilityStatus = document.getElementById('accessibility-status')!;
    this.mobileInfo = document.getElementById('mobile-info')!;
  }

  private createTerminal(): void {
    // Create terminal with all Phase 5 features enabled
    this.terminal = new CRTCanvasTerminal(
      this.canvas,
      {
        phosphorColor: '#00FF00',
        fontSize: 14,
        fontFamily: 'Monaco, "Courier New", monospace',
        lineHeight: 18,
        backgroundColor: '#000000',
        curvature: true,
        curvatureAmount: 0.1,
        scanlines: true,
        scanlineOpacity: 0.05,
        flicker: true,
        flickerIntensity: 0.02,
        glowIntensity: 0.5,
        targetFPS: 60,
        enableAntialiasing: true,
        typewriterSpeed: 50,
        cursorBlinkRate: 1.2
      },
      {
        enableScreenReader: true,
        announceNewText: true,
        enableKeyboardNavigation: true,
        enableHighContrast: false,
        reduceMotion: false,
        announceDelay: 300
      },
      {
        enableTouch: true,
        touchScrollSensitivity: 1.5,
        pinchZoomEnabled: false,
        longPressDelay: 500,
        swipeThreshold: 40
      }
    );
  }

  private setupUI(): void {
    // Setup control buttons
    document.getElementById('scroll-test')!.addEventListener('click', () => this.testSmoothScrolling());
    document.getElementById('performance-test')!.addEventListener('click', () => this.performanceStressTest());
    document.getElementById('accessibility-toggle')!.addEventListener('click', () => this.toggleAccessibilityFeatures());
    document.getElementById('mobile-demo')!.addEventListener('click', () => this.demonstrateMobileFeatures());
    document.getElementById('reset-demo')!.addEventListener('click', () => this.resetDemo());

    // Start real-time updates
    this.startRealtimeUpdates();
  }

  private startDemo(): void {
    // Print welcome message with Phase 5 features overview
    this.terminal.typewrite('=== CRT Terminal Emulator - Phase 5 Demo ===\n\n', 80, () => {
      this.terminal.typewrite('🚀 Performance and Polish Features:\n\n', 60, () => {
        this.terminal.typewrite('✓ Accessibility Support (Screen Reader + Keyboard Navigation)\n', 40);
        this.terminal.typewrite('✓ Smooth Scrolling Animation System\n', 40);
        this.terminal.typewrite('✓ Real-time Performance Monitoring\n', 40);
        this.terminal.typewrite('✓ Mobile Touch Support with Gestures\n', 40);
        this.terminal.typewrite('✓ Auto-optimization for Low-end Devices\n', 40);
        this.terminal.typewrite('✓ High Contrast and Reduced Motion Options\n\n', 40, () => {
          this.terminal.typewrite('📱 Mobile Features:\n', 50);
          this.terminal.typewrite('• Touch scrolling with momentum\n', 30);
          this.terminal.typewrite('• Long press for context menu\n', 30);
          this.terminal.typewrite('• Optimized performance for mobile devices\n\n', 30, () => {
            this.terminal.typewrite('♿ Accessibility Features:\n', 50);
            this.terminal.typewrite('• Full screen reader support\n', 30);
            this.terminal.typewrite('• Keyboard navigation (F6 to activate)\n', 30);
            this.terminal.typewrite('• High contrast mode available\n', 30);
            this.terminal.typewrite('• ARIA labels and live regions\n\n', 30, () => {
              this.terminal.typewrite('⚡ Performance Monitoring:\n', 50);
              this.terminal.typewrite('• Real-time FPS tracking\n', 30);
              this.terminal.typewrite('• Memory usage monitoring\n', 30);
              this.terminal.typewrite('• Auto-optimization suggestions\n', 30);
              this.terminal.typewrite('• Performance grade calculation\n\n', 30, () => {
                this.terminal.typewrite('Use the controls panel to test features! →\n\n', 40, () => {
                  this.terminal.setInputEnabled(true);
                });
              });
            });
          });
        });
      });
    });
  }

  private testSmoothScrolling(): void {
    this.terminal.print('\n🔄 Testing Smooth Scrolling...\n', { typewriter: false });
    
    // Generate lots of text to test scrolling
    for (let i = 1; i <= 50; i++) {
      setTimeout(() => {
        this.terminal.print(`Line ${i}: This is a test line to demonstrate smooth scrolling animation.`, { typewriter: false });
        if (i === 50) {
          setTimeout(() => {
            this.terminal.print('\n✅ Smooth scrolling test complete!\n');
          }, 500);
        }
      }, i * 100);
    }
  }

  private performanceStressTest(): void {
    this.terminal.print('\n⚡ Starting Performance Stress Test...\n');
    
    const monitor = this.terminal.getPerformanceMonitor();
    monitor.enableAutoOptimization(true);
    
    // Generate rapid text output to stress test
    let lineCount = 0;
    const stressInterval = setInterval(() => {
      this.terminal.print(`Stress test line ${++lineCount}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.`, { typewriter: false });
      
      if (lineCount >= 100) {
        clearInterval(stressInterval);
        setTimeout(() => {
          const grade = monitor.getPerformanceGrade();
          this.terminal.print(`\n📊 Performance Grade: ${grade.grade} (${grade.score}/100)\n`);
          this.terminal.print('✅ Stress test complete! Check performance panel for details.\n');
        }, 1000);
      }
    }, 50);
  }

  private toggleAccessibilityFeatures(): void {
    const accessManager = this.terminal.getAccessibilityManager();
    const currentState = accessManager.getCurrentState();
    
    // Toggle high contrast mode
    accessManager.setOptions({
      enableHighContrast: !currentState.isNavigating // Simple toggle for demo
    });
    
    this.terminal.print('\n♿ Accessibility features toggled!\n');
    this.terminal.print('High contrast mode: ' + (!currentState.isNavigating ? 'ON' : 'OFF') + '\n');
    this.terminal.print('Press F6 to activate keyboard navigation.\n');
  }

  private demonstrateMobileFeatures(): void {
    const mobileSupport = this.terminal.getMobileSupport();
    const isMobile = this.terminal.isMobileDevice();
    
    this.terminal.print('\n📱 Mobile Features Demo:\n');
    this.terminal.print(`Device Type: ${isMobile ? 'Mobile' : 'Desktop'}\n`);
    
    if (mobileSupport) {
      this.terminal.print('✓ Touch scrolling enabled\n');
      this.terminal.print('✓ Long press context menu available\n');
      this.terminal.print('✓ Momentum scrolling active\n');
      this.terminal.print('Try swiping to scroll (on touch devices)!\n');
    } else {
      this.terminal.print('ℹ️ Mobile features available on touch devices only.\n');
    }
  }

  private resetDemo(): void {
    this.terminal.clear();
    this.startDemo();
  }

  private startRealtimeUpdates(): void {
    const updateInterval = setInterval(() => {
      this.updatePerformanceDisplay();
      this.updateAccessibilityStatus();
      this.updateMobileInfo();
    }, 1000);

    // Store interval for cleanup
    this.animationId = updateInterval;
  }

  private updatePerformanceDisplay(): void {
    const monitor = this.terminal.getPerformanceMonitor();
    const metrics = monitor.getDetailedMetrics();
    const grade = monitor.getPerformanceGrade();
    
    const getStatusClass = (value: number, good: number, warning: number) => {
      if (value >= good) return 'status-good';
      if (value >= warning) return 'status-warning';
      return 'status-error';
    };
    
    this.performanceDisplay.innerHTML = `
      <div class="metric">
        <span><span class="status-indicator ${getStatusClass(metrics.averageFps, 55, 30)}"></span>FPS:</span>
        <span class="metric-value">${metrics.averageFps.toFixed(1)}</span>
      </div>
      <div class="metric">
        <span>Frame Time:</span>
        <span class="metric-value">${metrics.averageFrameTime.toFixed(1)}ms</span>
      </div>
      <div class="metric">
        <span>Memory (MB):</span>
        <span class="metric-value">${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}</span>
      </div>
      <div class="metric">
        <span>Grade:</span>
        <span class="metric-value">${grade.grade} (${grade.score})</span>
      </div>
      <div class="metric">
        <span>Auto-Opt:</span>
        <span class="metric-value">${monitor.isAutoOptimizationEnabled() ? 'ON' : 'OFF'}</span>
      </div>
    `;
  }

  private updateAccessibilityStatus(): void {
    const accessManager = this.terminal.getAccessibilityManager();
    const state = accessManager.getCurrentState();
    
    this.accessibilityStatus.innerHTML = `
      <div class="metric">
        <span><span class="status-indicator status-good"></span>Screen Reader:</span>
        <span class="metric-value">Active</span>
      </div>
      <div class="metric">
        <span>Navigation:</span>
        <span class="metric-value">${state.isNavigating ? 'Active' : 'Inactive'}</span>
      </div>
      <div class="metric">
        <span>Position:</span>
        <span class="metric-value">${state.readingPosition.x},${state.readingPosition.y}</span>
      </div>
      <div class="metric">
        <span>High Contrast:</span>
        <span class="metric-value">Available</span>
      </div>
      <div style="margin-top: 10px; font-size: 11px; color: #666;">
        Press F6 to activate keyboard navigation
      </div>
    `;
  }

  private updateMobileInfo(): void {
    const mobileSupport = this.terminal.getMobileSupport();
    const isMobile = this.terminal.isMobileDevice();
    
    if (mobileSupport) {
      const touchState = mobileSupport.getTouchState();
      this.mobileInfo.innerHTML = `
        <div class="metric">
          <span><span class="status-indicator status-good"></span>Device:</span>
          <span class="metric-value">Mobile</span>
        </div>
        <div class="metric">
          <span>Touch Active:</span>
          <span class="metric-value">${touchState.active ? 'Yes' : 'No'}</span>
        </div>
        <div class="metric">
          <span>Touch Scroll:</span>
          <span class="metric-value">Enabled</span>
        </div>
        <div class="metric">
          <span>Long Press:</span>
          <span class="metric-value">500ms</span>
        </div>
        <div style="margin-top: 10px; font-size: 11px; color: #666;">
          Touch and swipe to interact
        </div>
      `;
    } else {
      this.mobileInfo.innerHTML = `
        <div class="metric">
          <span><span class="status-indicator status-warning"></span>Device:</span>
          <span class="metric-value">Desktop</span>
        </div>
        <div class="metric">
          <span>Touch Support:</span>
          <span class="metric-value">Not Available</span>
        </div>
        <div style="margin-top: 10px; font-size: 11px; color: #666;">
          Mobile features work on touch devices
        </div>
      `;
    }
  }

  public destroy(): void {
    if (this.animationId) {
      clearInterval(this.animationId);
    }
    this.terminal.destroy();
  }
}

// Export for use in demos
export default Phase5Demo;