import type { LLMProvider, LLMProviderConfig } from './types';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import { LocalProvider } from './local';
import { config, isProviderConfigured } from '../../config/env';

export class LLMProviderManager {
  private providers = new Map<string, LLMProvider>();
  private activeProvider: string | null = null;
  private defaultTimeout: number = 30000; // 30 seconds
  private activeRequests = new Map<string, AbortController>();

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

  async generateText(
    prompt: string, 
    options?: { 
      systemMessage?: string; 
      temperature?: number; 
      maxTokens?: number;
      timeout?: number;
      signal?: AbortSignal;
    }
  ): Promise<string> {
    const provider = this.getActiveProvider();
    if (!provider) {
      throw new Error('No active LLM provider configured');
    }

    const requestId = `generateText_${Date.now()}_${Math.random()}`;
    const controller = new AbortController();
    const timeout = options?.timeout || this.defaultTimeout;
    
    // Combine external signal with our timeout signal
    if (options?.signal) {
      options.signal.addEventListener('abort', () => {
        controller.abort();
      });
    }
    
    this.activeRequests.set(requestId, controller);
    
    // Set up timeout with warning at 20s
    const warningTimeout = setTimeout(() => {
      if (!controller.signal.aborted) {
        console.warn(`⚠️ LLM request taking longer than 20s (timeout at ${timeout}ms)`);
      }
    }, 20000);
    
    const requestTimeout = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await provider.generateText(prompt, {
        systemMessage: options?.systemMessage,
        maxTokens: options?.maxTokens || 150,
        temperature: options?.temperature || 0.7,
        signal: controller.signal
      });
      
      clearTimeout(warningTimeout);
      clearTimeout(requestTimeout);
      this.activeRequests.delete(requestId);
      
      return response;
    } catch (error) {
      clearTimeout(warningTimeout);
      clearTimeout(requestTimeout);
      this.activeRequests.delete(requestId);
      
      if (controller.signal.aborted) {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      
      console.error('LLM generateText failed:', error);
      throw error;
    }
  }
  
  /**
   * Cancel all active requests
   */
  cancelAllRequests(): void {
    for (const [requestId, controller] of this.activeRequests) {
      controller.abort();
      console.log(`Cancelled LLM request: ${requestId}`);
    }
    this.activeRequests.clear();
  }
  
  /**
   * Get number of active requests
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }
  
  /**
   * Set default timeout for requests
   */
  setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }
}