import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

// Process management system for ClaudiaOS
interface SystemProcess {
  pid: number;
  ppid: number;
  user: string;
  command: string;
  cpu: number;
  memory: number;
  startTime: Date;
  status: 'running' | 'sleeping' | 'zombie' | 'stopped';
}

// Simulate dynamic system processes
const generateProcessList = (): SystemProcess[] => {
  const baseTime = new Date();
  baseTime.setHours(baseTime.getHours() - Math.floor(Math.random() * 24));
  
  const processes: SystemProcess[] = [
    {
      pid: 1,
      ppid: 0,
      user: 'root',
      command: '/system/core/init',
      cpu: 0.1,
      memory: 0.2,
      startTime: new Date(baseTime.getTime() - 86400000), // Started 24h ago
      status: 'running'
    },
    {
      pid: 2,
      ppid: 1,
      user: 'claudia',
      command: '/system/core/personality.exe',
      cpu: 2.5 + Math.random() * 2,
      memory: 8.5 + Math.random() * 3,
      startTime: new Date(baseTime.getTime() - 3600000), // Started 1h ago
      status: 'running'
    },
    {
      pid: 3,
      ppid: 1,
      user: 'claudia',
      command: '/system/core/ai-engine.so',
      cpu: 15.2 + Math.random() * 10,
      memory: 25.8 + Math.random() * 8,
      startTime: new Date(baseTime.getTime() - 3600000),
      status: 'running'
    },
    {
      pid: 4,
      ppid: 1,
      user: 'claudia',
      command: '/system/shell/claudia-shell',
      cpu: 1.2 + Math.random() * 1,
      memory: 4.5 + Math.random() * 2,
      startTime: new Date(baseTime.getTime() - 1800000), // 30min ago
      status: 'running'
    },
    {
      pid: 5,
      ppid: 4,
      user: 'claudia',
      command: '/system/interface/terminal-display',
      cpu: 3.8 + Math.random() * 2,
      memory: 12.3 + Math.random() * 4,
      startTime: new Date(baseTime.getTime() - 1800000),
      status: 'running'
    },
    {
      pid: 6,
      ppid: 2,
      user: 'claudia',
      command: '/system/core/conversation.so',
      cpu: 5.5 + Math.random() * 5,
      memory: 15.7 + Math.random() * 6,
      startTime: new Date(baseTime.getTime() - 900000), // 15min ago
      status: 'running'
    },
    {
      pid: 7,
      ppid: 3,
      user: 'claudia',
      command: '/system/avatar/image-generator',
      cpu: Math.random() < 0.7 ? 0.1 : 45.2 + Math.random() * 20, // Sometimes very active
      memory: 18.9 + Math.random() * 12,
      startTime: new Date(baseTime.getTime() - 600000), // 10min ago
      status: Math.random() < 0.9 ? 'running' : 'sleeping'
    },
    {
      pid: 8,
      ppid: 1,
      user: 'claudia',
      command: '/system/core/memory-manager.so',
      cpu: 0.8 + Math.random() * 0.5,
      memory: 6.2 + Math.random() * 2,
      startTime: new Date(baseTime.getTime() - 3600000),
      status: 'running'
    },
    {
      pid: 9,
      ppid: 4,
      user: 'claudia',
      command: '/system/net/provider-manager',
      cpu: 1.1 + Math.random() * 1,
      memory: 7.8 + Math.random() * 3,
      startTime: new Date(baseTime.getTime() - 2700000), // 45min ago
      status: 'running'
    },
    {
      pid: 10,
      ppid: 9,
      user: 'claudia',
      command: '/system/net/replicate-client',
      cpu: Math.random() < 0.6 ? 0.2 : 8.5 + Math.random() * 5,
      memory: 9.4 + Math.random() * 4,
      startTime: new Date(baseTime.getTime() - 1200000), // 20min ago
      status: Math.random() < 0.8 ? 'running' : 'sleeping'
    }
  ];
  
  return processes;
};

