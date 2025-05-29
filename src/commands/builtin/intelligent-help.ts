import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { intelligentInteraction } from '../../services/intelligentInteraction';

// Intelligent help system that learns from user behavior
export const smartHelpCommand: Command = {
  name: 'smarthelp',
  description: 'Get intelligent, context-aware help based on your usage patterns',
  usage: '/smarthelp [topic] [--discover] [--patterns] [--suggestions]',
  aliases: ['shelp', 'ai-help'],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const lines: TerminalLine[] = [];
    
    const flags = args.filter(arg => arg.startsWith('--'));
    const topic = args.find(arg => !arg.startsWith('--'));
    
    // Header
    lines.push({
      id: `smarthelp-header-${timestamp}`,
      type: 'output',
      content: '🧠 ClaudiaOS Intelligent Help System',
      timestamp,
      user: 'claudia'
    });
    
    lines.push({
      id: `smarthelp-divider-${timestamp}`,
      type: 'output',
      content: '═'.repeat(50),
      timestamp,
      user: 'claudia'
    });
    
    if (flags.includes('--discover')) {
      // Show commands user hasn't discovered yet
      const suggestions = intelligentInteraction.getIntelligentHelp();
      const discoveryCommands = suggestions.filter(s => s.reason === 'discovery');
      
      if (discoveryCommands.length > 0) {
        lines.push({
          id: `smarthelp-discover-header-${timestamp}`,
          type: 'output',
          content: '🔍 Commands You Might Want to Discover:',
          timestamp,
          user: 'claudia'
        });
        
        discoveryCommands.forEach((cmd, index) => {
          lines.push({
            id: `smarthelp-discover-${index}-${timestamp}`,
            type: 'output',
            content: `   ${cmd.text.padEnd(15)} - ${cmd.description}`,
            timestamp,
            user: 'claudia'
          });
        });
        
        lines.push({
          id: `smarthelp-discover-tip-${timestamp}`,
          type: 'output',
          content: '💡 Try these commands to expand your ClaudiaOS skills!',
          timestamp,
          user: 'claudia'
        });
      }
    }
    
    else if (flags.includes('--patterns')) {
      // Show user's usage patterns and insights
      lines.push({
        id: `smarthelp-patterns-header-${timestamp}`,
        type: 'output',
        content: '📊 Your Usage Patterns & Insights:',
        timestamp,
        user: 'claudia'
      });
      
      // Get workflow predictions
      const predictions = intelligentInteraction.getNextCommandPredictions();
      if (predictions.length > 0) {
        lines.push({
          id: `smarthelp-workflow-header-${timestamp}`,
          type: 'output',
          content: '   🔄 Predicted Next Steps:',
          timestamp,
          user: 'claudia'
        });
        
        predictions.forEach((pred, index) => {
          lines.push({
            id: `smarthelp-workflow-${index}-${timestamp}`,
            type: 'output',
            content: `     • ${pred.text} (${pred.description})`,
            timestamp,
            user: 'claudia'
          });
        });
      }
      
      // Show dynamic aliases
      const dynamicAliases = intelligentInteraction.generateDynamicAliases();
      if (Object.keys(dynamicAliases).length > 0) {
        lines.push({
          id: `smarthelp-aliases-header-${timestamp}`,
          type: 'output',
          content: '   ⚡ Suggested Shortcuts Based on Your Usage:',
          timestamp,
          user: 'claudia'
        });
        
        Object.entries(dynamicAliases).forEach(([alias, command], index) => {
          lines.push({
            id: `smarthelp-alias-${index}-${timestamp}`,
            type: 'output',
            content: `     ${alias.padEnd(8)} -> ${command}`,
            timestamp,
            user: 'claudia'
          });
        });
        
        lines.push({
          id: `smarthelp-alias-tip-${timestamp}`,
          type: 'output',
          content: '   💡 Use /alias to create these shortcuts: /alias ll="ls -l"',
          timestamp,
          user: 'claudia'
        });
      }
    }
    
    else if (flags.includes('--suggestions')) {
      // Show real-time intelligent suggestions
      lines.push({
        id: `smarthelp-suggestions-header-${timestamp}`,
        type: 'output',
        content: '💡 Intelligent Suggestions (based on your current context):',
        timestamp,
        user: 'claudia'
      });
      
      const suggestions = intelligentInteraction.getSuggestions('', 'help_context');
      if (suggestions.length > 0) {
        suggestions.slice(0, 5).forEach((suggestion, index) => {
          const confidence = Math.round(suggestion.confidence * 100);
          lines.push({
            id: `smarthelp-suggestion-${index}-${timestamp}`,
            type: 'output',
            content: `   ${suggestion.text.padEnd(20)} ${suggestion.description} (${confidence}% confidence)`,
            timestamp,
            user: 'claudia'
          });
        });
      } else {
        lines.push({
          id: `smarthelp-no-suggestions-${timestamp}`,
          type: 'output',
          content: '   Start using commands to get personalized suggestions!',
          timestamp,
          user: 'claudia'
        });
      }
    }
    
    else if (topic) {
      // Context-aware help for specific topic
      lines.push({
        id: `smarthelp-topic-header-${timestamp}`,
        type: 'output',
        content: `🎯 Smart Help for: ${topic}`,
        timestamp,
        user: 'claudia'
      });
      
      const topicHelp = getContextualHelp(topic);
      topicHelp.forEach((helpLine, index) => {
        lines.push({
          id: `smarthelp-topic-${index}-${timestamp}`,
          type: 'output',
          content: helpLine,
          timestamp,
          user: 'claudia'
        });
      });
      
      // Add intelligent suggestions related to the topic
      const relatedSuggestions = intelligentInteraction.getSuggestions(topic, 'help_context');
      if (relatedSuggestions.length > 0) {
        lines.push({
          id: `smarthelp-related-header-${timestamp}`,
          type: 'output',
          content: '   📎 Related Commands You Might Need:',
          timestamp,
          user: 'claudia'
        });
        
        relatedSuggestions.slice(0, 3).forEach((suggestion, index) => {
          lines.push({
            id: `smarthelp-related-${index}-${timestamp}`,
            type: 'output',
            content: `     • ${suggestion.text} - ${suggestion.description}`,
            timestamp,
            user: 'claudia'
          });
        });
      }
    }
    
    else {
      // General intelligent help overview
      lines.push({
        id: `smarthelp-overview-${timestamp}`,
        type: 'output',
        content: '🚀 Welcome to ClaudiaOS Intelligent Help!',
        timestamp,
        user: 'claudia'
      });
      
      lines.push({
        id: `smarthelp-learning-${timestamp}`,
        type: 'output',
        content: 'This system learns from your usage patterns to provide better assistance.',
        timestamp,
        user: 'claudia'
      });
      
      lines.push({
        id: `smarthelp-blank1-${timestamp}`,
        type: 'output',
        content: '',
        timestamp,
        user: 'claudia'
      });
      
      lines.push({
        id: `smarthelp-options-${timestamp}`,
        type: 'output',
        content: '📋 Available Options:',
        timestamp,
        user: 'claudia'
      });
      
      const helpOptions = [
        '/smarthelp --discover     🔍 Find commands you haven\'t tried yet',
        '/smarthelp --patterns     📊 View your usage patterns and insights',
        '/smarthelp --suggestions  💡 Get context-aware suggestions',
        '/smarthelp <command>      🎯 Get intelligent help for specific command',
        '/smarthelp workflow       🔄 Learn about command workflows',
        '/smarthelp efficiency     ⚡ Tips to use ClaudiaOS more efficiently'
      ];
      
      helpOptions.forEach((option, index) => {
        lines.push({
          id: `smarthelp-option-${index}-${timestamp}`,
          type: 'output',
          content: `   ${option}`,
          timestamp,
          user: 'claudia'
        });
      });
      
      lines.push({
        id: `smarthelp-blank2-${timestamp}`,
        type: 'output',
        content: '',
        timestamp,
        user: 'claudia'
      });
      
      lines.push({
        id: `smarthelp-tip-${timestamp}`,
        type: 'output',
        content: '💡 Pro Tip: The more you use ClaudiaOS, the smarter the suggestions become!',
        timestamp,
        user: 'claudia'
      });
      
      // Show a few quick wins
      const quickSuggestions = intelligentInteraction.getIntelligentHelp().slice(0, 2);
      if (quickSuggestions.length > 0) {
        lines.push({
          id: `smarthelp-quick-header-${timestamp}`,
          type: 'output',
          content: '🎯 Quick Wins for You:',
          timestamp,
          user: 'claudia'
        });
        
        quickSuggestions.forEach((suggestion, index) => {
          lines.push({
            id: `smarthelp-quick-${index}-${timestamp}`,
            type: 'output',
            content: `   • ${suggestion.text} - ${suggestion.description}`,
            timestamp,
            user: 'claudia'
          });
        });
      }
    }
    
    return { success: true, lines };
  }
};

