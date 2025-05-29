import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { intelligentInteraction } from '../../services/intelligentInteraction';

// Workflow assistant that predicts and suggests command sequences
export const workflowCommand: Command = {
  name: 'workflow',
  description: 'Intelligent workflow assistant for command sequences',
  usage: '/workflow [suggest] [learn] [show] [task]',
  aliases: ['wf', 'flow'],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const lines: TerminalLine[] = [];
    const subcommand = args[0];
    
    lines.push({
      id: `workflow-header-${timestamp}`,
      type: 'output',
      content: '🔄 ClaudiaOS Workflow Assistant',
      timestamp,
      user: 'claudia'
    });
    
    switch (subcommand) {
      case 'suggest':
        return await handleWorkflowSuggest(args.slice(1), timestamp);
      case 'learn':
        return await handleWorkflowLearn(args.slice(1), timestamp);
      case 'show':
        return await handleWorkflowShow(args.slice(1), timestamp);
      case 'task':
        return await handleTaskWorkflow(args.slice(1), timestamp);
      default:
        return await handleWorkflowOverview(timestamp);
    }
  }
};

async function handleWorkflowSuggest(args: string[], timestamp: string): Promise<CommandResult> {
  const lines: TerminalLine[] = [];
  const context = args.join(' ') || 'general';
  
  lines.push({
    id: `workflow-suggest-header-${timestamp}`,
    type: 'output',
    content: `💡 Workflow Suggestions for: ${context}`,
    timestamp,
    user: 'claudia'
  });
  
  const predictions = intelligentInteraction.getNextCommandPredictions();
  
  if (predictions.length > 0) {
    lines.push({
      id: `workflow-suggest-next-${timestamp}`,
      type: 'output',
      content: '🎯 Likely Next Commands:',
      timestamp,
      user: 'claudia'
    });
    
    predictions.forEach((pred, index) => {
      const confidence = Math.round(pred.confidence * 100);
      lines.push({
        id: `workflow-pred-${index}-${timestamp}`,
        type: 'output',
        content: `   ${pred.text.padEnd(15)} ${pred.description} (${confidence}%)`,
        timestamp,
        user: 'claudia'
      });
    });
  } else {
    lines.push({
      id: `workflow-suggest-none-${timestamp}`,
      type: 'output',
      content: '   Use more commands to build workflow patterns!',
      timestamp,
      user: 'claudia'
    });
  }
  
  // Suggest common workflow templates
  lines.push({
    id: `workflow-templates-header-${timestamp}`,
    type: 'output',
    content: '',
    timestamp,
    user: 'claudia'
  });
  
  lines.push({
    id: `workflow-templates-title-${timestamp}`,
    type: 'output',
    content: '📋 Common Workflow Templates:',
    timestamp,
    user: 'claudia'
  });
  
  const templates = getWorkflowTemplates();
  templates.forEach((template, index) => {
    lines.push({
      id: `workflow-template-${index}-${timestamp}`,
      type: 'output',
      content: `   ${template}`,
      timestamp,
      user: 'claudia'
    });
  });
  
  return { success: true, lines };
}

async function handleWorkflowLearn(_args: string[], timestamp: string): Promise<CommandResult> {
  const lines: TerminalLine[] = [];
  
  lines.push({
    id: `workflow-learn-header-${timestamp}`,
    type: 'output',
    content: '🧠 Workflow Learning Status',
    timestamp,
    user: 'claudia'
  });
  
  lines.push({
    id: `workflow-learn-status-${timestamp}`,
    type: 'output',
    content: '✅ Active Learning: ON',
    timestamp,
    user: 'claudia'
  });
  
  lines.push({
    id: `workflow-learn-info-${timestamp}`,
    type: 'output',
    content: '',
    timestamp,
    user: 'claudia'
  });
  
  const learningInfo = [
    'How ClaudiaOS Learns Your Workflows:',
    '',
    '1. Command Sequence Tracking:',
    '   • Records chains of commands you use together',
    '   • Identifies patterns in your command sequences',
    '   • Builds predictive models for next likely commands',
    '',
    '2. Context Awareness:',
    '   • Analyzes when and why you use certain commands',
    '   • Learns your preferences for different situations',
    '   • Adapts suggestions based on current activity',
    '',
    '3. Error Pattern Recognition:',
    '   • Remembers common typos and mistakes',
    '   • Suggests corrections proactively',
    '   • Learns from successful corrections',
    '',
    '4. Efficiency Optimization:',
    '   • Identifies frequently used command combinations',
    '   • Suggests aliases for common sequences',
    '   • Recommends workflow improvements',
    '',
    '💡 The more you use ClaudiaOS, the smarter it becomes!'
  ];
  
  learningInfo.forEach((info, index) => {
    lines.push({
      id: `workflow-learn-info-${index}-${timestamp}`,
      type: 'output',
      content: info,
      timestamp,
      user: 'claudia'
    });
  });
  
  return { success: true, lines };
}

