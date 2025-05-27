import axios from 'axios';
import type { ImageProvider, ImageGenerationRequest, ImageGenerationResponse, ImageProviderConfig } from './types';
import { getApiKey, config } from '../../config/env';
import { ApiKeySecurity } from '../../config/security';

export interface GoogleImageProviderConfig extends ImageProviderConfig {
  model?: string;
  projectId?: string;
  location?: string;
}

export class GoogleImageProvider implements ImageProvider {
  name = 'Google AI';
  id = 'google-image';
  private config: GoogleImageProviderConfig = {};
  
  private supportedModels = [
    'imagen-3.0-generate-001',
    'imagen-3.0-fast-generate-001'
  ];

  async initialize(providerConfig?: GoogleImageProviderConfig): Promise<void> {
    const apiKey = providerConfig?.apiKey || getApiKey('google-image');
    
    // Validate API key security
    if (apiKey) {
      const validation = ApiKeySecurity.validateApiKey('google-image', apiKey);
      if (!validation.valid) {
        console.warn(`Google Image API key validation failed: ${validation.message}`);
      }
    }
    
    this.config = {
      apiKey,
      model: providerConfig?.model || 'imagen-3.0-generate-001',
      projectId: providerConfig?.projectId || 'default',
      location: providerConfig?.location || 'us-central1',
      timeout: config.imageTimeout,
      defaultParameters: {
        width: 1024,
        height: 1024,
        aspectRatio: '1:1',
        ...providerConfig?.defaultParameters
      },
      ...providerConfig
    };
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  getSupportedModels(): string[] {
    return this.supportedModels;
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Google Image provider not configured');
    }

    try {
      console.log('🔍 Testing Google AI Image API connection...');
      // For Google AI, we'll do a minimal test by making a simple request
      // Note: Google AI Studio uses a different endpoint than Vertex AI
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateImage?key=${this.config.apiKey}`,
        {
          prompt: 'test',
          generationConfig: {
            width: 256,
            height: 256
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000,
          validateStatus: (status) => status < 500 // Accept 4xx as connection working
        }
      );
      
      console.log('✅ Connection test successful, status:', response.status);
      return true;
    } catch (error: any) {
      console.error('❌ Connection test failed:', error);
      if (error.response?.status === 400) {
        // 400 means the API is reachable but request format is wrong
        console.log('✅ API is reachable (got 400 for test request)');
        return true;
      }
      throw error;
    }
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.isConfigured()) {
      throw new Error('Google Image provider not configured');
    }

    try {
      console.log('🎨 Generating image with Google AI:', {
        model: this.config.model,
        prompt: request.prompt.substring(0, 100) + '...'
      });

      const aspectRatio = this.calculateAspectRatio(
        request.width || this.config.defaultParameters?.width || 1024,
        request.height || this.config.defaultParameters?.height || 1024
      );

      const requestBody = {
        prompt: request.prompt,
        generationConfig: {
          aspectRatio,
          responseMimeType: 'image/png',
          ...(request.negativePrompt && { negativePrompt: request.negativePrompt }),
          ...(request.seed && { seed: request.seed })
        }
      };

      console.log('📡 Making request to Google AI Image API:', {
        model: this.config.model,
        aspectRatio,
        hasNegativePrompt: !!request.negativePrompt,
        hasSeed: !!request.seed
      });

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateImage?key=${this.config.apiKey}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout || 120000
        }
      );

      if (!response.data?.generatedImages?.[0]?.imageUri) {
        throw new Error('Invalid response format from Google AI');
      }

      const imageUrl = response.data.generatedImages[0].imageUri;

      console.log('✅ Image generation successful:', {
        imageUrl: imageUrl.substring(0, 50) + '...',
        model: this.config.model
      });

      return {
        imageUrl,
        seed: request.seed,
        parameters: request,
        metadata: {
          prompt: request.prompt,
          model: this.config.model || 'unknown',
          provider: this.id,
          generatedAt: new Date().toISOString(),
          aspectRatio
        }
      };

    } catch (error: any) {
      console.error('❌ Google AI image generation error:', error);
      
      if (error.response) {
        console.error('API Response Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`Google AI API error (${error.response.status}): ${error.response.data?.error?.message || error.response.statusText}`);
      }
      
      if (error.request) {
        throw new Error('No response from Google AI API. Check your internet connection and API key.');
      }
      
      throw new Error(`Google AI image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateAspectRatio(width: number, height: number): string {
    // Google AI supports specific aspect ratios
    const ratio = width / height;
    
    if (Math.abs(ratio - 1) < 0.1) return '1:1';      // Square
    if (Math.abs(ratio - 16/9) < 0.1) return '16:9';  // Landscape
    if (Math.abs(ratio - 9/16) < 0.1) return '9:16';  // Portrait
    if (Math.abs(ratio - 4/3) < 0.1) return '4:3';    // Classic landscape
    if (Math.abs(ratio - 3/4) < 0.1) return '3:4';    // Classic portrait
    if (Math.abs(ratio - 3/2) < 0.1) return '3:2';    // Photo landscape
    if (Math.abs(ratio - 2/3) < 0.1) return '2:3';    // Photo portrait
    
    // Default to closest supported ratio
    if (ratio > 1) {
      return ratio > 1.5 ? '16:9' : '4:3';
    } else {
      return ratio < 0.67 ? '9:16' : '3:4';
    }
  }

  /**
   * Switch to a different model
   */
  switchModel(modelName: string): void {
    if (!this.supportedModels.includes(modelName)) {
      throw new Error(`Unsupported model: ${modelName}`);
    }
    this.config.model = modelName;
    console.log('🔄 Switched to Google AI model:', modelName);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): GoogleImageProviderConfig {
    return { ...this.config };
  }

  /**
   * Get supported aspect ratios
   */
  getSupportedAspectRatios(): string[] {
    return ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'];
  }
}