// Core LLM provider interface for extensibility
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface LLMProvider {
  name: string;
  id: string;
  initialize(config?: Record<string, any>): Promise<void>;
  generateResponse(messages: LLMMessage[], options?: LLMGenerationOptions): Promise<LLMResponse>;
  generateStreamingResponse?(messages: LLMMessage[], options: LLMGenerationOptions & { onChunk: (chunk: string) => void }): Promise<LLMResponse>;
  listModels?(): Promise<Array<{ id: string; name: string; description: string }>>;
  isConfigured(): boolean;
}

export interface LLMGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
}

export interface LLMProviderConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  [key: string]: any;
}