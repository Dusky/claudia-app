import axios from 'axios';
import type { LLMProvider, LLMMessage, LLMResponse, LLMGenerationOptions, LLMProviderConfig } from './types';
import { getApiKey, config } from '../../config/env';
import { ApiKeySecurity } from '../../config/security';

export class AnthropicProvider implements LLMProvider {
  name = 'Anthropic Claude';
  id = 'anthropic';
  private config: LLMProviderConfig = {};

  async initialize(providerConfig?: LLMProviderConfig): Promise<void> {
    const apiKey = providerConfig?.apiKey || getApiKey('anthropic');
    
    // Validate API key security
    if (apiKey) {
      const validation = ApiKeySecurity.validateApiKey('anthropic', apiKey);
      if (!validation.valid) {
        console.warn(`Anthropic API key validation failed: ${validation.message}`);
      }
    }
    
    this.config = {
      apiKey,
      model: providerConfig?.model || 'claude-3-sonnet-20240229',
      baseURL: providerConfig?.baseURL || 'https://api.anthropic.com',
      timeout: config.llmTimeout,
      ...providerConfig
    };
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  async generateResponse(messages: LLMMessage[], options?: LLMGenerationOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('Anthropic provider not configured');
    }

    // Convert messages to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const requestBody = {
      model: this.config.model,
      max_tokens: options?.maxTokens || 1000,
      temperature: options?.temperature || 0.7,
      system: systemMessage?.content || options?.systemPrompt,
      messages: conversationMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    };

    try {
      const response = await axios.post(
        `${this.config.baseURL}/v1/messages`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01'
          },
          timeout: this.config.timeout
        }
      );

      return {
        content: response.data.content[0].text,
        usage: {
          prompt_tokens: response.data.usage?.input_tokens,
          completion_tokens: response.data.usage?.output_tokens,
          total_tokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0)
        }
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(`Anthropic API error: ${error}`);
    }
  }

  async generateStreamingResponse(messages: LLMMessage[], options: LLMGenerationOptions & { onChunk: (chunk: string) => void }): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('Anthropic provider not configured');
    }

    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const requestBody = {
      model: this.config.model,
      max_tokens: options?.maxTokens || 1000,
      temperature: options?.temperature || 0.7,
      system: systemMessage?.content || options?.systemPrompt,
      stream: true,
      messages: conversationMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    };

    try {
      const response = await fetch(`${this.config.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey!,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

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
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  const text = parsed.delta.text;
                  fullContent += text;
                  options.onChunk(text);
                } else if (parsed.type === 'message_stop' && parsed.usage) {
                  usage = parsed.usage;
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
          prompt_tokens: usage.input_tokens,
          completion_tokens: usage.output_tokens,
          total_tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
        } : undefined
      };
    } catch (error) {
      console.error('Anthropic streaming API error:', error);
      throw new Error(`Anthropic streaming API error: ${error}`);
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
      throw new Error('Anthropic provider not configured');
    }

    try {
      const response = await axios.get(`${this.config.baseURL}/v1/models`, {
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        timeout: this.config.timeout
      });

      return response.data.data?.map((model: any) => ({
        id: model.id,
        name: model.display_name || model.id,
        description: model.description || 'Anthropic Claude model'
      })) || [];
    } catch (error) {
      console.error('Error fetching Anthropic models:', error);
      // Return default models as fallback
      return [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most intelligent model' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced intelligence and speed' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest model' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful model' }
      ];
    }
  }
}