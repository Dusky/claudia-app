import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

// System monitoring and resource management for ClaudiaOS
interface SystemStats {
  cpu: {
    usage: number;
    cores: number;
    model: string;
    frequency: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    cached: number;
    buffers: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    filesystem: string;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
}

// Generate realistic system statistics
const generateSystemStats = (): SystemStats => {
  const baseMemoryUsage = 6500 + Math.random() * 2000; // 6.5-8.5GB used
  const totalMemory = 16384; // 16GB total
  
  return {
    cpu: {
      usage: 15 + Math.random() * 35, // 15-50% usage
      cores: 8,
      model: 'ClaudiaOS Virtual CPU @ 3.2GHz',
      frequency: 3200 + Math.random() * 400
    },
    memory: {
      total: totalMemory,
      used: baseMemoryUsage,
      free: totalMemory - baseMemoryUsage,
      cached: 1200 + Math.random() * 800,
      buffers: 150 + Math.random() * 100
    },
    disk: {
      total: 512000, // 512GB
      used: 180000 + Math.random() * 50000, // 180-230GB used
      available: 0, // calculated
      filesystem: '/dev/claudia-root'
    },
    network: {
      bytesIn: Math.floor(Math.random() * 10000000),
      bytesOut: Math.floor(Math.random() * 5000000),
      packetsIn: Math.floor(Math.random() * 50000),
      packetsOut: Math.floor(Math.random() * 30000)
    }
  };
};

// Enhanced free command with detailed memory info
export const freeEnhancedCommand: Command = {
  name: 'free',
  description: 'Display memory usage information',
  usage: '/free [-h] [-m] [-g]',
  aliases: [],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const stats = generateSystemStats();
    const humanReadable = args.includes('-h');
    const megabytes = args.includes('-m');
    const gigabytes = args.includes('-g');
    
    let unit = 'MB';
    let divisor = 1;
    
    if (gigabytes) {
      unit = 'GB';
      divisor = 1024;
    } else if (!megabytes && !humanReadable) {
      unit = 'KB';
      divisor = 1/1024;
    }
    
    const formatValue = (value: number): string => {
      const converted = value * divisor;
      if (humanReadable) {
        if (converted >= 1024) {
          return `${(converted / 1024).toFixed(1)}G`;
        }
        return `${converted.toFixed(0)}M`;
      }
      return converted.toFixed(0);
    };
    
    const total = formatValue(stats.memory.total);
    const used = formatValue(stats.memory.used);
    const free = formatValue(stats.memory.free);
    const available = formatValue(stats.memory.free + stats.memory.cached);
    const cached = formatValue(stats.memory.cached);
    
    const lines: TerminalLine[] = [
      {
        id: `free-header-${timestamp}`,
        type: 'output',
        content: `               total        used        free      shared  buff/cache   available`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `free-mem-${timestamp}`,
        type: 'output',
        content: `Mem:        ${total.padStart(8)}    ${used.padStart(8)}    ${free.padStart(8)}         0    ${cached.padStart(8)}    ${available.padStart(8)}`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `free-swap-${timestamp}`,
        type: 'output',
        content: `Swap:           0           0           0`,
        timestamp,
        user: 'claudia'
      }
    ];
    
    if (humanReadable || megabytes || gigabytes) {
      lines.unshift({
        id: `free-unit-${timestamp}`,
        type: 'output',
        content: `Memory usage (in ${unit}):`,
        timestamp,
        user: 'claudia'
      });
    }
    
    return { success: true, lines };
  }
};

