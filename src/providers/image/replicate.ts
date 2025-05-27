import axios from 'axios';
import type { ImageProvider, ImageGenerationRequest, ImageGenerationResponse, ImageProviderConfig, PredictionStatus } from './types';
import { getApiKey, config } from '../../config/env';
import { ApiKeySecurity } from '../../config/security';

export interface ReplicateModel {
  id: string;
  owner: string;
  name: string;
  description: string;
  visibility: 'public' | 'private';
  github_url?: string;
  paper_url?: string;
  license_url?: string;
  cover_image_url?: string;
  latest_version?: {
    id: string;
    created_at: string;
    cog_version: string;
    openapi_schema: any;
  };
}

export interface ModelConfig {
  maxSteps: number;
  defaultSteps: number;
  maxGuidance: number;
  defaultGuidance: number;
  supportedDimensions: { width: number; height: number }[];
  defaultDimensions: { width: number; height: number };
  supportsNegativePrompt: boolean;
  description: string;
}

export interface ReplicateProviderConfig extends ImageProviderConfig {
  useOfficialModels?: boolean;
  version?: string; // For non-official models
}

export class ReplicateProvider implements ImageProvider {
  name = 'Replicate';
  id = 'replicate';
  private config: ReplicateProviderConfig = {};
  private supportedModels: Record<string, ReplicateModel> = {};
  
  private modelConfigs: Record<string, ModelConfig> = {
    'minimax/image-01': {
      maxSteps: 50,
      defaultSteps: 25,
      maxGuidance: 20.0,
      defaultGuidance: 7.5,
      supportedDimensions: [
        { width: 512, height: 512 },
        { width: 768, height: 768 },
        { width: 1024, height: 1024 },
        { width: 1024, height: 1536 },
        { width: 1536, height: 1024 },
      ],
      defaultDimensions: { width: 1024, height: 1024 },
      supportsNegativePrompt: true,
      description: 'Minimax Image 01 - General purpose image generation'
    },
    'google/imagen-4': {
      maxSteps: 1,
      defaultSteps: 1,
      maxGuidance: 1.0,
      defaultGuidance: 1.0,
      supportedDimensions: [
        { width: 512, height: 512 },
        { width: 768, height: 768 },
        { width: 1024, height: 1024 },
        { width: 1152, height: 896 },
        { width: 896, height: 1152 },
        { width: 1536, height: 1024 },
        { width: 1024, height: 1536 }
      ],
      defaultDimensions: { width: 1024, height: 1024 },
      supportsNegativePrompt: true,
      description: 'Google Imagen 4 - State-of-the-art image generation'
    },
    'black-forest-labs/flux-1.1-pro': {
      maxSteps: 1,
      defaultSteps: 1,
      maxGuidance: 10.0,
      defaultGuidance: 3.5,
      supportedDimensions: [
        { width: 512, height: 512 },
        { width: 768, height: 768 },
        { width: 1024, height: 1024 },
        { width: 1152, height: 896 },
        { width: 896, height: 1152 },
        { width: 1536, height: 1024 },
        { width: 1024, height: 1536 }
      ],
      defaultDimensions: { width: 1024, height: 1024 },
      supportsNegativePrompt: false,
      description: 'FLUX.1.1 Pro - Professional quality, single-step generation'
    },
    'black-forest-labs/flux-schnell': {
      maxSteps: 4,
      defaultSteps: 4,
      maxGuidance: 4.0,
      defaultGuidance: 0.0,
      supportedDimensions: [
        { width: 512, height: 512 },
        { width: 768, height: 768 },
        { width: 1024, height: 1024 },
        { width: 1152, height: 896 },
        { width: 896, height: 1152 }
      ],
      defaultDimensions: { width: 1024, height: 1024 },
      supportsNegativePrompt: false,
      description: 'Fast image generation model (4 steps max)'
    },
    'black-forest-labs/flux-dev': {
      maxSteps: 50,
      defaultSteps: 28,
      maxGuidance: 10.0,
      defaultGuidance: 3.5,
      supportedDimensions: [
        { width: 512, height: 512 },
        { width: 768, height: 768 },
        { width: 1024, height: 1024 },
        { width: 1152, height: 896 },
        { width: 896, height: 1152 }
      ],
      defaultDimensions: { width: 1024, height: 1024 },
      supportsNegativePrompt: false,
      description: 'Higher quality model with more steps'
    },
    'stability-ai/stable-diffusion-3.5-large': {
      maxSteps: 50,
      defaultSteps: 28,
      maxGuidance: 10.0,
      defaultGuidance: 7.0,
      supportedDimensions: [
        { width: 512, height: 512 },
        { width: 768, height: 768 },
        { width: 1024, height: 1024 },
        { width: 1152, height: 896 },
        { width: 896, height: 1152 }
      ],
      defaultDimensions: { width: 1024, height: 1024 },
      supportsNegativePrompt: true,
      description: 'Stable Diffusion 3.5 Large - Latest SD model'
    },
    'stability-ai/stable-diffusion-3': {
      maxSteps: 50,
      defaultSteps: 28,
      maxGuidance: 10.0,
      defaultGuidance: 7.0,
      supportedDimensions: [
        { width: 512, height: 512 },
        { width: 768, height: 768 },
        { width: 1024, height: 1024 }
      ],
      defaultDimensions: { width: 1024, height: 1024 },
      supportsNegativePrompt: true,
      description: 'Stable Diffusion 3 with negative prompts'
    },
    'ideogram-ai/ideogram-v2': {
      maxSteps: 1,
      defaultSteps: 1,
      maxGuidance: 10.0,
      defaultGuidance: 5.0,
      supportedDimensions: [
        { width: 512, height: 512 },
        { width: 768, height: 768 },
        { width: 1024, height: 1024 },
        { width: 1152, height: 896 },
        { width: 896, height: 1152 }
      ],
      defaultDimensions: { width: 1024, height: 1024 },
      supportsNegativePrompt: true,
      description: 'Ideogram v2 - Excellent for text in images'
    },
    'recraft-ai/recraft-v3': {
      maxSteps: 1,
      defaultSteps: 1,
      maxGuidance: 10.0,
      defaultGuidance: 7.5,
      supportedDimensions: [
        { width: 512, height: 512 },
        { width: 768, height: 768 },
        { width: 1024, height: 1024 },
        { width: 1152, height: 896 },
        { width: 896, height: 1152 }
      ],
      defaultDimensions: { width: 1024, height: 1024 },
      supportsNegativePrompt: false,
      description: 'Recraft v3 - Professional design and illustrations'
    },
    'stability-ai/sdxl': {
      maxSteps: 50,
      defaultSteps: 30,
      maxGuidance: 20.0,
      defaultGuidance: 7.5,
      supportedDimensions: [
        { width: 512, height: 512 },
        { width: 768, height: 768 },
        { width: 1024, height: 1024 },
        { width: 1152, height: 896 },
        { width: 896, height: 1152 }
      ],
      defaultDimensions: { width: 1024, height: 1024 },
      supportsNegativePrompt: true,
      description: 'SDXL model with negative prompt support'
    }
  };

