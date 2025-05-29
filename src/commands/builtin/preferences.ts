import type { Command, CommandResult, CommandContext } from '../types';
import { UserPreferencesManager } from '../../services/userPreferences';

const preferencesManager = UserPreferencesManager.getInstance();

export const preferencesCommand: Command = {
  name: 'preferences',
  description: 'Manage user preferences and settings',
  usage: '/preferences [get|set|list|reset|export|import] [key] [value]',
  aliases: ['prefs', 'settings', 'config'],
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    if (args.length === 0) {
      return await showPreferencesOverview();
    }

    const [subcommand, ...subArgs] = args;

    switch (subcommand.toLowerCase()) {
      case 'get':
        return await getPreference(subArgs);
      
      case 'set':
        return await setPreference(subArgs);
      
      case 'list':
        return await listPreferences(subArgs);
      
      case 'reset':
        return await resetPreference(subArgs);
      
      case 'export':
        return await exportPreferences();
      
      case 'import':
        return await importPreferences(subArgs);
      
      case 'categories':
        return await showCategories();
      
      case 'category':
        return await showCategory(subArgs);
      
      default:
        return {
          success: false,
          error: `Unknown preferences command: ${subcommand}. Use /preferences for overview.`
        };
    }
  }
};

async function showPreferencesOverview(): Promise<CommandResult> {
  const preferences = preferencesManager.getPreferences();
  const categories = preferencesManager.getPreferenceCategories();
  
  let output = 'ClaudiaOS User Preferences\n\n';
  output += 'Quick Settings:\n';
  output += `  Theme: ${preferences.theme}\n`;
  output += `  CRT Effect: ${preferences.enableCRTEffect ? 'Enabled' : 'Disabled'}\n`;
  output += `  Avatar: ${preferences.avatarEnabled ? 'Enabled' : 'Disabled'}\n`;
  output += `  AI Provider: ${preferences.defaultAIProvider}\n`;
  output += `  Debug Mode: ${preferences.developerMode ? 'Enabled' : 'Disabled'}\n\n`;
  
  output += 'Categories:\n';
  categories.forEach(category => {
    output += `  ${category.icon} ${category.name} - ${category.description}\n`;
  });
  
  output += '\nCommands:\n';
  output += '  /preferences list                    - Show all preferences\n';
  output += '  /preferences categories              - Show all categories\n';
  output += '  /preferences category <name>         - Show category preferences\n';
  output += '  /preferences get <key>               - Get a specific preference\n';
  output += '  /preferences set <key> <value>       - Set a preference\n';
  output += '  /preferences reset [key]             - Reset preference(s) to default\n';
  output += '  /preferences export                  - Export all preferences\n';
  output += '  /preferences import <json>           - Import preferences from JSON\n';
  
  return { success: true, message: output };
}

async function getPreference(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      error: 'Usage: /preferences get <key>'
    };
  }

  const key = args[0] as keyof import('../../services/userPreferences').UserPreferences;
  const definition = preferencesManager.getPreferenceDefinition(key);
  
  if (!definition) {
    return {
      success: false,
      error: `Unknown preference key: ${key}. Use "/preferences list" to see all keys.`
    };
  }

  const value = preferencesManager.getPreference(key);
  
  let output = `Preference: ${definition.name}\n\n`;
  output += `Key: ${key}\n`;
  output += `Current Value: ${JSON.stringify(value)}\n`;
  output += `Default Value: ${JSON.stringify(definition.defaultValue)}\n`;
  output += `Type: ${definition.type}\n`;
  output += `Description: ${definition.description}\n`;
  
  if (definition.options) {
    output += `Options: ${JSON.stringify(definition.options)}\n`;
  }
  
  if (definition.min !== undefined || definition.max !== undefined) {
    output += `Range: ${definition.min} - ${definition.max}\n`;
  }
  
  if (definition.requires) {
    output += `Requires: ${definition.requires}\n`;
  }

  return { success: true, message: output };
}

