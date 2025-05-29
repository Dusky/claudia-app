import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

// Enhanced file system simulation for ClaudiaOS
interface FileSystemItem {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  permissions: string;
  modified: string;
  content?: string;
}

interface Directory {
  [key: string]: FileSystemItem[];
}

// Comprehensive ClaudiaOS file system structure
const fileSystem: Directory = {
  '/': [
    { name: 'bin', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 10:30' },
    { name: 'boot', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 09:00' },
    { name: 'dev', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 09:00' },
    { name: 'etc', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 11:45' },
    { name: 'home', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 12:00' },
    { name: 'lib', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 09:30' },
    { name: 'proc', type: 'directory', permissions: 'dr-xr-xr-x', modified: '2024-01-15 14:20' },
    { name: 'root', type: 'directory', permissions: 'drwx------', modified: '2024-01-15 09:15' },
    { name: 'system', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 10:00' },
    { name: 'tmp', type: 'directory', permissions: 'drwxrwxrwx', modified: '2024-01-15 14:30' },
    { name: 'usr', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 10:45' },
    { name: 'var', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 13:15' },
  ],
  
  '/home/claudia': [
    { name: 'conversations', type: 'directory', permissions: 'drwx------', modified: '2024-01-15 14:25' },
    { name: 'settings', type: 'directory', permissions: 'drwx------', modified: '2024-01-15 12:30' },
    { name: 'avatars', type: 'directory', permissions: 'drwx------', modified: '2024-01-15 13:45' },
    { name: 'themes', type: 'directory', permissions: 'drwx------', modified: '2024-01-15 11:20' },
    { name: 'projects', type: 'directory', permissions: 'drwx------', modified: '2024-01-15 16:10' },
    { name: 'documents', type: 'directory', permissions: 'drwx------', modified: '2024-01-15 15:30' },
    { name: '.personality', type: 'file', size: 2048, permissions: '-rw-------', modified: '2024-01-15 12:15', content: 'Current personality configuration...' },
    { name: '.claudiarc', type: 'file', size: 512, permissions: '-rw-------', modified: '2024-01-15 09:45', content: '# ClaudiaOS configuration file\\nexport CLAUDIA_THEME=mainframe70s\\nexport CLAUDIA_DEBUG=false' },
    { name: 'README.md', type: 'file', size: 1024, permissions: '-rw-r--r--', modified: '2024-01-15 09:00', content: '# Welcome to ClaudiaOS\\n\\nThis is your personal directory in the ClaudiaOS system.' },
  ],
  
  '/home/claudia/conversations': [
    { name: 'session_001.log', type: 'file', size: 15360, permissions: '-rw-------', modified: '2024-01-15 14:20' },
    { name: 'session_002.log', type: 'file', size: 8192, permissions: '-rw-------', modified: '2024-01-15 13:45' },
    { name: 'archived', type: 'directory', permissions: 'drwx------', modified: '2024-01-14 18:00' },
    { name: 'current.log', type: 'file', size: 4096, permissions: '-rw-------', modified: '2024-01-15 16:30' },
  ],
  
  '/system': [
    { name: 'core', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 10:00' },
    { name: 'display', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 10:15' },
    { name: 'interface', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 10:30' },
    { name: 'shell', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 11:00' },
    { name: 'net', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 11:15' },
    { name: 'avatar', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 12:45' },
    { name: 'config', type: 'file', size: 1536, permissions: '-rw-r--r--', modified: '2024-01-15 11:45' },
    { name: 'version', type: 'file', size: 64, permissions: '-r--r--r--', modified: '2024-01-15 09:00', content: 'ClaudiaOS v2.1.7\\nBuild: 20240115-1000' },
  ],
  
  '/system/core': [
    { name: 'personality.exe', type: 'file', size: 32768, permissions: '-rwxr-xr-x', modified: '2024-01-15 10:00' },
    { name: 'ai-engine.so', type: 'file', size: 65536, permissions: '-rwxr-xr-x', modified: '2024-01-15 10:05' },
    { name: 'memory-manager.so', type: 'file', size: 16384, permissions: '-rwxr-xr-x', modified: '2024-01-15 10:10' },
    { name: 'conversation.so', type: 'file', size: 24576, permissions: '-rwxr-xr-x', modified: '2024-01-15 10:15' },
  ],
  
  '/etc': [
    { name: 'claudia.conf', type: 'file', size: 2048, permissions: '-rw-r--r--', modified: '2024-01-15 11:45' },
    { name: 'themes.conf', type: 'file', size: 1024, permissions: '-rw-r--r--', modified: '2024-01-15 11:20' },
    { name: 'providers.conf', type: 'file', size: 1536, permissions: '-rw-r--r--', modified: '2024-01-15 11:30' },
    { name: 'security.conf', type: 'file', size: 512, permissions: '-rw-r-----', modified: '2024-01-15 11:35' },
    { name: 'avatar.conf', type: 'file', size: 768, permissions: '-rw-r--r--', modified: '2024-01-15 12:45' },
    { name: 'passwd', type: 'file', size: 256, permissions: '-rw-r--r--', modified: '2024-01-15 09:15', content: 'claudia:x:1000:1000:Claudia AI:/home/claudia:/system/shell/claudia-shell' },
  ],
  
  '/var': [
    { name: 'log', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 13:15' },
    { name: 'cache', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 14:00' },
    { name: 'tmp', type: 'directory', permissions: 'drwxrwxrwx', modified: '2024-01-15 14:30' },
    { name: 'run', type: 'directory', permissions: 'drwxr-xr-x', modified: '2024-01-15 14:35' },
  ],
  
  '/var/log': [
    { name: 'system.log', type: 'file', size: 10240, permissions: '-rw-r--r--', modified: '2024-01-15 16:30' },
    { name: 'conversation.log', type: 'file', size: 25600, permissions: '-rw-r--r--', modified: '2024-01-15 16:25' },
    { name: 'avatar.log', type: 'file', size: 5120, permissions: '-rw-r--r--', modified: '2024-01-15 15:45' },
    { name: 'error.log', type: 'file', size: 2048, permissions: '-rw-r--r--', modified: '2024-01-15 14:10' },
  ],
  
  '/proc': [
    { name: 'cpuinfo', type: 'file', size: 1024, permissions: '-r--r--r--', modified: '2024-01-15 16:30' },
    { name: 'meminfo', type: 'file', size: 512, permissions: '-r--r--r--', modified: '2024-01-15 16:30' },
    { name: 'version', type: 'file', size: 256, permissions: '-r--r--r--', modified: '2024-01-15 09:00' },
    { name: 'uptime', type: 'file', size: 64, permissions: '-r--r--r--', modified: '2024-01-15 16:30' },
  ],
};

// Current working directory state (session-based)
const getCurrentDirectory = (): string => {
  return sessionStorage.getItem('claudiaos-cwd') || '/home/claudia';
};

const setCurrentDirectory = (path: string): void => {
  sessionStorage.setItem('claudiaos-cwd', path);
};

// Normalize path (handle .. and . references)
const normalizePath = (path: string, currentDir: string = getCurrentDirectory()): string => {
  if (!path.startsWith('/')) {
    path = currentDir + '/' + path;
  }
  
  const parts = path.split('/').filter(p => p !== '');
  const normalized: string[] = [];
  
  for (const part of parts) {
    if (part === '..') {
      normalized.pop();
    } else if (part !== '.') {
      normalized.push(part);
    }
  }
  
  return '/' + normalized.join('/');
};

// Enhanced ls command with file details
export const lsEnhancedCommand: Command = {
  name: 'ls',
  description: 'List directory contents with details',
  usage: '/ls [-l] [-a] [directory]',
  aliases: ['dir'],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const flags = args.filter(arg => arg.startsWith('-'));
    const directories = args.filter(arg => !arg.startsWith('-'));
    const directory = directories[0] || getCurrentDirectory();
    const showDetails = flags.includes('-l');
    const showHidden = flags.includes('-a');
    
    const normalizedPath = normalizePath(directory);
    const items = fileSystem[normalizedPath];
    
    if (!items) {
      return {
        success: false,
        lines: [{
          id: `ls-error-${timestamp}`,
          type: 'error',
          content: `ls: cannot access '${directory}': No such file or directory`,
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    const filteredItems = items.filter(item => 
      showHidden || !item.name.startsWith('.')
    );
    
    const lines: TerminalLine[] = [];
    
    if (showDetails) {
      // Detailed listing with permissions, size, etc.
      lines.push({
        id: `ls-total-${timestamp}`,
        type: 'output',
        content: `total ${filteredItems.length}`,
        timestamp,
        user: 'claudia'
      });
      
      filteredItems.forEach((item, index) => {
        const sizeStr = item.size ? item.size.toString().padStart(8) : '     dir';
        const typeIndicator = item.type === 'directory' ? '/' : '';
        
        lines.push({
          id: `ls-detail-${index}-${timestamp}`,
          type: 'output',
          content: `${item.permissions} ${sizeStr} ${item.modified} ${item.name}${typeIndicator}`,
          timestamp,
          user: 'claudia'
        });
      });
    } else {
      // Simple listing
      const fileNames = filteredItems.map(item => 
        item.type === 'directory' ? `${item.name}/` : item.name
      );
      
      // Display in columns (4 per row)
      for (let i = 0; i < fileNames.length; i += 4) {
        const row = fileNames.slice(i, i + 4);
        lines.push({
          id: `ls-row-${i}-${timestamp}`,
          type: 'output',
          content: row.map(name => name.padEnd(20)).join(''),
          timestamp,
          user: 'claudia'
        });
      }
    }
    
    return { success: true, lines };
  }
};

// cd command for navigation
export const cdCommand: Command = {
  name: 'cd',
  description: 'Change current working directory',
  usage: '/cd [directory]',
  aliases: [],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const targetDir = args[0] || '/home/claudia';
    
    let normalizedPath: string;
    
    if (targetDir === '~') {
      normalizedPath = '/home/claudia';
    } else {
      normalizedPath = normalizePath(targetDir);
    }
    
    // Check if directory exists
    if (!fileSystem[normalizedPath]) {
      return {
        success: false,
        lines: [{
          id: `cd-error-${timestamp}`,
          type: 'error',
          content: `cd: no such file or directory: ${targetDir}`,
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    setCurrentDirectory(normalizedPath);
    
    return {
      success: true,
      lines: [{
        id: `cd-success-${timestamp}`,
        type: 'output',
        content: `Changed directory to: ${normalizedPath}`,
        timestamp,
        user: 'claudia'
      }]
    };
  }
};

// pwd command that uses current directory state
export const pwdEnhancedCommand: Command = {
  name: 'pwd',
  description: 'Print current working directory',
  usage: '/pwd',
  aliases: [],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const currentDir = getCurrentDirectory();
    
    return {
      success: true,
      lines: [{
        id: `pwd-${timestamp}`,
        type: 'output',
        content: currentDir,
        timestamp,
        user: 'claudia'
      }]
    };
  }
};

// cat command to view file contents
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
          content: 'cat: missing file operand',
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    const filename = args[0];
    const currentDir = getCurrentDirectory();
    const normalizedPath = normalizePath(filename, currentDir);
    
    // Find the file in the current directory or specified path
    const dirPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/')) || '/';
    const fileName = normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1);
    
    const items = fileSystem[dirPath];
    const file = items?.find(item => item.name === fileName && item.type === 'file');
    
    if (!file) {
      return {
        success: false,
        lines: [{
          id: `cat-error-${timestamp}`,
          type: 'error',
          content: `cat: ${filename}: No such file or directory`,
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    const content = file.content || `[Binary file or file content not available for ${filename}]`;
    const contentLines = content.split('\\n');
    
    const lines: TerminalLine[] = contentLines.map((line, index) => ({
      id: `cat-line-${index}-${timestamp}`,
      type: 'output',
      content: line,
      timestamp,
      user: 'claudia'
    }));
    
    return { success: true, lines };
  }
};

// Export the file system for use by other commands
export { fileSystem, getCurrentDirectory, setCurrentDirectory, normalizePath };