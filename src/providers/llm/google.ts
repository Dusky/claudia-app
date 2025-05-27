import axios from 'axios';
import type { LLMProvider, LLMMessage, LLMResponse, LLMGenerationOptions, LLMProviderConfig } from './types';
import { getApiKey, config } from '../../config/env';
import { ApiKeySecurity } from '../../config/security';

export class GoogleProvider implements LLMProvider {
  name = 'Google Gemini';
  id = 'google';
  private config: LLMProviderConfig = {};

  async initialize(providerConfig?: LLMProviderConfig): Promise<void> {
    const apiKey = providerConfig?.apiKey || getApiKey('google');
    
    // Validate API key security
    if (apiKey) {
      const validation = ApiKeySecurity.validateApiKey('google', apiKey);
      if (!validation.valid) {
        console.warn(`Google API key validation failed: ${validation.message}`);
      }
    }
    
    this.config = {
      apiKey,
      model: providerConfig?.model || 'gemini-1.5-flash',
      baseURL: providerConfig?.baseURL || 'https://generativelanguage.googleapis.com',
      timeout: config.llmTimeout,
      ...providerConfig
    };
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  async generateResponse(messages: LLMMessage[], options?: LLMGenerationOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('Google provider not configured');
    }

    // Convert messages to Google Gemini format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

    // Add system prompt as the first user message if present
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage || options?.systemPrompt) {
      contents.unshift({
        role: 'user',
        parts: [{ text: systemMessage?.content || options?.systemPrompt || '' }]
      });
    }

    const requestBody = {
      contents,
      generationConfig: {
        maxOutputTokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
      }
    };

    try {
      const response = await axios.post(
        `${this.config.baseURL}/v1beta/models/${this.config.model}:generateContent`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          params: {
            key: this.config.apiKey
          },
          timeout: this.config.timeout
        }
      );

      const candidate = response.data.candidates?.[0];
      if (!candidate || !candidate.content?.parts?.[0]?.text) {
        throw new Error('No valid response from Google Gemini');
      }

      return {
        content: candidate.content.parts[0].text,
        usage: {
          prompt_tokens: response.data.usageMetadata?.promptTokenCount,
          completion_tokens: response.data.usageMetadata?.candidatesTokenCount,
          total_tokens: response.data.usageMetadata?.totalTokenCount
        }
      };
    } catch (error: any) {
      console.error('Google Gemini API error:', error);
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          throw new Error('Google API key is invalid or not authorized. Please check your VITE_GOOGLE_API_KEY.');
        } else if (status === 403) {
          throw new Error('Google API access forbidden. Please check API key permissions.');
        } else if (status === 404) {
          throw new Error('Google API endpoint not found. Please check the model name or API version.');
        } else if (status === 429) {
          throw new Error('Google API rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`Google API error (${status}): ${data?.error?.message || 'Unknown error'}`);
        }
      } else if (error.request) {
        throw new Error('No response from Google API. Please check your internet connection.');
      } else {
        throw new Error(`Google API configuration error: ${error.message}`);
      }
    }
  }

  async generateStreamingResponse(messages: LLMMessage[], options: LLMGenerationOptions & { onChunk: (chunk: string) => void }): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('Google provider not configured');
    }

    // Convert messages to Google Gemini format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

    // Add system prompt as the first user message if present
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage || options?.systemPrompt) {
      contents.unshift({
        role: 'user',
        parts: [{ text: systemMessage?.content || options?.systemPrompt || '' }]
      });
    }

    const requestBody = {
      contents,
      generationConfig: {
        maxOutputTokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
      }
    };

    try {
      const response = await fetch(
        `${this.config.baseURL}/v1beta/models/${this.config.model}:streamGenerateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader');
      }

      let fullContent = '';
      let usage: any = null;
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim() && !line.startsWith('data:')) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                  const text = parsed.candidates[0].content.parts[0].text;
                  fullContent += text;
                  options.onChunk(text);
                }
                if (parsed.usageMetadata) {
                  usage = parsed.usageMetadata;
                }
              } catch (parseError) {
                // Skip invalid JSON lines
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        content: fullContent,
        usage: usage ? {
          prompt_tokens: usage.promptTokenCount,
          completion_tokens: usage.candidatesTokenCount,
          total_tokens: usage.totalTokenCount
        } : undefined
      };
    } catch (error: any) {
      console.error('Google Gemini streaming API error:', error);
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          throw new Error('Google API key is invalid or not authorized. Please check your VITE_GOOGLE_API_KEY.');
        } else if (status === 403) {
          throw new Error('Google API access forbidden. Please check API key permissions.');
        } else if (status === 404) {
          throw new Error('Google API endpoint not found. Please check the model name or API version.');
        } else if (status === 429) {
          throw new Error('Google API rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`Google API error (${status}): ${data?.error?.message || 'Unknown error'}`);
        }
      } else {
        throw new Error(`Google streaming API error: ${error.message}`);
      }
    }
  }

  async generateText(prompt: string, options?: { systemMessage?: string; maxTokens?: number; temperature?: number }): Promise<string> {
    const messages: LLMMessage[] = [];
    
    if (options?.systemMessage) {
      messages.push({ role: 'system', content: options.systemMessage });
    }
    
    messages.push({ role: 'user', content: prompt });
    
    const response = await this.generateResponse(messages, {
      maxTokens: options?.maxTokens || 150,
      temperature: options?.temperature || 0.7
    });
    
    return response.content;
  }

  async listModels(): Promise<Array<{ id: string; name: string; description: string }>> {
    if (!this.isConfigured()) {
      throw new Error('Google provider not configured');
    }

    try {
      const response = await fetch(
        `${this.config.baseURL}/v1beta/models?key=${this.config.apiKey}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return data.models
        ?.filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
        ?.map((model: any) => ({
          id: model.name.replace('models/', ''),
          name: model.displayName || model.name,
          description: model.description || 'Google Gemini model'
        })) || [];
    } catch (error: any) {
      console.error('Error fetching Google models:', error);
      // Return default models as fallback
      return [
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and efficient model' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Advanced reasoning model' },
        { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', description: 'Production-ready model' }
      ];
    }
  }
}