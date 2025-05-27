// Environment configuration with type safety and validation

export interface AppConfig {
  // API Keys
  anthropicApiKey?: string;
  googleApiKey?: string;
  googleImageApiKey?: string;
  openaiApiKey?: string;
  replicateApiToken?: string;
  
  // Provider Configuration
  defaultLLMProvider: string;
  defaultImageProvider: string;
  ollamaBaseUrl: string;
  localLLMModel: string;
  
  // Application Settings
  defaultTheme: string;
  databasePath: string;
  conversationHistoryLength: number; // Added for conversation context
  imageStyle: string; // Style for generated images
  
  // Performance Settings
  avatarCacheSize: number;
  avatarCacheTTL: number;
  llmTimeout: number;
  imageTimeout: number;
  
  // Development Settings
  debugMode: boolean;
  mockAPIs: boolean;
  detailedErrors: boolean;
}

class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): AppConfig {
    return {
      // API Keys
      anthropicApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
      googleApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
      googleImageApiKey: import.meta.env.VITE_GOOGLE_IMAGE_API_KEY,
      openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
      replicateApiToken: import.meta.env.VITE_REPLICATE_API_TOKEN,
      
      // Provider Configuration
      defaultLLMProvider: import.meta.env.VITE_DEFAULT_LLM_PROVIDER || 'anthropic',
      defaultImageProvider: import.meta.env.VITE_DEFAULT_IMAGE_PROVIDER || 'replicate',
      ollamaBaseUrl: import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',
      localLLMModel: import.meta.env.VITE_LOCAL_LLM_MODEL || 'llama2',
      
      // Application Settings
      defaultTheme: import.meta.env.VITE_DEFAULT_THEME || 'claudia',
      databasePath: import.meta.env.VITE_DATABASE_PATH || './claudia.db',
      conversationHistoryLength: parseInt(import.meta.env.VITE_CONVERSATION_HISTORY_LENGTH || '10'),
      imageStyle: import.meta.env.VITE_IMAGE_STYLE || 'realistic digital photography, warm natural lighting, detailed, beautiful composition',
      
      // Performance Settings
      avatarCacheSize: parseInt(import.meta.env.VITE_AVATAR_CACHE_SIZE || '100'),
      avatarCacheTTL: parseInt(import.meta.env.VITE_AVATAR_CACHE_TTL || '604800'), // 7 days
      llmTimeout: parseInt(import.meta.env.VITE_LLM_TIMEOUT || '30000'), // 30 seconds
      imageTimeout: parseInt(import.meta.env.VITE_IMAGE_TIMEOUT || '120000'), // 2 minutes
      
      // Development Settings
      debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
      mockAPIs: import.meta.env.VITE_MOCK_APIS === 'true',
      detailedErrors: import.meta.env.VITE_DETAILED_ERRORS === 'true'
    };
  }

  private validateConfig(): void {
    const errors: string[] = [];

    // Validate required settings
    if (!this.config.defaultLLMProvider) {
      errors.push('Default LLM provider is required');
    }

    if (!this.config.defaultImageProvider) {
      errors.push('Default image provider is required');
    }

    // Validate numeric settings
    if (this.config.avatarCacheSize <= 0) {
      errors.push('Avatar cache size must be positive');
    }
    if (this.config.conversationHistoryLength < 0) {
      errors.push('Conversation history length cannot be negative');
    }

    if (this.config.llmTimeout <= 0) {
      errors.push('LLM timeout must be positive');
    }

    if (this.config.imageTimeout <= 0) {
      errors.push('Image timeout must be positive');
    }

    // Validate provider choices
    const validLLMProviders = ['anthropic', 'google', 'local'];
    if (!validLLMProviders.includes(this.config.defaultLLMProvider)) {
      errors.push(`Invalid LLM provider: ${this.config.defaultLLMProvider}`);
    }

    const validImageProviders = ['replicate', 'google-image'];
    if (!validImageProviders.includes(this.config.defaultImageProvider)) {
      errors.push(`Invalid image provider: ${this.config.defaultImageProvider}`);
    }

    const validThemes = ['mainframe70s', 'pc80s', 'bbs90s', 'modern', 'claudia'];
    if (!validThemes.includes(this.config.defaultTheme)) {
      errors.push(`Invalid theme: ${this.config.defaultTheme}`);
    }

    if (errors.length > 0) {
      console.error('Configuration validation errors:', errors);
      if (!this.config.debugMode) {
        throw new Error(`Configuration errors: ${errors.join(', ')}`);
      }
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public get(key: keyof AppConfig): any {
    return this.config[key];
  }

  public getImageStyle(): string {
    // Check localStorage for saved style first
    const savedStyle = localStorage.getItem('claudia-image-style');
    if (savedStyle) {
      return savedStyle;
    }
    return this.config.imageStyle;
  }

  public hasApiKey(provider: string): boolean {
    switch (provider) {
      case 'anthropic':
        return !!this.config.anthropicApiKey;
      case 'google':
        return !!this.config.googleApiKey;
      case 'google-image':
        return !!this.config.googleImageApiKey;
      case 'openai':
        return !!this.config.openaiApiKey;
      case 'replicate':
        return !!this.config.replicateApiToken;
      default:
        return false;
    }
  }

  public getProviderConfig(provider: string): Record<string, any> {
    switch (provider) {
      case 'anthropic':
        return {
          apiKey: this.config.anthropicApiKey,
          timeout: this.config.llmTimeout
        };
      case 'google':
        return {
          apiKey: this.config.googleApiKey,
          timeout: this.config.llmTimeout
        };
      case 'google-image':
        return {
          apiKey: this.config.googleImageApiKey,
          timeout: this.config.imageTimeout
        };
      case 'local':
        return {
          baseURL: this.config.ollamaBaseUrl,
          model: this.config.localLLMModel,
          timeout: this.config.llmTimeout
        };
      case 'replicate':
        return {
          apiKey: this.config.replicateApiToken,
          timeout: this.config.imageTimeout
        };
      default:
        return {};
    }
  }

  public logConfiguration(): void {
    if (!this.config.debugMode) return;

    console.group('🔧 Claudia Configuration');
    console.log('Default LLM Provider:', this.config.defaultLLMProvider);
    console.log('Default Image Provider:', this.config.defaultImageProvider);
    console.log('Default Theme:', this.config.defaultTheme);
    console.log('Database Path:', this.config.databasePath);
    console.log('Conversation History Length:', this.config.conversationHistoryLength);
    console.log('Avatar Cache Size:', this.config.avatarCacheSize);
    console.log('LLM Timeout:', this.config.llmTimeout + 'ms');
    console.log('Image Timeout:', this.config.imageTimeout + 'ms');
    
    console.group('🔑 API Key Status');
    console.log('Anthropic:', this.hasApiKey('anthropic') ? '✅ Configured' : '❌ Missing');
    console.log('Google LLM:', this.hasApiKey('google') ? '✅ Configured' : '❌ Missing');
    console.log('Google Image:', this.hasApiKey('google-image') ? '✅ Configured' : '❌ Missing');
    console.log('OpenAI:', this.hasApiKey('openai') ? '✅ Configured' : '❌ Missing');
    console.log('Replicate:', this.hasApiKey('replicate') ? '✅ Configured' : '❌ Missing');
    console.groupEnd();
    
    console.group('🛠️ Development Settings');
    console.log('Debug Mode:', this.config.debugMode ? '✅ Enabled' : '❌ Disabled');
    console.log('Mock APIs:', this.config.mockAPIs ? '✅ Enabled' : '❌ Disabled');
    console.log('Detailed Errors:', this.config.detailedErrors ? '✅ Enabled' : '❌ Disabled');
    console.groupEnd();
    
    console.groupEnd();
  }
}

// Create singleton instance
export const configManager = new ConfigManager();

// Export config for easy access
export const config = configManager.getConfig();

// Helper functions
export const getApiKey = (provider: string): string | undefined => {
  switch (provider) {
    case 'anthropic':
      return config.anthropicApiKey;
    case 'google':
      return config.googleApiKey;
    case 'google-image':
      return config.googleImageApiKey;
    case 'openai':
      return config.openaiApiKey;
    case 'replicate':
      return config.replicateApiToken;
    default:
      return undefined;
  }
};

export const isProviderConfigured = (provider: string): boolean => {
  return configManager.hasApiKey(provider);
};

export const getProviderConfig = (provider: string): Record<string, any> => {
  return configManager.getProviderConfig(provider);
};

// Initialize configuration logging
if (config.debugMode) {
  configManager.logConfiguration();
}