// Enhanced ps command with more options
export const psEnhancedCommand: Command = {
  name: 'ps',
  description: 'Display running processes',
  usage: '/ps [aux] [-u user] [-p pid]',
  aliases: [],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const processes = generateProcessList();
    
    // Parse arguments
    const showAll = args.includes('aux') || args.includes('ax');
    const userFilter = args.find((_arg, i) => args[i-1] === '-u');
    const pidFilter = args.find((_arg, i) => args[i-1] === '-p');
    
    let filteredProcesses = processes;
    
    if (userFilter) {
      filteredProcesses = processes.filter(p => p.user === userFilter);
    }
    
    if (pidFilter) {
      const pid = parseInt(pidFilter);
      filteredProcesses = processes.filter(p => p.pid === pid);
    }
    
    const lines: TerminalLine[] = [];
    
    if (showAll) {
      // Detailed format like 'ps aux'
      lines.push({
        id: `ps-header-${timestamp}`,
        type: 'output',
        content: 'USER       PID  %CPU %MEM    TIME COMMAND',
        timestamp,
        user: 'claudia'
      });
      
      filteredProcesses.forEach((proc, index) => {
        const runtime = Math.floor((Date.now() - proc.startTime.getTime()) / 1000);
        const timeStr = `${Math.floor(runtime / 60)}:${(runtime % 60).toString().padStart(2, '0')}`;
        
        lines.push({
          id: `ps-proc-${index}-${timestamp}`,
          type: 'output',
          content: `${proc.user.padEnd(8)} ${proc.pid.toString().padStart(5)} ${proc.cpu.toFixed(1).padStart(4)} ${proc.memory.toFixed(1).padStart(4)} ${timeStr.padStart(7)} ${proc.command}`,
          timestamp,
          user: 'claudia'
        });
      });
    } else {
      // Simple format
      lines.push({
        id: `ps-header-${timestamp}`,
        type: 'output',
        content: '  PID TTY          TIME CMD',
        timestamp,
        user: 'claudia'
      });
      
      filteredProcesses.forEach((proc, index) => {
        const runtime = Math.floor((Date.now() - proc.startTime.getTime()) / 1000);
        const timeStr = `${Math.floor(runtime / 60)}:${(runtime % 60).toString().padStart(2, '0')}`;
        const cmdName = proc.command.split('/').pop() || proc.command;
        
        lines.push({
          id: `ps-simple-${index}-${timestamp}`,
          type: 'output',
          content: `${proc.pid.toString().padStart(5)} pts/0    ${timeStr.padStart(8)} ${cmdName}`,
          timestamp,
          user: 'claudia'
        });
      });
    }
    
    return { success: true, lines };
  }
};

