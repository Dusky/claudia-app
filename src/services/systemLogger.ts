export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: string;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  stackTrace?: string;
}

export interface LogFilter {
  level?: LogEntry['level'][];
  category?: string[];
  timeRange?: { start: number; end: number };
  search?: string;
}

export interface SystemMetric {
  id: string;
  timestamp: number;
  name: string;
  value: number;
  unit: string;
  category: string;
  tags?: Record<string, string>;
}

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  eventType: string;
  properties: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export class SystemLogger {
  private static instance: SystemLogger;
  private logs: LogEntry[] = [];
  private metrics: SystemMetric[] = [];
  private events: AnalyticsEvent[] = [];
  private maxLogEntries = 10000;
  private maxMetrics = 5000;
  private maxEvents = 5000;
  private logLevel: LogEntry['level'] = 'info';
  private enabledCategories: Set<string> = new Set();
  private storageKey = 'claudiaos-system-logs';
  private metricsKey = 'claudiaos-system-metrics';
  private eventsKey = 'claudiaos-analytics-events';

  private constructor() {
    this.loadFromStorage();
    this.enableAllCategories();
    this.startPeriodicCleanup();
    this.startSystemMetricsCollection();
  }

  public static getInstance(): SystemLogger {
    if (!SystemLogger.instance) {
      SystemLogger.instance = new SystemLogger();
    }
    return SystemLogger.instance;
  }

  // Logging Methods
  debug(message: string, category: string = 'general', context?: Record<string, any>): void {
    this.log('debug', message, category, context);
  }

  info(message: string, category: string = 'general', context?: Record<string, any>): void {
    this.log('info', message, category, context);
  }

  warn(message: string, category: string = 'general', context?: Record<string, any>): void {
    this.log('warn', message, category, context);
  }

  error(message: string, category: string = 'general', context?: Record<string, any>, error?: Error): void {
    const logContext = { ...context };
    if (error) {
      logContext.error = error.message;
      logContext.stackTrace = error.stack;
    }
    this.log('error', message, category, logContext, error?.stack);
  }

  critical(message: string, category: string = 'general', context?: Record<string, any>, error?: Error): void {
    const logContext = { ...context };
    if (error) {
      logContext.error = error.message;
      logContext.stackTrace = error.stack;
    }
    this.log('critical', message, category, logContext, error?.stack);
    
    // Critical logs are also sent to console for immediate visibility
    console.error(`[CRITICAL] ${message}`, logContext);
  }

  private log(level: LogEntry['level'], message: string, category: string, context?: Record<string, any>, stackTrace?: string): void {
    if (!this.shouldLog(level, category)) {
      return;
    }

    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      context,
      sessionId: this.getCurrentSessionId(),
      stackTrace
    };

    this.logs.push(entry);
    
    // Maintain size limit
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }

    this.saveLogsToStorage();
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'debug' ? 'log' : level === 'critical' ? 'error' : level;
      console[consoleMethod](`[${level.toUpperCase()}] ${category}: ${message}`, context || '');
    }
  }

  // Metrics Collection
  recordMetric(name: string, value: number, unit: string, category: string = 'system', tags?: Record<string, string>): void {
    const metric: SystemMetric = {
      id: this.generateId(),
      timestamp: Date.now(),
      name,
      value,
      unit,
      category,
      tags
    };

    this.metrics.push(metric);
    
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.saveMetricsToStorage();
  }

  // Analytics Events
  trackEvent(eventType: string, properties: Record<string, any>): void {
    const event: AnalyticsEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      eventType,
      properties,
      sessionId: this.getCurrentSessionId()
    };

    this.events.push(event);
    
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    this.saveEventsToStorage();
  }

  // Query Methods
  getLogs(filter?: LogFilter, limit: number = 100): LogEntry[] {
    let filtered = [...this.logs];

    if (filter) {
      if (filter.level) {
        filtered = filtered.filter(log => filter.level!.includes(log.level));
      }
      
      if (filter.category) {
        filtered = filtered.filter(log => filter.category!.includes(log.category));
      }
      
      if (filter.timeRange) {
        filtered = filtered.filter(log => 
          log.timestamp >= filter.timeRange!.start && 
          log.timestamp <= filter.timeRange!.end
        );
      }
      
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        filtered = filtered.filter(log =>
          log.message.toLowerCase().includes(searchLower) ||
          log.category.toLowerCase().includes(searchLower) ||
          (log.context && JSON.stringify(log.context).toLowerCase().includes(searchLower))
        );
      }
    }

    return filtered.slice(-limit).reverse();
  }

  getMetrics(category?: string, timeRange?: { start: number; end: number }, limit: number = 1000): SystemMetric[] {
    let filtered = [...this.metrics];

    if (category) {
      filtered = filtered.filter(metric => metric.category === category);
    }

    if (timeRange) {
      filtered = filtered.filter(metric =>
        metric.timestamp >= timeRange.start &&
        metric.timestamp <= timeRange.end
      );
    }

    return filtered.slice(-limit);
  }

  getEvents(eventType?: string, timeRange?: { start: number; end: number }, limit: number = 1000): AnalyticsEvent[] {
    let filtered = [...this.events];

    if (eventType) {
      filtered = filtered.filter(event => event.eventType === eventType);
    }

    if (timeRange) {
      filtered = filtered.filter(event =>
        event.timestamp >= timeRange.start &&
        event.timestamp <= timeRange.end
      );
    }

    return filtered.slice(-limit);
  }

  // Statistics
  getLogStatistics(): Record<string, any> {
    const stats = {
      totalLogs: this.logs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      timeRange: {
        oldest: this.logs.length > 0 ? Math.min(...this.logs.map(l => l.timestamp)) : 0,
        newest: this.logs.length > 0 ? Math.max(...this.logs.map(l => l.timestamp)) : 0
      }
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    });

    return stats;
  }

  getSystemHealth(): Record<string, any> {
    const recentErrors = this.getLogs({
      level: ['error', 'critical'],
      timeRange: { start: Date.now() - 3600000, end: Date.now() } // Last hour
    });

    const recentMetrics = this.getMetrics(undefined, {
      start: Date.now() - 600000, // Last 10 minutes
      end: Date.now()
    });

    return {
      errorCount: recentErrors.length,
      criticalErrors: recentErrors.filter(log => log.level === 'critical').length,
      systemLoad: this.calculateAverageMetric(recentMetrics, 'cpu_usage'),
      memoryUsage: this.calculateAverageMetric(recentMetrics, 'memory_usage'),
      uptime: Date.now() - (this.logs.find(log => log.category === 'system' && log.message.includes('startup'))?.timestamp || Date.now()),
      healthScore: this.calculateHealthScore(recentErrors, recentMetrics)
    };
  }

  // Configuration
  setLogLevel(level: LogEntry['level']): void {
    this.logLevel = level;
    this.info(`Log level set to ${level}`, 'logger');
  }

  enableCategory(category: string): void {
    this.enabledCategories.add(category);
    this.info(`Enabled logging for category: ${category}`, 'logger');
  }

  disableCategory(category: string): void {
    this.enabledCategories.delete(category);
    this.info(`Disabled logging for category: ${category}`, 'logger');
  }

  enableAllCategories(): void {
    // Common log categories in ClaudiaOS
    const categories = [
      'general', 'system', 'commands', 'avatar', 'ai', 'filesystem', 
      'plugins', 'session', 'network', 'security', 'performance', 
      'ui', 'storage', 'logger'
    ];
    
    categories.forEach(cat => this.enabledCategories.add(cat));
  }

  // Cleanup and Maintenance
  clearLogs(category?: string): void {
    if (category) {
      this.logs = this.logs.filter(log => log.category !== category);
      this.info(`Cleared logs for category: ${category}`, 'logger');
    } else {
      this.logs = [];
      this.info('All logs cleared', 'logger');
    }
    this.saveLogsToStorage();
  }

  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'category', 'message', 'context'];
      const rows = this.logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.level,
        log.category,
        log.message.replace(/"/g, '""'),
        JSON.stringify(log.context || {}).replace(/"/g, '""')
      ]);
      
      return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }
    
    return JSON.stringify(this.logs, null, 2);
  }

  // Private Methods
  private shouldLog(level: LogEntry['level'], category: string): boolean {
    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3, critical: 4 };
    return levelPriority[level] >= levelPriority[this.logLevel] && 
           this.enabledCategories.has(category);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentSessionId(): string {
    return sessionStorage.getItem('claudiaos-session-id') || 'unknown';
  }

  private calculateAverageMetric(metrics: SystemMetric[], name: string): number {
    const relevant = metrics.filter(m => m.name === name);
    if (relevant.length === 0) return 0;
    return relevant.reduce((sum, m) => sum + m.value, 0) / relevant.length;
  }

  private calculateHealthScore(errors: LogEntry[], metrics: SystemMetric[]): number {
    let score = 100;
    
    // Deduct points for errors
    score -= errors.filter(e => e.level === 'error').length * 5;
    score -= errors.filter(e => e.level === 'critical').length * 20;
    
    // Deduct points for high resource usage
    const avgCpu = this.calculateAverageMetric(metrics, 'cpu_usage');
    const avgMemory = this.calculateAverageMetric(metrics, 'memory_usage');
    
    if (avgCpu > 80) score -= 10;
    if (avgMemory > 90) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      
      this.logs = this.logs.filter(log => log.timestamp > cutoff);
      this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);
      this.events = this.events.filter(event => event.timestamp > cutoff);
      
      this.saveLogsToStorage();
      this.saveMetricsToStorage();
      this.saveEventsToStorage();
    }, 60 * 60 * 1000); // Every hour
  }

  private startSystemMetricsCollection(): void {
    setInterval(() => {
      // Simulate system metrics
      this.recordMetric('cpu_usage', Math.random() * 100, '%', 'system');
      this.recordMetric('memory_usage', Math.random() * 100, '%', 'system');
      this.recordMetric('disk_usage', Math.random() * 100, '%', 'system');
      this.recordMetric('network_rx', Math.random() * 1000, 'KB/s', 'network');
      this.recordMetric('network_tx', Math.random() * 500, 'KB/s', 'network');
    }, 30000); // Every 30 seconds
  }

  private loadFromStorage(): void {
    try {
      const logsData = localStorage.getItem(this.storageKey);
      if (logsData) {
        this.logs = JSON.parse(logsData);
      }

      const metricsData = localStorage.getItem(this.metricsKey);
      if (metricsData) {
        this.metrics = JSON.parse(metricsData);
      }

      const eventsData = localStorage.getItem(this.eventsKey);
      if (eventsData) {
        this.events = JSON.parse(eventsData);
      }
    } catch (error) {
      console.error('Failed to load logs from storage:', error);
    }
  }

  private saveLogsToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save logs to storage:', error);
    }
  }

  private saveMetricsToStorage(): void {
    try {
      localStorage.setItem(this.metricsKey, JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Failed to save metrics to storage:', error);
    }
  }

  private saveEventsToStorage(): void {
    try {
      localStorage.setItem(this.eventsKey, JSON.stringify(this.events));
    } catch (error) {
      console.error('Failed to save events to storage:', error);
    }
  }
}