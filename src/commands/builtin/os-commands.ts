import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

// Simulate system uptime (session-based)
const getSystemUptime = (): string => {
  const startTime = sessionStorage.getItem('claudiaos-start-time');
  const now = Date.now();
  const start = startTime ? parseInt(startTime) : now;
  
  if (!startTime) {
    sessionStorage.setItem('claudiaos-start-time', now.toString());
    return '0 minutes';
  }
  
  const uptimeMs = now - start;
  const minutes = Math.floor(uptimeMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} days, ${hours % 24} hours, ${minutes % 60} minutes`;
  if (hours > 0) return `${hours} hours, ${minutes % 60} minutes`;
  return `${minutes} minutes`;
};

// ps - Show running processes
export const psCommand: Command = {
  name: 'ps',
  description: 'Display currently running system processes',
  usage: '/ps',
  aliases: [],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    
    const lines: TerminalLine[] = [
      {
        id: `ps-header-${timestamp}`,
        type: 'output',
        content: 'PID    USER     TIME    COMMAND',
        timestamp,
        user: 'claudia'
      },
      {
        id: `ps-1-${timestamp}`,
        type: 'output', 
        content: '1      claudia  0:01    /system/core/personality.exe',
        timestamp,
        user: 'claudia'
      },
      {
        id: `ps-2-${timestamp}`,
        type: 'output',
        content: '2      claudia  0:00    /system/display/theme-manager',
        timestamp,
        user: 'claudia'
      },
      {
        id: `ps-3-${timestamp}`,
        type: 'output',
        content: '3      claudia  0:02    /system/interface/avatar-service',
        timestamp,
        user: 'claudia'
      },
      {
        id: `ps-4-${timestamp}`,
        type: 'output',
        content: '4      claudia  0:05    /system/shell/terminal',
        timestamp,
        user: 'claudia'
      },
      {
        id: `ps-5-${timestamp}`,
        type: 'output',
        content: '5      claudia  0:03    /system/net/intelligence-provider',
        timestamp,
        user: 'claudia'
      }
    ];
    
    return { success: true, lines };
  }
};

// top - System monitor 
export const topCommand: Command = {
  name: 'top',
  description: 'Display real-time system resource usage',
  usage: '/top',
  aliases: [],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const uptime = getSystemUptime();
    
    // Simulate realistic but fake CPU/memory usage
    const cpuUsage = Math.floor(Math.random() * 15 + 5); // 5-20%
    const memUsage = Math.floor(Math.random() * 30 + 40); // 40-70%
    
    const lines: TerminalLine[] = [
      {
        id: `top-header-${timestamp}`,
        type: 'output',
        content: `ClaudiaOS - System Monitor    Uptime: ${uptime}`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `top-cpu-${timestamp}`,
        type: 'output',
        content: `CPU Usage: ${cpuUsage}%    Memory: ${memUsage}%    Processes: 5`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `top-divider-${timestamp}`,
        type: 'output',
        content: '─'.repeat(50),
        timestamp,
        user: 'claudia'
      },
      {
        id: `top-processes-${timestamp}`,
        type: 'output',
        content: 'PID  %CPU %MEM COMMAND',
        timestamp,
        user: 'claudia'
      },
      {
        id: `top-proc1-${timestamp}`,
        type: 'output',
        content: '1    12.5 15.2 personality.exe',
        timestamp,
        user: 'claudia'
      },
      {
        id: `top-proc2-${timestamp}`,
        type: 'output',
        content: '4    8.1  22.8 terminal',
        timestamp,
        user: 'claudia'
      },
      {
        id: `top-proc3-${timestamp}`,
        type: 'output',
        content: '3    5.2  18.3 avatar-service',
        timestamp,
        user: 'claudia'
      }
    ];
    
    return { success: true, lines };
  }
};

// uptime - System uptime
export const uptimeCommand: Command = {
  name: 'uptime',
  description: 'Show system uptime and load averages',
  usage: '/uptime',
  aliases: [],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const uptime = getSystemUptime();
    const currentTime = new Date().toLocaleTimeString();
    
    // Simulate load averages
    const load1 = (Math.random() * 0.5 + 0.1).toFixed(2);
    const load5 = (Math.random() * 0.3 + 0.2).toFixed(2);
    const load15 = (Math.random() * 0.2 + 0.15).toFixed(2);
    
    const lines: TerminalLine[] = [
      {
        id: `uptime-${timestamp}`,
        type: 'output',
        content: `${currentTime} up ${uptime}, 1 user, load average: ${load1}, ${load5}, ${load15}`,
        timestamp,
        user: 'claudia'
      }
    ];
    
    return { success: true, lines };
  }
};

// whoami - Current user
export const whoamiCommand: Command = {
  name: 'whoami',
  description: 'Display current system user',
  usage: '/whoami',
  aliases: [],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    
    const lines: TerminalLine[] = [
      {
        id: `whoami-${timestamp}`,
        type: 'output',
        content: 'claudia',
        timestamp,
        user: 'claudia'
      }
    ];
    
    return { success: true, lines };
  }
};

// pwd - Present working directory
export const pwdCommand: Command = {
  name: 'pwd',
  description: 'Print current working directory',
  usage: '/pwd',
  aliases: [],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    
    const lines: TerminalLine[] = [
      {
        id: `pwd-${timestamp}`,
        type: 'output',
        content: '/home/claudia',
        timestamp,
        user: 'claudia'
      }
    ];
    
    return { success: true, lines };
  }
};

// ls - List directory contents
export const lsCommand: Command = {
  name: 'ls',
  description: 'List directory contents',
  usage: '/ls [directory]',
  aliases: ['dir'],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const directory = args[0] || '/home/claudia';
    
    let files: string[] = [];
    
    // Simulate different directories
    switch (directory) {
      case '/home/claudia':
      case '~':
        files = ['conversations/', 'settings/', 'avatars/', 'themes/', '.personality'];
        break;
      case '/system':
        files = ['core/', 'display/', 'interface/', 'shell/', 'net/', 'config'];
        break;
      case '/etc':
        files = ['claudia.conf', 'themes.conf', 'providers.conf', 'security.conf'];
        break;
      default:
        return {
          success: false,
          lines: [{
            id: `ls-error-${timestamp}`,
            type: 'error',
            content: `System Error: Directory not found: ${directory}`,
            timestamp,
            user: 'claudia'
          }]
        };
    }
    
    const lines: TerminalLine[] = [
      {
        id: `ls-header-${timestamp}`,
        type: 'output',
        content: `Contents of ${directory}:`,
        timestamp,
        user: 'claudia'
      },
      ...files.map((file, index) => ({
        id: `ls-file-${index}-${timestamp}`,
        type: 'output' as const,
        content: `  ${file}`,
        timestamp,
        user: 'claudia' as const
      }))
    ];
    
    return { success: true, lines };
  }
};

// free - Memory usage
export const freeCommand: Command = {
  name: 'free',
  description: 'Display memory usage information',
  usage: '/free',
  aliases: [],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    
    // Simulate memory usage (in KB)
    const total = 16384;
    const used = Math.floor(total * (0.4 + Math.random() * 0.3)); // 40-70% used
    const free = total - used;
    const available = free + Math.floor(used * 0.2); // Some cached memory
    
    const lines: TerminalLine[] = [
      {
        id: `free-header-${timestamp}`,
        type: 'output',
        content: '               total        used        free      available',
        timestamp,
        user: 'claudia'
      },
      {
        id: `free-mem-${timestamp}`,
        type: 'output',
        content: `Mem:        ${total.toString().padStart(8)}    ${used.toString().padStart(8)}    ${free.toString().padStart(8)}    ${available.toString().padStart(8)}`,
        timestamp,
        user: 'claudia'
      }
    ];
    
    return { success: true, lines };
  }
};

// uname - System information
export const unameCommand: Command = {
  name: 'uname',
  description: 'Display system information',
  usage: '/uname [-a]',
  aliases: [],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    
    let content = 'ClaudiaOS';
    
    if (args.includes('-a') || args.includes('--all')) {
      content = 'ClaudiaOS claudia-terminal 2.1.7 ClaudiaOS x86_64 Intelligent-OS';
    }
    
    const lines: TerminalLine[] = [
      {
        id: `uname-${timestamp}`,
        type: 'output',
        content,
        timestamp,
        user: 'claudia'
      }
    ];
    
    return { success: true, lines };
  }
};

// cat - Display file contents  
export const catCommand: Command = {
  name: 'cat',
  description: 'Display file contents',
  usage: '/cat <filename>',
  aliases: [],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    
    if (args.length === 0) {
      return {
        success: false,
        lines: [{
          id: `cat-error-${timestamp}`,
          type: 'error',
          content: 'System Error: No filename specified. Usage: /cat <filename>',
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    const filename = args[0];
    let fileContent: string[] = [];
    
    // Simulate different system files
    switch (filename) {
      case '.personality':
      case '/home/claudia/.personality':
        fileContent = [
          '# ClaudiaOS Personality Configuration',
          'name=Default System Personality',
          'version=2.1.7',
          'mood=helpful',
          'response_style=conversational',
          'system_integration=true'
        ];
        break;
      case '/etc/claudia.conf':
        fileContent = [
          '# ClaudiaOS System Configuration',
          '[display]',
          'theme=pc80s',
          'crt_effects=enabled',
          'phosphor_glow=true',
          '',
          '[interface]',
          'avatar=enabled',
          'visual_subsystem=active',
          '',
          '[network]',
          'intelligence_provider=anthropic',
          'fallback_mode=offline'
        ];
        break;
      case '/etc/themes.conf':
        fileContent = [
          '# Available Display Configurations',
          'mainframe70s="70s Mainframe"',
          'pc80s="PC 80s"', 
          'bbs90s="90s BBS"',
          'modern="Modern"',
          'claudia="Claudia Custom"'
        ];
        break;
      case '/var/log/system.log':
        fileContent = [
          `[${new Date().toISOString()}] ClaudiaOS boot sequence initiated`,
          `[${new Date().toISOString()}] Personality subsystem loaded successfully`,
          `[${new Date().toISOString()}] Display manager started`,
          `[${new Date().toISOString()}] Avatar services online`,
          `[${new Date().toISOString()}] Terminal shell ready`,
          `[${new Date().toISOString()}] System initialization complete`
        ];
        break;
      default:
        return {
          success: false,
          lines: [{
            id: `cat-error-${timestamp}`,
            type: 'error',
            content: `System Error: File not found: ${filename}`,
            timestamp,
            user: 'claudia'
          }]
        };
    }
    
    const lines: TerminalLine[] = fileContent.map((line, index) => ({
      id: `cat-line-${index}-${timestamp}`,
      type: 'output',
      content: line,
      timestamp,
      user: 'claudia'
    }));
    
    return { success: true, lines };
  }
};

// date - Display current date and time
export const dateCommand: Command = {
  name: 'date',
  description: 'Display current system date and time',
  usage: '/date',
  aliases: [],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const now = new Date();
    
    // Format like Unix date command
    const dateString = now.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
    const timeString = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZoneName: 'short'
    });
    
    const lines: TerminalLine[] = [
      {
        id: `date-${timestamp}`,
        type: 'output',
        content: `${dateString} ${timeString}`,
        timestamp,
        user: 'claudia'
      }
    ];
    
    return { success: true, lines };
  }
};