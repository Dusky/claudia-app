import type { StorageService } from '../storage/types';
import type { ConfigSettings } from '../store/appStore';

/**
 * Centralized settings management service
 * Handles all application settings with proper typing and validation
 */
export class SettingsManager {
  private storage: StorageService;
  private cache = new Map<string, unknown>();
  
  constructor(storage: StorageService) {
    this.storage = storage;
  }

  // AI Settings
  async getAITemperature(defaultValue = 0.8): Promise<number> {
    const value = await this.storage.getSetting<number>('ai.temperature', defaultValue);
    return this.validateNumber(value ?? defaultValue, 0, 2, defaultValue);
  }

  async setAITemperature(temperature: number): Promise<void> {
    const validated = this.validateNumber(temperature, 0, 2, 0.8);
    await this.storage.setSetting('ai.temperature', validated, 'number');
    this.cache.set('ai.temperature', validated);
  }

  async getAIMaxTokens(defaultValue = 1000): Promise<number> {
    const value = await this.storage.getSetting<number>('ai.maxTokens', defaultValue);
    return this.validateNumber(value ?? defaultValue, 1, 100000, defaultValue);
  }

  async setAIMaxTokens(maxTokens: number): Promise<void> {
    const validated = this.validateNumber(maxTokens, 1, 100000, 1000);
    await this.storage.setSetting('ai.maxTokens', validated, 'number');
    this.cache.set('ai.maxTokens', validated);
  }

  async getAIContextLength(defaultValue = 8000): Promise<number> {
    const value = await this.storage.getSetting<number>('ai.contextLength', defaultValue);
    return this.validateNumber(value ?? defaultValue, 0, 50000, defaultValue);
  }

  async setAIContextLength(contextLength: number): Promise<void> {
    const validated = this.validateNumber(contextLength, 0, 50000, 8000);
    await this.storage.setSetting('ai.contextLength', validated, 'number');
    this.cache.set('ai.contextLength', validated);
  }

  async getStreamingEnabled(defaultValue = false): Promise<boolean> {
    const value = await this.storage.getSetting<boolean>('ai.streamingEnabled', defaultValue);
    return value ?? defaultValue;
  }

  async setStreamingEnabled(enabled: boolean): Promise<void> {
    await this.storage.setSetting('ai.streamingEnabled', enabled, 'boolean');
    this.cache.set('ai.streamingEnabled', enabled);
  }

  // MCP Settings
  async getMCPEnabled(defaultValue = true): Promise<boolean> {
    const value = await this.storage.getSetting<boolean>('mcp.enabled', defaultValue);
    return value ?? defaultValue;
  }

  async setMCPEnabled(enabled: boolean): Promise<void> {
    await this.storage.setSetting('mcp.enabled', enabled, 'boolean');
    this.cache.set('mcp.enabled', enabled);
  }

  // App Settings
  async getGlobalImageGeneration(defaultValue = true): Promise<boolean> {
    const value = await this.storage.getSetting<boolean>('app.globalImageGeneration', defaultValue);
    return value ?? defaultValue;
  }

  async setGlobalImageGeneration(enabled: boolean): Promise<void> {
    await this.storage.setSetting('app.globalImageGeneration', enabled, 'boolean');
    this.cache.set('app.globalImageGeneration', enabled);
  }

  async getActivePersonalityId(): Promise<string | null> {
    return await this.storage.getSetting<string>('active_personality');
  }

  async setActivePersonalityId(personalityId: string): Promise<void> {
    await this.storage.setSetting('active_personality', personalityId, 'string');
    this.cache.set('active_personality', personalityId);
  }

  // Configuration Management
  async getAppConfig(): Promise<ConfigSettings | null> {
    try {
      const saved = localStorage.getItem('claudia-config');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load app config:', error);
      return null;
    }
  }

  async setAppConfig(config: ConfigSettings): Promise<void> {
    try {
      localStorage.setItem('claudia-config', JSON.stringify(config));
      this.cache.set('app.config', config);
    } catch (error) {
      console.warn('Failed to save app config:', error);
    }
  }

  // Conversation Settings
  async getLastActiveConversationId(): Promise<string | null> {
    return await this.storage.getSetting<string>('lastActiveConversationId');
  }

  async setLastActiveConversationId(conversationId: string | null): Promise<void> {
    await this.storage.setSetting('lastActiveConversationId', conversationId, 'string');
    this.cache.set('lastActiveConversationId', conversationId);
  }

  // Bulk operations
  async getAllAISettings(): Promise<{
    temperature: number;
    maxTokens: number;
    contextLength: number;
    streamingEnabled: boolean;
  }> {
    return {
      temperature: await this.getAITemperature(),
      maxTokens: await this.getAIMaxTokens(),
      contextLength: await this.getAIContextLength(),
      streamingEnabled: await this.getStreamingEnabled(),
    };
  }

  async setAISettings(settings: {
    temperature?: number;
    maxTokens?: number;
    contextLength?: number;
    streamingEnabled?: boolean;
  }): Promise<void> {
    const promises = [];
    
    if (settings.temperature !== undefined) {
      promises.push(this.setAITemperature(settings.temperature));
    }
    if (settings.maxTokens !== undefined) {
      promises.push(this.setAIMaxTokens(settings.maxTokens));
    }
    if (settings.contextLength !== undefined) {
      promises.push(this.setAIContextLength(settings.contextLength));
    }
    if (settings.streamingEnabled !== undefined) {
      promises.push(this.setStreamingEnabled(settings.streamingEnabled));
    }

    await Promise.all(promises);
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  getCachedValue<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  // Validation helpers
  private validateNumber(value: number, min: number, max: number, defaultValue: number): number {
    if (typeof value !== 'number' || isNaN(value) || value < min || value > max) {
      console.warn(`Invalid number value: ${value}, using default: ${defaultValue}`);
      return defaultValue;
    }
    return value;
  }


  // Migration support
  async migrateOldSettings(): Promise<void> {
    try {
      // Check for old localStorage keys and migrate them
      const oldKeys = [
        'claudia_ai_temperature',
        'claudia_ai_maxTokens',
        'claudia_ai_contextLength',
      ];

      for (const key of oldKeys) {
        const oldValue = localStorage.getItem(key);
        if (oldValue) {
          try {
            const newKey = key.replace('claudia_ai_', 'ai.');
            const parsedValue = JSON.parse(oldValue);
            await this.storage.setSetting(newKey, parsedValue);
            localStorage.removeItem(key); // Clean up old key
            console.log(`Migrated setting: ${key} -> ${newKey}`);
          } catch (error) {
            console.warn(`Failed to migrate setting ${key}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Settings migration failed:', error);
    }
  }
}