async function handleWorkflowShow(_args: string[], timestamp: string): Promise<CommandResult> {
  const lines: TerminalLine[] = [];
  
  lines.push({
    id: `workflow-show-header-${timestamp}`,
    type: 'output',
    content: '📊 Your Learned Workflows',
    timestamp,
    user: 'claudia'
  });
  
  // Show dynamic aliases
  const dynamicAliases = intelligentInteraction.generateDynamicAliases();
  if (Object.keys(dynamicAliases).length > 0) {
    lines.push({
      id: `workflow-aliases-header-${timestamp}`,
      type: 'output',
      content: '⚡ Suggested Shortcuts:',
      timestamp,
      user: 'claudia'
    });
    
    Object.entries(dynamicAliases).forEach(([alias, command], index) => {
      lines.push({
        id: `workflow-alias-${index}-${timestamp}`,
        type: 'output',
        content: `   ${alias.padEnd(6)} → ${command}`,
        timestamp,
        user: 'claudia'
      });
    });
    
    lines.push({
      id: `workflow-alias-tip-${timestamp}`,
      type: 'output',
      content: '   💡 Use /alias to create: /alias ll="ls -l"',
      timestamp,
      user: 'claudia'
    });
  }
  
  lines.push({
    id: `workflow-patterns-header-${timestamp}`,
    type: 'output',
    content: '',
    timestamp,
    user: 'claudia'
  });
  
  lines.push({
    id: `workflow-patterns-title-${timestamp}`,
    type: 'output',
    content: '🔄 Detected Patterns:',
    timestamp,
    user: 'claudia'
  });
  
  // Show sample patterns (in real implementation, this would come from actual data)
  const samplePatterns = [
    'Navigation: /ls → /cd → /pwd (85% accuracy)',
    'Monitoring: /top → /ps → /free (78% accuracy)',  
    'File Inspection: /ls → /cat → /echo (72% accuracy)',
    'System Check: /uptime → /df → /sysinfo (68% accuracy)'
  ];
  
  samplePatterns.forEach((pattern, index) => {
    lines.push({
      id: `workflow-pattern-${index}-${timestamp}`,
      type: 'output',
      content: `   • ${pattern}`,
      timestamp,
      user: 'claudia'
    });
  });
  
  return { success: true, lines };
}