// df command - disk space usage
export const dfCommand: Command = {
  name: 'df',
  description: 'Display filesystem disk space usage',
  usage: '/df [-h]',
  aliases: [],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const stats = generateSystemStats();
    const humanReadable = args.includes('-h');
    
    stats.disk.available = stats.disk.total - stats.disk.used;
    
    const formatSize = (size: number): string => {
      if (humanReadable) {
        if (size >= 1000000) {
          return `${(size / 1000000).toFixed(1)}T`;
        } else if (size >= 1000) {
          return `${(size / 1000).toFixed(1)}G`;
        }
        return `${size.toFixed(0)}M`;
      }
      return (size * 1024).toFixed(0); // Show in KB
    };
    
    const usePercent = ((stats.disk.used / stats.disk.total) * 100).toFixed(0);
    
    const lines: TerminalLine[] = [
      {
        id: `df-header-${timestamp}`,
        type: 'output',
        content: `Filesystem      ${humanReadable ? 'Size  Used Avail Use%' : '1K-blocks      Used Available Use%'} Mounted on`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `df-root-${timestamp}`,
        type: 'output',
        content: `${stats.disk.filesystem.padEnd(15)} ${formatSize(stats.disk.total).padStart(5)} ${formatSize(stats.disk.used).padStart(4)} ${formatSize(stats.disk.available).padStart(5)} ${usePercent.padStart(3)}% /`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `df-home-${timestamp}`,
        type: 'output',
        content: `/dev/claudia-home    ${formatSize(50000).padStart(5)} ${formatSize(25000).padStart(4)} ${formatSize(25000).padStart(5)}  50% /home`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `df-tmp-${timestamp}`,
        type: 'output',
        content: `tmpfs               ${formatSize(8192).padStart(5)} ${formatSize(100).padStart(4)} ${formatSize(8092).padStart(5)}   2% /tmp`,
        timestamp,
        user: 'claudia'
      }
    ];
    
    return { success: true, lines };
  }
};

// Enhanced uptime command
export const uptimeEnhancedCommand: Command = {
  name: 'uptime',
  description: 'Show system uptime and load average',
  usage: '/uptime',
  aliases: [],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const startTime = sessionStorage.getItem('claudiaos-start-time');
    const now = Date.now();
    const start = startTime ? parseInt(startTime) : now;
    
    if (!startTime) {
      sessionStorage.setItem('claudiaos-start-time', now.toString());
    }
    
    const uptimeMs = now - start;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(uptimeSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    let uptimeStr = '';
    if (days > 0) {
      uptimeStr = `${days} day${days > 1 ? 's' : ''}, ${hours % 24}:${(minutes % 60).toString().padStart(2, '0')}`;
    } else if (hours > 0) {
      uptimeStr = `${hours}:${(minutes % 60).toString().padStart(2, '0')}`;
    } else {
      uptimeStr = `${minutes} min`;
    }
    
    const currentTime = new Date().toLocaleTimeString();
    const loadAvg1 = (Math.random() * 2).toFixed(2);
    const loadAvg5 = (Math.random() * 2).toFixed(2);
    const loadAvg15 = (Math.random() * 2).toFixed(2);
    
    const lines: TerminalLine[] = [{
      id: `uptime-${timestamp}`,
      type: 'output',
      content: ` ${currentTime} up ${uptimeStr}, 1 user, load average: ${loadAvg1}, ${loadAvg5}, ${loadAvg15}`,
      timestamp,
      user: 'claudia'
    }];
    
    return { success: true, lines };
  }
};

// System information command
export const systemInfoCommand: Command = {
  name: 'sysinfo',
  description: 'Display comprehensive system information',
  usage: '/sysinfo',
  aliases: ['hwinfo'],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const stats = generateSystemStats();
    
    const lines: TerminalLine[] = [
      {
        id: `sysinfo-header-${timestamp}`,
        type: 'output',
        content: '=== ClaudiaOS System Information ===',
        timestamp,
        user: 'claudia'
      },
      {
        id: `sysinfo-os-${timestamp}`,
        type: 'output',
        content: `Operating System: ClaudiaOS v2.1.7`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `sysinfo-kernel-${timestamp}`,
        type: 'output',
        content: `Kernel: claudia-kernel 5.15.0-claudia`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `sysinfo-arch-${timestamp}`,
        type: 'output',
        content: `Architecture: x86_64`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `sysinfo-cpu-${timestamp}`,
        type: 'output',
        content: `CPU: ${stats.cpu.model} (${stats.cpu.cores} cores @ ${stats.cpu.frequency.toFixed(0)}MHz)`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `sysinfo-memory-${timestamp}`,
        type: 'output',
        content: `Memory: ${(stats.memory.used / 1024).toFixed(1)}GB / ${(stats.memory.total / 1024).toFixed(1)}GB (${((stats.memory.used / stats.memory.total) * 100).toFixed(1)}% used)`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `sysinfo-disk-${timestamp}`,
        type: 'output',
        content: `Storage: ${(stats.disk.used / 1000).toFixed(0)}GB / ${(stats.disk.total / 1000).toFixed(0)}GB (${((stats.disk.used / stats.disk.total) * 100).toFixed(1)}% used)`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `sysinfo-network-${timestamp}`,
        type: 'output',
        content: `Network: RX ${(stats.network.bytesIn / 1024 / 1024).toFixed(1)}MB, TX ${(stats.network.bytesOut / 1024 / 1024).toFixed(1)}MB`,
        timestamp,
        user: 'claudia'
      }
    ];
    
    return { success: true, lines };
  }
};