  async initialize(providerConfig?: ReplicateProviderConfig): Promise<void> {
    const apiKey = providerConfig?.apiKey || getApiKey('replicate');
    
    // Validate API key security
    if (apiKey) {
      const validation = ApiKeySecurity.validateApiKey('replicate', apiKey);
      if (!validation.valid) {
        console.warn(`Replicate API key validation failed: ${validation.message}`);
      }
    }
    
    // Use proxy in development to avoid CORS issues
    const isDevelopment = import.meta.env.DEV;
    const baseURL = isDevelopment 
      ? '/api/replicate'  // This will be proxied to api.replicate.com
      : (providerConfig?.baseURL || 'https://api.replicate.com');
    
    const selectedModel = providerConfig?.model || 'google/imagen-4'; // Default to a known good model
    const modelConfig = this.modelConfigs[selectedModel] || this.modelConfigs['minimax/image-01']; // Fallback if selectedModel config is missing
    
    this.config = {
      apiKey,
      baseURL,
      model: selectedModel,
      useOfficialModels: providerConfig?.useOfficialModels ?? true,
      timeout: config.imageTimeout,
      defaultParameters: {
        width: modelConfig?.defaultDimensions.width || 1024,
        height: modelConfig?.defaultDimensions.height || 1024,
        num_inference_steps: modelConfig?.defaultSteps || 25, // Adjusted default
        guidance_scale: modelConfig?.defaultGuidance || 7.5, // Adjusted default
        ...providerConfig?.defaultParameters
      },
      ...providerConfig
    };

    // Initialize supported models list
    await this.loadSupportedModels();
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  getSupportedModels(): string[] {
    const baseModels = [
      'minimax/image-01', // Added new model
      'google/imagen-4',
      'black-forest-labs/flux-1.1-pro',
      'black-forest-labs/flux-schnell',
      'black-forest-labs/flux-dev',
      'stability-ai/stable-diffusion-3.5-large',
      'stability-ai/stable-diffusion-3',
      'ideogram-ai/ideogram-v2',
      'recraft-ai/recraft-v3',
      'stability-ai/sdxl',
      'bytedance/sdxl-lightning-4step',
      'prompthero/openjourney',
      'runwayml/stable-diffusion-v1-5',
      'stability-ai/stable-diffusion-xl-base-1.0'
    ];
    
    // Add dynamically loaded models
    const dynamicModels = Object.keys(this.supportedModels);
    
    return [...baseModels, ...dynamicModels].filter((model, index, arr) => 
      arr.indexOf(model) === index // Remove duplicates
    );
  }

  getModelInfo(modelName: string): ReplicateModel | null {
    return this.supportedModels[modelName] || null;
  }

  private async loadSupportedModels(): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('Replicate API key not configured, skipping model loading');
      return;
    }

