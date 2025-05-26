import type { ImageProvider, ImageProviderConfig } from './types';
import { ReplicateProvider } from './replicate';
import { GoogleImageProvider } from './google';

export class ImageProviderManager {
  private providers = new Map<string, ImageProvider>();
  private activeProvider: string | null = null;

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
}