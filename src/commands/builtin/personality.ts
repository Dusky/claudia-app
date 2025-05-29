import type { Command, CommandResult, CommandContext } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { DEFAULT_PERSONALITY } from '../../types/personality';

// --- Main /personality command ---
export const personalityCommand: Command = {
  name: 'personality',
  description: 'Manage AI personalities. Lists personality subcommands.',
  usage: '/personality [help|gui]',
  aliases: ['p', 'persona'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    if (args.length > 0 && args[0]?.toLowerCase() === 'gui') {
      const guiCommand = context.commandRegistry.get('personality-gui');
      if (guiCommand) {
        return guiCommand.execute([], context);
      }
      return { success: false, lines: [{ id: `p-gui-err-${timestamp}`, type: 'error', content: 'Error: GUI command not found.', timestamp }]};
    }

    if (args.length === 0 || args[0]?.toLowerCase() === 'help') {
      lines.push({
        id: `p-help-header-${timestamp}`,
        type: 'system',
        content: 'Personality: Management Subcommands:', // Emoji removed
        timestamp, user: 'claudia'
      });
       lines.push({
        id: `p-help-blank-${timestamp}`,
        type: 'output',
        content: '',
        timestamp, user: 'claudia'
      });
      lines.push({
        id: `p-help-cmd-gui-${timestamp}`,
        type: 'output',
        content: `  /personality gui             - Open the graphical personality editor.`,
        timestamp, user: 'claudia'
      });

      const allCommands = context.commandRegistry.getAllCommands();
      const personalitySubCommands = allCommands
        .filter((cmd: any) => cmd.name.startsWith('personality-') && cmd.name !== 'personality' && cmd.name !== 'personality-gui')
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      if (personalitySubCommands.length > 0) {
        personalitySubCommands.forEach((cmd: any) => {
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
          content: '  Info: No other personality subcommands found (ensure they are registered).',
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
        content: "Info: Type '/help [subcommand_name]' for more details on a specific subcommand.",
        timestamp, user: 'claudia'
      });
      return { success: true, lines };
    }

    return {
      success: false,
      lines: [{
        id: `p-invalid-${timestamp}`,
        type: 'error',
        content: `Error: Invalid argument for /personality. Use '/personality gui' or '/personality help'.`, // Emoji removed
        timestamp, user: 'claudia'
      }],
    };
  }
};

// --- Subcommand: /personality-gui ---
export const personalityGuiCommand: Command = {
  name: 'personality-gui',
  description: 'Opens the graphical editor for managing personalities.',
  usage: '/personality-gui',
  aliases: ['p-gui', 'p-editor'],

  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    context.openPersonalityEditor(undefined); 
    return {
      success: true,
      lines: [{
        id: `p-gui-open-${Date.now()}`,
        type: 'system',
        content: 'System: Opening graphical personality editor...',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      }],
      metadata: { action: 'open_personality_editor', personalityId: undefined } 
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
        content: 'Info: No personalities found. Use "/personality-gui" or "/personality-create" to make one, or "/personality-init" to restore the default.',
        timestamp,
        user: 'claudia'
      });
    } else {
      lines.push({
        id: `p-list-header-${timestamp}`,
        type: 'system',
        content: 'Personality: Available Personalities:', // Emoji removed
        timestamp,
        user: 'claudia'
      });
      lines.push({ id: `p-list-space-${timestamp}`, type: 'output', content: '', timestamp, user: 'claudia' });

      personalities.forEach((p, index) => {
        const isActive = activePersonality?.id === p.id;
        const indicator = isActive ? '-> *' : '  -'; // Using text indicators
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
    lines.push({ id: `p-list-footer1-${timestamp}`, type: 'system', content: 'Info: Use "/personality-set <id>" to change personality.', timestamp, user: 'claudia' });
    lines.push({ id: `p-list-footer2-${timestamp}`, type: 'system', content: 'Info: Use "/personality-gui" or "/personality-create" to create/edit.', timestamp, user: 'claudia' });
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
        content: 'Error: No active personality set. Use "/personality-list" and "/personality-set <id>".', // Emoji removed
        timestamp, user: 'claudia'
      });
      return { success: false, lines };
    }

    lines.push({ id: `p-curr-title-${timestamp}`, type: 'system', content: `Personality: Current Personality: ${personality.name} (ID: ${personality.id})`, timestamp, user: 'claudia' }); // Emoji removed
    lines.push({ id: `p-curr-desc-${timestamp}`, type: 'output', content: `  Description: "${personality.description}"`, timestamp, user: 'claudia' });
    lines.push({ id: `p-curr-usage-${timestamp}`, type: 'output', content: `  Usage Count: ${personality.usage_count}`, timestamp, user: 'claudia' });
    if (personality.isDefault) {
      lines.push({ id: `p-curr-default-${timestamp}`, type: 'output', content: `  This is a default system personality.`, timestamp, user: 'claudia' });
    }
    lines.push({ id: `p-curr-space1-${timestamp}`, type: 'output', content: '', timestamp, user: 'claudia' });


    lines.push({ id: `p-curr-prompt-info-${timestamp}`, type: 'system', content: `  Info: System prompt is active. Use "/personality-view ${personality.id}" to see the full prompt.`, timestamp, user: 'claudia' });
    
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
      return { success: false, lines: [{ id: `p-set-err-${timestamp}`, type: 'error', content: 'Error: Usage: /personality-set <personality_id>', timestamp, user: 'claudia' }] }; // Emoji removed
    }
    const personalityId = args[0];
    const personality = await context.storage.getPersonality(personalityId);

    if (!personality) {
      return { success: false, lines: [{ id: `p-set-notfound-${timestamp}`, type: 'error', content: `Error: Personality "${personalityId}" not found.`, timestamp, user: 'claudia' }] }; // Emoji removed
    }

    const success = await context.storage.setActivePersonality(personalityId);
    if (success) {
      return { success: true, lines: [{ id: `p-set-succ-${timestamp}`, type: 'output', content: `Personality: Switched to personality: ${personality.name}`, timestamp, user: 'claudia' }] }; // Emoji removed
    } else {
      return { success: false, lines: [{ id: `p-set-fail-${timestamp}`, type: 'error', content: 'Error: Failed to switch personality.', timestamp, user: 'claudia' }] }; // Emoji removed
    }
  }
};