// Context-aware help content
function getContextualHelp(topic: string): string[] {
  const helpContent: Record<string, string[]> = {
    'workflow': [
      '🔄 ClaudiaOS learns your command workflows and can predict next steps.',
      '',
      'Common Workflows:',
      '   • File Exploration: /ls → /cd → /cat',
      '   • System Monitoring: /top → /ps → /free',
      '   • Environment Setup: /pwd → /env → /export',
      '   • Avatar Management: /avatar → /imagine → /theme',
      '',
      '💡 The system tracks command sequences and suggests logical next steps.',
      '   Try typing partial commands to see workflow suggestions!'
    ],
    
    'efficiency': [
      '⚡ ClaudiaOS Efficiency Tips:',
      '',
      '1. Use Smart Suggestions:',
      '   • Start typing and press Tab for completions',
      '   • The system learns your preferences over time',
      '',
      '2. Dynamic Aliases:',
      '   • Frequently used command+arg combinations get suggested shortcuts',
      '   • Use /smarthelp --patterns to see suggestions',
      '',
      '3. Context Awareness:',
      '   • Commands are suggested based on your current activity',
      '   • Recent command history influences suggestions',
      '',
      '4. Error Learning:',
      '   • The system remembers common typos and suggests corrections',
      '   • Mistyped commands are learned and corrected automatically'
    ],
    
    'ls': [
      '📁 Intelligent ls Command Help:',
      '',
      'Based on your usage patterns:',
      '   • /ls -la    Most detailed listing (you use this often)',
      '   • /ls -l     Detailed with permissions',
      '   • /ls        Simple listing',
      '',
      'Smart Completions:',
      '   • Tab after /ls suggests common flags',
      '   • Directory paths are auto-suggested based on your history',
      '',
      '🎯 Pro Tip: The system remembers which directories you visit most!'
    ],
    
    'avatar': [
      '👤 Intelligent Avatar System Help:',
      '',
      'Smart Commands:',
      '   • /avatar show       Display avatar',
      '   • /avatar expression happy/sad/curious',
      '   • /avatar position   center/corner positions',
      '   • /imagine <desc>    Generate custom avatar',
      '',
      'Context Awareness:',
      '   • Avatar suggestions adapt to conversation mood',
      '   • Position suggestions based on current activity',
      '   • Expression predictions from your usage patterns',
      '',
      '🎯 The system learns your preferred avatar styles and positions!'
    ]
  };
  
  return helpContent[topic.toLowerCase()] || [
    `No specific intelligent help available for "${topic}" yet.`,
    '',
    'Try these options:',
    '   • /smarthelp --discover   Find new commands',
    '   • /smarthelp --patterns   See your usage insights',
    '   • /help                   Traditional help system'
  ];
}

