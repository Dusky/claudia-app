import axios from 'axios';
import { LLMProvider, LLMMessage, LLMResponse, LLMGenerationOptions, LLMProviderConfig } from './types';
import { getApiKey, config } from '../../config/env';

export class GoogleProvider implements LLMProvider {
  name = 'Google Gemini';
  id = 'google';
  private config: LLMProviderConfig = {};

  async initialize(providerConfig?: LLMProviderConfig): Promise<void> {
    this.config = {
      apiKey: providerConfig?.apiKey || getApiKey('google'),
      model: providerConfig?.model || 'gemini-pro',
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
        `${this.config.baseURL}/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        }
      );

      const candidate = response.data.candidates?.[0];
      if (!candidate) {
        throw new Error('No response from Google Gemini');
      }

      return {
        content: candidate.content.parts[0].text,
        usage: {
          prompt_tokens: response.data.usageMetadata?.promptTokenCount,
          completion_tokens: response.data.usageMetadata?.candidatesTokenCount,
          total_tokens: response.data.usageMetadata?.totalTokenCount
        }
      };
    } catch (error) {
      console.error('Google Gemini API error:', error);
      throw new Error(`Google Gemini API error: ${error}`);
    }
  }
}