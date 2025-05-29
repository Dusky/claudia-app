// Intelligent Interaction Layer for ClaudiaOS Phase 4
// Provides context-aware suggestions, smart autocomplete, and learning capabilities

interface CommandUsage {
  command: string;
  args: string[];
  timestamp: Date;
  success: boolean;
  context: string; // What the user was doing before
}

interface UserPattern {
  commandSequences: string[][]; // Common command sequences
  frequentCommands: Record<string, number>; // Command frequency
  timePatterns: Record<string, number[]>; // Commands by hour of day
  errorPatterns: string[]; // Common mistakes
  workflowPatterns: Record<string, string[]>; // Task -> typical commands
}

export interface Suggestion {
  type: 'command' | 'argument' | 'workflow' | 'correction';
  text: string;
  description: string;
  confidence: number;
  reason: string;
}

export class IntelligentInteractionManager {
  private commandHistory: CommandUsage[] = [];
  private userPatterns: UserPattern;
  private maxHistorySize = 1000;
  
  constructor() {
    this.userPatterns = this.loadUserPatterns();
    this.loadCommandHistory();
  }
  
  // Record a command execution for learning
  recordCommand(command: string, args: string[], success: boolean, context: string = ''): void {
    const usage: CommandUsage = {
      command,
      args,
      timestamp: new Date(),
      success,
      context
    };
    
    this.commandHistory.push(usage);
    
    // Maintain history size limit
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory = this.commandHistory.slice(-this.maxHistorySize);
    }
    
