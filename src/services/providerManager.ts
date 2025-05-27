import type { LLMProviderManager } from '../providers/llm/manager';
import type { ImageProviderManager } from '../providers/image/manager';
import type { MCPProviderManager } from '../providers/mcp/manager';
import { config as envConfig, configManager, isProviderConfigured } from '../config/env';

/**
 * Unified provider management service
 * Centralizes initialization and configuration of all providers
 */
export class ProviderManager {
  private llmManager: LLMProviderManager;
  private imageManager: ImageProviderManager;
  private mcpManager: MCPProviderManager;
  private initializationStatus = {
    llm: false,
    image: false,
    mcp: false
  };

  constructor(
    llmManager: LLMProviderManager,
    imageManager: ImageProviderManager,
    mcpManager: MCPProviderManager
  ) {
    this.llmManager = llmManager;
    this.imageManager = imageManager;
    this.mcpManager = mcpManager;
  }

  /**
   * Initialize all providers with graceful error handling
   */
  async initializeAllProviders(): Promise<{
    llm: { success: boolean; error?: string };
    image: { success: boolean; error?: string };
    mcp: { success: boolean; error?: string };
  }> {
    const results = {
      llm: { success: false } as { success: boolean; error?: string },
      image: { success: false } as { success: boolean; error?: string },
      mcp: { success: false } as { success: boolean; error?: string }
    };

    // Initialize LLM provider
    try {
      if (isProviderConfigured(envConfig.defaultLLMProvider)) {
        await this.llmManager.initializeProvider(envConfig.defaultLLMProvider);
        results.llm.success = true;
        this.initializationStatus.llm = true;
        console.log('✅ LLM provider initialized:', envConfig.defaultLLMProvider);
      } else {
        results.llm.error = `Default LLM provider ${envConfig.defaultLLMProvider} not configured (missing API key)`;
        console.log('ℹ️ LLM provider not configured');
      }
    } catch (error) {
      results.llm.error = error instanceof Error ? error.message : 'Unknown LLM initialization error';
      console.warn('⚠️ LLM provider initialization failed:', error);
    }

    // Initialize Image provider
    try {
      if (isProviderConfigured(envConfig.defaultImageProvider)) {
        const imageProviderConfig = configManager.getProviderConfig(envConfig.defaultImageProvider);
        await this.imageManager.initializeProvider(envConfig.defaultImageProvider, imageProviderConfig);
        results.image.success = true;
        this.initializationStatus.image = true;
        console.log('✅ Image provider initialized:', envConfig.defaultImageProvider);
      } else {
        results.image.error = `Default image provider ${envConfig.defaultImageProvider} not configured (missing API key)`;
        console.log('ℹ️ Image provider not configured');
      }
    } catch (error) {
      results.image.error = error instanceof Error ? error.message : 'Unknown image initialization error';
      console.warn('⚠️ Image provider initialization failed:', error);
    }

    // Initialize MCP provider
    try {
      await this.mcpManager.initialize();
      results.mcp.success = true;
      this.initializationStatus.mcp = true;
      console.log('✅ MCP provider initialized');
    } catch (error) {
      results.mcp.error = error instanceof Error ? error.message : 'Unknown MCP initialization error';
      console.warn('⚠️ MCP provider initialization failed:', error);
    }

    return results;
  }

  /**
   * Get initialization status of all providers
   */
  getInitializationStatus(): {
    llm: boolean;
    image: boolean;
    mcp: boolean;
    allInitialized: boolean;
    anyInitialized: boolean;
  } {
    const { llm, image, mcp } = this.initializationStatus;
    return {
      llm,
      image,
      mcp,
      allInitialized: llm && image && mcp,
      anyInitialized: llm || image || mcp
    };
  }

  /**
   * Re-initialize a specific provider
   */
  async reinitializeProvider(type: 'llm' | 'image' | 'mcp'): Promise<{ success: boolean; error?: string }> {
    try {
      switch (type) {
        case 'llm':
          if (isProviderConfigured(envConfig.defaultLLMProvider)) {
            await this.llmManager.initializeProvider(envConfig.defaultLLMProvider);
            this.initializationStatus.llm = true;
            return { success: true };
          } else {
            return { success: false, error: 'LLM provider not configured' };
          }

        case 'image':
          if (isProviderConfigured(envConfig.defaultImageProvider)) {
            const imageProviderConfig = configManager.getProviderConfig(envConfig.defaultImageProvider);
            await this.imageManager.initializeProvider(envConfig.defaultImageProvider, imageProviderConfig);
            this.initializationStatus.image = true;
            return { success: true };
          } else {
            return { success: false, error: 'Image provider not configured' };
          }

        case 'mcp':
          await this.mcpManager.initialize();
          this.initializationStatus.mcp = true;
          return { success: true };

        default:
          return { success: false, error: 'Unknown provider type' };
      }
    } catch (error) {
      this.initializationStatus[type] = false;
      return {
        success: false,
        error: error instanceof Error ? error.message : `Unknown ${type} initialization error`
      };
    }
  }

  /**
   * Check if providers are ready for use
   */
  getProviderReadiness(): {
    llmReady: boolean;
    imageReady: boolean;
    mcpReady: boolean;
    canUseAI: boolean;
    canGenerateImages: boolean;
  } {
    const llmProvider = this.llmManager.getActiveProvider();
    const imageProvider = this.imageManager.getActiveProvider();
    
    const llmReady = llmProvider?.isConfigured() ?? false;
    const imageReady = imageProvider?.isConfigured() ?? false;
    const mcpReady = this.mcpManager.isConfigured();

    return {
      llmReady,
      imageReady,
      mcpReady,
      canUseAI: llmReady,
      canGenerateImages: imageReady
    };
  }

  /**
   * Get provider configurations for diagnostics
   */
  getProviderDiagnostics(): {
    llm: {
      configured: boolean;
      activeProvider: string | null;
      defaultProvider: string;
      configuredProviders: Array<{ id: string; name: string; configured: boolean }>;
    };
    image: {
      configured: boolean;
      activeProvider: string | null;
      defaultProvider: string;
      configuredProviders: Array<{ id: string; name: string; configured: boolean }>;
    };
    mcp: {
      configured: boolean;
      enabled: boolean;
    };
  } {
    const llmProvider = this.llmManager.getActiveProvider();
    const imageProvider = this.imageManager.getActiveProvider();

    return {
      llm: {
        configured: llmProvider?.isConfigured() ?? false,
        activeProvider: llmProvider?.id ?? null,
        defaultProvider: envConfig.defaultLLMProvider,
        configuredProviders: this.llmManager.getAvailableProviders()
      },
      image: {
        configured: imageProvider?.isConfigured() ?? false,
        activeProvider: imageProvider?.id ?? null,
        defaultProvider: envConfig.defaultImageProvider,
        configuredProviders: this.imageManager.getAvailableProviders()
      },
      mcp: {
        configured: this.mcpManager.isConfigured(),
        enabled: true // MCP is always enabled if configured
      }
    };
  }

  /**
   * Reset all providers (useful for testing or error recovery)
   */
  async resetAllProviders(): Promise<void> {
    this.initializationStatus = {
      llm: false,
      image: false,
      mcp: false
    };
    
    // Note: We don't actually reset the managers here since they might be in use
    // This just resets our tracking of initialization status
    console.log('Provider initialization status reset');
  }
}