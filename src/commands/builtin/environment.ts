import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

// Environment variable management for ClaudiaOS
interface EnvironmentVariable {
  name: string;
  value: string;
  exported: boolean;
  readonly: boolean;
}

// Default ClaudiaOS environment variables
const defaultEnvironment: Record<string, EnvironmentVariable> = {
  'PATH': {
    name: 'PATH',
    value: '/system/bin:/system/core:/usr/bin:/bin:/home/claudia/.local/bin',
    exported: true,
    readonly: false
  },
  'HOME': {
    name: 'HOME',
    value: '/home/claudia',
    exported: true,
    readonly: true
  },
  'USER': {
    name: 'USER',
    value: 'claudia',
    exported: true,
    readonly: true
  },
  'SHELL': {
    name: 'SHELL',
    value: '/system/shell/claudia-shell',
    exported: true,
    readonly: true
  },
  'TERM': {
    name: 'TERM',
    value: 'claudia-256color',
    exported: true,
    readonly: false
  },
  'LANG': {
    name: 'LANG',
    value: 'en_US.UTF-8',
    exported: true,
    readonly: false
  },
  'PWD': {
    name: 'PWD',
    value: '/home/claudia',
    exported: true,
    readonly: false
  },
  'CLAUDIA_VERSION': {
    name: 'CLAUDIA_VERSION',
    value: '2.1.7',
    exported: true,
    readonly: true
  },
  'CLAUDIA_BUILD': {
    name: 'CLAUDIA_BUILD',
    value: '20240115-1000',
    exported: true,
    readonly: true
  },
  'CLAUDIA_THEME': {
    name: 'CLAUDIA_THEME',
    value: 'mainframe70s',
    exported: true,
    readonly: false
  },
  'CLAUDIA_DEBUG': {
    name: 'CLAUDIA_DEBUG',
    value: 'false',
    exported: true,
    readonly: false
  },
  'CLAUDIA_AI_PROVIDER': {
    name: 'CLAUDIA_AI_PROVIDER',
    value: 'anthropic',
    exported: true,
    readonly: false
  },
  'CLAUDIA_IMAGE_PROVIDER': {
    name: 'CLAUDIA_IMAGE_PROVIDER',
    value: 'replicate',
    exported: true,
    readonly: false
  },
  'TZ': {
    name: 'TZ',
    value: 'UTC',
    exported: true,
    readonly: false
  }
};

// Get environment variables from session storage or defaults
const getEnvironment = (): Record<string, EnvironmentVariable> => {
  const stored = sessionStorage.getItem('claudiaos-environment');
  if (stored) {
    try {
      return { ...defaultEnvironment, ...JSON.parse(stored) };
    } catch (e) {
      console.warn('Failed to parse stored environment, using defaults');
    }
  }
  return { ...defaultEnvironment };
};

// Save environment variables to session storage
const saveEnvironment = (env: Record<string, EnvironmentVariable>): void => {
  const filtered = Object.fromEntries(
    Object.entries(env).filter(([_, variable]) => !variable.readonly)
  );
  sessionStorage.setItem('claudiaos-environment', JSON.stringify(filtered));
};

// Update PWD when directory changes
const updatePWD = (newPath: string): void => {
  const env = getEnvironment();
  env.PWD = { ...env.PWD, value: newPath };
  saveEnvironment(env);
};

