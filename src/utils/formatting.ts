// Utility functions for formatting terminal output with markdown and HTML

export const fmt = {
  // Text formatting
  bold: (text: string) => `**${text}**`,
  italic: (text: string) => `*${text}*`,
  underline: (text: string) => `__${text}__`,
  emphasis: (text: string) => `_${text}_`,
  code: (text: string) => `\`${text}\``,
  
  // Colors using HTML spans
  red: (text: string) => `<span class="color-red">${text}</span>`,
  green: (text: string) => `<span class="color-green">${text}</span>`,
  blue: (text: string) => `<span class="color-blue">${text}</span>`,
  yellow: (text: string) => `<span class="color-yellow">${text}</span>`,
  cyan: (text: string) => `<span class="color-cyan">${text}</span>`,
  magenta: (text: string) => `<span class="color-magenta">${text}</span>`,
  orange: (text: string) => `<span class="color-orange">${text}</span>`,
  purple: (text: string) => `<span class="color-purple">${text}</span>`,
  gray: (text: string) => `<span class="color-gray">${text}</span>`,
  grey: (text: string) => `<span class="color-grey">${text}</span>`,
  
  // Theme colors
  accent: (text: string) => `<span class="color-accent">${text}</span>`,
  successColor: (text: string) => `<span class="color-success">${text}</span>`,
  warningColor: (text: string) => `<span class="color-warning">${text}</span>`,
  errorColor: (text: string) => `<span class="color-error">${text}</span>`,
  
  // Custom color
  color: (text: string, color: string) => `<span class="color-${color}">${text}</span>`,
  
  // Line break
  br: () => '<br/>',
  
  // Common formatting combinations
  command: (cmd: string) => fmt.cyan(`/${cmd}`),
  parameter: (param: string) => fmt.code(param),
  success: (text: string) => `${fmt.green('✓')} ${text}`,
  error: (text: string) => `${fmt.red('✗')} ${text}`,
  warning: (text: string) => `${fmt.yellow('⚠️')} ${text}`,
  info: (text: string) => `${fmt.blue('ℹ️')} ${text}`,
  note: (text: string) => `${fmt.yellow('💡')} ${text}`,
  
  // Headers
  header: (text: string) => fmt.bold(`=== ${text} ===`),
  subheader: (text: string) => fmt.bold(text + ':'),
  
  // Lists
  bullet: (text: string) => `• ${text}`,
  numberedItem: (num: number, text: string) => `${num}. ${text}`,
  
  // Code blocks (simulated with background)
  codeBlock: (text: string) => `<code>${text}</code>`,
  
  // Links (for display purposes, not clickable in terminal)
  link: (text: string, url: string) => `[${text}](${url})`,
  
  // Table-like formatting helpers
  padRight: (text: string, width: number) => text.padEnd(width),
  padLeft: (text: string, width: number) => text.padStart(width),
  
  // Progress/status indicators
  spinner: () => '⏳',
  checkmark: () => '✓',
  cross: () => '✗',
  arrow: () => '→',
  triangleRight: () => '▶',
  diamond: () => '◆',
  
  // Emojis for status
  loading: () => '⏳',
  done: () => '✅',
  failed: () => '❌',
  thinking: () => '🤔',
  robot: () => '🤖',
  chat: () => '💬',
  settings: () => '⚙️',
  image: () => '🖼️',
  
  // Combine multiple formatters
  combine: (...parts: string[]) => parts.join(''),
};

// Helper for creating formatted terminal lines
export const createFormattedLine = (
  id: string,
  type: 'input' | 'output' | 'system' | 'error',
  content: string,
  timestamp?: string,
  user?: 'user' | 'claudia',
  isChatResponse?: boolean
) => ({
  id,
  type,
  content,
  timestamp: timestamp || new Date().toISOString(),
  user,
  isChatResponse
});

export default fmt;