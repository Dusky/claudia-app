import React, { useState, useEffect, useCallback } from 'react';
import type { StorageService } from '../storage/types';
import './AIOptionsModal.css';

interface AIOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storage: StorageService;
}

export const AI_OPTION_TEMPERATURE_KEY = 'aiOptionTemperature';
export const AI_OPTION_CONTEXT_LENGTH_KEY = 'aiOptionContextLength';
export const AI_OPTION_MAX_TOKENS_KEY = 'aiOptionMaxTokens';

export const DEFAULT_AI_TEMPERATURE = 0.7;
export const DEFAULT_AI_CONTEXT_LENGTH = 10;
export const DEFAULT_AI_MAX_TOKENS = 500;


export const AIOptionsModal: React.FC<AIOptionsModalProps> = ({ isOpen, onClose, storage }) => {
  const [temperature, setTemperature] = useState<number>(DEFAULT_AI_TEMPERATURE);
  const [contextLength, setContextLength] = useState<number>(DEFAULT_AI_CONTEXT_LENGTH);
  const [maxTokens, setMaxTokens] = useState<number>(DEFAULT_AI_MAX_TOKENS);
  const [isLoading, setIsLoading] = useState(true);

  const loadOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedTemp = await storage.getSetting<number>(AI_OPTION_TEMPERATURE_KEY, DEFAULT_AI_TEMPERATURE);
      const storedContext = await storage.getSetting<number>(AI_OPTION_CONTEXT_LENGTH_KEY, DEFAULT_AI_CONTEXT_LENGTH);
      const storedMaxTokens = await storage.getSetting<number>(AI_OPTION_MAX_TOKENS_KEY, DEFAULT_AI_MAX_TOKENS);
      
      setTemperature(storedTemp ?? DEFAULT_AI_TEMPERATURE);
      setContextLength(storedContext ?? DEFAULT_AI_CONTEXT_LENGTH);
      setMaxTokens(storedMaxTokens ?? DEFAULT_AI_MAX_TOKENS);
    } catch (error) {
      console.error("Error loading AI options:", error);
      // Keep defaults if loading fails
    } finally {
      setIsLoading(false);
    }
  }, [storage]);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen, loadOptions]);

  const handleSave = async () => {
    try {
      await storage.setSetting(AI_OPTION_TEMPERATURE_KEY, temperature, 'number');
      await storage.setSetting(AI_OPTION_CONTEXT_LENGTH_KEY, contextLength, 'number');
      await storage.setSetting(AI_OPTION_MAX_TOKENS_KEY, maxTokens, 'number');
      onClose();
    } catch (error) {
      console.error("Error saving AI options:", error);
      // Handle error (e.g., show a message to the user)
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay ai-options-modal-overlay">
      <div className="modal-content ai-options-modal-content">
        <h2>AI Generation Options</h2>
        {isLoading ? (
          <p>Loading options...</p>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="temperature">
                Temperature: <span>{temperature.toFixed(2)}</span>
              </label>
              <p className="description">Controls randomness. Lower is more deterministic, higher is more creative.</p>
              <input
                type="range"
                id="temperature"
                min="0"
                max="2" // Some models support up to 2
                step="0.01"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="contextLength">
                Context Length: <span>{contextLength}</span>
              </label>
              <p className="description">Number of past messages sent to the AI for context.</p>
              <input
                type="range"
                id="contextLength"
                min="0" // 0 means no history
                max="50" // Arbitrary max, adjust as needed
                step="1"
                value={contextLength}
                onChange={(e) => setContextLength(parseInt(e.target.value, 10))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="maxTokens">
                Max Tokens: <span>{maxTokens}</span>
              </label>
              <p className="description">Maximum length of the AI's response.</p>
              <input
                type="range"
                id="maxTokens"
                min="50"
                max="4000" // Adjust based on typical model limits
                step="10"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
              />
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
