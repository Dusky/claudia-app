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
    const timestamp = new Date().toISOString();
    
    if (args.length === 0) {
      lines.push({
        id: `theme-${timestamp}-1`,
        type: 'output',
        content: `Info: Current theme: ${context.currentTheme}`,
        timestamp, user: 'claudia'
      });
      
      lines.push({
        id: `theme-${timestamp}-2`,
        type: 'output',
        content: 'Info: Use /themes to see available themes.',
        timestamp, user: 'claudia'
      });
      
      return { success: true, lines };
    }
    
    const themeName = args[0].toLowerCase();
    const availableThemes = getAllThemes();
    const foundTheme = availableThemes.find(t => t.id === themeName);
    
    if (foundTheme) {
      context.setTheme(themeName);
      
      lines.push({
        id: `theme-${timestamp}`,
        type: 'output',
        content: `Info: Theme changed to: ${foundTheme.name} (${foundTheme.era})`, // Emoji removed
        timestamp, user: 'claudia'
      });
    } else {
      lines.push({
        id: `theme-${timestamp}-1`,
        type: 'error',
        content: `Error: Unknown theme: ${themeName}`, // Emoji removed
        timestamp, user: 'claudia'
      });
      
      lines.push({
        id: `theme-${timestamp}-2`,
        type: 'output',
        content: `Info: Available themes: ${availableThemes.map(t => t.id).join(', ')}`,
        timestamp, user: 'claudia'
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
    const timestamp = new Date().toISOString();
    const availableThemes = getAllThemes();
    
    lines.push({
      id: `themes-${timestamp}-1`,
      type: 'system',
      content: 'Themes: AVAILABLE THEMES:', // Emoji removed
      timestamp, user: 'claudia'
    });
    
    lines.push({
      id: `themes-${timestamp}-2`,
      type: 'output',
      content: '',
      timestamp, user: 'claudia'
    });
    
    availableThemes.forEach((theme, index) => {
      const isActive = theme.id === context.currentTheme;
      const prefix = isActive ? '-> ' : '   ';
      const suffix = isActive ? ' (current)' : '';
      const themeId = theme.id.padEnd(15);
      const themeName = theme.name.padEnd(20);
      
      lines.push({
        id: `themes-${timestamp}-${index + 3}`,
        type: 'output',
        content: `${prefix}${themeId} ${themeName} (${theme.era})${suffix}`,
        timestamp, user: 'claudia'
      });
    });
    
    lines.push({
      id: `themes-${timestamp}-${availableThemes.length + 3}`,
      type: 'output',
      content: '',
      timestamp, user: 'claudia'
    });
    
    lines.push({
      id: `themes-${timestamp}-${availableThemes.length + 4}`,
      type: 'output',
      content: 'Info: Use /theme <name> to switch themes.',
      timestamp, user: 'claudia'
    });
    
    return { success: true, lines };
  }
};

export const clearCommand: Command = {
  name: 'clear',
  description: 'Clears the terminal, resets the chat context, and starts a new conversation session.',
  usage: '/clear',
  aliases: ['cls', 'c'],
  
  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    // The resetConversationAndTerminal action (to be added to the store and context)
    // will handle creating a new conversation, setting it active, and updating the terminal lines.
    await context.resetConversationAndTerminal(context.storage as any);

    // shouldContinue: false indicates to the caller (App.tsx) that the environment
    // has significantly changed, and normal follow-up processing might be skipped.
    // The command itself doesn't need to return lines, as the store action will update them.
    return { 
      success: true, 
      lines: [], 
      shouldContinue: false 
    };
  }
};
