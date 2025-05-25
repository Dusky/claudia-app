// Core image provider interface for extensibility
export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
  style?: string;
  [key: string]: any; // Allow provider-specific parameters
}

export interface ImageGenerationResponse {
  imageUrl: string;
  seed?: number;
  parameters?: Record<string, any>;
  metadata?: {
    prompt: string;
    model: string;
    provider: string;
    generatedAt: string;
  };
}

export interface ImageProvider {
  name: string;
  id: string;
  initialize(config?: Record<string, any>): Promise<void>;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
  isConfigured(): boolean;
  getSupportedModels?(): string[];
}

export interface ImageProviderConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  defaultParameters?: Record<string, any>;
  [key: string]: any;
}

export interface PredictionStatus {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: any;
  error?: string;
  urls?: {
    get: string;
    cancel: string;
  };
}

export interface ImagePromptComponents {
  character: string;
  expression: string;
  pose: string;
  action: string;
  style: string;
  lighting: string;
  background: string;
  quality: string;
  negativePrompt?: string;
}

export interface PromptModificationContext {
  personality: {
    name: string;
    systemPrompt: string;
  };
  currentMood?: string;
  previousActions?: string[];
  conversationContext?: string;
}