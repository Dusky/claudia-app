import type { Command, CommandResult, CommandContext } from '../types';
import { PluginManager } from '../../services/pluginSystem';

const pluginManager = PluginManager.getInstance();

export const pluginCommand: Command = {
  name: 'plugin',
  description: 'Manage ClaudiaOS plugins and extensions',
  usage: '/plugin [install|uninstall|list|enable|disable|info|search] [plugin-id]',
  aliases: ['plugins', 'ext', 'extension'],
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    if (args.length === 0) {
      return {
        success: true,
        message: `Plugin Management System

Available Commands:
  /plugin list                    - List all installed plugins
  /plugin search <query>          - Search available plugins
  /plugin install <plugin-id>     - Install a plugin
  /plugin uninstall <plugin-id>   - Uninstall a plugin
  /plugin enable <plugin-id>      - Enable a plugin
  /plugin disable <plugin-id>     - Disable a plugin
  /plugin info <plugin-id>        - Show plugin information
  /plugin reload <plugin-id>      - Reload a plugin
  /plugin store                   - Browse plugin store

Examples:
  /plugin list
  /plugin install weather-widget
  /plugin info system-monitor`
      };
    }

    const [subcommand, ...subArgs] = args;

    switch (subcommand.toLowerCase()) {
      case 'list':
        return await listPlugins();
      
      case 'search':
        return await searchPlugins(subArgs.join(' '));
      
      case 'install':
        if (subArgs.length === 0) {
          return { success: false, error: 'Usage: /plugin install <plugin-id>' };
        }
        return await installPlugin(subArgs[0]);
      
      case 'uninstall':
        if (subArgs.length === 0) {
          return { success: false, error: 'Usage: /plugin uninstall <plugin-id>' };
        }
        return await uninstallPlugin(subArgs[0]);
      
      case 'enable':
        if (subArgs.length === 0) {
          return { success: false, error: 'Usage: /plugin enable <plugin-id>' };
        }
        return await enablePlugin(subArgs[0]);
      
      case 'disable':
        if (subArgs.length === 0) {
          return { success: false, error: 'Usage: /plugin disable <plugin-id>' };
        }
        return await disablePlugin(subArgs[0]);
      
      case 'info':
        if (subArgs.length === 0) {
          return { success: false, error: 'Usage: /plugin info <plugin-id>' };
        }
        return await getPluginInfo(subArgs[0]);
      
      case 'reload':
        if (subArgs.length === 0) {
          return { success: false, error: 'Usage: /plugin reload <plugin-id>' };
        }
        return await reloadPlugin(subArgs[0]);
      
      case 'store':
        return await browsePluginStore();
      
      default:
        return {
          success: false,
          error: `Unknown plugin command: ${subcommand}. Use /plugin for help.`
        };
    }
  }
};

async function listPlugins(): Promise<CommandResult> {
  const plugins = pluginManager.getInstalledPlugins();
  
  if (plugins.length === 0) {
    return {
      success: true,
      message: 'No plugins installed. Use "/plugin store" to browse available plugins.'
    };
  }

  let output = 'Installed Plugins:\n\n';
  plugins.forEach(plugin => {
    const status = pluginManager.isPluginEnabled(plugin.id) ? '🟢 Enabled' : '🔴 Disabled';
    output += `${status} ${plugin.name} (${plugin.id})\n`;
    output += `  Version: ${plugin.version}\n`;
    output += `  Description: ${plugin.description}\n`;
    if (plugin.commands && plugin.commands.length > 0) {
      output += `  Commands: ${plugin.commands.map(cmd => cmd.name).join(', ')}\n`;
    }
    output += '\n';
  });

  return { success: true, message: output.trim() };
}

async function searchPlugins(query: string): Promise<CommandResult> {
  if (!query.trim()) {
    return { success: false, error: 'Please provide a search query' };
  }

  // Simulate plugin store search
  const availablePlugins = [
    {
      id: 'weather-widget',
      name: 'Weather Widget',
      version: '1.2.0',
      description: 'Display current weather and forecasts',
      author: 'ClaudiaOS Team',
      commands: ['weather', 'forecast'],
      permissions: ['network']
    },
    {
      id: 'system-monitor',
      name: 'Advanced System Monitor',
      version: '2.1.0',
      description: 'Enhanced system monitoring with graphs',
      author: 'SysAdmin Tools',
      commands: ['monitor', 'perf'],
      permissions: ['system']
    },
    {
      id: 'file-browser',
      name: 'Enhanced File Browser',
      version: '1.0.3',
      description: 'Visual file browser with preview support',
      author: 'UI Extensions',
      commands: ['browse', 'preview'],
      permissions: ['filesystem']
    },
    {
      id: 'task-manager',
      name: 'Task Manager',
      version: '1.1.0',
      description: 'Manage tasks and reminders',
      author: 'Productivity Suite',
      commands: ['task', 'reminder', 'todo'],
      permissions: ['storage']
    }
  ];

  const filtered = availablePlugins.filter(plugin => 
    plugin.name.toLowerCase().includes(query.toLowerCase()) ||
    plugin.description.toLowerCase().includes(query.toLowerCase()) ||
    plugin.commands.some(cmd => cmd.toLowerCase().includes(query.toLowerCase()))
  );

  if (filtered.length === 0) {
    return {
      success: true,
      message: `No plugins found matching "${query}". Try different keywords.`
    };
  }

  let output = `Search Results for "${query}":\n\n`;
  filtered.forEach(plugin => {
    output += `📦 ${plugin.name} (${plugin.id})\n`;
    output += `  Version: ${plugin.version} | Author: ${plugin.author}\n`;
    output += `  Description: ${plugin.description}\n`;
    output += `  Commands: ${plugin.commands.join(', ')}\n`;
    output += `  Install: /plugin install ${plugin.id}\n\n`;
  });

  return { success: true, message: output.trim() };
}