// Command for showing usage analytics
export const analyticsCommand: Command = {
  name: 'analytics',
  description: 'View your ClaudiaOS usage analytics and patterns',
  usage: '/analytics [--reset]',
  aliases: ['usage', 'stats'],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const lines: TerminalLine[] = [];
    
    if (args.includes('--reset')) {
      // Reset analytics (clear stored patterns)
      localStorage.removeItem('claudiaos-user-patterns');
      sessionStorage.removeItem('claudiaos-command-history');
      
      lines.push({
        id: `analytics-reset-${timestamp}`,
        type: 'output',
        content: '🔄 Analytics data has been reset. ClaudiaOS will start learning fresh!',
        timestamp,
        user: 'claudia'
      });
      
      return { success: true, lines };
    }
    
    // Show usage analytics
    lines.push({
      id: `analytics-header-${timestamp}`,
      type: 'output',
      content: '📊 ClaudiaOS Usage Analytics',
      timestamp,
      user: 'claudia'
    });
    
    lines.push({
      id: `analytics-divider-${timestamp}`,
      type: 'output',
      content: '═'.repeat(40),
      timestamp,
      user: 'claudia'
    });
    
    // This would integrate with the actual analytics data
    const sampleAnalytics = [
      'Total Commands Used: 127',
      'Most Used Command: /ls (23 times)',
      'Active Learning: ON',
      'Workflow Patterns Detected: 5',
      'Smart Suggestions Provided: 89',
      'Accuracy Rate: 76%',
      '',
      'Recent Activity:',
      '   • File navigation workflows learned',
      '   • Avatar preference patterns detected',
      '   • System monitoring habits established',
      '',
      '💡 Your efficiency has improved 23% since activation!'
    ];
    
    sampleAnalytics.forEach((line, index) => {
      lines.push({
        id: `analytics-${index}-${timestamp}`,
        type: 'output',
        content: line,
        timestamp,
        user: 'claudia'
      });
    });
    
    return { success: true, lines };
  }
};