import type { Command, CommandResult, CommandContext } from '../types';
import { SystemLogger } from '../../services/systemLogger';

const logger = SystemLogger.getInstance();

export const logsCommand: Command = {
  name: 'logs',
  description: 'View and manage system logs',
  usage: '/logs [show|clear|export|stats|health] [options]',
  aliases: ['log', 'syslog'],
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    if (args.length === 0) {
      return await showRecentLogs();
    }

    const [subcommand, ...subArgs] = args;

    switch (subcommand.toLowerCase()) {
      case 'show':
        return await showLogs(subArgs);
      
      case 'clear':
        return await clearLogs(subArgs);
      
      case 'export':
        return await exportLogs(subArgs);
      
      case 'stats':
        return await showLogStats();
      
      case 'health':
        return await showSystemHealth();
      
      case 'level':
        return await setLogLevel(subArgs);
      
      case 'category':
        return await manageCategories(subArgs);
      
      default:
        return {
          success: false,
          error: `Unknown logs command: ${subcommand}. Use /logs for recent logs or /help logs for full usage.`
        };
    }
  }
};

export const metricsCommand: Command = {
  name: 'metrics',
  description: 'View system metrics and performance data',
  usage: '/metrics [show|category] [options]',
  aliases: ['perf', 'performance'],
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    if (args.length === 0) {
      return await showRecentMetrics();
    }

    const [subcommand, ...subArgs] = args;

    switch (subcommand.toLowerCase()) {
      case 'show':
        return await showMetrics(subArgs);
      
      case 'category':
        return await showMetricsByCategory(subArgs);
      
      default:
        return {
          success: false,
          error: `Unknown metrics command: ${subcommand}. Use /metrics for recent metrics.`
        };
    }
  }
};

async function showRecentLogs(): Promise<CommandResult> {
  const logs = logger.getLogs(undefined, 20);
  
  if (logs.length === 0) {
    return {
      success: true,
      message: 'No logs available. The system will start generating logs as you use ClaudiaOS.'
    };
  }

  let output = 'Recent System Logs (20 most recent):\n\n';
  logs.forEach(log => {
    const timestamp = new Date(log.timestamp).toLocaleString();
    const level = log.level.toUpperCase().padEnd(8);
    const category = log.category.padEnd(12);
    output += `${timestamp} [${level}] ${category} ${log.message}\n`;
    
    if (log.context && Object.keys(log.context).length > 0) {
      output += `  Context: ${JSON.stringify(log.context)}\n`;
    }
  });

  output += '\nUse "/logs show --level error" to see only errors';
  output += '\nUse "/logs stats" for log statistics';

  return { success: true, message: output };
}

async function showLogs(args: string[]): Promise<CommandResult> {
  const options = parseLogOptions(args);
  const logs = logger.getLogs(options.filter, options.limit);

  if (logs.length === 0) {
    return {
      success: true,
      message: 'No logs found matching the specified criteria.'
    };
  }

  let output = `System Logs (${logs.length} entries):\n\n`;
  logs.forEach(log => {
    const timestamp = new Date(log.timestamp).toLocaleString();
    const level = log.level.toUpperCase().padEnd(8);
    const category = log.category.padEnd(12);
    output += `${timestamp} [${level}] ${category} ${log.message}\n`;
    
    if (log.context && Object.keys(log.context).length > 0) {
      output += `  Context: ${JSON.stringify(log.context)}\n`;
    }
    
    if (log.stackTrace && (log.level === 'error' || log.level === 'critical')) {
      output += `  Stack: ${log.stackTrace.split('\n')[0]}\n`;
    }
  });

  return { success: true, message: output };
}

async function clearLogs(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    logger.clearLogs();
    return {
      success: true,
      message: 'All system logs have been cleared.'
    };
  }

  const category = args[0];
  logger.clearLogs(category);
  return {
    success: true,
    message: `Logs for category "${category}" have been cleared.`
  };
}

async function exportLogs(args: string[]): Promise<CommandResult> {
  const format = args[0] === 'csv' ? 'csv' : 'json';
  const exported = logger.exportLogs(format);
  
  const preview = exported.length > 1000 ? 
    exported.substring(0, 1000) + '\n... (truncated)' : 
    exported;

  return {
    success: true,
    message: `Log export (${format.toUpperCase()} format):\n\n${preview}\n\nIn a real environment, this would download as a file.`
  };
}

async function showLogStats(): Promise<CommandResult> {
  const stats = logger.getLogStatistics();
  
  let output = 'System Log Statistics:\n\n';
  output += `Total Logs: ${stats.totalLogs}\n\n`;
  
  output += 'By Level:\n';
  Object.entries(stats.byLevel).forEach(([level, count]) => {
    output += `  ${level.toUpperCase().padEnd(8)}: ${count}\n`;
  });
  
  output += '\nBy Category:\n';
  Object.entries(stats.byCategory).forEach(([category, count]) => {
    output += `  ${category.padEnd(12)}: ${count}\n`;
  });
  
  if (stats.timeRange.oldest > 0) {
    output += '\nTime Range:\n';
    output += `  Oldest: ${new Date(stats.timeRange.oldest).toLocaleString()}\n`;
    output += `  Newest: ${new Date(stats.timeRange.newest).toLocaleString()}\n`;
  }

  return { success: true, message: output };
}