// --- Subcommand: /personality-create ---
export const createPersonalityCommand: Command = {
  name: 'personality-create',
  description: 'Opens the editor to create a new personality (via GUI).',
  usage: '/personality-create',
  aliases: ['p-new', 'p-add'],

  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    context.openPersonalityEditor(null); 
    return {
      success: true,
      lines: [{
        id: `p-create-open-${Date.now()}`,
        type: 'system',
        content: 'System: Opening personality editor to create a new personality...',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      }],
      metadata: { action: 'open_personality_editor', personalityId: null } 
    };
  }
};

// --- Subcommand: /personality-edit <id> ---
export const editPersonalityCommand: Command = {
  name: 'personality-edit',
  description: 'Opens the editor to modify an existing personality (via GUI).',
  usage: '/personality-edit <id>',
  aliases: ['p-mod', 'p-update'],

  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    if (args.length === 0) {
      return { success: false, lines: [{ id: `p-edit-err-${timestamp}`, type: 'error', content: 'Error: Usage: /personality-edit <personality_id>', timestamp, user: 'claudia' }] }; // Emoji removed
    }
    const personalityId = args[0];
    const personality = await context.storage.getPersonality(personalityId);

    if (!personality) {
      return { success: false, lines: [{ id: `p-edit-notfound-${timestamp}`, type: 'error', content: `Error: Personality "${personalityId}" not found.`, timestamp, user: 'claudia' }] }; // Emoji removed
    }
    context.openPersonalityEditor(personality); 
    return {
      success: true,
      lines: [{
        id: `p-edit-open-${timestamp}`,
        type: 'system',
        content: `System: Opening personality editor for "${personality.name}"...`,
        timestamp,
        user: 'claudia'
      }],
      metadata: { action: 'open_personality_editor', personalityId: personality.id } 
    };
  }
};

