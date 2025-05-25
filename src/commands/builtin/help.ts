import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

export const helpCommand: Command = {
  name: 'help',
  description: 'Show available commands and usage information',
  usage: '/help [command]',
  aliases: ['h', '?'],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    
    if (args.length > 0) {
      // Specific command help not implemented yet - show general help
      const commandName = args[0].toLowerCase();
      lines.push({
        id: `help-${Date.now()}`,
        type: 'output',
        content: `Specific command help for "/${commandName}" not implemented yet. Showing general help:`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-space`,
        type: 'output',
        content: '',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
    }
    
    // General help
    lines.push({
        id: `help-${Date.now()}-1`,
        type: 'output',
        content: '◈ CLAUDIA AI TERMINAL COMPANION',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-2`,
        type: 'output',
        content: '',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-3`,
        type: 'output',
        content: '▣ AVAILABLE COMMANDS:',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-4`,
        type: 'output',
        content: '/help, /h, /?        - Show this help message',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-5`,
        type: 'output',
        content: '/theme <name>        - Change terminal theme',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-6`,
        type: 'output',
        content: '/themes             - List available themes',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-7`,
        type: 'output',
        content: '/clear, /cls        - Clear terminal screen',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-8`,
        type: 'output',
        content: '/avatar <command>   - Control avatar appearance',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-9`,
        type: 'output',
        content: '/imagine <prompt>   - Generate avatar image',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-10`,
        type: 'output',
        content: '/ask <question>     - Ask AI a question',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-11`,
        type: 'output',
        content: '/providers           - Manage AI/image providers',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-12`,
        type: 'output',
        content: '/test               - Test API connections',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-13`,
        type: 'output',
        content: '/personality        - Manage AI personalities',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-14`,
        type: 'output',
        content: '',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-15`,
        type: 'output',
        content: '▶ Any message without / will be sent directly to me!',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-16`,
        type: 'output',
        content: 'Example: "Hello Claudia, how are you today?"',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-17`,
        type: 'output',
        content: '',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `help-${Date.now()}-18`,
        type: 'output',
        content: '☰ TIP: Use "/personality create" to customize my behavior!',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
    
    return {
      success: true,
      lines
    };
  }
};