async function showSystemHealth(): Promise<CommandResult> {
  const health = logger.getSystemHealth();
  
  let output = 'System Health Report:\n\n';
  output += `Health Score: ${health.healthScore}/100\n`;
  output += `Uptime: ${formatDuration(health.uptime)}\n\n`;
  
  output += 'Recent Issues (Last Hour):\n';
  output += `  Errors: ${health.errorCount}\n`;
  output += `  Critical: ${health.criticalErrors}\n\n`;
  
  output += 'System Performance:\n';
  output += `  CPU Usage: ${health.systemLoad.toFixed(1)}%\n`;
  output += `  Memory Usage: ${health.memoryUsage.toFixed(1)}%\n\n`;
  
  if (health.healthScore >= 90) {
    output += '🟢 System is running optimally';
  } else if (health.healthScore >= 70) {
    output += '🟡 System is running normally with minor issues';
  } else if (health.healthScore >= 50) {
    output += '🟠 System has some performance issues';
  } else {
    output += '🔴 System has significant issues that need attention';
  }

  return { success: true, message: output };
}

async function setLogLevel(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      error: 'Usage: /logs level <debug|info|warn|error|critical>'
    };
  }

  const level = args[0].toLowerCase();
  const validLevels = ['debug', 'info', 'warn', 'error', 'critical'];
  
  if (!validLevels.includes(level)) {
    return {
      success: false,
      error: `Invalid log level. Valid levels: ${validLevels.join(', ')}`
    };
  }

  logger.setLogLevel(level as any);
  return {
    success: true,
    message: `Log level set to ${level}`
  };
}

async function manageCategories(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      error: 'Usage: /logs category <enable|disable> <category-name>'
    };
  }

  const [action, category] = args;
  
  if (!category) {
    return {
      success: false,
      error: 'Please specify a category name'
    };
  }

  if (action === 'enable') {
    logger.enableCategory(category);
    return {
      success: true,
      message: `Enabled logging for category: ${category}`
    };
  } else if (action === 'disable') {
    logger.disableCategory(category);
    return {
      success: true,
      message: `Disabled logging for category: ${category}`
    };
  } else {
    return {
      success: false,
      error: 'Action must be "enable" or "disable"'
    };
  }
}

async function showRecentMetrics(): Promise<CommandResult> {
  const metrics = logger.getMetrics(undefined, undefined, 50);
  
  if (metrics.length === 0) {
    return {
      success: true,
      message: 'No metrics available. The system will start collecting metrics shortly.'
    };
  }

  const byCategory: Record<string, typeof metrics> = {};
  metrics.forEach(metric => {
    if (!byCategory[metric.category]) {
      byCategory[metric.category] = [];
    }
    byCategory[metric.category].push(metric);
  });

  let output = 'Recent System Metrics:\n\n';
  
  Object.entries(byCategory).forEach(([category, categoryMetrics]) => {
    output += `${category.toUpperCase()}:\n`;
    
    const latest: Record<string, typeof metrics[0]> = {};
    categoryMetrics.forEach(metric => {
      if (!latest[metric.name] || metric.timestamp > latest[metric.name].timestamp) {
        latest[metric.name] = metric;
      }
    });
    
    Object.values(latest).forEach(metric => {
      const timestamp = new Date(metric.timestamp).toLocaleString();
      output += `  ${metric.name}: ${metric.value.toFixed(2)} ${metric.unit} (${timestamp})\n`;
    });
    output += '\n';
  });

  return { success: true, message: output };
}

async function showMetrics(args: string[]): Promise<CommandResult> {
  const timeRange = args.includes('--hour') ? {
    start: Date.now() - 3600000,
    end: Date.now()
  } : undefined;

  const metrics = logger.getMetrics(undefined, timeRange, 100);
  
  if (metrics.length === 0) {
    return {
      success: true,
      message: 'No metrics found for the specified time range.'
    };
  }

  let output = `System Metrics (${metrics.length} entries):\n\n`;
  metrics.forEach(metric => {
    const timestamp = new Date(metric.timestamp).toLocaleString();
    output += `${timestamp} [${metric.category}] ${metric.name}: ${metric.value} ${metric.unit}\n`;
  });

  return { success: true, message: output };
}

async function showMetricsByCategory(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      error: 'Usage: /metrics category <category-name>'
    };
  }

  const category = args[0];
  const metrics = logger.getMetrics(category, undefined, 50);
  
  if (metrics.length === 0) {
    return {
      success: true,
      message: `No metrics found for category: ${category}`
    };
  }

  let output = `Metrics for category "${category}" (${metrics.length} entries):\n\n`;
  metrics.forEach(metric => {
    const timestamp = new Date(metric.timestamp).toLocaleString();
    output += `${timestamp} ${metric.name}: ${metric.value} ${metric.unit}\n`;
  });

  return { success: true, message: output };
}

function parseLogOptions(args: string[]): { filter: any; limit: number } {
  const filter: any = {};
  let limit = 50;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--level' && i + 1 < args.length) {
      filter.level = [args[i + 1]];
      i++;
    } else if (arg === '--category' && i + 1 < args.length) {
      filter.category = [args[i + 1]];
      i++;
    } else if (arg === '--search' && i + 1 < args.length) {
      filter.search = args[i + 1];
      i++;
    } else if (arg === '--limit' && i + 1 < args.length) {
      limit = parseInt(args[i + 1]) || 50;
      i++;
    } else if (arg === '--hour') {
      filter.timeRange = {
        start: Date.now() - 3600000,
        end: Date.now()
      };
    }
  }

  return { filter, limit };
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}