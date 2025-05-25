import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

export const debugCommand: Command = {
  name: 'debug',
  description: 'Debug utilities for development',
  usage: '/debug [action]',
  aliases: ['dbg'],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();
    
    if (args.length === 0 || args[0] === 'help') {
      lines.push({
        id: `debug-${timestamp}-help`, type: 'output',
        content: 'Debug commands available:', timestamp, user: 'claudia'
      });
      lines.push({
        id: `debug-${timestamp}-help-1`, type: 'output',
        content: '  /debug clear-storage - Clear localStorage (will trigger boot sequence)', timestamp, user: 'claudia'
      });
      lines.push({
        id: `debug-${timestamp}-help-2`, type: 'output',
        content: '  /debug show-storage - Show localStorage contents', timestamp, user: 'claudia'
      });
      lines.push({
        id: `debug-${timestamp}-help-3`, type: 'output',
        content: '  /debug test-boot - Force trigger boot sequence test', timestamp, user: 'claudia'
      });
      return { success: true, lines };
    }
    
    const action = args[0].toLowerCase();
    
    if (action === 'clear-storage') {
      localStorage.clear();
      lines.push({
        id: `debug-${timestamp}-clear`, type: 'system',
        content: 'Debug: localStorage cleared. Refresh the page to trigger boot sequence.', timestamp, user: 'claudia'
      });
      return { success: true, lines };
    }
    
    if (action === 'show-storage') {
      lines.push({
        id: `debug-${timestamp}-storage-header`, type: 'output',
        content: 'Debug: localStorage contents:', timestamp, user: 'claudia'
      });
      
      const claudiaConfig = localStorage.getItem('claudia-config');
      const lastActiveId = localStorage.getItem('lastActiveConversationId');
      
      lines.push({
        id: `debug-${timestamp}-config`, type: 'output',
        content: `  claudia-config: ${claudiaConfig || 'null'}`, timestamp, user: 'claudia'
      });
      lines.push({
        id: `debug-${timestamp}-lastid`, type: 'output',
        content: `  lastActiveConversationId: ${lastActiveId || 'null'}`, timestamp, user: 'claudia'
      });
      
      // Show all localStorage keys
      const allKeys = Object.keys(localStorage);
      if (allKeys.length > 0) {
        lines.push({
          id: `debug-${timestamp}-all-keys`, type: 'output',
          content: `  All keys: ${allKeys.join(', ')}`, timestamp, user: 'claudia'
        });
      }
      
      return { success: true, lines };
    }
    
    if (action === 'test-boot') {
      lines.push({
        id: `debug-${timestamp}-boot-info`, type: 'output',
        content: 'Debug: Boot sequence test - checking current config...', timestamp, user: 'claudia'
      });
      
      const savedConfig = localStorage.getItem('claudia-config');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          lines.push({
            id: `debug-${timestamp}-boot-config`, type: 'output',
            content: `  enhancedBoot: ${config.enhancedBoot}`, timestamp, user: 'claudia'
          });
        } catch (error) {
          lines.push({
            id: `debug-${timestamp}-boot-error`, type: 'error',
            content: `  Error parsing config: ${error}`, timestamp, user: 'claudia'
          });
        }
      } else {
        lines.push({
          id: `debug-${timestamp}-boot-default`, type: 'output',
          content: '  No saved config - using default (enhancedBoot: true)', timestamp, user: 'claudia'
        });
      }
      
      lines.push({
        id: `debug-${timestamp}-boot-refresh`, type: 'system',
        content: 'Debug: Clear storage and refresh page to test boot sequence', timestamp, user: 'claudia'
      });
      
      return { success: true, lines };
    }
    
    lines.push({
      id: `debug-${timestamp}-unknown`, type: 'error',
      content: `Debug: Unknown action '${action}'. Use /debug help to see available actions.`, timestamp, user: 'claudia'
    });
    return { success: false, lines };
  }
};