// top command - dynamic process monitor
export const topCommand: Command = {
  name: 'top',
  description: 'Display and update sorted information about running processes',
  usage: '/top',
  aliases: [],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const processes = generateProcessList().sort((a, b) => b.cpu - a.cpu);
    
    // System summary
    const totalCpu = processes.reduce((sum, p) => sum + p.cpu, 0);
    const totalMemory = processes.reduce((sum, p) => sum + p.memory, 0);
    const uptime = sessionStorage.getItem('claudiaos-start-time');
    const uptimeSeconds = uptime ? Math.floor((Date.now() - parseInt(uptime)) / 1000) : 0;
    const uptimeStr = `${Math.floor(uptimeSeconds / 3600)}:${Math.floor((uptimeSeconds % 3600) / 60).toString().padStart(2, '0')}:${(uptimeSeconds % 60).toString().padStart(2, '0')}`;
    
    const lines: TerminalLine[] = [
      {
        id: `top-header1-${timestamp}`,
        type: 'output',
        content: `top - ${new Date().toLocaleTimeString()} up ${uptimeStr}, 1 user, load average: 0.${Math.floor(Math.random() * 99)}, 0.${Math.floor(Math.random() * 99)}, 0.${Math.floor(Math.random() * 99)}`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `top-header2-${timestamp}`,
        type: 'output',
        content: `Tasks: ${processes.length} total, ${processes.filter(p => p.status === 'running').length} running, ${processes.filter(p => p.status === 'sleeping').length} sleeping`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `top-header3-${timestamp}`,
        type: 'output',
        content: `%Cpu(s): ${totalCpu.toFixed(1)} us, 2.1 sy, 0.0 ni, ${(100 - totalCpu - 2.1).toFixed(1)} id`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `top-header4-${timestamp}`,
        type: 'output',
        content: `Memory: ${(16384 * 1024).toLocaleString()} total, ${Math.floor(totalMemory * 167.77).toLocaleString()} used, ${Math.floor((100 - totalMemory) * 167.77).toLocaleString()} free`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `top-blank-${timestamp}`,
        type: 'output',
        content: '',
        timestamp,
        user: 'claudia'
      },
      {
        id: `top-processes-header-${timestamp}`,
        type: 'output',
        content: '  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND',
        timestamp,
        user: 'claudia'
      }
    ];
    
    // Show top processes
    processes.slice(0, 10).forEach((proc, index) => {
      const runtime = Math.floor((Date.now() - proc.startTime.getTime()) / 1000);
      const timeStr = `${Math.floor(runtime / 60)}:${(runtime % 60).toString().padStart(2, '0')}.${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
      const virt = Math.floor(proc.memory * 1024 * 10.24);
      const res = Math.floor(virt * 0.7);
      const shr = Math.floor(res * 0.3);
      
      lines.push({
        id: `top-proc-${index}-${timestamp}`,
        type: 'output',
        content: `${proc.pid.toString().padStart(5)} ${proc.user.padEnd(8)} 20   0 ${virt.toString().padStart(7)} ${res.toString().padStart(6)} ${shr.toString().padStart(6)} ${proc.status[0].toUpperCase()} ${proc.cpu.toFixed(1).padStart(5)} ${proc.memory.toFixed(1).padStart(5)} ${timeStr.padStart(9)} ${proc.command.split('/').pop()}`,
        timestamp,
        user: 'claudia'
      });
    });
    
    return { success: true, lines };
  }
};

// kill command
export const killCommand: Command = {
  name: 'kill',
  description: 'Terminate processes by PID',
  usage: '/kill [-9] <pid>',
  aliases: [],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    
    if (args.length === 0) {
      return {
        success: false,
        lines: [{
          id: `kill-error-${timestamp}`,
          type: 'error',
          content: 'kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]',
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    const force = args.includes('-9');
    const pidStr = args.find(arg => !arg.startsWith('-'));
    
    if (!pidStr) {
      return {
        success: false,
        lines: [{
          id: `kill-nopid-${timestamp}`,
          type: 'error',
          content: 'kill: no process ID specified',
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    const pid = parseInt(pidStr);
    if (isNaN(pid)) {
      return {
        success: false,
        lines: [{
          id: `kill-invalid-${timestamp}`,
          type: 'error',
          content: `kill: ${pidStr}: arguments must be process or job IDs`,
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    // Simulate process termination
    if (pid === 1) {
      return {
        success: false,
        lines: [{
          id: `kill-init-${timestamp}`,
          type: 'error',
          content: 'kill: (1) - Operation not permitted (cannot kill init process)',
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    if (pid === 2 || pid === 3) {
      return {
        success: false,
        lines: [{
          id: `kill-core-${timestamp}`,
          type: 'error',
          content: `kill: (${pid}) - Operation not permitted (core system process)`,
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    const signal = force ? 'SIGKILL' : 'SIGTERM';
    
    return {
      success: true,
      lines: [{
        id: `kill-success-${timestamp}`,
        type: 'output',
        content: `Process ${pid} terminated with ${signal}`,
        timestamp,
        user: 'claudia'
      }]
    };
  }
};

// jobs command
export const jobsCommand: Command = {
  name: 'jobs',
  description: 'Display active jobs',
  usage: '/jobs',
  aliases: [],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    
    // Simulate background jobs
    const jobs = [
      '[1]+ Running    /system/avatar/image-generator &',
      '[2]- Stopped    /system/net/model-downloader'
    ];
    
    const lines: TerminalLine[] = jobs.map((job, index) => ({
      id: `jobs-${index}-${timestamp}`,
      type: 'output',
      content: job,
      timestamp,
      user: 'claudia'
    }));
    
    if (jobs.length === 0) {
      lines.push({
        id: `jobs-empty-${timestamp}`,
        type: 'output',
        content: 'No active jobs',
        timestamp,
        user: 'claudia'
      });
    }
    
    return { success: true, lines };
  }
};