import axios from 'axios';
import type { LLMProvider, LLMMessage, LLMResponse, LLMGenerationOptions, LLMProviderConfig } from './types';
import { config } from '../../config/env';

export class LocalProvider implements LLMProvider {
  name = 'Local LLM';
  id = 'local';
  private config: LLMProviderConfig = {};

  async initialize(providerConfig?: LLMProviderConfig): Promise<void> {
    this.config = {
      baseURL: providerConfig?.baseURL || config.ollamaBaseUrl,
      model: providerConfig?.model || config.localLLMModel,
      apiFormat: providerConfig?.apiFormat || 'ollama', // 'ollama', 'openai-compatible', etc.
      timeout: config.llmTimeout,
      ...providerConfig
    };
  }

  isConfigured(): boolean {
    return !!this.config.baseURL;
  }

  async generateResponse(messages: LLMMessage[], options?: LLMGenerationOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('Local provider not configured');
    }

    try {
      if (this.config.apiFormat === 'openai-compatible') {
        return await this.generateOpenAICompatible(messages, options);
      } else {
        return await this.generateOllama(messages, options);
      }
    } catch (error) {
      console.error('Local LLM API error:', error);
      throw new Error(`Local LLM API error: ${error}`);
    }
  }

  private async generateOllama(messages: LLMMessage[], options?: LLMGenerationOptions): Promise<LLMResponse> {
    // Combine all messages into a single prompt for Ollama
    let prompt = '';
    
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage || options?.systemPrompt) {
      prompt += `System: ${systemMessage?.content || options?.systemPrompt}\n\n`;
    }

    messages
      .filter(m => m.role !== 'system')
      .forEach(msg => {
        prompt += `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}\n\n`;
      });

    prompt += 'Assistant: ';

    const requestBody = {
      model: this.config.model,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature || 0.7,
        num_predict: options?.maxTokens || 1000
      }
    };

    const response = await axios.post(
      `${this.config.baseURL}/api/generate`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    return {
      content: response.data.response,
      usage: {
        prompt_tokens: response.data.prompt_eval_count,
        completion_tokens: response.data.eval_count,
        total_tokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
      }
    };
  }

  private async generateOpenAICompatible(messages: LLMMessage[], options?: LLMGenerationOptions): Promise<LLMResponse> {
    const requestBody = {
      model: this.config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      max_tokens: options?.maxTokens || 1000,
      temperature: options?.temperature || 0.7
    };

    const response = await axios.post(
      `${this.config.baseURL}/v1/chat/completions`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : undefined
        }
      }
    );

    const choice = response.data.choices?.[0];
    if (!choice) {
      throw new Error('No response from local LLM');
    }

    return {
      content: choice.message.content,
      usage: response.data.usage
    };
  }
}