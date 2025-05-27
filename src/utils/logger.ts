/**
 * Lightweight, tag-based logging system for Claudia
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogTag = 'canvas' | 'llm' | 'image' | 'avatar' | 'storage' | 'command' | 'terminal' | 'accessibility' | 'performance' | 'memory' | 'network' | 'security';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  tag: LogTag;
  message: string;
  data?: any;
}

class Logger {
  private logLevel: LogLevel = 'info';
  private enabledTags: Set<LogTag> = new Set();
  private logHistory: LogEntry[] = [];
  private maxHistorySize: number = 1000;
  private terminalOutput: boolean = false;

  constructor() {
    // Initialize from localStorage
    this.loadSettings();
    
    // Enable all tags by default in development
    if (this.isDebugMode()) {
      this.enableAllTags();
      this.setLogLevel('debug');
    }
  }

  /**
   * Check if we're in debug mode
   */
  private isDebugMode(): boolean {
    return localStorage.getItem('claudia-debug-mode') === 'true' ||
           import.meta.env.DEV ||
           import.meta.env.VITE_DEBUG_MODE === 'true';
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const settings = localStorage.getItem('claudia-logger-settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        this.logLevel = parsed.logLevel || 'info';
        this.enabledTags = new Set(parsed.enabledTags || []);
        this.terminalOutput = parsed.terminalOutput || false;
      }
    } catch (error) {
      console.warn('Failed to load logger settings:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      const settings = {
        logLevel: this.logLevel,
        enabledTags: Array.from(this.enabledTags),
        terminalOutput: this.terminalOutput
      };
      localStorage.setItem('claudia-logger-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save logger settings:', error);
    }
  }

  /**
   * Check if a log level should be processed
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Format log message for console output
   */
  private formatMessage(level: LogLevel, tag: LogTag, message: string, data?: any): string {
    const timestamp = new Date().toISOString().substr(11, 12); // HH:mm:ss.sss
    const levelEmoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    }[level];
    
    const tagColor = this.getTagColor(tag);
    const formattedTag = `%c[${tag.toUpperCase()}]%c`;
    
    let formattedMessage = `${levelEmoji} ${timestamp} ${formattedTag} ${message}`;
    
    if (data !== undefined) {
      formattedMessage += ` ${JSON.stringify(data)}`;
    }
    
    return formattedMessage;
  }

  /**
   * Get CSS color for tag
   */
  private getTagColor(tag: LogTag): string {
    const colors: Record<LogTag, string> = {
      canvas: '#00ff00',
      llm: '#00aaff',
      image: '#ff6600',
      avatar: '#ff00ff',
      storage: '#ffaa00',
      command: '#aa00ff',
      terminal: '#00ffaa',
      accessibility: '#0088ff',
      performance: '#ff8800',
      memory: '#ff4444',
      network: '#44ff44',
      security: '#ff0000'
    };
    return colors[tag] || '#ffffff';
  }

  /**
   * Log a message
   */
  private log(level: LogLevel, tag: LogTag, message: string, data?: any): void {
    // Check if we should log this level and tag
    if (!this.shouldLog(level) || (!this.enabledTags.has(tag) && !this.isDebugMode())) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      tag,
      message,
      data
    };

    // Add to history
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Format and output to console
    const formattedMessage = this.formatMessage(level, tag, message, data);
    const tagColor = this.getTagColor(tag);
    
    const consoleMethod = level === 'error' ? console.error :
                         level === 'warn' ? console.warn :
                         level === 'debug' ? console.debug :
                         console.log;

    if (data !== undefined) {
      consoleMethod(formattedMessage, `color: ${tagColor}; font-weight: bold`, 'color: inherit', data);
    } else {
      consoleMethod(formattedMessage, `color: ${tagColor}; font-weight: bold`, 'color: inherit');
    }

    // Output to terminal if enabled
    if (this.terminalOutput && level !== 'debug') {
      this.outputToTerminal(entry);
    }
  }

  /**
   * Output log entry to terminal (if available)
   */
  private outputToTerminal(entry: LogEntry): void {
    try {
      // This would need integration with the terminal system
      // For now, we'll just store it for potential future use
      const event = new CustomEvent('claudia-log', { detail: entry });
      window.dispatchEvent(event);
    } catch (error) {
      // Silently fail if terminal integration isn't available
    }
  }

  // Public API methods

  /**
   * Set the minimum log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.saveSettings();
  }

  /**
   * Enable logging for specific tags
   */
  enableTags(...tags: LogTag[]): void {
    tags.forEach(tag => this.enabledTags.add(tag));
    this.saveSettings();
  }

  /**
   * Disable logging for specific tags
   */
  disableTags(...tags: LogTag[]): void {
    tags.forEach(tag => this.enabledTags.delete(tag));
    this.saveSettings();
  }

  /**
   * Enable all tags
   */
  enableAllTags(): void {
    const allTags: LogTag[] = ['canvas', 'llm', 'image', 'avatar', 'storage', 'command', 'terminal', 'accessibility', 'performance', 'memory', 'network', 'security'];
    allTags.forEach(tag => this.enabledTags.add(tag));
    this.saveSettings();
  }

  /**
   * Disable all tags
   */
  disableAllTags(): void {
    this.enabledTags.clear();
    this.saveSettings();
  }

  /**
   * Toggle terminal output
   */
  setTerminalOutput(enabled: boolean): void {
    this.terminalOutput = enabled;
    this.saveSettings();
  }

  /**
   * Get current settings
   */
  getSettings(): {
    logLevel: LogLevel;
    enabledTags: LogTag[];
    terminalOutput: boolean;
    historySize: number;
  } {
    return {
      logLevel: this.logLevel,
      enabledTags: Array.from(this.enabledTags),
      terminalOutput: this.terminalOutput,
      historySize: this.logHistory.length
    };
  }

  /**
   * Get log history
   */
  getHistory(tag?: LogTag, level?: LogLevel, limit?: number): LogEntry[] {
    let filtered = this.logHistory;

    if (tag) {
      filtered = filtered.filter(entry => entry.tag === tag);
    }

    if (level) {
      filtered = filtered.filter(entry => entry.level === level);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify({
      exported: new Date().toISOString(),
      settings: this.getSettings(),
      logs: this.logHistory
    }, null, 2);
  }

  // Convenient logging methods

  debug(tag: LogTag, message: string, data?: any): void {
    this.log('debug', tag, message, data);
  }

  info(tag: LogTag, message: string, data?: any): void {
    this.log('info', tag, message, data);
  }

  warn(tag: LogTag, message: string, data?: any): void {
    this.log('warn', tag, message, data);
  }

  error(tag: LogTag, message: string, data?: any): void {
    this.log('error', tag, message, data);
  }
}

