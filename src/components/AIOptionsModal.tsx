import React, { useState, useEffect, useCallback } from 'react';
import type { StorageService } from '../storage/types';
import type { LLMProviderManager } from '../providers/llm/manager';
import './AIOptionsModal.css';

interface AIOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storage: StorageService;
  llmManager: LLMProviderManager;
}

export const AI_OPTION_TEMPERATURE_KEY = 'ai.temperature';
export const AI_OPTION_CONTEXT_LENGTH_KEY = 'ai.contextLength';
export const AI_OPTION_MAX_TOKENS_KEY = 'ai.maxTokens';
export const AI_OPTION_STREAMING_KEY = 'ai.streamingEnabled';
export const AI_OPTION_PROVIDER_KEY = 'ai.activeProvider';
export const AI_OPTION_MODEL_KEY = 'ai.activeModel';

export const DEFAULT_AI_TEMPERATURE = 0.7;
export const DEFAULT_AI_CONTEXT_LENGTH = 8000; // tokens instead of message count
export const DEFAULT_AI_MAX_TOKENS = 1000;

interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

export const AIOptionsModal: React.FC<AIOptionsModalProps> = ({ isOpen, onClose, storage, llmManager }) => {
  const [temperature, setTemperature] = useState<number>(DEFAULT_AI_TEMPERATURE);
  const [contextLength, setContextLength] = useState<number>(DEFAULT_AI_CONTEXT_LENGTH);
  const [maxTokens, setMaxTokens] = useState<number>(DEFAULT_AI_MAX_TOKENS);
  const [streamingEnabled, setStreamingEnabled] = useState<boolean>(false);
  const [activeProvider, setActiveProvider] = useState<string>('');
  const [activeModel, setActiveModel] = useState<string>('');
  const [availableProviders, setAvailableProviders] = useState<Array<{ id: string; name: string; configured: boolean }>>([]);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const loadOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load basic options
      const storedTemp = await storage.getSetting<number>(AI_OPTION_TEMPERATURE_KEY);
      const storedContext = await storage.getSetting<number>(AI_OPTION_CONTEXT_LENGTH_KEY);
      const storedMaxTokens = await storage.getSetting<number>(AI_OPTION_MAX_TOKENS_KEY);
      const storedStreaming = await storage.getSetting<boolean>(AI_OPTION_STREAMING_KEY);
      const storedProvider = await storage.getSetting<string>(AI_OPTION_PROVIDER_KEY);
      const storedModel = await storage.getSetting<string>(AI_OPTION_MODEL_KEY);
      
      setTemperature(storedTemp ?? DEFAULT_AI_TEMPERATURE);
      setContextLength(storedContext ?? DEFAULT_AI_CONTEXT_LENGTH);
      setMaxTokens(storedMaxTokens ?? DEFAULT_AI_MAX_TOKENS);
      setStreamingEnabled(storedStreaming ?? false);
      
      // Load available providers
      const providers = llmManager.getAvailableProviders();
      setAvailableProviders(providers);
      
      // Set active provider (fallback to first configured provider)
      const currentProvider = storedProvider || llmManager.getActiveProvider()?.id || '';
      setActiveProvider(currentProvider);
      
      // Load models for the active provider
      if (currentProvider) {
        await loadModelsForProvider(currentProvider);
        setActiveModel(storedModel || '');
      }
    } catch (error) {
      console.error("Error loading AI options:", error);
      // Keep defaults if loading fails
    } finally {
      setIsLoading(false);
    }
  }, [storage, llmManager]);

  const loadModelsForProvider = async (providerId: string) => {
    setIsLoadingModels(true);
    try {
      const provider = llmManager.getProvider(providerId);
      if (provider && provider.listModels) {
        const models = await provider.listModels();
        setAvailableModels(models);
      } else {
        setAvailableModels([]);
      }
    } catch (error) {
      console.error(`Error loading models for provider ${providerId}:`, error);
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleProviderChange = async (providerId: string) => {
    setActiveProvider(providerId);
    setActiveModel(''); // Reset model when provider changes
    
    if (providerId) {
      await loadModelsForProvider(providerId);
    } else {
      setAvailableModels([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen, loadOptions]);

  const handleSave = async () => {
    try {
      // Save all options
      await storage.setSetting(AI_OPTION_TEMPERATURE_KEY, temperature);
      await storage.setSetting(AI_OPTION_CONTEXT_LENGTH_KEY, contextLength);
      await storage.setSetting(AI_OPTION_MAX_TOKENS_KEY, maxTokens);
      await storage.setSetting(AI_OPTION_STREAMING_KEY, streamingEnabled);
      await storage.setSetting(AI_OPTION_PROVIDER_KEY, activeProvider);
      await storage.setSetting(AI_OPTION_MODEL_KEY, activeModel);
      
      // Apply provider and model changes
      if (activeProvider) {
        const provider = llmManager.getProvider(activeProvider);
        if (provider) {
          llmManager.setActiveProvider(activeProvider);
          
          // Reinitialize with new model if specified
          if (activeModel) {
            await provider.initialize({
              model: activeModel
            });
          }
        }
      }
      
      onClose();
    } catch (error) {
      console.error("Error saving AI options:", error);
      // Handle error (e.g., show a message to the user)
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay ai-options-modal-overlay">
      <div className="modal-content ai-options-modal-content">
        <h2>AI Provider & Generation Options</h2>
        {isLoading ? (
          <p>Loading options...</p>
        ) : (
          <>
            {/* Provider Selection */}
            <div className="form-group">
              <label htmlFor="provider">
                AI Provider
              </label>
              <p className="description">Choose which AI provider to use for responses.</p>
              <select
                id="provider"
                value={activeProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                <option value="">Select Provider</option>
                {availableProviders.map(provider => (
                  <option key={provider.id} value={provider.id} disabled={!provider.configured}>
                    {provider.name} {!provider.configured && '(Not Configured)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selection */}
            {activeProvider && (
              <div className="form-group">
                <label htmlFor="model">
                  Model
                </label>
                <p className="description">Choose the specific model to use.</p>
                {isLoadingModels ? (
                  <p>Loading models...</p>
                ) : (
                  <select
                    id="model"
                    value={activeModel}
                    onChange={(e) => setActiveModel(e.target.value)}
                  >
                    <option value="">Default Model</option>
                    {availableModels.map(model => (
                      <option key={model.id} value={model.id} title={model.description}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                )}
                {availableModels.length === 0 && !isLoadingModels && (
                  <p className="description">No models available or API error. Will use provider default.</p>
                )}
              </div>
            )}

            {/* Streaming Toggle */}
            <div className="form-group">
              <label htmlFor="streaming">
                <input
                  type="checkbox"
                  id="streaming"
                  checked={streamingEnabled}
                  onChange={(e) => setStreamingEnabled(e.target.checked)}
                />
                Enable Streaming Responses
              </label>
              <p className="description">Show responses as they're generated (typewriter effect). Not all models support this.</p>
            </div>

            {/* Generation Parameters */}
            <hr />
            <h3>Generation Parameters</h3>

            <div className="form-group">
              <label htmlFor="temperature">
                Temperature: <span>{temperature.toFixed(2)}</span>
              </label>
              <p className="description">Controls randomness. Lower is more deterministic, higher is more creative.</p>
              <input
                type="range"
                id="temperature"
                min="0"
                max="2"
                step="0.01"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="contextLength">
                Context Length (tokens)
              </label>
              <p className="description">Maximum tokens from conversation history to include as context. Higher values = more context but slower/costlier.</p>
              <input
                type="number"
                id="contextLength"
                min="0"
                max="200000"
                step="100"
                value={contextLength}
                onChange={(e) => setContextLength(parseInt(e.target.value, 10) || 0)}
                placeholder="e.g., 8000"
              />
              <p className="description"><small>Common values: 4000 (short), 8000 (medium), 16000 (long), 32000+ (extensive)</small></p>
            </div>

            <div className="form-group">
              <label htmlFor="maxTokens">
                Max Response Tokens
              </label>
              <p className="description">Maximum tokens in the AI's response. Higher values allow longer responses but cost more.</p>
              <input
                type="number"
                id="maxTokens"
                min="1"
                max="100000"
                step="50"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 1)}
                placeholder="e.g., 1000"
              />
              <p className="description"><small>Common values: 500 (brief), 1000 (normal), 2000 (detailed), 4000+ (extensive)</small></p>
            </div>

            <div className="modal-actions">
              <button onClick={onClose} className="button-secondary">Cancel</button>
              <button onClick={handleSave} className="button-primary">Save Options</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AIOptionsModal;