// env command - display environment variables
export const envCommand: Command = {
  name: 'env',
  description: 'Display environment variables',
  usage: '/env [variable]',
  aliases: [],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const environment = getEnvironment();
    
    if (args.length > 0) {
      // Show specific variable
      const varName = args[0].toUpperCase();
      const variable = environment[varName];
      
      if (!variable) {
        return {
          success: false,
          lines: [{
            id: `env-notfound-${timestamp}`,
            type: 'error',
            content: `env: ${varName}: No such variable`,
            timestamp,
            user: 'claudia'
          }]
        };
      }
      
      return {
        success: true,
        lines: [{
          id: `env-single-${timestamp}`,
          type: 'output',
          content: `${variable.name}=${variable.value}`,
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    // Show all exported variables
    const exportedVars = Object.values(environment)
      .filter(v => v.exported)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    const lines: TerminalLine[] = exportedVars.map((variable, index) => ({
      id: `env-${index}-${timestamp}`,
      type: 'output',
      content: `${variable.name}=${variable.value}`,
      timestamp,
      user: 'claudia'
    }));
    
    return { success: true, lines };
  }
};

// export command - export environment variables
export const exportCommand: Command = {
  name: 'export',
  description: 'Export environment variables',
  usage: '/export [VAR=value] or /export VAR',
  aliases: [],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const environment = getEnvironment();
    
    if (args.length === 0) {
      // Show all exported variables with declare -x format
      const exportedVars = Object.values(environment)
        .filter(v => v.exported)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      const lines: TerminalLine[] = exportedVars.map((variable, index) => ({
        id: `export-list-${index}-${timestamp}`,
        type: 'output',
        content: `declare -x ${variable.name}="${variable.value}"`,
        timestamp,
        user: 'claudia'
      }));
      
      return { success: true, lines };
    }
    
    const arg = args.join(' ');
    
    if (arg.includes('=')) {
      // Set and export variable: export VAR=value
      const [name, ...valueParts] = arg.split('=');
      const value = valueParts.join('=');
      const varName = name.toUpperCase();
      
      if (environment[varName]?.readonly) {
        return {
          success: false,
          lines: [{
            id: `export-readonly-${timestamp}`,
            type: 'error',
            content: `export: ${varName}: readonly variable`,
            timestamp,
            user: 'claudia'
          }]
        };
      }
      
      environment[varName] = {
        name: varName,
        value: value,
        exported: true,
        readonly: false
      };
      
      saveEnvironment(environment);
      
      return {
        success: true,
        lines: [{
          id: `export-set-${timestamp}`,
          type: 'output',
          content: `Export: ${varName}=${value}`,
          timestamp,
          user: 'claudia'
        }]
      };
    } else {
      // Export existing variable: export VAR
      const varName = arg.toUpperCase();
      
      if (!environment[varName]) {
        environment[varName] = {
          name: varName,
          value: '',
          exported: true,
          readonly: false
        };
      } else {
        environment[varName].exported = true;
      }
      
      saveEnvironment(environment);
      
      return {
        success: true,
        lines: [{
          id: `export-var-${timestamp}`,
          type: 'output',
          content: `Exported: ${varName}`,
          timestamp,
          user: 'claudia'
        }]
      };
    }
  }
};

// unset command - remove environment variables
export const unsetCommand: Command = {
  name: 'unset',
  description: 'Remove environment variables',
  usage: '/unset <variable>',
  aliases: [],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    
    if (args.length === 0) {
      return {
        success: false,
        lines: [{
          id: `unset-missing-${timestamp}`,
          type: 'error',
          content: 'unset: not enough arguments',
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    const environment = getEnvironment();
    const varName = args[0].toUpperCase();
    
    if (!environment[varName]) {
      return {
        success: true,
        lines: [{
          id: `unset-notfound-${timestamp}`,
          type: 'output',
          content: `unset: ${varName}: not found`,
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    if (environment[varName].readonly) {
      return {
        success: false,
        lines: [{
          id: `unset-readonly-${timestamp}`,
          type: 'error',
          content: `unset: ${varName}: cannot unset readonly variable`,
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    delete environment[varName];
    saveEnvironment(environment);
    
    return {
      success: true,
      lines: [{
        id: `unset-success-${timestamp}`,
        type: 'output',
        content: `Unset: ${varName}`,
        timestamp,
        user: 'claudia'
      }]
    };
  }
};

// set command - set shell options and variables
export const setCommand: Command = {
  name: 'set',
  description: 'Set shell options and variables',
  usage: '/set [VAR=value] or /set [option]',
  aliases: [],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const environment = getEnvironment();
    
    if (args.length === 0) {
      // Show all variables (exported and non-exported)
      const allVars = Object.values(environment)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      const lines: TerminalLine[] = allVars.map((variable, index) => ({
        id: `set-list-${index}-${timestamp}`,
        type: 'output',
        content: `${variable.name}=${variable.value}`,
        timestamp,
        user: 'claudia'
      }));
      
      return { success: true, lines };
    }
    
    const arg = args.join(' ');
    
    if (arg.includes('=')) {
      // Set variable: set VAR=value
      const [name, ...valueParts] = arg.split('=');
      const value = valueParts.join('=');
      const varName = name.toUpperCase();
      
      if (environment[varName]?.readonly) {
        return {
          success: false,
          lines: [{
            id: `set-readonly-${timestamp}`,
            type: 'error',
            content: `set: ${varName}: readonly variable`,
            timestamp,
            user: 'claudia'
          }]
        };
      }
      
      environment[varName] = {
        name: varName,
        value: value,
        exported: environment[varName]?.exported || false,
        readonly: false
      };
      
      saveEnvironment(environment);
      
      return {
        success: true,
        lines: [{
          id: `set-var-${timestamp}`,
          type: 'output',
          content: `Set: ${varName}=${value}`,
          timestamp,
          user: 'claudia'
        }]
      };
    } else {
      // Shell options (simulated)
      const option = arg;
      const supportedOptions = ['+x', '-x', '+e', '-e', '+v', '-v'];
      
      if (supportedOptions.includes(option)) {
        return {
          success: true,
          lines: [{
            id: `set-option-${timestamp}`,
            type: 'output',
            content: `Shell option: ${option}`,
            timestamp,
            user: 'claudia'
          }]
        };
      } else {
        return {
          success: false,
          lines: [{
            id: `set-invalid-${timestamp}`,
            type: 'error',
            content: `set: ${option}: invalid option`,
            timestamp,
            user: 'claudia'
          }]
        };
      }
    }
  }
};

// echo command with variable expansion
export const echoCommand: Command = {
  name: 'echo',
  description: 'Display text with variable expansion',
  usage: '/echo [text] [$VAR]',
  aliases: [],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const environment = getEnvironment();
    
    if (args.length === 0) {
      return {
        success: true,
        lines: [{
          id: `echo-empty-${timestamp}`,
          type: 'output',
          content: '',
          timestamp,
          user: 'claudia'
        }]
      };
    }
    
    // Join all arguments and expand variables
    let text = args.join(' ');
    
    // Expand $VAR and ${VAR} patterns
    text = text.replace(/\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/g, (_, braced, simple) => {
      const varName = (braced || simple).toUpperCase();
      const variable = environment[varName];
      return variable ? variable.value : '';
    });
    
    return {
      success: true,
      lines: [{
        id: `echo-${timestamp}`,
        type: 'output',
        content: text,
        timestamp,
        user: 'claudia'
      }]
    };
  }
};

// alias command - command aliases
export const aliasCommand: Command = {
  name: 'alias',
  description: 'Create and display command aliases',
  usage: '/alias [name=command] or /alias [name]',
  aliases: [],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    
    // Get aliases from session storage
    const getAliases = (): Record<string, string> => {
      const stored = sessionStorage.getItem('claudiaos-aliases');
      return stored ? JSON.parse(stored) : {
        'll': 'ls -l',
        'la': 'ls -la',
        'cls': 'clear',
        'dir': 'ls',
        'md': 'mkdir',
        'rd': 'rmdir'
      };
    };
    
    const saveAliases = (aliases: Record<string, string>): void => {
      sessionStorage.setItem('claudiaos-aliases', JSON.stringify(aliases));
    };
    
    const aliases = getAliases();
    
    if (args.length === 0) {
      // Show all aliases
      const lines: TerminalLine[] = Object.entries(aliases)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, command], index) => ({
          id: `alias-${index}-${timestamp}`,
          type: 'output',
          content: `alias ${name}='${command}'`,
          timestamp,
          user: 'claudia'
        }));
      
      return { success: true, lines };
    }
    
    const arg = args.join(' ');
    
    if (arg.includes('=')) {
      // Create alias: alias name=command
      const [name, ...commandParts] = arg.split('=');
      const command = commandParts.join('=');
      
      aliases[name.trim()] = command.trim();
      saveAliases(aliases);
      
      return {
        success: true,
        lines: [{
          id: `alias-set-${timestamp}`,
          type: 'output',
          content: `alias ${name}='${command}'`,
          timestamp,
          user: 'claudia'
        }]
      };
    } else {
      // Show specific alias
      const name = arg.trim();
      const command = aliases[name];
      
      if (!command) {
        return {
          success: false,
          lines: [{
            id: `alias-notfound-${timestamp}`,
            type: 'error',
            content: `alias: ${name}: not found`,
            timestamp,
            user: 'claudia'
          }]
        };
      }
      
      return {
        success: true,
        lines: [{
          id: `alias-show-${timestamp}`,
          type: 'output',
          content: `alias ${name}='${command}'`,
          timestamp,
          user: 'claudia'
        }]
      };
    }
  }
};

// Export environment utilities
export { getEnvironment, saveEnvironment, updatePWD };