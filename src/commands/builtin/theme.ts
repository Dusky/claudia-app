import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { getAllThemes } from '../../terminal/themes';

export const themeCommand: Command = {
  name: 'theme',
  description: 'Change the terminal theme',
  usage: '/theme <theme-name>',
  aliases: ['t'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    
    if (args.length === 0) {
      lines.push({
        id: `theme-${Date.now()}-1`,
        type: 'output',
        content: `Current theme: ${context.currentTheme}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `theme-${Date.now()}-2`,
        type: 'output',
        content: 'Use /themes to see available themes.',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      return { success: true, lines };
    }
    
    const themeName = args[0].toLowerCase();
    const availableThemes = getAllThemes();
    const foundTheme = availableThemes.find(t => t.id === themeName);
    
    if (foundTheme) {
      context.setTheme(themeName);
      
      lines.push({
        id: `theme-${Date.now()}`,
        type: 'output',
        content: `✨ Theme changed to: ${foundTheme.name} (${foundTheme.era})`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
    } else {
      lines.push({
        id: `theme-${Date.now()}-1`,
        type: 'error',
        content: `❌ Unknown theme: ${themeName}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `theme-${Date.now()}-2`,
        type: 'output',
        content: `Available themes: ${availableThemes.map(t => t.id).join(', ')}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
    }
    
    return { success: true, lines };
  }
};

export const themesCommand: Command = {
  name: 'themes',
  description: 'List all available themes',
  usage: '/themes',
  
  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const availableThemes = getAllThemes();
    
    lines.push({
      id: `themes-${Date.now()}-1`,
      type: 'output',
      content: '🎨 AVAILABLE THEMES:',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    
    lines.push({
      id: `themes-${Date.now()}-2`,
      type: 'output',
      content: '',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    
    availableThemes.forEach((theme, index) => {
      const isActive = theme.id === context.currentTheme;
      const prefix = isActive ? '→ ' : '  ';
      const suffix = isActive ? ' (current)' : '';
      
      lines.push({
        id: `themes-${Date.now()}-${index + 3}`,
        type: 'output',
        content: `${prefix}${theme.id.padEnd(12)} - ${theme.name} (${theme.era})${suffix}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
    });
    
    lines.push({
      id: `themes-${Date.now()}-${availableThemes.length + 3}`,
      type: 'output',
      content: '',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    
    lines.push({
      id: `themes-${Date.now()}-${availableThemes.length + 4}`,
      type: 'output',
      content: 'Use /theme <name> to switch themes.',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    
    return { success: true, lines };
  }
};

export const clearCommand: Command = {
  name: 'clear',
  description: 'Clear the terminal screen',
  usage: '/clear',
  aliases: ['cls', 'c'],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    // Clear is handled specially by returning an empty lines array
    // and setting a special flag
    return { 
      success: true, 
      lines: [],
      shouldContinue: false // This tells the terminal to clear
    };
  }
};