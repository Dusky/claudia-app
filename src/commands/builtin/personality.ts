import type { Command, CommandResult, CommandContext } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { DEFAULT_PERSONALITY } from '../../types/personality'; // Removed unused Personality type import
import type { StorageService } from '../../storage/types'; // Changed MockDatabase to StorageService

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
        return listPersonalities(storage);
        
      case 'current':
        return showCurrentPersonality(storage);
        
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
        return switchPersonality(args[1], storage, context); // Pass context for openPersonalityEditor
        
      case 'create':
      case 'new':
        // For now, show instructions until modal is fully working
        return {
          success: true,
          lines: [{
            id: `personality-create-${Date.now()}`,
            type: 'output',
            content: 'Personality creation feature is in development. Use "/personality list" to see available personalities.',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }]
        };
        
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
        // For now, show instructions until modal is fully working
        return {
          success: true,
          lines: [{
            id: `personality-edit-${Date.now()}`,
            type: 'output',
            content: 'Personality editing feature is in development. Use "/personality current" to see the active personality.',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }]
        };
        
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
        return deletePersonality(args[1], storage);
        
      case 'init':
        return initializeDefaultPersonality(storage);
        
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

async function listPersonalities(storage: StorageService): Promise<CommandResult> {
  if (!storage.getAllPersonalities || !storage.getActivePersonality) {
    return {
      success: false,
      lines: [{
        id: `personality-error-${Date.now()}`,
        type: 'error',
        content: 'Personality storage not available',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      }]
    };
  }
  
  const personalities = await storage.getAllPersonalities();
  const activePersonality = await storage.getActivePersonality();
  const lines: TerminalLine[] = [];
  
  if (!personalities || personalities.length === 0) {
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
    const usageCount = p.usage_count && p.usage_count > 0 ? ` • Used ${p.usage_count} times` : '';
    
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

async function showCurrentPersonality(storage: StorageService): Promise<CommandResult> {
  if (!storage.getActivePersonality) {
    return {
      success: false,
      lines: [{
        id: `personality-error-${Date.now()}`,
        type: 'error',
        content: 'Personality storage not available',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      }]
    };
  }
  
  const personality = await storage.getActivePersonality();
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
  
  const usageCountText = personality.usage_count && personality.usage_count > 0 ? ` • Used ${personality.usage_count} times` : '';
  lines.push({
    id: `personality-current-${Date.now()}-id`,
    type: 'output',
    content: `ID: ${personality.id}${usageCountText}`,
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  
  return { success: true, lines };
}

async function switchPersonality(id: string, storage: StorageService, _context: CommandContext): Promise<CommandResult> { // Mark context as unused
  if (!storage.getPersonality || !storage.setActivePersonality) {
    return {
      success: false,
      lines: [{
        id: `personality-error-${Date.now()}`,
        type: 'error',
        content: 'Personality storage not available',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      }]
    };
  }
  
  const personality = await storage.getPersonality(id);
  const lines: TerminalLine[] = [];
  
  if (!personality) {
    lines.push({
      id: `personality-switch-error-${Date.now()}`,
      type: 'error',
      content: `Personality "${id}" not found. Use "/personality list" to see available personalities.`,
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  const success = await storage.setActivePersonality(id);
  
  if (success) {
    // Update the system prompt in the LLM manager if personality has one
    // This part is a placeholder for when system prompt generation is fully integrated
    // For now, we just confirm the switch.
    // if (context.llmManager.updateSystemPrompt) {
    //   const systemPrompt = generateSystemPrompt(personality); // Assuming generateSystemPrompt exists
    //   context.llmManager.updateSystemPrompt(systemPrompt);
    // }

    lines.push({
      id: `personality-switch-success-${Date.now()}`,
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

async function deletePersonality(id: string, storage: StorageService): Promise<CommandResult> {
  if (!storage.getPersonality || !storage.deletePersonality) {
    return {
      success: false,
      lines: [{
        id: `personality-error-${Date.now()}`,
        type: 'error',
        content: 'Personality storage not available',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      }]
    };
  }
  
  const personality = await storage.getPersonality(id);
  const lines: TerminalLine[] = [];
  
  if (!personality) {
    lines.push({
      id: `personality-delete-error-${Date.now()}`,
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
  
  const success = await storage.deletePersonality(id);
  
  if (success) {
    lines.push({
      id: `personality-delete-success-${Date.now()}`,
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

async function initializeDefaultPersonality(storage: StorageService): Promise<CommandResult> {
  if (!storage.getPersonality || !storage.savePersonality || !storage.setActivePersonality) {
    return {
      success: false,
      lines: [{
        id: `personality-error-${Date.now()}`,
        type: 'error',
        content: 'Personality storage not available',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      }]
    };
  }
  
  const existing = await storage.getPersonality('default');
  const lines: TerminalLine[] = [];
  
  if (existing) {
    lines.push({
      id: `personality-init-exists-${Date.now()}`,
      type: 'output',
      content: 'Default personality already exists.',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    return { success: true, lines };
  }
  
  await storage.savePersonality(DEFAULT_PERSONALITY);
  await storage.setActivePersonality('default');
  
  lines.push({
    id: `personality-init-success-${Date.now()}`,
    type: 'output',
    content: '◈ Initialized default personality: Claudia - Default',
    timestamp: new Date().toISOString(),
    user: 'claudia'
  });
  return { success: true, lines };
}

// The openPersonalityEditor helper is removed as its logic is now directly in the execute method's
// 'create' and 'edit' cases, using context.openPersonalityEditor.
