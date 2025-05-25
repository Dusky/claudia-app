import type { LLMProvider, LLMProviderConfig } from './types';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import { LocalProvider } from './local';
import { config, isProviderConfigured } from '../../config/env';

export class LLMProviderManager {
  private providers = new Map<string, LLMProvider>();
  private activeProvider: string | null = null;

  constructor() {
    // Register default providers
    this.registerProvider(new AnthropicProvider());
    this.registerProvider(new GoogleProvider());
    this.registerProvider(new LocalProvider());
    
    // Auto-initialize and set default provider if configured
    this.autoInitialize();
  }

  private async autoInitialize(): Promise<void> {
    // Try to initialize the default provider from environment
    const defaultProvider = config.defaultLLMProvider;
    
    if (isProviderConfigured(defaultProvider)) {
      try {
        await this.initializeProvider(defaultProvider);
        console.log(`✅ Auto-initialized ${defaultProvider} provider`);
      } catch (error) {
        console.warn(`⚠️ Failed to auto-initialize ${defaultProvider}:`, error);
      }
    } else {
      console.log(`ℹ️ Default provider ${defaultProvider} not configured (missing API key)`);
    }
  }

  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  async initializeProvider(providerId: string, providerConfig?: LLMProviderConfig): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    await provider.initialize(providerConfig);
    this.activeProvider = providerId;
  }

  getProvider(providerId?: string): LLMProvider | null {
    const id = providerId || this.activeProvider;
    if (!id) return null;
    return this.providers.get(id) || null;
  }

  getActiveProvider(): LLMProvider | null {
    return this.activeProvider ? this.providers.get(this.activeProvider) || null : null;
  }

  getAvailableProviders(): Array<{ id: string; name: string; configured: boolean }> {
    return Array.from(this.providers.values()).map(provider => ({
      id: provider.id,
      name: provider.name,
      configured: provider.isConfigured()
    }));
  }

  setActiveProvider(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider ${providerId} not found`);
    }
    this.activeProvider = providerId;
  }
}