// CPU information command (like /proc/cpuinfo)
export const cpuInfoCommand: Command = {
  name: 'cpuinfo',
  description: 'Display detailed CPU information',
  usage: '/cpuinfo',
  aliases: [],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const stats = generateSystemStats();
    
    const lines: TerminalLine[] = [];
    
    for (let i = 0; i < stats.cpu.cores; i++) {
      const coreLines = [
        `processor       : ${i}`,
        `vendor_id       : ClaudiaOS`,
        `cpu family      : 6`,
        `model           : 142`,
        `model name      : ${stats.cpu.model}`,
        `stepping        : 10`,
        `microcode       : 0xde`,
        `cpu MHz         : ${(stats.cpu.frequency + Math.random() * 100).toFixed(2)}`,
        `cache size      : 8192 KB`,
        `physical id     : 0`,
        `siblings        : ${stats.cpu.cores}`,
        `core id         : ${i}`,
        `cpu cores       : ${stats.cpu.cores}`,
        `flags           : fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov`,
        ''
      ];
      
      coreLines.forEach((line, index) => {
        lines.push({
          id: `cpuinfo-core${i}-line${index}-${timestamp}`,
          type: 'output',
          content: line,
          timestamp,
          user: 'claudia'
        });
      });
    }
    
    return { success: true, lines };
  }
};

// Memory information command (like /proc/meminfo)
export const memInfoCommand: Command = {
  name: 'meminfo',
  description: 'Display detailed memory information',
  usage: '/meminfo',
  aliases: [],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const stats = generateSystemStats();
    
    const memData = [
      ['MemTotal', stats.memory.total * 1024],
      ['MemFree', stats.memory.free * 1024],
      ['MemAvailable', (stats.memory.free + stats.memory.cached) * 1024],
      ['Buffers', stats.memory.buffers * 1024],
      ['Cached', stats.memory.cached * 1024],
      ['SwapCached', 0],
      ['Active', stats.memory.used * 0.6 * 1024],
      ['Inactive', stats.memory.used * 0.4 * 1024],
      ['SwapTotal', 0],
      ['SwapFree', 0],
      ['Dirty', 64],
      ['Writeback', 0],
      ['Mapped', stats.memory.used * 0.3 * 1024],
      ['Shmem', 128 * 1024],
      ['KernelStack', 16 * 1024],
      ['PageTables', 32 * 1024],
      ['Committed_AS', stats.memory.used * 1.2 * 1024],
      ['VmallocTotal', 34359738367],
      ['VmallocUsed', 0],
      ['HugePages_Total', 0],
      ['HugePages_Free', 0],
      ['Hugepagesize', 2048]
    ];
    
    const lines: TerminalLine[] = memData.map(([name, value], index) => ({
      id: `meminfo-${index}-${timestamp}`,
      type: 'output',
      content: `${name.toString().padEnd(16)}: ${Math.floor(value as number).toString().padStart(10)} kB`,
      timestamp,
      user: 'claudia'
    }));
    
    return { success: true, lines };
  }
};