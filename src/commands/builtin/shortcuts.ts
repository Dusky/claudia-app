import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

export const shortcutsCommand: Command = {
  name: 'shortcuts',
  description: 'Show available keyboard shortcuts',
  usage: '/shortcuts',
  aliases: ['keys', 'hotkeys'],
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    
    const shortcutLines: TerminalLine[] = [
      {
        id: `shortcuts-header-${timestamp}`,
        type: 'output',
        content: '⌨️  Keyboard Shortcuts:',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-divider-${timestamp}`,
        type: 'output',
        content: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-1-${timestamp}`,
        type: 'output',
        content: 'Ctrl/Cmd + L / K    →  Clear terminal',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-2-${timestamp}`,
        type: 'output',
        content: 'Ctrl/Cmd + R        →  Repeat last command',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-3-${timestamp}`,
        type: 'output',
        content: 'Ctrl/Cmd + /        →  Show help modal',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-4-${timestamp}`,
        type: 'output',
        content: 'Ctrl/Cmd + T        →  Switch to Claudia theme',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-5-${timestamp}`,
        type: 'output',
        content: 'Ctrl/Cmd + Shift+T  →  Show all themes',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-6-${timestamp}`,
        type: 'output',
        content: 'Ctrl/Cmd + Shift+N  →  New conversation',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-7-${timestamp}`,
        type: 'output',
        content: 'Ctrl/Cmd + I        →  Image generation',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-8-${timestamp}`,
        type: 'output',
        content: 'Ctrl/Cmd + A        →  Avatar control',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-9-${timestamp}`,
        type: 'output',
        content: 'Ctrl/Cmd + O        →  App settings',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-10-${timestamp}`,
        type: 'output',
        content: 'Ctrl/Cmd + P        →  Personality editor',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-11-${timestamp}`,
        type: 'output',
        content: 'Ctrl/Cmd + ,        →  Configuration',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-12-${timestamp}`,
        type: 'output',
        content: 'Ctrl/Cmd + D        →  Debug mode',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-nav-${timestamp}`,
        type: 'output',
        content: '↑ / ↓               →  Command history',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-tab-${timestamp}`,
        type: 'output',
        content: 'Tab                 →  Command completion',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-footer-${timestamp}`,
        type: 'output',
        content: '',
        timestamp,
        user: 'claudia'
      },
      {
        id: `shortcuts-tip-${timestamp}`,
        type: 'system',
        content: '💡 Tip: Use /help for command documentation',
        timestamp,
        user: 'claudia'
      }
    ];
    
    return { 
      success: true, 
      lines: shortcutLines
    };
  }
};