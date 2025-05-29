// Plugin/Extension System for ClaudiaOS Phase 5
// Extensible command system with plugin support

import type { Command, CommandContext, CommandResult } from '../commands/types';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  commands: Command[];
  hooks: PluginHooks;
  permissions: PluginPermissions;
  dependencies?: string[];
  metadata: PluginMetadata;
}

interface PluginHooks {
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
  onCommand?: (command: string, args: string[]) => Promise<boolean>;
  onPreCommand?: (command: string, args: string[]) => Promise<{ allow: boolean; message?: string }>;
  onPostCommand?: (command: string, args: string[], result: CommandResult) => Promise<void>;
  onThemeChange?: (newTheme: string) => Promise<void>;
  onSessionStart?: () => Promise<void>;
  onSessionEnd?: () => Promise<void>;
}

interface PluginPermissions {
  fileSystem: boolean;
  network: boolean;
  systemCommands: boolean;
  environmentVariables: boolean;
  sessionData: boolean;
  userData: boolean;
}

interface PluginMetadata {
  installDate: Date;
  lastUsed: Date;
  usageCount: number;
  rating?: number;
  tags: string[];
  category: 'utility' | 'development' | 'entertainment' | 'system' | 'productivity';
}

interface PluginRegistry {
  available: PluginInfo[];
  installed: Plugin[];
}

interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  size: number;
  downloads: number;
  rating: number;
  category: string;
  tags: string[];
  source: string;
}

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private enabledPlugins: Set<string> = new Set();
  private pluginCommands: Map<string, Plugin> = new Map();
  private registry: PluginRegistry;
  
  private constructor() {
    this.registry = {
      available: this.getAvailablePlugins(),
      installed: []
    };
    
    this.loadInstalledPlugins();
  }
  
  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }
  
  // Plugin lifecycle management
  async installPlugin(pluginId: string): Promise<{ success: boolean; message: string }> {
    try {
      const pluginInfo = this.registry.available.find(p => p.id === pluginId);
      if (!pluginInfo) {
        return { success: false, message: `Plugin not found: ${pluginId}` };
      }
      
      // Check if already installed
      if (this.plugins.has(pluginId)) {
        return { success: false, message: `Plugin already installed: ${pluginId}` };
      }
      
      // Simulate plugin download and installation
      const plugin = await this.downloadPlugin(pluginInfo);
      
      // Validate plugin
      const validation = this.validatePlugin(plugin);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }
      
      // Install plugin
      this.plugins.set(pluginId, plugin);
      this.registry.installed.push(plugin);
      
      // Register commands
      plugin.commands.forEach(command => {
        this.pluginCommands.set(command.name, plugin);
      });
      
      // Save to storage
      this.savePluginRegistry();
      
      // Run onLoad hook
      if (plugin.hooks.onLoad) {
        await plugin.hooks.onLoad();
      }
      
      return { success: true, message: `Plugin installed successfully: ${plugin.name}` };
      
    } catch (error) {
      return { 
        success: false, 
        message: `Installation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  async uninstallPlugin(pluginId: string): Promise<{ success: boolean; message: string }> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        return { success: false, message: `Plugin not found: ${pluginId}` };
      }
      
      // Disable first
      await this.disablePlugin(pluginId);
      
      // Run onUnload hook
      if (plugin.hooks.onUnload) {
        await plugin.hooks.onUnload();
      }
      
      // Remove commands
      plugin.commands.forEach(command => {
        this.pluginCommands.delete(command.name);
      });
      
      // Remove from registry
      this.plugins.delete(pluginId);
      this.registry.installed = this.registry.installed.filter(p => p.id !== pluginId);
      
      // Save to storage
      this.savePluginRegistry();
      
      return { success: true, message: `Plugin uninstalled: ${plugin.name}` };
      
    } catch (error) {
      return { 
        success: false, 
        message: `Uninstallation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  async enablePlugin(pluginId: string): Promise<{ success: boolean; message: string }> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return { success: false, message: `Plugin not found: ${pluginId}` };
    }
    
    if (plugin.enabled) {
      return { success: false, message: `Plugin already enabled: ${plugin.name}` };
    }
    
    try {
      // Check dependencies
      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          if (!this.enabledPlugins.has(dep)) {
            return { success: false, message: `Missing dependency: ${dep}` };
          }
        }
      }
      
      plugin.enabled = true;
      this.enabledPlugins.add(pluginId);
      
      // Register commands
      plugin.commands.forEach(command => {
        this.pluginCommands.set(command.name, plugin);
      });
      
      // Run onLoad hook
      if (plugin.hooks.onLoad) {
        await plugin.hooks.onLoad();
      }
      
      this.savePluginRegistry();
      
      return { success: true, message: `Plugin enabled: ${plugin.name}` };
      
    } catch (error) {
      plugin.enabled = false;
      this.enabledPlugins.delete(pluginId);
      return { 
        success: false, 
        message: `Enable failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  async disablePlugin(pluginId: string): Promise<{ success: boolean; message: string }> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return { success: false, message: `Plugin not found: ${pluginId}` };
    }
    
    if (!plugin.enabled) {
      return { success: false, message: `Plugin already disabled: ${plugin.name}` };
    }
    
    try {
      plugin.enabled = false;
      this.enabledPlugins.delete(pluginId);
      
      // Unregister commands
      plugin.commands.forEach(command => {
        this.pluginCommands.delete(command.name);
      });
      
      // Run onUnload hook
      if (plugin.hooks.onUnload) {
        await plugin.hooks.onUnload();
      }
      
      this.savePluginRegistry();
      
      return { success: true, message: `Plugin disabled: ${plugin.name}` };
      
    } catch (error) {
      return { 
        success: false, 
        message: `Disable failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  // Plugin command execution
  async executePluginCommand(commandName: string, args: string[], context: CommandContext): Promise<CommandResult | null> {
    const plugin = this.pluginCommands.get(commandName);
    if (!plugin || !plugin.enabled) {
      return null;
    }
    
    try {
      // Run pre-command hook
      if (plugin.hooks.onPreCommand) {
        const preResult = await plugin.hooks.onPreCommand(commandName, args);
        if (!preResult.allow) {
          return {
            success: false,
            lines: [{
              id: `plugin-blocked-${Date.now()}`,
              type: 'error',
              content: preResult.message || 'Command blocked by plugin',
              timestamp: new Date().toISOString(),
              user: 'claudia'
            }]
          };
        }
      }
      
      // Find and execute command
      const command = plugin.commands.find(cmd => cmd.name === commandName);
      if (!command) {
        return null;
      }
      
      const result = await command.execute(args, context);
      
      // Update plugin usage
      plugin.metadata.lastUsed = new Date();
      plugin.metadata.usageCount++;
      
      // Run post-command hook
      if (plugin.hooks.onPostCommand) {
        await plugin.hooks.onPostCommand(commandName, args, result);
      }
      
      // Run general command hook
      if (plugin.hooks.onCommand) {
        await plugin.hooks.onCommand(commandName, args);
      }
      
      this.savePluginRegistry();
      
      return result;
      
    } catch (error) {
      return {
        success: false,
        lines: [{
          id: `plugin-error-${Date.now()}`,
          type: 'error',
          content: `Plugin error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          user: 'claudia'
        }]
      };
    }
  }
  
  // Plugin discovery and management
  getAvailablePlugins(): PluginInfo[] {
    // Simulate available plugins in a plugin store
    return [
      {
        id: 'git-helper',
        name: 'Git Helper',
        version: '1.2.0',
        description: 'Advanced Git commands and workflow assistance',
        author: 'ClaudiaOS Team',
        size: 245000,
        downloads: 15420,
        rating: 4.8,
        category: 'development',
        tags: ['git', 'version-control', 'development'],
        source: 'https://plugins.claudiaos.dev/git-helper'
      },
      {
        id: 'system-monitor-pro',
        name: 'System Monitor Pro',
        version: '2.1.5',
        description: 'Advanced system monitoring with real-time graphs',
        author: 'DevTools Inc',
        size: 512000,
        downloads: 8930,
        rating: 4.6,
        category: 'system',
        tags: ['monitoring', 'performance', 'system'],
        source: 'https://plugins.claudiaos.dev/system-monitor-pro'
      },
      {
        id: 'text-processor',
        name: 'Text Processor',
        version: '1.0.3',
        description: 'Advanced text processing and manipulation tools',
        author: 'TextTools',
        size: 128000,
        downloads: 5670,
        rating: 4.3,
        category: 'utility',
        tags: ['text', 'processing', 'utility'],
        source: 'https://plugins.claudiaos.dev/text-processor'
      },
      {
        id: 'music-player',
        name: 'Terminal Music Player',
        version: '3.0.1',
        description: 'Play music directly in your terminal',
        author: 'AudioCorp',
        size: 890000,
        downloads: 12340,
        rating: 4.7,
        category: 'entertainment',
        tags: ['music', 'audio', 'entertainment'],
        source: 'https://plugins.claudiaos.dev/music-player'
      },
      {
        id: 'task-manager',
        name: 'Advanced Task Manager',
        version: '1.5.2',
        description: 'Comprehensive task and project management',
        author: 'ProductivityPro',
        size: 340000,
        downloads: 7890,
        rating: 4.5,
        category: 'productivity',
        tags: ['tasks', 'projects', 'productivity'],
        source: 'https://plugins.claudiaos.dev/task-manager'
      }
    ];
  }
  
  getInstalledPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  getEnabledPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).filter(p => p.enabled);
  }
  
  getPluginCommands(): Map<string, Plugin> {
    return new Map(this.pluginCommands);
  }
  
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  isPluginEnabled(pluginId: string): boolean {
    return this.enabledPlugins.has(pluginId);
  }
  
  searchPlugins(query: string): PluginInfo[] {
    const lowerQuery = query.toLowerCase();
    return this.registry.available.filter(plugin => 
      plugin.name.toLowerCase().includes(lowerQuery) ||
      plugin.description.toLowerCase().includes(lowerQuery) ||
      plugin.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
  
  // Plugin validation and security
  private validatePlugin(plugin: Plugin): { valid: boolean; message: string } {
    if (!plugin.id || !plugin.name || !plugin.version) {
      return { valid: false, message: 'Missing required plugin metadata' };
    }
    
    if (!Array.isArray(plugin.commands)) {
      return { valid: false, message: 'Plugin must provide commands array' };
    }
    
    // Validate commands
    for (const command of plugin.commands) {
      if (!command.name || !command.execute || typeof command.execute !== 'function') {
        return { valid: false, message: `Invalid command in plugin: ${command.name || 'unnamed'}` };
      }
    }
    
    // Check permissions
    if (!plugin.permissions) {
      return { valid: false, message: 'Plugin must declare permissions' };
    }
    
    return { valid: true, message: 'Plugin is valid' };
  }
  
  // Simulate plugin download
  private async downloadPlugin(pluginInfo: PluginInfo): Promise<Plugin> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create mock plugin based on pluginInfo
    const plugin: Plugin = {
      id: pluginInfo.id,
      name: pluginInfo.name,
      version: pluginInfo.version,
      description: pluginInfo.description,
      author: pluginInfo.author,
      enabled: false,
      commands: this.generateMockCommands(pluginInfo),
      hooks: {},
      permissions: {
        fileSystem: false,
        network: false,
        systemCommands: false,
        environmentVariables: false,
        sessionData: false,
        userData: false
      },
      metadata: {
        installDate: new Date(),
        lastUsed: new Date(),
        usageCount: 0,
        tags: pluginInfo.tags,
        category: pluginInfo.category as any
      }
    };
    
    return plugin;
  }
  
  private generateMockCommands(pluginInfo: PluginInfo): Command[] {
    // Generate mock commands based on plugin type
    const commands: Command[] = [];
    
    if (pluginInfo.id === 'git-helper') {
      commands.push({
        name: 'gstatus',
        description: 'Enhanced git status with visual indicators',
        usage: '/gstatus',
        aliases: ['gs'],
        execute: async () => ({
          success: true,
          lines: [{
            id: 'mock-gstatus',
            type: 'output',
            content: '🔍 Git Status: Clean working directory',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }]
        })
      });
    }
    
    if (pluginInfo.id === 'system-monitor-pro') {
      commands.push({
        name: 'htop-pro',
        description: 'Advanced system monitor with graphs',
        usage: '/htop-pro',
        aliases: ['htoppro'],
        execute: async () => ({
          success: true,
          lines: [{
            id: 'mock-htop-pro',
            type: 'output',
            content: '📊 System Monitor Pro: Advanced monitoring active',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }]
        })
      });
    }
    
    return commands;
  }
  
  // Storage management
  private loadInstalledPlugins(): void {
    try {
      const stored = localStorage.getItem('claudiaos-plugins');
      if (stored) {
        const data = JSON.parse(stored);
        this.registry.installed = data.installed || [];
        
        // Reconstruct plugin objects
        this.registry.installed.forEach(plugin => {
          // Convert date strings back to Date objects
          plugin.metadata.installDate = new Date(plugin.metadata.installDate);
          plugin.metadata.lastUsed = new Date(plugin.metadata.lastUsed);
          
          this.plugins.set(plugin.id, plugin);
          
          if (plugin.enabled) {
            this.enabledPlugins.add(plugin.id);
            plugin.commands.forEach(command => {
              this.pluginCommands.set(command.name, plugin);
            });
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load installed plugins:', error);
    }
  }
  
  private savePluginRegistry(): void {
    try {
      const data = {
        installed: Array.from(this.plugins.values())
      };
      localStorage.setItem('claudiaos-plugins', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save plugin registry:', error);
    }
  }
  
  // Event hooks for system integration
  async triggerThemeChange(newTheme: string): Promise<void> {
    for (const plugin of this.enabledPlugins) {
      const pluginObj = this.plugins.get(plugin);
      if (pluginObj?.hooks.onThemeChange) {
        try {
          await pluginObj.hooks.onThemeChange(newTheme);
        } catch (error) {
          console.warn(`Plugin ${plugin} theme change hook failed:`, error);
        }
      }
    }
  }
  
  async triggerSessionStart(): Promise<void> {
    for (const plugin of this.enabledPlugins) {
      const pluginObj = this.plugins.get(plugin);
      if (pluginObj?.hooks.onSessionStart) {
        try {
          await pluginObj.hooks.onSessionStart();
        } catch (error) {
          console.warn(`Plugin ${plugin} session start hook failed:`, error);
        }
      }
    }
  }
  
  async triggerSessionEnd(): Promise<void> {
    for (const plugin of this.enabledPlugins) {
      const pluginObj = this.plugins.get(plugin);
      if (pluginObj?.hooks.onSessionEnd) {
        try {
          await pluginObj.hooks.onSessionEnd();
        } catch (error) {
          console.warn(`Plugin ${plugin} session end hook failed:`, error);
        }
      }
    }
  }
}

// Global instance
export const pluginManager = PluginManager.getInstance();