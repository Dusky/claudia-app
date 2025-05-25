// LLM Providers
export { LLMProviderManager } from './llm/manager';
export { AnthropicProvider } from './llm/anthropic';
export { GoogleProvider } from './llm/google';
export { LocalProvider } from './llm/local';
export type { 
  LLMProvider, 
  LLMMessage, 
  LLMResponse, 
  LLMGenerationOptions, 
  LLMProviderConfig 
} from './llm/types';

// Image Providers
export { ImageProviderManager } from './image/manager';
export { ReplicateProvider } from './image/replicate';
export { ImagePromptComposer } from './image/promptComposer';
export type { 
  ImageProvider, 
  ImageGenerationRequest, 
  ImageGenerationResponse, 
  ImageProviderConfig,
  PredictionStatus,
  ImagePromptComponents,
  PromptModificationContext
} from './image/types';