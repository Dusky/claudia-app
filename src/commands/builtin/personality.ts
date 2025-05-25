import type { Command, CommandResult, CommandContext } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { DEFAULT_PERSONALITY } from '../../types/personality';
import type { MockDatabase } from '../../storage/mockDatabase';

export const personalityCommand: Command = {
  name: 'personality',
  description: 'Manage AI personalities',
  usage: '/personality [list|create|edit <id>|switch <id>|delete <id>|current]',
  aliases: ['persona'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const { storage } = context;
    const subcommand = args[0]?.toLowerCase();
    
    switch (subcommand) {
      case 'list':
      case undefined:
        return await listPersonalities(storage);
        
      case 'current':
        return await showCurrentPersonality(storage);
        
      case 'switch':
      case 'use':
      case 'activate':
        if (!args[1]) {
          return { 
            success: false, 
            lines: [{
              id: `personality-error-${Date.now()}`,
              type: 'error',
              content: 'Usage: /personality switch <personality_id>',
              timestamp: new Date().toISOString(),
              user: 'claudia'
            }]
          };
        }
        return await switchPersonality(args[1], storage);
        
      case 'create':
      case 'new':
        return await openPersonalityEditor(null, context);
        
      case 'edit':
      case 'modify':
        if (!args[1]) {
          return { 
            success: false, 
            lines: [{
              id: `personality-error-${Date.now()}`,
              type: 'error',
              content: 'Usage: /personality edit <personality_id>',
              timestamp: new Date().toISOString(),
              user: 'claudia'
            }]
          };
        }
        return await openPersonalityEditor(args[1], context);
        
      case 'delete':
      case 'remove':
        if (!args[1]) {
          return { 
            success: false, 
            lines: [{
              id: `personality-error-${Date.now()}`,
              type: 'error',
              content: 'Usage: /personality delete <personality_id>',
              timestamp: new Date().toISOString(),
              user: 'claudia'
            }]
          };
        }
        return await deletePersonality(args[1], storage);
        
      case 'init':
        return await initializeDefaultPersonality(storage);
        
      default:
        return {
          success: false,
          lines: [{
            id: `personality-error-${Date.now()}`,
            type: 'error',
            content: `Unknown subcommand: ${subcommand}`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }, {
            id: `personality-help-${Date.now()}`,
            type: 'output',
            content: '',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }, {
            id: `personality-help-${Date.now()}-1`,
            type: 'output',
            content: 'Available commands:',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }, {
            id: `personality-help-${Date.now()}-2`,
            type: 'output',
            content: '• /personality list - Show all personalities',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }, {
            id: `personality-help-${Date.now()}-3`,
            type: 'output',
            content: '• /personality current - Show active personality',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }, {
            id: `personality-help-${Date.now()}-4`,
            type: 'output',
            content: '• /personality switch <id> - Switch to personality',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }, {
            id: `personality-help-${Date.now()}-5`,
            type: 'output',
            content: '• /personality create - Create new personality',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }, {
            id: `personality-help-${Date.now()}-6`,
            type: 'output',
            content: '• /personality edit <id> - Edit personality',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }, {
            id: `personality-help-${Date.now()}-7`,
            type: 'output',
            content: '• /personality delete <id> - Delete personality',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }]
        };
    }
  }
};

