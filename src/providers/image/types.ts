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
    predictionId?: string;
    duration?: number;
    [key: string]: any;
  };
}

export interface ImageProvider {
  name: string;
  id: string;
  initialize(config?: Record<string, any>): Promise<void>;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
  isConfigured(): boolean;
  getSupportedModels?(): string[];
  testConnection?(): Promise<boolean>;
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
  metrics?: {
    predict_time?: number;
  };
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface ImagePromptComponents {
  character: string; // Core, consistent character description
  style: string; // Core stylistic keywords
  quality: string; // Core quality keywords
  negativePrompt?: string;

  // Fields for dynamic prompting
  situationalDescription: string; // Main description, either AI-provided or generated from state
  expressionKeywords: string; // Keywords for current expression
  poseKeywords: string; // Keywords for current pose
  actionKeywords: string; // Keywords for current action
  lightingKeywords: string; // Keywords for lighting
  backgroundKeywords: string; // Keywords for background

  // For variation
  variationSeed?: number;
  contextualKeywords?: string[];
}

export interface PromptModificationContext {
  personality: {
    name: string;
    systemPrompt: string;
  };
  currentMood?: string;
  previousActions?: string[];
  conversationContext?: string;
  isAIDescription?: boolean; // True if situationalDescription comes directly from AI's [IMAGE:] tag
  isMetaPrompted?: boolean; // True if using meta-prompting
  variationSeed?: number;
  contextualKeywords?: string[];
}