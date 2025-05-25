import axios from 'axios';
import { LLMProvider, LLMMessage, LLMResponse, LLMGenerationOptions, LLMProviderConfig } from './types';
import { getApiKey, config } from '../../config/env';

export class AnthropicProvider implements LLMProvider {
  name = 'Anthropic Claude';
  id = 'anthropic';
  private config: LLMProviderConfig = {};

  async initialize(providerConfig?: LLMProviderConfig): Promise<void> {
    this.config = {
      apiKey: providerConfig?.apiKey || getApiKey('anthropic'),
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
}