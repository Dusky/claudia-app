import type { Command, CommandResult, CommandContext } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { DEFAULT_PERSONALITY, type Personality } from '../../types/personality';
import type { StorageService } from '../../storage/types';

// --- Main /personality command ---
export const personalityCommand: Command = {
  name: 'personality',
  description: 'Manage AI personalities. Lists personality subcommands.',
  usage: '/personality [help]',
  aliases: ['p', 'persona'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    if (args.length === 0 || args[0]?.toLowerCase() === 'help') {
      lines.push({
        id: `p-help-header-${timestamp}`,
        type: 'system',
        content: '🎭 Personality Management Subcommands:',
        timestamp, user: 'claudia'
      });
       lines.push({
        id: `p-help-blank-${timestamp}`,
        type: 'output',
        content: '',
        timestamp, user: 'claudia'
      });

      const allCommands = context.commandRegistry.getAll();
      const personalitySubCommands = allCommands
        .filter(cmd => cmd.name.startsWith('personality-') && cmd.name !== this.name)
        .sort((a, b) => a.name.localeCompare(b.name));

      if (personalitySubCommands.length > 0) {
        personalitySubCommands.forEach(cmd => {
          lines.push({
            id: `p-help-cmd-${cmd.name}-${timestamp}`,
            type: 'output',
            content: `  /${cmd.name.padEnd(20)} - ${cmd.description}`,
            timestamp, user: 'claudia'
          });
        });
      } else {
        lines.push({
          id: `p-help-none-${timestamp}`,
          type: 'output',
          content: '  No personality subcommands found (ensure they are registered).',
          timestamp, user: 'claudia'
        });
      }
      lines.push({
        id: `p-help-blank-after-${timestamp}`,
        type: 'output',
        content: '',
        timestamp, user: 'claudia'
      });
      lines.push({
        id: `p-help-tip-${timestamp}`,
        type: 'system',
        content: "▶ Type '/help [subcommand_name]' for more details on a specific subcommand.",
        timestamp, user: 'claudia'
      });
      return { success: true, lines };
    }

    return {
      success: false,
      lines: [{
        id: `p-invalid-${timestamp}`,
        type: 'error',
        content: `❌ Invalid argument for /personality. Use a subcommand like /personality-list or /personality-create. Type '/personality help' to see available subcommands.`,
        timestamp, user: 'claudia'
      }],
    };
  }
};

// --- Subcommand: /personality-list ---
export const listPersonalitiesCommand: Command = {
  name: 'personality-list',
  description: 'Lists all available personalities.',
  usage: '/personality-list',
  aliases: ['p-ls', 'p-list'],

  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    const personalities = await context.storage.getAllPersonalities();
    const activePersonality = await context.storage.getActivePersonality();
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    if (!personalities || personalities.length === 0) {
      lines.push({
        id: `p-list-empty-${timestamp}`,
        type: 'output',
        content: 'No personalities found. Use "/personality-create" to make one, or "/personality-init" to restore the default.',
        timestamp,
        user: 'claudia'
      });
    } else {
      lines.push({
        id: `p-list-header-${timestamp}`,
        type: 'system',
        content: '🎭 Available Personalities:',
        timestamp,
        user: 'claudia'
      });
      lines.push({ id: `p-list-space-${timestamp}`, type: 'output', content: '', timestamp, user: 'claudia' });

      personalities.forEach((p, index) => {
        const isActive = activePersonality?.id === p.id;
        const indicator = isActive ? '→ ●' : '  ○';
        const defaultLabel = p.isDefault ? ' (default)' : '';
        const usageCount = p.usage_count > 0 ? `(Used ${p.usage_count} times)` : '';
        
        lines.push({
          id: `p-list-item-${p.id}-name-${timestamp}-${index}`,
          type: 'output',
          content: `${indicator} ${p.name}${defaultLabel}`,
          timestamp, user: 'claudia'
        });
        lines.push({
          id: `p-list-item-${p.id}-desc-${timestamp}-${index}`,
          type: 'output',
          content: `     "${p.description}" ${usageCount}`,
          timestamp, user: 'claudia'
        });
        lines.push({
          id: `p-list-item-${p.id}-id-${timestamp}-${index}`,
          type: 'output',
          content: `     ID: ${p.id}`,
          timestamp, user: 'claudia'
        });
        if (index < personalities.length - 1) {
            lines.push({ id: `p-list-item-sep-${p.id}-${timestamp}-${index}`, type: 'output', content: '     ---', timestamp, user: 'claudia' });
        }
      });
      lines.push({ id: `p-list-footer-space-${timestamp}`, type: 'output', content: '', timestamp, user: 'claudia' });
    }
    lines.push({ id: `p-list-footer1-${timestamp}`, type: 'system', content: '▶ Use "/personality-set <id>" to change personality.', timestamp, user: 'claudia' });
    lines.push({ id: `p-list-footer2-${timestamp}`, type: 'system', content: '▶ Use "/personality-create" to create a new one.', timestamp, user: 'claudia' });
    return { success: true, lines };
  }
};