// --- Subcommand: /personality-delete <id> ---
export const deletePersonalityCommand: Command = {
  name: 'personality-delete',
  description: 'Deletes a personality. (Use GUI for safer deletion)',
  usage: '/personality-delete <id>',
  aliases: ['p-rm', 'p-del'],

  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();
    if (args.length === 0) {
      return { success: false, lines: [{ id: `p-del-err-${timestamp}`, type: 'error', content: 'Error: Usage: /personality-delete <personality_id>', timestamp, user: 'claudia' }] }; // Emoji removed
    }
    const personalityId = args[0];
    const personality = await context.storage.getPersonality(personalityId);

    if (!personality) {
      return { success: false, lines: [{ id: `p-del-notfound-${timestamp}`, type: 'error', content: `Error: Personality "${personalityId}" not found.`, timestamp, user: 'claudia' }] }; // Emoji removed
    }
    if (personality.isDefault) {
      return { success: false, lines: [{ id: `p-del-default-${timestamp}`, type: 'error', content: 'Error: Cannot delete the default system personality.', timestamp, user: 'claudia' }] }; // Emoji removed
    }
    const activePersonality = await context.storage.getActivePersonality();
    if (activePersonality?.id === personalityId) {
        const defaultP = await context.storage.getPersonality(DEFAULT_PERSONALITY.id);
        if (defaultP && defaultP.id !== personalityId) { 
            await context.storage.setActivePersonality(DEFAULT_PERSONALITY.id);
             lines.push({ id: `p-del-autoswitch-${timestamp}`, type: 'system', content: `System: Switched to default personality before deleting active one.`, timestamp, user: 'claudia' });
        } else {
            return { success: false, lines: [{ id: `p-del-active-nodefault-${timestamp}`, type: 'error', content: 'Error: Cannot delete active personality. Set another active first or ensure a different default exists.', timestamp, user: 'claudia' }] }; // Emoji removed
        }
    }

    const success = await context.storage.deletePersonality(personalityId);
    if (success) {
      lines.push({ id: `p-del-succ-${timestamp}`, type: 'output', content: `Deleted: Personality: ${personality.name}`, timestamp, user: 'claudia' }); // Emoji removed
      return { success: true, lines };
    } else {
      lines.push({ id: `p-del-fail-${timestamp}`, type: 'error', content: 'Error: Failed to delete personality.', timestamp, user: 'claudia' }); // Emoji removed
      return { success: false, lines };
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
    
    await context.storage.savePersonality(DEFAULT_PERSONALITY); 
    await context.storage.setActivePersonality('default');

    if (existing) {
      return { success: true, lines: [{ id: `p-init-reset-${timestamp}`, type: 'output', content: 'Personality: Default personality has been reset and set as active.', timestamp, user: 'claudia' }] }; // Emoji removed
    }
    
    return { success: true, lines: [{ id: `p-init-succ-${timestamp}`, type: 'output', content: 'Personality: Initialized default personality: Claudia - Default, and set as active.', timestamp, user: 'claudia' }] }; // Emoji removed
  }
};

// --- Subcommand: /personality-view <id> ---
export const viewPersonalityCommand: Command = {
  name: 'personality-view',
  description: 'Displays detailed information about a specific personality in the terminal.',
  usage: '/personality-view <id>',
  aliases: ['p-info', 'p-show'],
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    if (args.length === 0) {
      return { success: false, lines: [{ id: `p-view-err-${timestamp}`, type: 'error', content: 'Error: Usage: /personality-view <personality_id>', timestamp, user: 'claudia' }] }; // Emoji removed
    }
    const personalityId = args[0];
    const p = await context.storage.getPersonality(personalityId);

    if (!p) {
      return { success: false, lines: [{ id: `p-view-notfound-${timestamp}`, type: 'error', content: `Error: Personality with ID '${personalityId}' not found.`, timestamp, user: 'claudia' }] }; // Emoji removed
    }

    const lines: TerminalLine[] = [
      { id: `pv-header-${timestamp}`, type: 'system', content: `Personality Details: ${p.name} (ID: ${p.id})`, timestamp, user: 'claudia' }, // Emoji removed
      { id: `pv-desc-${timestamp}`, type: 'output', content: `  Description: "${p.description}"`, timestamp, user: 'claudia' },
      { id: `pv-default-${timestamp}`, type: 'output', content: `  Is Default: ${p.isDefault ? 'Yes (System Default)' : 'No'}`, timestamp, user: 'claudia' },
      { id: `pv-created-${timestamp}`, type: 'output', content: `  Created: ${new Date(p.created_at).toLocaleString()}`, timestamp, user: 'claudia' },
      { id: `pv-updated-${timestamp}`, type: 'output', content: `  Updated: ${new Date(p.updated_at).toLocaleString()}`, timestamp, user: 'claudia' },
      { id: `pv-usage-${timestamp}`, type: 'output', content: `  Usage Count: ${p.usage_count}`, timestamp, user: 'claudia' },
      { id: `pv-space-${timestamp}`, type: 'output', content: ``, timestamp, user: 'claudia' },
      { id: `pv-prompt-header-${timestamp}`, type: 'system', content: `  System Prompt:`, timestamp, user: 'claudia' },
      ...p.system_prompt.split('\n').map((line, index) => ({
        id: `pv-prompt-line-${index}-${timestamp}`,
        type: 'output' as const,
        content: `    ${line}`, 
        timestamp,
        user: 'claudia' as const
      })),
    ];
    return { success: true, lines };
  }
};