    // Update patterns
    this.updateUserPatterns(usage);
    this.saveUserPatterns();
    this.saveCommandHistory();
  }
  
  // Get context-aware suggestions for current input
  getSuggestions(partialInput: string, currentContext: string = ''): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // Command completion suggestions
    suggestions.push(...this.getCommandCompletions(partialInput));
    
    // Argument suggestions based on command
    suggestions.push(...this.getArgumentSuggestions(partialInput));
    
    // Workflow suggestions
    suggestions.push(...this.getWorkflowSuggestions(currentContext));
    
    // Error correction suggestions
    suggestions.push(...this.getErrorCorrections(partialInput));
    
    // Frequency-based suggestions
    suggestions.push(...this.getFrequencyBasedSuggestions(partialInput));
    
    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);
  }
  
  // Get smart autocomplete suggestions
  getAutocompleteSuggestions(input: string, cursorPosition: number): string[] {
    const beforeCursor = input.substring(0, cursorPosition);
    const parts = beforeCursor.split(' ');
    const lastPart = parts[parts.length - 1];
    
    if (parts.length === 1) {
      // Command completion
      return this.getCommandNames()
        .filter(cmd => cmd.startsWith(lastPart))
        .sort((a, b) => {
          const freqA = this.userPatterns.frequentCommands[a] || 0;
          const freqB = this.userPatterns.frequentCommands[b] || 0;
          return freqB - freqA;
        })
        .slice(0, 5);
    } else {
      // Argument completion
      const command = parts[0];
      return this.getArgumentCompletions(command, lastPart);
    }
  }
  
  // Get next likely commands based on current context
  getNextCommandPredictions(lastCommands: string[] = []): Suggestion[] {
    const predictions: Suggestion[] = [];
    
    // Analyze command sequences
    for (const sequence of this.userPatterns.commandSequences) {
      if (this.isSequenceMatch(lastCommands, sequence)) {
        const nextCommand = this.predictNextInSequence(lastCommands, sequence);
        if (nextCommand) {
          predictions.push({
            type: 'workflow',
            text: nextCommand,
            description: `Often used after ${lastCommands.slice(-2).join(' → ')}`,
            confidence: 0.8,
            reason: 'workflow_pattern'
          });
        }
      }
    }
    
    return predictions.slice(0, 3);
  }
  
  // Get intelligent help based on user behavior
  getIntelligentHelp(_query: string = ''): Suggestion[] {
    const helpSuggestions: Suggestion[] = [];
    
    // Suggest commands user hasn't tried but might find useful
    const unusedCommands = this.getUnusedCommands();
    unusedCommands.forEach(cmd => {
      helpSuggestions.push({
        type: 'command',
        text: cmd,
        description: `You haven't tried this command yet: /${cmd}`,
        confidence: 0.6,
        reason: 'discovery'
      });
    });
    
    // Suggest improvements based on error patterns
    this.userPatterns.errorPatterns.forEach(errorCmd => {
      const correction = this.suggestCorrection(errorCmd);
      if (correction) {
        helpSuggestions.push({
          type: 'correction',
          text: correction,
          description: `Did you mean /${correction}? (You've tried /${errorCmd})`,
          confidence: 0.7,
          reason: 'error_learning'
        });
      }
    });
    
    return helpSuggestions.slice(0, 5);
  }
  
  // Generate dynamic aliases based on usage patterns
  generateDynamicAliases(): Record<string, string> {
    const aliases: Record<string, string> = {};
    
    // Create aliases for frequently used command+arg combinations
    Object.entries(this.userPatterns.frequentCommands)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([command, frequency]) => {
        if (frequency > 5) {
          const commonArgs = this.getMostCommonArgs(command);
          if (commonArgs.length > 0) {
            const shortcut = this.generateShortcut(command, commonArgs);
            aliases[shortcut] = `${command} ${commonArgs.join(' ')}`;
          }
        }
      });
    
    return aliases;
  }
  
  // Private helper methods
  
  private updateUserPatterns(usage: CommandUsage): void {
    // Update command frequency
    this.userPatterns.frequentCommands[usage.command] = 
      (this.userPatterns.frequentCommands[usage.command] || 0) + 1;
    
    // Update time patterns
    const hour = usage.timestamp.getHours();
    if (!this.userPatterns.timePatterns[usage.command]) {
      this.userPatterns.timePatterns[usage.command] = new Array(24).fill(0);
    }
    this.userPatterns.timePatterns[usage.command][hour]++;
    
    // Update error patterns
    if (!usage.success) {
      this.userPatterns.errorPatterns.push(usage.command);
      // Keep only last 20 errors
      this.userPatterns.errorPatterns = this.userPatterns.errorPatterns.slice(-20);
    }
    
    // Update command sequences
    this.updateCommandSequences(usage.command);
  }
  
  private updateCommandSequences(newCommand: string): void {
    const recentCommands = this.commandHistory
      .slice(-5)
      .map(usage => usage.command);
    
    if (recentCommands.length >= 2) {
      const sequence = [...recentCommands, newCommand];
      
      // Find or create similar sequences
      let found = false;
      for (let i = 0; i < this.userPatterns.commandSequences.length; i++) {
        if (this.sequenceSimilarity(sequence, this.userPatterns.commandSequences[i]) > 0.6) {
          this.userPatterns.commandSequences[i] = sequence; // Update with latest
          found = true;
          break;
        }
      }
      
      if (!found && sequence.length >= 2) {
        this.userPatterns.commandSequences.push(sequence);
        // Keep only most recent sequences
        this.userPatterns.commandSequences = this.userPatterns.commandSequences.slice(-50);
      }
    }
  }
  
  private getCommandCompletions(partialInput: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const input = partialInput.toLowerCase();
    
    // Remove leading slash if present
    const cleanInput = input.startsWith('/') ? input.slice(1) : input;
    
    const commands = this.getCommandNames();
    commands.forEach(command => {
      if (command.toLowerCase().startsWith(cleanInput)) {
        const frequency = this.userPatterns.frequentCommands[command] || 0;
        suggestions.push({
          type: 'command',
          text: `/${command}`,
          description: frequency > 0 ? `Used ${frequency} times` : 'Available command',
          confidence: 0.9 - (command.length - cleanInput.length) * 0.1 + frequency * 0.05,
          reason: 'command_completion'
        });
      }
    });
    
    return suggestions;
  }
  
  private getArgumentSuggestions(partialInput: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const parts = partialInput.split(' ');
    
    if (parts.length < 2) return suggestions;
    
    const command = parts[0].replace('/', '');
    const currentArg = parts[parts.length - 1];
    
    // Get common arguments for this command
    const commonArgs = this.getMostCommonArgs(command);
    commonArgs.forEach(arg => {
      if (arg.toLowerCase().startsWith(currentArg.toLowerCase())) {
        suggestions.push({
          type: 'argument',
          text: arg,
          description: `Common argument for /${command}`,
          confidence: 0.7,
          reason: 'argument_history'
        });
      }
    });
    
    return suggestions;
  }
  
  private getWorkflowSuggestions(_currentContext: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // Analyze recent commands to suggest next steps
    const recentCommands = this.commandHistory
      .slice(-3)
      .map(usage => usage.command);
    
    for (const sequence of this.userPatterns.commandSequences) {
      if (this.isSequenceMatch(recentCommands, sequence.slice(0, recentCommands.length))) {
        const nextCmd = sequence[recentCommands.length];
        if (nextCmd) {
          suggestions.push({
            type: 'workflow',
            text: `/${nextCmd}`,
            description: `Next step in your usual workflow`,
            confidence: 0.8,
            reason: 'workflow_prediction'
          });
        }
      }
    }
    
    return suggestions;
  }
  
  private getErrorCorrections(partialInput: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const input = partialInput.toLowerCase();
    
    // Check for common typos
    const commands = this.getCommandNames();
    commands.forEach(command => {
      const distance = this.levenshteinDistance(input, command.toLowerCase());
      if (distance <= 2 && distance > 0) {
        suggestions.push({
          type: 'correction',
          text: `/${command}`,
          description: `Did you mean /${command}?`,
          confidence: 0.6 - distance * 0.1,
          reason: 'typo_correction'
        });
      }
    });
    
    return suggestions;
  }
  
  private getFrequencyBasedSuggestions(partialInput: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // Suggest most frequently used commands if input is empty or very short
    if (partialInput.length <= 1) {
      const frequentCommands = Object.entries(this.userPatterns.frequentCommands)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      
      frequentCommands.forEach(([command, frequency]) => {
        suggestions.push({
          type: 'command',
          text: `/${command}`,
          description: `Your most used command (${frequency} times)`,
          confidence: 0.5 + frequency * 0.02,
          reason: 'frequency'
        });
      });
    }
    
    return suggestions;
  }
  
  private getCommandNames(): string[] {
    // This would integrate with the actual command registry
    return [
      'help', 'ls', 'cd', 'pwd', 'cat', 'ps', 'top', 'free', 'df', 'uptime',
      'env', 'export', 'set', 'echo', 'alias', 'kill', 'jobs', 'sysinfo',
      'avatar', 'imagine', 'theme', 'clear', 'ask', 'providers', 'config'
    ];
  }
  
  private getArgumentCompletions(command: string, partial: string): string[] {
    const completions: Record<string, string[]> = {
      'ls': ['-l', '-a', '-la', '/home/claudia', '/system', '/etc'],
      'cd': ['/home/claudia', '/system', '/etc', '/var', '..', '~'],
      'ps': ['aux', '-u', '-p'],
      'free': ['-h', '-m', '-g'],
      'export': ['CLAUDIA_THEME=', 'CLAUDIA_DEBUG=', 'PATH='],
      'theme': ['mainframe70s', 'pc80s', 'bbs90s', 'modern'],
      'avatar': ['show', 'hide', 'expression', 'position', 'scale']
    };
    
    return completions[command]?.filter(arg => 
      arg.toLowerCase().startsWith(partial.toLowerCase())
    ) || [];
  }
  
  private getMostCommonArgs(command: string): string[] {
    const argFrequency: Record<string, number> = {};
    
    this.commandHistory
      .filter(usage => usage.command === command)
      .forEach(usage => {
        usage.args.forEach(arg => {
          argFrequency[arg] = (argFrequency[arg] || 0) + 1;
        });
      });
    
    return Object.entries(argFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([arg]) => arg);
  }
  
  private isSequenceMatch(recentCommands: string[], pattern: string[]): boolean {
    if (recentCommands.length > pattern.length) return false;
    
    for (let i = 0; i < recentCommands.length; i++) {
      if (recentCommands[i] !== pattern[i]) return false;
    }
    
    return true;
  }
  
  private predictNextInSequence(recentCommands: string[], pattern: string[]): string | null {
    if (recentCommands.length >= pattern.length) return null;
    return pattern[recentCommands.length];
  }
  
  private getUnusedCommands(): string[] {
    const allCommands = this.getCommandNames();
    const usedCommands = new Set(Object.keys(this.userPatterns.frequentCommands));
    
    return allCommands.filter(cmd => !usedCommands.has(cmd));
  }
  
  private suggestCorrection(errorCommand: string): string | null {
    const commands = this.getCommandNames();
    let bestMatch = null;
    let bestDistance = Infinity;
    
    commands.forEach(command => {
      const distance = this.levenshteinDistance(errorCommand, command);
      if (distance < bestDistance && distance <= 2) {
        bestDistance = distance;
        bestMatch = command;
      }
    });
    
    return bestMatch;
  }
  
  private generateShortcut(command: string, args: string[]): string {
    // Generate short aliases for common command+args combinations
    const shortcuts: Record<string, string> = {
      'ls -la': 'll',
      'ls -l': 'l',
      'cd ..': 'up',
      'ps aux': 'psa',
      'free -h': 'mem'
    };
    
    const fullCommand = `${command} ${args.join(' ')}`;
    return shortcuts[fullCommand] || `${command.charAt(0)}${args[0]?.charAt(0) || ''}`;
  }
  
  private sequenceSimilarity(seq1: string[], seq2: string[]): number {
    const maxLength = Math.max(seq1.length, seq2.length);
    if (maxLength === 0) return 1;
    
    let matches = 0;
    const minLength = Math.min(seq1.length, seq2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (seq1[i] === seq2[i]) matches++;
    }
    
    return matches / maxLength;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  private loadUserPatterns(): UserPattern {
    const stored = localStorage.getItem('claudiaos-user-patterns');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Failed to parse stored user patterns');
      }
    }
    
    return {
      commandSequences: [],
      frequentCommands: {},
      timePatterns: {},
      errorPatterns: [],
      workflowPatterns: {}
    };
  }
  
  private saveUserPatterns(): void {
    localStorage.setItem('claudiaos-user-patterns', JSON.stringify(this.userPatterns));
  }
  
  private loadCommandHistory(): void {
    const stored = sessionStorage.getItem('claudiaos-command-history');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.commandHistory = data.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      } catch (e) {
        console.warn('Failed to parse stored command history');
      }
    }
  }
  
  private saveCommandHistory(): void {
    sessionStorage.setItem('claudiaos-command-history', JSON.stringify(this.commandHistory));
  }
}

// Global instance
export const intelligentInteraction = new IntelligentInteractionManager();