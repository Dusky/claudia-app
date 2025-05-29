export interface UserPreferences {
  // System Preferences
  theme: string;
  enableCRTEffect: boolean;
  enableScanlines: boolean;
  terminalOpacity: number;
  fontSize: number;
  fontFamily: string;
  
  // Behavior Preferences
  autoSave: boolean;
  autoSaveInterval: number; // minutes
  confirmDestructiveActions: boolean;
  enableSoundEffects: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast' | 'off';
  
  // AI & Avatar Preferences
  defaultAIProvider: string;
  avatarEnabled: boolean;
  avatarPosition: 'left' | 'right' | 'center' | 'hidden';
  avatarSize: 'small' | 'medium' | 'large';
  avatarAutoExpressions: boolean;
  conversationMemory: boolean;
  
  // Command & Shell Preferences
  commandHistory: boolean;
  commandHistorySize: number;
  autoComplete: boolean;
  caseSensitiveCommands: boolean;
  aliasExpansion: boolean;
  commandSuggestions: boolean;
  
  // Privacy & Security
  dataCollection: boolean;
  errorReporting: boolean;
  analyticsEnabled: boolean;
  sessionPersistence: boolean;
  
  // Advanced Features
  developerMode: boolean;
  debugLogging: boolean;
  experimentalFeatures: boolean;
  pluginAutoUpdates: boolean;
  
  // Accessibility
  highContrast: boolean;
  reduceMotion: boolean;
  screenReaderSupport: boolean;
  keyboardShortcuts: boolean;
  
  // Custom Settings
  customSettings: Record<string, any>;
}

export interface PreferenceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  preferences: PreferenceDefinition[];
}

export interface PreferenceDefinition {
  id: keyof UserPreferences;
  name: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'select' | 'range';
  defaultValue: any;
  options?: string[] | { value: any; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  validation?: (value: any) => boolean | string;
  requires?: keyof UserPreferences;
  category: string;
}

export class UserPreferencesManager {
  private static instance: UserPreferencesManager;
  private preferences: UserPreferences;
  private listeners: Map<string, ((preferences: UserPreferences) => void)[]> = new Map();
  private storageKey = 'claudiaos-user-preferences';
  private defaultPreferences: UserPreferences;

  private constructor() {
    this.defaultPreferences = this.getDefaultPreferences();
    this.preferences = this.loadPreferences();
    this.validatePreferences();
  }

  public static getInstance(): UserPreferencesManager {
    if (!UserPreferencesManager.instance) {
      UserPreferencesManager.instance = new UserPreferencesManager();
    }
    return UserPreferencesManager.instance;
  }

  // Get/Set Methods
  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  getPreference<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
    return this.preferences[key];
  }

  setPreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): boolean {
    const definition = this.getPreferenceDefinition(key);
    
    if (definition && definition.validation) {
      const validationResult = definition.validation(value);
      if (validationResult !== true) {
        console.error(`Invalid value for ${key}:`, validationResult);
        return false;
      }
    }

    const oldValue = this.preferences[key];
    this.preferences[key] = value;
    
    this.savePreferences();
    this.notifyListeners(key, value, oldValue);
    
    return true;
  }

  setPreferences(updates: Partial<UserPreferences>): boolean {
    const validUpdates: Partial<UserPreferences> = {};
    
    // Validate all updates first
    for (const [key, value] of Object.entries(updates)) {
      const definition = this.getPreferenceDefinition(key as keyof UserPreferences);
      
      if (definition && definition.validation) {
        const validationResult = definition.validation(value);
        if (validationResult !== true) {
          console.error(`Invalid value for ${key}:`, validationResult);
          return false;
        }
      }
      
      (validUpdates as any)[key] = value;
    }
    
    // Apply all updates
    const oldPreferences = { ...this.preferences };
    Object.assign(this.preferences, validUpdates);
    
    this.savePreferences();
    
    // Notify listeners for each changed preference
    for (const [key, value] of Object.entries(validUpdates)) {
      const typedKey = key as keyof UserPreferences;
      this.notifyListeners(typedKey, value, oldPreferences[typedKey]);
    }
    
    return true;
  }

  resetPreference<K extends keyof UserPreferences>(key: K): void {
    const defaultValue = this.defaultPreferences[key];
    this.setPreference(key, defaultValue);
  }

  resetToDefaults(): void {
    this.preferences = { ...this.defaultPreferences };
    this.savePreferences();
    this.notifyListeners('*' as any, this.preferences, this.defaultPreferences);
  }

  // Categories and Definitions
  getPreferenceCategories(): PreferenceCategory[] {
    return [
      {
        id: 'appearance',
        name: 'Appearance',
        description: 'Visual settings and themes',
        icon: '🎨',
        preferences: this.getPreferenceDefinitions().filter(p => p.category === 'appearance')
      },
      {
        id: 'behavior',
        name: 'Behavior',
        description: 'System behavior and automation',
        icon: '⚙️',
        preferences: this.getPreferenceDefinitions().filter(p => p.category === 'behavior')
      },
      {
        id: 'ai-avatar',
        name: 'AI & Avatar',
        description: 'AI assistant and avatar settings',
        icon: '🤖',
        preferences: this.getPreferenceDefinitions().filter(p => p.category === 'ai-avatar')
      },
      {
        id: 'commands',
        name: 'Commands & Shell',
        description: 'Command line behavior',
        icon: '💻',
        preferences: this.getPreferenceDefinitions().filter(p => p.category === 'commands')
      },
      {
        id: 'privacy',
        name: 'Privacy & Security',
        description: 'Data and security settings',
        icon: '🔒',
        preferences: this.getPreferenceDefinitions().filter(p => p.category === 'privacy')
      },
      {
        id: 'advanced',
        name: 'Advanced',
        description: 'Developer and experimental features',
        icon: '🔧',
        preferences: this.getPreferenceDefinitions().filter(p => p.category === 'advanced')
      },
      {
        id: 'accessibility',
        name: 'Accessibility',
        description: 'Accessibility and usability features',
        icon: '♿',
        preferences: this.getPreferenceDefinitions().filter(p => p.category === 'accessibility')
      }
    ];
  }

  getPreferenceDefinitions(): PreferenceDefinition[] {
    return [
      // Appearance
      {
        id: 'theme',
        name: 'Theme',
        description: 'Visual theme for the terminal interface',
        type: 'select',
        defaultValue: 'mainframe70s',
        options: ['mainframe70s', 'pc80s', 'bbs90s', 'modern'],
        category: 'appearance'
      },
      {
        id: 'enableCRTEffect',
        name: 'CRT Effect',
        description: 'Enable retro CRT monitor effect',
        type: 'boolean',
        defaultValue: true,
        category: 'appearance'
      },
      {
        id: 'enableScanlines',
        name: 'Scanlines',
        description: 'Enable CRT scanline effect',
        type: 'boolean',
        defaultValue: true,
        requires: 'enableCRTEffect',
        category: 'appearance'
      },
      {
        id: 'terminalOpacity',
        name: 'Terminal Opacity',
        description: 'Background opacity of the terminal',
        type: 'range',
        defaultValue: 0.9,
        min: 0.1,
        max: 1.0,
        step: 0.1,
        category: 'appearance'
      },
      {
        id: 'fontSize',
        name: 'Font Size',
        description: 'Terminal text size in pixels',
        type: 'range',
        defaultValue: 14,
        min: 10,
        max: 24,
        step: 1,
        category: 'appearance'
      },
      {
        id: 'fontFamily',
        name: 'Font Family',
        description: 'Terminal font family',
        type: 'select',
        defaultValue: 'Courier New',
        options: ['Courier New', 'Monaco', 'Consolas', 'Fira Code', 'Source Code Pro'],
        category: 'appearance'
      },

      // Behavior
      {
        id: 'autoSave',
        name: 'Auto Save',
        description: 'Automatically save session state',
        type: 'boolean',
        defaultValue: true,
        category: 'behavior'
      },
      {
        id: 'autoSaveInterval',
        name: 'Auto Save Interval',
        description: 'Minutes between automatic saves',
        type: 'range',
        defaultValue: 5,
        min: 1,
        max: 60,
        step: 1,
        requires: 'autoSave',
        category: 'behavior'
      },
      {
        id: 'confirmDestructiveActions',
        name: 'Confirm Destructive Actions',
        description: 'Ask for confirmation before potentially harmful operations',
        type: 'boolean',
        defaultValue: true,
        category: 'behavior'
      },
      {
        id: 'enableSoundEffects',
        name: 'Sound Effects',
        description: 'Play sound effects for various actions',
        type: 'boolean',
        defaultValue: false,
        category: 'behavior'
      },
      {
        id: 'animationSpeed',
        name: 'Animation Speed',
        description: 'Speed of UI animations',
        type: 'select',
        defaultValue: 'normal',
        options: ['slow', 'normal', 'fast', 'off'],
        category: 'behavior'
      },

      // AI & Avatar
      {
        id: 'defaultAIProvider',
        name: 'Default AI Provider',
        description: 'Preferred AI provider for conversations',
        type: 'select',
        defaultValue: 'anthropic',
        options: ['anthropic', 'google', 'local'],
        category: 'ai-avatar'
      },
      {
        id: 'avatarEnabled',
        name: 'Avatar Enabled',
        description: 'Show AI avatar in conversations',
        type: 'boolean',
        defaultValue: true,
        category: 'ai-avatar'
      },
      {
        id: 'avatarPosition',
        name: 'Avatar Position',
        description: 'Where to display the avatar',
        type: 'select',
        defaultValue: 'right',
        options: ['left', 'right', 'center', 'hidden'],
        requires: 'avatarEnabled',
        category: 'ai-avatar'
      },
      {
        id: 'avatarSize',
        name: 'Avatar Size',
        description: 'Size of the avatar display',
        type: 'select',
        defaultValue: 'medium',
        options: ['small', 'medium', 'large'],
        requires: 'avatarEnabled',
        category: 'ai-avatar'
      },
      {
        id: 'avatarAutoExpressions',
        name: 'Auto Expressions',
        description: 'Automatically change avatar expressions based on context',
        type: 'boolean',
        defaultValue: true,
        requires: 'avatarEnabled',
        category: 'ai-avatar'
      },
      {
        id: 'conversationMemory',
        name: 'Conversation Memory',
        description: 'Remember conversation context across sessions',
        type: 'boolean',
        defaultValue: true,
        category: 'ai-avatar'
      },

      // Commands & Shell
      {
        id: 'commandHistory',
        name: 'Command History',
        description: 'Save and recall command history',
        type: 'boolean',
        defaultValue: true,
        category: 'commands'
      },
      {
        id: 'commandHistorySize',
        name: 'History Size',
        description: 'Number of commands to remember',
        type: 'range',
        defaultValue: 1000,
        min: 100,
        max: 10000,
        step: 100,
        requires: 'commandHistory',
        category: 'commands'
      },
      {
        id: 'autoComplete',
        name: 'Auto Complete',
        description: 'Enable command auto-completion',
        type: 'boolean',
        defaultValue: true,
        category: 'commands'
      },
      {
        id: 'caseSensitiveCommands',
        name: 'Case Sensitive Commands',
        description: 'Commands are case sensitive',
        type: 'boolean',
        defaultValue: false,
        category: 'commands'
      },
      {
        id: 'aliasExpansion',
        name: 'Alias Expansion',
        description: 'Expand command aliases',
        type: 'boolean',
        defaultValue: true,
        category: 'commands'
      },
      {
        id: 'commandSuggestions',
        name: 'Command Suggestions',
        description: 'Show intelligent command suggestions',
        type: 'boolean',
        defaultValue: true,
        category: 'commands'
      },

      // Privacy & Security
      {
        id: 'dataCollection',
        name: 'Data Collection',
        description: 'Allow collection of usage data for improvements',
        type: 'boolean',
        defaultValue: false,
        category: 'privacy'
      },
      {
        id: 'errorReporting',
        name: 'Error Reporting',
        description: 'Automatically report errors to help improve the system',
        type: 'boolean',
        defaultValue: true,
        category: 'privacy'
      },
      {
        id: 'analyticsEnabled',
        name: 'Analytics',
        description: 'Enable usage analytics',
        type: 'boolean',
        defaultValue: false,
        requires: 'dataCollection',
        category: 'privacy'
      },
      {
        id: 'sessionPersistence',
        name: 'Session Persistence',
        description: 'Save session state between browser sessions',
        type: 'boolean',
        defaultValue: true,
        category: 'privacy'
      },

      // Advanced
      {
        id: 'developerMode',
        name: 'Developer Mode',
        description: 'Enable developer features and debugging',
        type: 'boolean',
        defaultValue: false,
        category: 'advanced'
      },
      {
        id: 'debugLogging',
        name: 'Debug Logging',
        description: 'Enable detailed debug logs',
        type: 'boolean',
        defaultValue: false,
        requires: 'developerMode',
        category: 'advanced'
      },
      {
        id: 'experimentalFeatures',
        name: 'Experimental Features',
        description: 'Enable experimental and unstable features',
        type: 'boolean',
        defaultValue: false,
        requires: 'developerMode',
        category: 'advanced'
      },
      {
        id: 'pluginAutoUpdates',
        name: 'Plugin Auto Updates',
        description: 'Automatically update plugins to latest versions',
        type: 'boolean',
        defaultValue: true,
        category: 'advanced'
      },

      // Accessibility
      {
        id: 'highContrast',
        name: 'High Contrast',
        description: 'Use high contrast colors for better visibility',
        type: 'boolean',
        defaultValue: false,
        category: 'accessibility'
      },
      {
        id: 'reduceMotion',
        name: 'Reduce Motion',
        description: 'Minimize animations and motion effects',
        type: 'boolean',
        defaultValue: false,
        category: 'accessibility'
      },
      {
        id: 'screenReaderSupport',
        name: 'Screen Reader Support',
        description: 'Optimize for screen reader accessibility',
        type: 'boolean',
        defaultValue: false,
        category: 'accessibility'
      },
      {
        id: 'keyboardShortcuts',
        name: 'Keyboard Shortcuts',
        description: 'Enable keyboard shortcuts for common actions',
        type: 'boolean',
        defaultValue: true,
        category: 'accessibility'
      }
    ];
  }

  getPreferenceDefinition(key: keyof UserPreferences): PreferenceDefinition | undefined {
    return this.getPreferenceDefinitions().find(def => def.id === key);
  }

  // Event Listeners
  addListener<K extends keyof UserPreferences>(
    key: K | '*', 
    callback: (preferences: UserPreferences, key?: K, newValue?: UserPreferences[K], oldValue?: UserPreferences[K]) => void
  ): void {
    const keyStr = key as string;
    if (!this.listeners.has(keyStr)) {
      this.listeners.set(keyStr, []);
    }
    this.listeners.get(keyStr)!.push(callback);
  }

  removeListener<K extends keyof UserPreferences>(
    key: K | '*', 
    callback: (preferences: UserPreferences) => void
  ): void {
    const keyStr = key as string;
    const listeners = this.listeners.get(keyStr);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Validation and Import/Export
  validatePreferences(): boolean {
    const definitions = this.getPreferenceDefinitions();
    let isValid = true;

    for (const definition of definitions) {
      const value = this.preferences[definition.id];
      
      if (definition.validation) {
        const result = definition.validation(value);
        if (result !== true) {
          console.warn(`Invalid preference ${definition.id}:`, result);
          this.preferences[definition.id] = definition.defaultValue;
          isValid = false;
        }
      }
    }

    if (!isValid) {
      this.savePreferences();
    }

    return isValid;
  }

  exportPreferences(): string {
    return JSON.stringify(this.preferences, null, 2);
  }

  importPreferences(jsonString: string): boolean {
    try {
      const imported = JSON.parse(jsonString);
      
      // Validate imported preferences
      const validPreferences: Partial<UserPreferences> = {};
      const definitions = this.getPreferenceDefinitions();
      
      for (const definition of definitions) {
        if (imported.hasOwnProperty(definition.id)) {
          const value = imported[definition.id];
          
          if (definition.validation) {
            const result = definition.validation(value);
            if (result === true) {
              validPreferences[definition.id] = value;
            }
          } else {
            validPreferences[definition.id] = value;
          }
        }
      }
      
      return this.setPreferences(validPreferences);
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }

  // Private Methods
  private getDefaultPreferences(): UserPreferences {
    const definitions = this.getPreferenceDefinitions();
    const defaults: any = {};
    
    definitions.forEach(def => {
      defaults[def.id] = def.defaultValue;
    });
    
    // Add custom settings
    defaults.customSettings = {};
    
    return defaults as UserPreferences;
  }

  private loadPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.defaultPreferences, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
    
    return { ...this.defaultPreferences };
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  private notifyListeners<K extends keyof UserPreferences>(
    key: K, 
    newValue: UserPreferences[K], 
    oldValue: UserPreferences[K]
  ): void {
    // Notify specific key listeners
    const keyListeners = this.listeners.get(key as string);
    if (keyListeners) {
      keyListeners.forEach(callback => {
        try {
          callback(this.preferences, key, newValue, oldValue);
        } catch (error) {
          console.error('Error in preference listener:', error);
        }
      });
    }
    
    // Notify global listeners
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(callback => {
        try {
          callback(this.preferences, key, newValue, oldValue);
        } catch (error) {
          console.error('Error in global preference listener:', error);
        }
      });
    }
  }
}