async function installPlugin(pluginId: string): Promise<CommandResult> {
  const result = await pluginManager.installPlugin(pluginId);
  
  return {
    success: result.success,
    message: result.success ? result.message : undefined,
    error: result.success ? undefined : result.message
  };
}

async function uninstallPlugin(pluginId: string): Promise<CommandResult> {
  const result = await pluginManager.uninstallPlugin(pluginId);
  
  return {
    success: result.success,
    message: result.success ? result.message : undefined,
    error: result.success ? undefined : result.message
  };
}

async function enablePlugin(pluginId: string): Promise<CommandResult> {
  const result = await pluginManager.enablePlugin(pluginId);
  
  return {
    success: result.success,
    message: result.success ? result.message : undefined,
    error: result.success ? undefined : result.message
  };
}

async function disablePlugin(pluginId: string): Promise<CommandResult> {
  const result = await pluginManager.disablePlugin(pluginId);
  
  return {
    success: result.success,
    message: result.success ? result.message : undefined,
    error: result.success ? undefined : result.message
  };
}

async function getPluginInfo(pluginId: string): Promise<CommandResult> {
  const plugin = pluginManager.getPlugin(pluginId);
  
  if (!plugin) {
    return {
      success: false,
      error: `Plugin "${pluginId}" not found. Use "/plugin list" to see installed plugins.`
    };
  }

  const isEnabled = pluginManager.isPluginEnabled(pluginId);
  const status = isEnabled ? '🟢 Enabled' : '🔴 Disabled';

  let output = `Plugin Information: ${plugin.name}\n\n`;
  output += `ID: ${plugin.id}\n`;
  output += `Version: ${plugin.version}\n`;
  output += `Status: ${status}\n`;
  output += `Author: ${plugin.author || 'Unknown'}\n`;
  output += `Description: ${plugin.description}\n`;
  
  if (plugin.commands && plugin.commands.length > 0) {
    output += `Commands: ${plugin.commands.map(cmd => cmd.name).join(', ')}\n`;
  }
  
  if (plugin.permissions) {
    const permissionList = Object.entries(plugin.permissions)
      .filter(([_, allowed]) => allowed)
      .map(([permission, _]) => permission);
    if (permissionList.length > 0) {
      output += `Permissions: ${permissionList.join(', ')}\n`;
    }
  }
  
  if (plugin.dependencies && plugin.dependencies.length > 0) {
    output += `Dependencies: ${plugin.dependencies.join(', ')}\n`;
  }

  output += `\nInstalled: ${plugin.metadata?.installDate ? new Date(plugin.metadata.installDate).toLocaleString() : 'Unknown'}`;

  return { success: true, message: output };
}

async function reloadPlugin(pluginId: string): Promise<CommandResult> {
  const disableResult = await pluginManager.disablePlugin(pluginId);
  if (!disableResult.success) {
    return { success: false, error: disableResult.message };
  }

  const enableResult = await pluginManager.enablePlugin(pluginId);
  return {
    success: enableResult.success,
    message: enableResult.success ? 
      `Plugin "${pluginId}" reloaded successfully` : undefined,
    error: enableResult.success ? undefined : enableResult.message
  };
}

async function browsePluginStore(): Promise<CommandResult> {
  return {
    success: true,
    message: `ClaudiaOS Plugin Store

🔥 Featured Plugins:
  📦 weather-widget - Real-time weather information
  📦 system-monitor - Advanced system monitoring
  📦 file-browser - Enhanced file management
  📦 task-manager - Task and reminder management

📊 Categories:
  • System Tools - system-monitor, process-viewer
  • Productivity - task-manager, note-keeper
  • Utilities - weather-widget, calculator
  • Development - git-helper, code-formatter
  • Entertainment - music-player, game-center

🔍 Search: /plugin search <keyword>
📥 Install: /plugin install <plugin-id>

Visit the online store at: https://plugins.claudiaos.dev
(Note: This is a simulated environment)`
  };
}