// Create singleton instance
const logger = new Logger();

// Export singleton and types
export { logger };
export default logger;

// Convenience functions for common use cases
export const logCanvas = (level: LogLevel, message: string, data?: any) => logger.log(level, 'canvas', message, data);
export const logLLM = (level: LogLevel, message: string, data?: any) => logger.log(level, 'llm', message, data);
export const logImage = (level: LogLevel, message: string, data?: any) => logger.log(level, 'image', message, data);
export const logAvatar = (level: LogLevel, message: string, data?: any) => logger.log(level, 'avatar', message, data);
export const logStorage = (level: LogLevel, message: string, data?: any) => logger.log(level, 'storage', message, data);
export const logCommand = (level: LogLevel, message: string, data?: any) => logger.log(level, 'command', message, data);
export const logTerminal = (level: LogLevel, message: string, data?: any) => logger.log(level, 'terminal', message, data);
export const logAccessibility = (level: LogLevel, message: string, data?: any) => logger.log(level, 'accessibility', message, data);
export const logPerformance = (level: LogLevel, message: string, data?: any) => logger.log(level, 'performance', message, data);
export const logMemory = (level: LogLevel, message: string, data?: any) => logger.log(level, 'memory', message, data);
export const logNetwork = (level: LogLevel, message: string, data?: any) => logger.log(level, 'network', message, data);
export const logSecurity = (level: LogLevel, message: string, data?: any) => logger.log(level, 'security', message, data);