    try {
      // Load some popular image generation models
      const popularModels = [
        'minimax/image-01', // Added new model
        'google/imagen-4',
        'black-forest-labs/flux-1.1-pro',
        'black-forest-labs/flux-schnell',
        'stability-ai/stable-diffusion-3.5-large',
        'ideogram-ai/ideogram-v2',
        'recraft-ai/recraft-v3'
      ];

      for (const modelPath of popularModels) {
        try {
          const model = await this.getModelDetails(modelPath);
          if (model) {
            this.supportedModels[modelPath] = model;
          }
        } catch (error) {
          console.warn(`Failed to load model info for ${modelPath}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to load Replicate models:', error);
    }
  }

  private async getModelDetails(modelPath: string): Promise<ReplicateModel | null> {
    try {
      const [owner, name] = modelPath.split('/');
      const response = await axios.get(
        `${this.config.baseURL}/v1/models/${owner}/${name}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          timeout: 10000 // Quick timeout for model loading
        }
      );
      return response.data;
    } catch (error) {
      console.warn(`Failed to get details for model ${modelPath}:`, error);
      return null;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Replicate provider not configured');
    }

    try {
      console.log('🔍 Testing Replicate API connection...');
      const response = await axios.get(
        `${this.config.baseURL}/v1/models`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout for connection test
        }
      );
      
      console.log('✅ Connection test successful, status:', response.status);
      return true;
    } catch (error: any) {
      console.error('❌ Connection test failed:', error);
      throw error;
    }
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.isConfigured()) {
      throw new Error('Replicate provider not configured');
    }

    try {
      console.log('🎨 Generating image with Replicate:', {
        model: this.config.model,
        prompt: request.prompt.substring(0, 100) + '...',
        useOfficialModels: this.config.useOfficialModels
      });

      let predictionResponse: { id: string };

      if (this.config.useOfficialModels) {
        // Use official models API for better performance
        predictionResponse = await this.createOfficialModelPrediction(request);
      } else {
        // Use traditional prediction API with version
        predictionResponse = await this.createPrediction(request);
      }
      
      // Wait for completion with progress logging
      const completedPrediction = await this.waitForCompletion(predictionResponse.id);
      
      if (completedPrediction.status !== 'succeeded') {
        throw new Error(`Image generation failed: ${completedPrediction.error || 'Unknown error'}`);
      }

      // Extract image URL from output (handle different formats)
      let imageUrl: string;
      if (Array.isArray(completedPrediction.output)) {
        imageUrl = completedPrediction.output[0];
      } else if (typeof completedPrediction.output === 'string') {
        imageUrl = completedPrediction.output;
      } else if (completedPrediction.output && completedPrediction.output.url) {
        imageUrl = completedPrediction.output.url;
      } else {
        throw new Error('Invalid output format from Replicate');
      }

      console.log('✅ Image generation successful:', { 
        imageUrl: imageUrl.substring(0, 50) + '...',
        model: this.config.model,
        duration: completedPrediction.metrics?.predict_time
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
          predictionId: completedPrediction.id,
          duration: completedPrediction.metrics?.predict_time
        }
      };

    } catch (error: any) {
      console.error('❌ Replicate image generation error:', error);
      
      // Enhanced error reporting
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      
      // Check for specific error types
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      }
      
      if (error.response) {
        console.error('API Response Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`Replicate API error (${error.response.status}): ${error.response.data?.detail || error.response.statusText}`);
      }
      
      if (error.request) {
        console.error('Network Request Error:', error.request);
        throw new Error('No response from Replicate API. Check your internet connection and API key.');
      }
      
      throw new Error(`Replicate image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createOfficialModelPrediction(request: ImageGenerationRequest): Promise<{ id: string }> {
    const input = this.buildInputParameters(request);
    const [owner, modelName] = (this.config.model || 'minimax/image-01').split('/'); // Default to new model if current is undefined
    
    console.log('📡 Creating official model prediction:', { 
      owner, 
      modelName, 
      inputKeys: Object.keys(input),
      apiKeyPresent: !!this.config.apiKey,
      baseURL: this.config.baseURL 
    });
    
    try {
      const response = await axios.post(
        `${this.config.baseURL}/v1/models/${owner}/${modelName}/predictions`,
        { input },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'wait=60' // Wait up to 60 seconds for completion
          },
          timeout: this.config.timeout || 120000
        }
      );

      console.log('✅ Prediction created successfully:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to create prediction:', error);
      
      if (error.response) {
        console.error('Response details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        });
      }
      
      throw error;
    }
  }

  private async createPrediction(request: ImageGenerationRequest): Promise<{ id: string }> {
    const input = this.buildInputParameters(request);
    
    // For non-official models, we need a version ID
    const version = this.config.version;
    if (!version) {
      throw new Error('Version ID required for non-official models. Set config.version or use official models.');
    }
    
    console.log('📡 Creating prediction with version:', version);
    
    const response = await axios.post(
      `${this.config.baseURL}/v1/predictions`,
      { 
        version,
        input 
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait=60'
        },
        timeout: this.config.timeout
      }
    );

    return response.data;
  }

  private buildInputParameters(request: ImageGenerationRequest): Record<string, any> {
    const modelConfig = this.getModelConfig();
    
    const input: Record<string, any> = {
      prompt: request.prompt,
      width: request.width || modelConfig?.defaultDimensions.width || 1024,
      height: request.height || modelConfig?.defaultDimensions.height || 1024,
    };

    // Add steps with model-specific validation
    const requestedSteps = request.steps || modelConfig?.defaultSteps || 25;
    const maxSteps = modelConfig?.maxSteps || 50;
    input.num_inference_steps = Math.min(requestedSteps, maxSteps);

    // Add guidance with model-specific validation
    const requestedGuidance = request.guidance !== undefined ? request.guidance : (modelConfig?.defaultGuidance || 7.5);
    const maxGuidance = modelConfig?.maxGuidance || 20.0;
    input.guidance_scale = Math.min(requestedGuidance, maxGuidance);

    // Add negative prompt only if model supports it
    if (request.negativePrompt && modelConfig?.supportsNegativePrompt) {
      input.negative_prompt = request.negativePrompt;
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

    console.log('🔧 Built input parameters:', {
      model: this.config.model,
      maxSteps: maxSteps,
      actualSteps: input.num_inference_steps,
      maxGuidance: maxGuidance,
      actualGuidance: input.guidance_scale,
      dimensions: `${input.width}x${input.height}`,
      supportsNegativePrompt: modelConfig?.supportsNegativePrompt
    });

    return input;
  }

  getModelConfig(): ModelConfig | undefined {
    return this.modelConfigs[this.config.model || 'minimax/image-01']; // Default to new model if current is undefined
  }

  getAllModelConfigs(): Record<string, ModelConfig> {
    return { ...this.modelConfigs };
  }

  private async waitForCompletion(predictionId: string, maxWaitTime = 300000): Promise<PredictionStatus> {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds
    let lastStatus = '';

    console.log('⏳ Waiting for prediction completion:', predictionId);

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getPredictionStatus(predictionId);
      
      // Log status changes
      if (status.status !== lastStatus) {
        console.log(`📊 Prediction ${predictionId} status: ${lastStatus} → ${status.status}`);
        lastStatus = status.status;
      }
      
      if (['succeeded', 'failed', 'canceled'].includes(status.status)) {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`🎯 Prediction completed in ${duration.toFixed(1)}s with status: ${status.status}`);
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Image generation timed out after ${maxWaitTime / 1000}s`);
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
    console.log('🛑 Canceling prediction:', predictionId);
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

  // Utility methods for extensibility

  /**
   * Switch to a different model
   */
  switchModel(modelName: string, useOfficialAPI = true): void {
    this.config.model = modelName;
    this.config.useOfficialModels = useOfficialAPI;
    console.log('🔄 Switched to model:', modelName, useOfficialAPI ? '(official)' : '(version-based)');
  }

  /**
   * Set model version for non-official models
   */
  setModelVersion(version: string): void {
    this.config.version = version;
    this.config.useOfficialModels = false;
    console.log('🏷️ Set model version:', version);
  }

  /**
   * Update default parameters
   */
  updateDefaultParameters(params: Record<string, any>): void {
    this.config.defaultParameters = {
      ...this.config.defaultParameters,
      ...params
    };
    console.log('⚙️ Updated default parameters:', params);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): ReplicateProviderConfig {
    return { ...this.config };
  }


  /**
   * Search for models by query
   */
  async searchModels(query: string): Promise<ReplicateModel[]> {
    try {
      const response = await axios({
        method: 'QUERY',
        url: `${this.config.baseURL}/v1/models`,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'text/plain'
        },
        data: query,
        timeout: 10000
      });
      return response.data.results || [];
    } catch (error) {
      console.warn('Failed to search models:', error);
      return [];
    }
  }

  /**
   * List account's predictions
   */
  async listPredictions(limit = 10): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.config.baseURL}/v1/predictions`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          params: { limit },
          timeout: 10000
        }
      );
      return response.data.results || [];
    } catch (error) {
      console.warn('Failed to list predictions:', error);
      return [];
    }
  }
}