// --- Subcommand: /personality-current ---
export const currentPersonalityCommand: Command = {
  name: 'personality-current',
  description: 'Shows details of the currently active personality.',
  usage: '/personality-current',
  aliases: ['p-curr', 'p-active'],

  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    const personality = await context.storage.getActivePersonality();
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    if (!personality) {
      lines.push({
        id: `p-curr-none-${timestamp}`,
        type: 'error',
        content: '❌ No active personality set. Use "/personality-list" and "/personality-set <id>".',
        timestamp, user: 'claudia'
      });
      return { success: false, lines };
    }

    lines.push({ id: `p-curr-title-${timestamp}`, type: 'system', content: `🎭 Current Personality: ${personality.name} (ID: ${personality.id})`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-desc-${timestamp}`, type: 'output', content: `  Description: "${personality.description}"`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-usage-${timestamp}`, type: 'output', content: `  Usage Count: ${personality.usage_count}`, timestamp, user: 'claudia' });
    if (personality.isDefault) {
      lines.push({ id: `p-curr-default-${timestamp}`, type: 'output', content: `  This is a default system personality.`, timestamp, user: 'claudia' });
    }
    lines.push({ id: `p-curr-space1-${timestamp}`, type: 'output', content: '', timestamp, user: 'claudia' });

    lines.push({ id: `p-curr-traits-header-${timestamp}`, type: 'system', content: '  Character Traits:', timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-trait-tone-${timestamp}`, type: 'output', content: `    • Tone: ${personality.traits.tone}`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-trait-formality-${timestamp}`, type: 'output', content: `    • Formality: ${personality.traits.formality}`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-trait-humor-${timestamp}`, type: 'output', content: `    • Humor: ${personality.traits.humor}`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-trait-verbosity-${timestamp}`, type: 'output', content: `    • Verbosity: ${personality.traits.verbosity}`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-trait-enthusiasm-${timestamp}`, type: 'output', content: `    • Enthusiasm: ${personality.traits.enthusiasm}`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-space2-${timestamp}`, type: 'output', content: '', timestamp, user: 'claudia' });

    lines.push({ id: `p-curr-background-header-${timestamp}`, type: 'system', content: '  Background & Expertise:', timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-background-role-${timestamp}`, type: 'output', content: `    • Role: ${personality.background.role}`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-background-expertise-${timestamp}`, type: 'output', content: `    • Expertise: ${personality.background.expertise.join(', ')}`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-background-desc-${timestamp}`, type: 'output', content: `    • Details: ${personality.background.personality_description}`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-space3-${timestamp}`, type: 'output', content: '', timestamp, user: 'claudia' });
    
    lines.push({ id: `p-curr-behavior-header-${timestamp}`, type: 'system', content: '  Behavioral Style:', timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-behavior-style-${timestamp}`, type: 'output', content: `    • Response Style: ${personality.behavior.response_style}`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-behavior-emoji-${timestamp}`, type: 'output', content: `    • Emoji Usage: ${personality.behavior.emoji_usage}`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-behavior-questions-${timestamp}`, type: 'output', content: `    • Question Asking: ${personality.behavior.question_asking}`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-behavior-creativity-${timestamp}`, type: 'output', content: `    • Creativity: ${personality.behavior.creativity_level}`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-space4-${timestamp}`, type: 'output', content: '', timestamp, user: 'claudia' });

    lines.push({ id: `p-curr-prompt-info-${timestamp}`, type: 'system', content: `  ▶ System prompt is active. Use "/personality-view ${personality.id}" to see the full prompt.`, timestamp, user: 'claudia' });
    
    return { success: true, lines };
  }
};

// --- Subcommand: /personality-set <id> ---
export const setPersonalityCommand: Command = {
  name: 'personality-set',
  description: 'Sets the active personality.',
  usage: '/personality-set <id>',
  aliases: ['p-set', 'p-switch', 'p-use'],

  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    if (args.length === 0) {
      return { success: false, lines: [{ id: `p-set-err-${timestamp}`, type: 'error', content: '❌ Usage: /personality-set <personality_id>', timestamp, user: 'claudia' }] };
    }
    const personalityId = args[0];
    const personality = await context.storage.getPersonality(personalityId);

    if (!personality) {
      return { success: false, lines: [{ id: `p-set-notfound-${timestamp}`, type: 'error', content: `❌ Personality "${personalityId}" not found.`, timestamp, user: 'claudia' }] };
    }

    const success = await context.storage.setActivePersonality(personalityId);
    if (success) {
      // Optionally update LLM system prompt here if your LLMManager supports it
      // await context.llmManager.setSystemPrompt(personality.system_prompt);
      return { success: true, lines: [{ id: `p-set-succ-${timestamp}`, type: 'output', content: `🎭 Switched to personality: ${personality.name}`, timestamp, user: 'claudia' }] };
    } else {
      return { success: false, lines: [{ id: `p-set-fail-${timestamp}`, type: 'error', content: '❌ Failed to switch personality.', timestamp, user: 'claudia' }] };
    }
  }
};

// --- Subcommand: /personality-create ---
export const createPersonalityCommand: Command = {
  name: 'personality-create',
  description: 'Opens the editor to create a new personality.',
  usage: '/personality-create',
  aliases: ['p-new', 'p-add'],

  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    context.openPersonalityEditor(null); // Open editor for a new personality
    return {
      success: true,
      lines: [{
        id: `p-create-open-${Date.now()}`,
        type: 'system',
        content: 'Opening personality editor to create a new personality...',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      }],
      metadata: { action: 'open_personality_editor', personalityId: null } // For App.tsx to handle
    };
  }
};

// --- Subcommand: /personality-edit <id> ---
export const editPersonalityCommand: Command = {
  name: 'personality-edit',
  description: 'Opens the editor to modify an existing personality.',
  usage: '/personality-edit <id>',
  aliases: ['p-mod', 'p-update'],

  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    if (args.length === 0) {
      return { success: false, lines: [{ id: `p-edit-err-${timestamp}`, type: 'error', content: '❌ Usage: /personality-edit <personality_id>', timestamp, user: 'claudia' }] };
    }
    const personalityId = args[0];
    const personality = await context.storage.getPersonality(personalityId);

    if (!personality) {
      return { success: false, lines: [{ id: `p-edit-notfound-${timestamp}`, type: 'error', content: `❌ Personality "${personalityId}" not found.`, timestamp, user: 'claudia' }] };
    }
    context.openPersonalityEditor(personality);
    return {
      success: true,
      lines: [{
        id: `p-edit-open-${timestamp}`,
        type: 'system',
        content: `Opening personality editor for "${personality.name}"...`,
        timestamp,
        user: 'claudia'
      }],
      metadata: { action: 'open_personality_editor', personalityId: personality.id } // For App.tsx
    };
  }
};

// --- Subcommand: /personality-delete <id> ---
export const deletePersonalityCommand: Command = {
  name: 'personality-delete',
  description: 'Deletes a personality.',
  usage: '/personality-delete <id>',
  aliases: ['p-rm', 'p-del'],

  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    if (args.length === 0) {
      return { success: false, lines: [{ id: `p-del-err-${timestamp}`, type: 'error', content: '❌ Usage: /personality-delete <personality_id>', timestamp, user: 'claudia' }] };
    }
    const personalityId = args[0];
    const personality = await context.storage.getPersonality(personalityId);

    if (!personality) {
      return { success: false, lines: [{ id: `p-del-notfound-${timestamp}`, type: 'error', content: `❌ Personality "${personalityId}" not found.`, timestamp, user: 'claudia' }] };
    }
    if (personality.isDefault) {
      return { success: false, lines: [{ id: `p-del-default-${timestamp}`, type: 'error', content: '❌ Cannot delete the default system personality.', timestamp, user: 'claudia' }] };
    }
    const activePersonality = await context.storage.getActivePersonality();
    if (activePersonality?.id === personalityId) {
        return { success: false, lines: [{ id: `p-del-active-${timestamp}`, type: 'error', content: '❌ Cannot delete the active personality. Switch to another first using "/personality-set <id>".', timestamp, user: 'claudia' }] };
    }

    const success = await context.storage.deletePersonality(personalityId);
    if (success) {
      return { success: true, lines: [{ id: `p-del-succ-${timestamp}`, type: 'output', content: `🗑️ Deleted personality: ${personality.name}`, timestamp, user: 'claudia' }] };
    } else {
      return { success: false, lines: [{ id: `p-del-fail-${timestamp}`, type: 'error', content: '❌ Failed to delete personality.', timestamp, user: 'claudia' }] };
    }
  }
};

// --- Subcommand: /personality-init ---
export const initDefaultPersonalityCommand: Command = {
  name: 'personality-init',
  description: 'Initializes or resets the default personality if missing.',
  usage: '/personality-init',
  aliases: ['p-init'],

  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const existing = await context.storage.getPersonality('default');
    
    // Save (which also updates if exists) and set active
    await context.storage.savePersonality(DEFAULT_PERSONALITY); 
    await context.storage.setActivePersonality('default');

    if (existing) {
      return { success: true, lines: [{ id: `p-init-reset-${timestamp}`, type: 'output', content: '🎭 Default personality has been reset and set as active.', timestamp, user: 'claudia' }] };
    }
    
    return { success: true, lines: [{ id: `p-init-succ-${timestamp}`, type: 'output', content: '🎭 Initialized default personality: Claudia - Default, and set as active.', timestamp, user: 'claudia' }] };
  }
};

// Placeholder for /personality-view <id> if you want a CLI view without modal
export const viewPersonalityCommand: Command = {
  name: 'personality-view',
  description: 'Displays detailed information about a specific personality in the terminal.',
  usage: '/personality-view <id>',
  aliases: ['p-info', 'p-show'],
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    if (args.length === 0) {
      return { success: false, lines: [{ id: `p-view-err-${timestamp}`, type: 'error', content: '❌ Usage: /personality-view <personality_id>', timestamp, user: 'claudia' }] };
    }
    const personalityId = args[0];
    const p = await context.storage.getPersonality(personalityId);

    if (!p) {
      return { success: false, lines: [{ id: `p-view-notfound-${timestamp}`, type: 'error', content: `❌ Personality with ID '${personalityId}' not found.`, timestamp, user: 'claudia' }] };
    }

    const lines: TerminalLine[] = [
      { id: `pv-header-${timestamp}`, type: 'system', content: `🎭 Details for Personality: ${p.name} (ID: ${p.id})`, timestamp, user: 'claudia' },
      { id: `pv-desc-${timestamp}`, type: 'output', content: `  Description: "${p.description}"`, timestamp, user: 'claudia' },
      { id: `pv-default-${timestamp}`, type: 'output', content: `  Is Default: ${p.isDefault ? 'Yes (System Default)' : 'No'}`, timestamp, user: 'claudia' },
      { id: `pv-created-${timestamp}`, type: 'output', content: `  Created: ${new Date(p.created_at).toLocaleString()}`, timestamp, user: 'claudia' },
      { id: `pv-updated-${timestamp}`, type: 'output', content: `  Updated: ${new Date(p.updated_at).toLocaleString()}`, timestamp, user: 'claudia' },
      { id: `pv-usage-${timestamp}`, type: 'output', content: `  Usage Count: ${p.usage_count}`, timestamp, user: 'claudia' },
      { id: `pv-space-${timestamp}`, type: 'output', content: ``, timestamp, user: 'claudia' },
      { id: `pv-prompt-header-${timestamp}`, type: 'system', content: `  System Prompt:`, timestamp, user: 'claudia' },
      // Split system prompt into multiple lines if it's very long for better readability
      ...p.system_prompt.split('\n').map((line, index) => ({
        id: `pv-prompt-line-${index}-${timestamp}`,
        type: 'output',
        content: `    ${line}`, // Indent prompt lines
        timestamp,
        user: 'claudia'
      })),
    ];
    return { success: true, lines };
  }
};
