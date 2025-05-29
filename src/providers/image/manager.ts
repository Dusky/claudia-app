import type { ImageProvider, ImageProviderConfig } from './types';
import { ReplicateProvider } from './replicate';
import { GoogleImageProvider } from './google';

export class ImageProviderManager {
  private providers = new Map<string, ImageProvider>();
  private activeProvider: string | null = null;
  private fallbackModels: string[] = ['minimax/image-01', 'google/imagen-4', 'black-forest-labs/flux-schnell'];
  private currentModelIndex = 0;

  constructor() {
    // Register default providers
    this.registerProvider(new ReplicateProvider());
    this.registerProvider(new GoogleImageProvider());
  }

  registerProvider(provider: ImageProvider): void {
    this.providers.set(provider.id, provider);
  }

  async initializeProvider(providerId: string, config: ImageProviderConfig): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Image provider ${providerId} not found`);
    }

    await provider.initialize(config);
    this.activeProvider = providerId;
  }

  getProvider(providerId?: string): ImageProvider | null {
    const id = providerId || this.activeProvider;
    if (!id) return null;
    return this.providers.get(id) || null;
  }

  getActiveProvider(): ImageProvider | null {
    return this.activeProvider ? this.providers.get(this.activeProvider) || null : null;
  }

  getAvailableProviders(): Array<{ id: string; name: string; configured: boolean; models?: string[] }> {
    return Array.from(this.providers.values()).map(provider => ({
      id: provider.id,
      name: provider.name,
      configured: provider.isConfigured(),
      models: provider.getSupportedModels?.()
    }));
  }

  setActiveProvider(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new Error(`Image provider ${providerId} not found`);
    }
    this.activeProvider = providerId;
  }

  async generateImageWithFallback(request: any): Promise<any> {
    const provider = this.getActiveProvider();
    if (!provider) {
      throw new Error('No active image provider configured');
    }

    // Try with current model first
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.fallbackModels.length; attempt++) {
      try {
        const modelToTry = this.fallbackModels[(this.currentModelIndex + attempt) % this.fallbackModels.length];
        
        // Switch model if provider supports it
        if (provider.id === 'replicate' && typeof (provider as any).switchModel === 'function') {
          console.log(`🔄 Attempting image generation with model: ${modelToTry}`);
          (provider as any).switchModel(modelToTry, true);
        }
        
        const result = await provider.generateImage(request);
        
        // Success - update current model index for next time
        this.currentModelIndex = (this.currentModelIndex + attempt) % this.fallbackModels.length;
        console.log(`✅ Image generation successful with model: ${modelToTry}`);
        
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`❌ Model ${this.fallbackModels[(this.currentModelIndex + attempt) % this.fallbackModels.length]} failed:`, lastError.message);
        
        // Don't retry for certain types of errors
        if (lastError.message.includes('API key') || lastError.message.includes('authentication')) {
          throw lastError;
        }
      }
    }
    
    // All models failed
    throw new Error(`All fallback models failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  setFallbackModels(models: string[]): void {
    this.fallbackModels = models;
    this.currentModelIndex = 0;
  }

  getFallbackModels(): string[] {
    return [...this.fallbackModels];
  }
}