async function listPersonalities(storage: MockDatabase): Promise<CommandResult> {
  const personalities = storage.getAllPersonalities();
  const activePersonality = storage.getActivePersonality();
  const lines: TerminalLine[] = [];
  
  if (personalities.length === 0) {
    lines.push({
      id: `personality-list-${Date.now()}`,
      type: 'output',
      content: 'No personalities found. Use "/personality init" to create the default personality.',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    return { success: true, lines };
  }
  
  lines.push({
    id: `personality-list-${Date.now()}-header`,
    type: 'output',
    content: '◈ Available Personalities:',
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  lines.push({
    id: `personality-list-${Date.now()}-space`,
    type: 'output',
    content: '',
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  personalities.forEach((p, index) => {
    const isActive = activePersonality?.id === p.id;
    const indicator = isActive ? '→ ●' : '  ○';
    const defaultLabel = p.isDefault ? ' (default)' : '';
    const usageCount = p.usage_count > 0 ? ` • Used ${p.usage_count} times` : '';
    
    lines.push({
      id: `personality-list-${Date.now()}-${index}-name`,
      type: 'output',
      content: `${indicator} ${p.name}${defaultLabel}`,
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    
    lines.push({
      id: `personality-list-${Date.now()}-${index}-desc`,
      type: 'output',
      content: `     ${p.description}${usageCount}`,
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    
    lines.push({
      id: `personality-list-${Date.now()}-${index}-id`,
      type: 'output',
      content: `     ID: ${p.id}`,
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    
    lines.push({
      id: `personality-list-${Date.now()}-${index}-space`,
      type: 'output',
      content: '',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
  });
  
  lines.push({
    id: `personality-list-${Date.now()}-footer1`,
    type: 'output',
    content: 'Use "/personality switch <id>" to change personality',
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  lines.push({
    id: `personality-list-${Date.now()}-footer2`,
    type: 'output',
    content: 'Use "/personality create" to create a new personality',
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  return { success: true, lines };
}

async function showCurrentPersonality(storage: MockDatabase): Promise<CommandResult> {
  const personality = storage.getActivePersonality();
  const lines: TerminalLine[] = [];
  
  if (!personality) {
    lines.push({
      id: `personality-current-${Date.now()}`,
      type: 'error',
      content: 'No active personality set. Use "/personality init" to create the default personality.',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  lines.push({
    id: `personality-current-${Date.now()}-title`,
    type: 'output',
    content: `☰ Current Personality: ${personality.name}`,
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  lines.push({
    id: `personality-current-${Date.now()}-space1`,
    type: 'output',
    content: '',
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  lines.push({
    id: `personality-current-${Date.now()}-desc`,
    type: 'output',
    content: `Description: ${personality.description}`,
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  lines.push({
    id: `personality-current-${Date.now()}-space2`,
    type: 'output',
    content: '',
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  lines.push({
    id: `personality-current-${Date.now()}-traits`,
    type: 'output',
    content: 'Traits:',
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  lines.push({
    id: `personality-current-${Date.now()}-tone`,
    type: 'output',
    content: `• Tone: ${personality.traits.tone}`,
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  lines.push({
    id: `personality-current-${Date.now()}-formality`,
    type: 'output',
    content: `• Formality: ${personality.traits.formality}`,
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  lines.push({
    id: `personality-current-${Date.now()}-humor`,
    type: 'output',
    content: `• Humor: ${personality.traits.humor}`,
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  lines.push({
    id: `personality-current-${Date.now()}-verbosity`,
    type: 'output',
    content: `• Verbosity: ${personality.traits.verbosity}`,
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  lines.push({
    id: `personality-current-${Date.now()}-enthusiasm`,
    type: 'output',
    content: `• Enthusiasm: ${personality.traits.enthusiasm}`,
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  lines.push({
    id: `personality-current-${Date.now()}-space3`,
    type: 'output',
    content: '',
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  lines.push({
    id: `personality-current-${Date.now()}-id`,
    type: 'output',
    content: `ID: ${personality.id} • Used ${personality.usage_count} times`,
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  return { success: true, lines };
}

async function switchPersonality(id: string, storage: MockDatabase): Promise<CommandResult> {
  const personality = storage.getPersonality(id);
  const lines: TerminalLine[] = [];
  
  if (!personality) {
    lines.push({
      id: `personality-switch-${Date.now()}`,
      type: 'error',
      content: `Personality "${id}" not found. Use "/personality list" to see available personalities.`,
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  const success = storage.setActivePersonality(id);
  
  if (success) {
    lines.push({
      id: `personality-switch-${Date.now()}-success`,
      type: 'output',
      content: `◈ Switched to personality: ${personality.name}`,
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    lines.push({
      id: `personality-switch-${Date.now()}-desc`,
      type: 'output',
      content: personality.description,
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    return { success: true, lines };
  } else {
    lines.push({
      id: `personality-switch-${Date.now()}-error`,
      type: 'error',
      content: 'Failed to switch personality. Please try again.',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    return { success: false, lines };
  }
}

async function deletePersonality(id: string, storage: MockDatabase): Promise<CommandResult> {
  const personality = storage.getPersonality(id);
  const lines: TerminalLine[] = [];
  
  if (!personality) {
    lines.push({
      id: `personality-delete-${Date.now()}`,
      type: 'error',
      content: `Personality "${id}" not found.`,
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  if (personality.isDefault) {
    lines.push({
      id: `personality-delete-${Date.now()}`,
      type: 'error',
      content: 'Cannot delete the default personality.',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  const success = storage.deletePersonality(id);
  
  if (success) {
    lines.push({
      id: `personality-delete-${Date.now()}-success`,
      type: 'output',
      content: `✗ Deleted personality: ${personality.name}`,
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    return { success: true, lines };
  } else {
    lines.push({
      id: `personality-delete-${Date.now()}-error`,
      type: 'error',
      content: 'Failed to delete personality. Please try again.',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    return { success: false, lines };
  }
}

async function initializeDefaultPersonality(storage: MockDatabase): Promise<CommandResult> {
  const existing = storage.getPersonality('default');
  const lines: TerminalLine[] = [];
  
  if (existing) {
    lines.push({
      id: `personality-init-${Date.now()}`,
      type: 'output',
      content: 'Default personality already exists.',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    return { success: true, lines };
  }
  
  storage.savePersonality(DEFAULT_PERSONALITY);
  storage.setActivePersonality('default');
  
  lines.push({
    id: `personality-init-${Date.now()}-success`,
    type: 'output',
    content: '◈ Initialized default personality: Claudia - Default',
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  return { success: true, lines };
}

async function openPersonalityEditor(id: string | null, _context: CommandContext): Promise<CommandResult> {
  // This will trigger opening the personality editor modal
  return {
    success: true,
    lines: [{
      id: `personality-editor-${Date.now()}`,
      type: 'output',
      content: '◈ Opening personality editor...',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    }],
    metadata: {
      action: 'open_personality_editor',
      personalityId: id
    }
  };
}