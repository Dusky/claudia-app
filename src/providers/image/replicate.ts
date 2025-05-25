import axios from 'axios';
import { ImageProvider, ImageGenerationRequest, ImageGenerationResponse, ImageProviderConfig, PredictionStatus } from './types';
import { getApiKey, config } from '../../config/env';

export class ReplicateProvider implements ImageProvider {
  name = 'Replicate';
  id = 'replicate';
  private config: ImageProviderConfig = {};

  async initialize(providerConfig?: ImageProviderConfig): Promise<void> {
    this.config = {
      apiKey: providerConfig?.apiKey || getApiKey('replicate'),
      baseURL: providerConfig?.baseURL || 'https://api.replicate.com',
      model: providerConfig?.model || 'black-forest-labs/flux-schnell',
      timeout: config.imageTimeout,
      defaultParameters: {
        width: 1024,
        height: 1024,
        num_inference_steps: 4,
        guidance_scale: 0.0,
        ...providerConfig?.defaultParameters
      },
      ...providerConfig
    };
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  getSupportedModels(): string[] {
    return [
      'black-forest-labs/flux-schnell',
      'black-forest-labs/flux-dev',
      'stability-ai/stable-diffusion-3',
      'stability-ai/sdxl',
      'bytedance/sdxl-lightning-4step'
    ];
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.isConfigured()) {
      throw new Error('Replicate provider not configured');
    }

    try {
      // Create prediction using official model endpoint
      const predictionResponse = await this.createPrediction(request);
      
      // Wait for completion or poll if needed
      const completedPrediction = await this.waitForCompletion(predictionResponse.id);
      
      if (completedPrediction.status !== 'succeeded') {
        throw new Error(`Image generation failed: ${completedPrediction.error || 'Unknown error'}`);
      }

      // Extract image URL from output
      const imageUrl = Array.isArray(completedPrediction.output) 
        ? completedPrediction.output[0] 
        : completedPrediction.output;

      return {
        imageUrl,
        seed: request.seed,
        parameters: request,
        metadata: {
          prompt: request.prompt,
          model: this.config.model || 'unknown',
          provider: this.id,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Replicate image generation error:', error);
      throw new Error(`Replicate image generation failed: ${error}`);
    }
  }

  private async createPrediction(request: ImageGenerationRequest): Promise<{ id: string }> {
    const input = this.buildInputParameters(request);
    
    // Use the official model predictions endpoint
    const [owner, modelName] = (this.config.model || 'black-forest-labs/flux-schnell').split('/');
    
    const response = await axios.post(
      `${this.config.baseURL}/v1/models/${owner}/${modelName}/predictions`,
      { input },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait=60' // Wait up to 60 seconds for completion
        }
      }
    );

    return response.data;
  }

  private buildInputParameters(request: ImageGenerationRequest): Record<string, any> {
    const input: Record<string, any> = {
      prompt: request.prompt,
      width: request.width || this.config.defaultParameters?.width || 1024,
      height: request.height || this.config.defaultParameters?.height || 1024,
      ...this.config.defaultParameters
    };

    // Add optional parameters if provided
    if (request.negativePrompt) {
      input.negative_prompt = request.negativePrompt;
    }
    
    if (request.steps) {
      input.num_inference_steps = request.steps;
    }
    
    if (request.guidance) {
      input.guidance_scale = request.guidance;
    }
    
    if (request.seed) {
      input.seed = request.seed;
    }

    // Add any additional provider-specific parameters
    Object.keys(request).forEach(key => {
      if (!['prompt', 'negativePrompt', 'width', 'height', 'steps', 'guidance', 'seed', 'style'].includes(key)) {
        input[key] = request[key];
      }
    });

    return input;
  }

  private async waitForCompletion(predictionId: string, maxWaitTime = 300000): Promise<PredictionStatus> {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getPredictionStatus(predictionId);
      
      if (['succeeded', 'failed', 'canceled'].includes(status.status)) {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Image generation timed out');
  }

  private async getPredictionStatus(predictionId: string): Promise<PredictionStatus> {
    const response = await axios.get(
      `${this.config.baseURL}/v1/predictions/${predictionId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      }
    );

    return response.data;
  }

  async cancelPrediction(predictionId: string): Promise<void> {
    await axios.post(
      `${this.config.baseURL}/v1/predictions/${predictionId}/cancel`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      }
    );
  }
}