async function setPreference(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      error: 'Usage: /preferences set <key> <value>'
    };
  }

  const key = args[0] as keyof import('../../services/userPreferences').UserPreferences;
  const valueStr = args.slice(1).join(' ');
  
  const definition = preferencesManager.getPreferenceDefinition(key);
  
  if (!definition) {
    return {
      success: false,
      error: `Unknown preference key: ${key}. Use "/preferences list" to see all keys.`
    };
  }

  // Parse value based on type
  let value: any;
  try {
    switch (definition.type) {
      case 'boolean':
        const boolStr = valueStr.toLowerCase();
        if (['true', '1', 'yes', 'on', 'enabled'].includes(boolStr)) {
          value = true;
        } else if (['false', '0', 'no', 'off', 'disabled'].includes(boolStr)) {
          value = false;
        } else {
          return {
            success: false,
            error: `Invalid boolean value. Use: true/false, yes/no, on/off, enabled/disabled`
          };
        }
        break;
      
      case 'number':
      case 'range':
        value = parseFloat(valueStr);
        if (isNaN(value)) {
          return {
            success: false,
            error: `Invalid number value: ${valueStr}`
          };
        }
        
        if (definition.min !== undefined && value < definition.min) {
          return {
            success: false,
            error: `Value must be at least ${definition.min}`
          };
        }
        
        if (definition.max !== undefined && value > definition.max) {
          return {
            success: false,
            error: `Value must be at most ${definition.max}`
          };
        }
        break;
      
      case 'select':
        if (definition.options) {
          const validOptions = Array.isArray(definition.options[0]) ? 
            definition.options.map((opt: any) => opt.value) : 
            definition.options;
          
          if (!validOptions.includes(valueStr)) {
            return {
              success: false,
              error: `Invalid option. Valid options: ${validOptions.join(', ')}`
            };
          }
        }
        value = valueStr;
        break;
      
      case 'string':
      default:
        value = valueStr;
        break;
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse value: ${error}`
    };
  }

  // Check requirements
  if (definition.requires) {
    const requiredValue = preferencesManager.getPreference(definition.requires);
    if (!requiredValue) {
      return {
        success: false,
        error: `This preference requires "${definition.requires}" to be enabled first.`
      };
    }
  }

  const success = preferencesManager.setPreference(key, value);
  
  if (success) {
    return {
      success: true,
      message: `Preference "${key}" set to: ${JSON.stringify(value)}`
    };
  } else {
    return {
      success: false,
      error: `Failed to set preference "${key}". Value may be invalid.`
    };
  }
}

async function listPreferences(args: string[]): Promise<CommandResult> {
  const categoryFilter = args[0];
  const definitions = preferencesManager.getPreferenceDefinitions();
  const preferences = preferencesManager.getPreferences();
  
  let filtered = definitions;
  if (categoryFilter) {
    filtered = definitions.filter(def => def.category === categoryFilter);
    if (filtered.length === 0) {
      return {
        success: false,
        error: `No preferences found for category: ${categoryFilter}`
      };
    }
  }

  let output = categoryFilter ? 
    `Preferences in category "${categoryFilter}":\n\n` : 
    'All User Preferences:\n\n';

  // Group by category
  const byCategory: Record<string, typeof definitions> = {};
  filtered.forEach(def => {
    if (!byCategory[def.category]) {
      byCategory[def.category] = [];
    }
    byCategory[def.category].push(def);
  });

  Object.entries(byCategory).forEach(([category, defs]) => {
    output += `${category.toUpperCase()}:\n`;
    defs.forEach(def => {
      const currentValue = preferences[def.id];
      const isDefault = JSON.stringify(currentValue) === JSON.stringify(def.defaultValue);
      const status = isDefault ? '' : ' (modified)';
      
      output += `  ${def.id.padEnd(25)} = ${JSON.stringify(currentValue)}${status}\n`;
      output += `    ${def.description}\n`;
    });
    output += '\n';
  });

  output += 'Use "/preferences get <key>" for detailed information about a preference.\n';
  output += 'Use "/preferences set <key> <value>" to change a preference.';

  return { success: true, message: output };
}

async function resetPreference(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    // Reset all preferences
    preferencesManager.resetToDefaults();
    return {
      success: true,
      message: 'All preferences have been reset to their default values.'
    };
  }

  const key = args[0] as keyof import('../../services/userPreferences').UserPreferences;
  const definition = preferencesManager.getPreferenceDefinition(key);
  
  if (!definition) {
    return {
      success: false,
      error: `Unknown preference key: ${key}. Use "/preferences list" to see all keys.`
    };
  }

  preferencesManager.resetPreference(key);
  
  return {
    success: true,
    message: `Preference "${key}" reset to default value: ${JSON.stringify(definition.defaultValue)}`
  };
}

async function exportPreferences(): Promise<CommandResult> {
  const exported = preferencesManager.exportPreferences();
  
  // In a real environment, this would trigger a download
  // For now, show a truncated preview
  const preview = exported.length > 1000 ? 
    exported.substring(0, 1000) + '\n... (truncated)' : 
    exported;

  return {
    success: true,
    message: `Preferences Export (JSON):\n\n${preview}\n\nIn a real environment, this would download as a file.\nCopy this JSON to import in another session.`
  };
}

async function importPreferences(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      error: 'Usage: /preferences import <json-string>\n\nPaste the JSON from a preferences export.'
    };
  }

  const jsonString = args.join(' ');
  const success = preferencesManager.importPreferences(jsonString);
  
  if (success) {
    return {
      success: true,
      message: 'Preferences imported successfully. Some settings may require a refresh to take effect.'
    };
  } else {
    return {
      success: false,
      error: 'Failed to import preferences. Please check that the JSON is valid and contains valid preference values.'
    };
  }
}

async function showCategories(): Promise<CommandResult> {
  const categories = preferencesManager.getPreferenceCategories();
  
  let output = 'Preference Categories:\n\n';
  
  categories.forEach(category => {
    output += `${category.icon} ${category.name}\n`;
    output += `  ID: ${category.id}\n`;
    output += `  Description: ${category.description}\n`;
    output += `  Preferences: ${category.preferences.length}\n`;
    output += `  View: /preferences category ${category.id}\n\n`;
  });

  return { success: true, message: output };
}

async function showCategory(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      error: 'Usage: /preferences category <category-id>'
    };
  }

  const categoryId = args[0];
  const categories = preferencesManager.getPreferenceCategories();
  const category = categories.find(cat => cat.id === categoryId);
  
  if (!category) {
    return {
      success: false,
      error: `Unknown category: ${categoryId}. Use "/preferences categories" to see all categories.`
    };
  }

  const preferences = preferencesManager.getPreferences();
  
  let output = `${category.icon} ${category.name}\n`;
  output += `${category.description}\n\n`;
  
  if (category.preferences.length === 0) {
    output += 'No preferences in this category.\n';
  } else {
    category.preferences.forEach(pref => {
      const currentValue = preferences[pref.id];
      const isDefault = JSON.stringify(currentValue) === JSON.stringify(pref.defaultValue);
      const status = isDefault ? '' : ' (modified)';
      
      output += `${pref.name}${status}\n`;
      output += `  Key: ${pref.id}\n`;
      output += `  Value: ${JSON.stringify(currentValue)}\n`;
      output += `  Default: ${JSON.stringify(pref.defaultValue)}\n`;
      output += `  Description: ${pref.description}\n`;
      
      if (pref.options) {
        output += `  Options: ${JSON.stringify(pref.options)}\n`;
      }
      
      if (pref.requires) {
        output += `  Requires: ${pref.requires}\n`;
      }
      
      output += '\n';
    });
  }
  
  output += `Use "/preferences list ${categoryId}" for a compact view.\n`;
  output += 'Use "/preferences set <key> <value>" to change settings.';

  return { success: true, message: output };
}