async function handleTaskWorkflow(args: string[], timestamp: string): Promise<CommandResult> {
  const lines: TerminalLine[] = [];
  const task = args.join(' ');
  
  if (!task) {
    lines.push({
      id: `workflow-task-error-${timestamp}`,
      type: 'error',
      content: 'Please specify a task: /workflow task <task_description>',
      timestamp,
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  lines.push({
    id: `workflow-task-header-${timestamp}`,
    type: 'output',
    content: `🎯 Suggested Workflow for: "${task}"`,
    timestamp,
    user: 'claudia'
  });
  
  const suggestedWorkflow = suggestWorkflowForTask(task);
  
  lines.push({
    id: `workflow-task-steps-${timestamp}`,
    type: 'output',
    content: '📋 Recommended Steps:',
    timestamp,
    user: 'claudia'
  });
  
  suggestedWorkflow.forEach((step, index) => {
    lines.push({
      id: `workflow-task-step-${index}-${timestamp}`,
      type: 'output',
      content: `   ${index + 1}. ${step}`,
      timestamp,
      user: 'claudia'
    });
  });
  
  lines.push({
    id: `workflow-task-note-${timestamp}`,
    type: 'output',
    content: '',
    timestamp,
    user: 'claudia'
  });
  
  lines.push({
    id: `workflow-task-tip-${timestamp}`,
    type: 'output',
    content: '💡 As you follow this workflow, ClaudiaOS will learn and improve future suggestions!',
    timestamp,
    user: 'claudia'
  });
  
  return { success: true, lines };
}

async function handleWorkflowOverview(timestamp: string): Promise<CommandResult> {
  const lines: TerminalLine[] = [];
  
  lines.push({
    id: `workflow-overview-desc-${timestamp}`,
    type: 'output',
    content: 'Intelligent workflow assistance for efficient command sequences',
    timestamp,
    user: 'claudia'
  });
  
  lines.push({
    id: `workflow-overview-blank-${timestamp}`,
    type: 'output',
    content: '',
    timestamp,
    user: 'claudia'
  });
  
  const commands = [
    '/workflow suggest          💡 Get next command suggestions',
    '/workflow learn            🧠 View learning system info',
    '/workflow show             📊 Show your learned patterns',
    '/workflow task <desc>      🎯 Get workflow for specific task',
    '',
    'Examples:',
    '/workflow task "monitor system performance"',
    '/workflow task "explore file system"',
    '/workflow task "customize avatar"'
  ];
  
  commands.forEach((cmd, index) => {
    lines.push({
      id: `workflow-cmd-${index}-${timestamp}`,
      type: 'output',
      content: cmd,
      timestamp,
      user: 'claudia'
    });
  });
  
  return { success: true, lines };
}

function getWorkflowTemplates(): string[] {
  return [
    '🔍 Exploration:    /ls → /cd <dir> → /ls -la → /cat <file>',
    '⚡ System Check:   /uptime → /free -h → /df -h → /top',
    '👤 Avatar Setup:   /avatar show → /imagine <desc> → /avatar position',
    '🎨 Customization:  /theme → /config → /export CLAUDIA_THEME=<theme>',
    '📊 Monitoring:     /ps aux → /top → /jobs → /kill <pid>',
    '📁 File Management: /pwd → /ls -la → /cd → /cat → /echo'
  ];
}

function suggestWorkflowForTask(task: string): string[] {
  const taskLower = task.toLowerCase();
  
  if (taskLower.includes('monitor') || taskLower.includes('performance') || taskLower.includes('system')) {
    return [
      '/uptime              # Check system uptime and load',
      '/free -h             # View memory usage',
      '/df -h               # Check disk space',
      '/ps aux              # List all processes',
      '/top                 # Monitor real-time performance',
      '/sysinfo             # Get comprehensive system info'
    ];
  }
  
  if (taskLower.includes('explore') || taskLower.includes('navigate') || taskLower.includes('file')) {
    return [
      '/pwd                 # Check current directory',
      '/ls -la              # List all files with details',
      '/cd <directory>      # Navigate to directory of interest',
      '/cat <file>          # View file contents',
      '/find or /ls         # Find specific files',
      '/echo $PWD           # Verify current location'
    ];
  }
  
  if (taskLower.includes('avatar') || taskLower.includes('customize') || taskLower.includes('appearance')) {
    return [
      '/avatar show         # Display avatar',
      '/avatar expression   # Set expression (happy/curious/etc)',
      '/imagine <desc>      # Generate custom avatar image',
      '/avatar position     # Position avatar on screen',
      '/theme <name>        # Change terminal theme',
      '/config              # Access configuration options'
    ];
  }
  
  if (taskLower.includes('environment') || taskLower.includes('setup') || taskLower.includes('config')) {
    return [
      '/env                 # View environment variables',
      '/export VAR=value    # Set environment variables',
      '/alias name=command  # Create command shortcuts',
      '/set                 # Configure shell options',
      '/echo $HOME          # Check environment values',
      '/config              # Access system configuration'
    ];
  }
  
  if (taskLower.includes('troubleshoot') || taskLower.includes('debug') || taskLower.includes('problem')) {
    return [
      '/ps aux              # Check running processes',
      '/top                 # Monitor system resources',
      '/jobs                # Check background jobs',
      '/free -h             # Check memory usage',
      '/df -h               # Check disk space',
      '/smarthelp --suggestions  # Get intelligent help'
    ];
  }
  
  // Default workflow for unknown tasks
  return [
    '/smarthelp --discover   # Find relevant commands',
    '/workflow suggest       # Get contextual suggestions',
    '/help                   # Access traditional help',
    '/analytics              # Check usage patterns',
    '/ask <question>         # Ask AI for specific guidance'
  ];
}