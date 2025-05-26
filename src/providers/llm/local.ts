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

  async generateStreamingResponse(messages: LLMMessage[], options: LLMGenerationOptions & { onChunk: (chunk: string) => void }): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('Local provider not configured');
    }

    try {
      if (this.config.apiFormat === 'openai-compatible') {
        return await this.generateOpenAICompatibleStreaming(messages, options);
      } else {
        return await this.generateOllamaStreaming(messages, options);
      }
    } catch (error) {
      console.error('Local LLM streaming API error:', error);
      throw new Error(`Local LLM streaming API error: ${error}`);
    }
  }

  private async generateOllamaStreaming(messages: LLMMessage[], options: LLMGenerationOptions & { onChunk: (chunk: string) => void }): Promise<LLMResponse> {
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
      stream: true,
      options: {
        temperature: options?.temperature || 0.7,
        num_predict: options?.maxTokens || 1000
      }
    };

    const response = await fetch(`${this.config.baseURL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.response) {
                fullContent += parsed.response;
                options.onChunk(parsed.response);
              }
              if (parsed.done && parsed.eval_count) {
                usage = {
                  prompt_tokens: parsed.prompt_eval_count,
                  completion_tokens: parsed.eval_count,
                  total_tokens: (parsed.prompt_eval_count || 0) + (parsed.eval_count || 0)
                };
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
      usage
    };
  }

  private async generateOpenAICompatibleStreaming(messages: LLMMessage[], options: LLMGenerationOptions & { onChunk: (chunk: string) => void }): Promise<LLMResponse> {
    const requestBody = {
      model: this.config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      max_tokens: options?.maxTokens || 1000,
      temperature: options?.temperature || 0.7,
      stream: true
    };

    const response = await fetch(`${this.config.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : ''
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
              if (parsed.choices?.[0]?.delta?.content) {
                const text = parsed.choices[0].delta.content;
                fullContent += text;
                options.onChunk(text);
              }
              if (parsed.usage) {
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
      usage
    };
  }

  async listModels(): Promise<Array<{ id: string; name: string; description: string }>> {
    if (!this.isConfigured()) {
      throw new Error('Local provider not configured');
    }

    try {
      if (this.config.apiFormat === 'openai-compatible') {
        const response = await fetch(`${this.config.baseURL}/v1/models`, {
          headers: {
            'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : ''
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data?.map((model: any) => ({
          id: model.id,
          name: model.id,
          description: model.description || 'Local model'
        })) || [];
      } else {
        // Ollama format
        const response = await fetch(`${this.config.baseURL}/api/tags`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.models?.map((model: any) => ({
          id: model.name,
          name: model.name,
          description: `${model.details?.family || 'Local'} model (${model.size})`
        })) || [];
      }
    } catch (error) {
      console.error('Error fetching local models:', error);
      // Return default fallback
      return [
        { id: 'llama2', name: 'Llama 2', description: 'Local Llama 2 model' },
        { id: 'codellama', name: 'Code Llama', description: 'Code generation model' },
        { id: 'mistral', name: 'Mistral', description: 'Local Mistral model' }
      ];
    }
  }
}