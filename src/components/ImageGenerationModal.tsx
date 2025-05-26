import React, { useState, useEffect } from 'react';
import type { TerminalTheme } from '../terminal/themes';
import type { ImageProviderManager } from '../providers/image/manager';
import type { AvatarController } from '../avatar/AvatarController';
import type { ImagePromptComponents } from '../providers/image/types';
import type { ModelConfig } from '../providers/image/replicate';
import { configManager } from '../config/env';
import styles from './ImageGenerationModal.module.css';

interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageManager: ImageProviderManager;
  avatarController: AvatarController;
  theme: TerminalTheme;
}

export const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({
  isOpen,
  onClose,
  imageManager,
  avatarController,
  theme
}) => {
  const [activeProvider, setActiveProvider] = useState<string>('');
  const [availableProviders, setAvailableProviders] = useState<Array<{ id: string; name: string; configured: boolean }>>([]);
  const [selectedModel, setSelectedModel] = useState<string>('black-forest-labs/flux-schnell');
  const [availableModels, setAvailableModels] = useState<Record<string, ModelConfig>>({});
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [imageStyle, setImageStyle] = useState<string>('realistic digital photography, warm natural lighting, detailed, beautiful composition');
  const [promptComponents, setPromptComponents] = useState<ImagePromptComponents>({
    character: '',
    expression: '',
    pose: '',
    action: '',
    style: '',
    lighting: '',
    background: '',
    quality: '',
    negativePrompt: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedImage, setLastGeneratedImage] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load current settings
      const provider = imageManager.getActiveProvider();
      setActiveProvider(provider?.id || '');
      setAvailableProviders(imageManager.getAvailableProviders());
      
      // Load current image style
      setImageStyle(configManager.getImageStyle());
      
      // Load model configurations if provider is Replicate
      if (provider?.id === 'replicate') {
        try {
          // Type assertion to access Replicate-specific methods
          const replicateProvider = provider as any;
          if (replicateProvider.getAllModelConfigs) {
            const models = replicateProvider.getAllModelConfigs();
            setAvailableModels(models);
            
            // Get current model config
            const currentConfig = replicateProvider.getModelConfig();
            setModelConfig(currentConfig);
            
            // Set current model if available
            if (replicateProvider.config?.model) {
              setSelectedModel(replicateProvider.config.model);
            }
          }
        } catch (error) {
          console.warn('Could not load model configurations:', error);
        }
      }
      
      // Load current prompt components from avatar controller
      const composer = avatarController.getPromptComposer();
      const avatarState = avatarController.getState();
      
      const components = composer.generatePromptComponents({
        expression: avatarState.expression,
        pose: avatarState.pose,
        action: avatarState.action,
        style: 'realistic digital art, warm cozy style',
        background: 'none',
        lighting: 'soft',
        quality: 'high'
      });
      
      setPromptComponents(components);
    }
  }, [isOpen, imageManager, avatarController]);

  const handleProviderChange = (providerId: string) => {
    try {
      imageManager.setActiveProvider(providerId);
      setActiveProvider(providerId);
    } catch (error) {
      console.error('Failed to switch provider:', error);
    }
  };

  const handleModelChange = async (modelId: string) => {
    try {
      const provider = imageManager.getActiveProvider();
      if (provider?.id === 'replicate') {
        // Reinitialize provider with new model
        await provider.initialize({
          apiKey: (provider as any).config.apiKey,
          model: modelId,
          baseURL: (provider as any).config.baseURL,
          useOfficialModels: (provider as any).config.useOfficialModels
        });
        
        setSelectedModel(modelId);
        
        // Update model config
        const replicateProvider = provider as any;
        if (replicateProvider.getModelConfig) {
          const newConfig = replicateProvider.getModelConfig();
          setModelConfig(newConfig);
        }
      }
    } catch (error) {
      console.error('Failed to switch model:', error);
    }
  };

  const handleStyleSave = () => {
    // Save style to localStorage for persistence
    localStorage.setItem('claudia-image-style', imageStyle);
    
    // Update the config manager (for this session)
    (configManager as any).config.imageStyle = imageStyle;
    
    console.log('💾 Image style saved:', imageStyle);
  };

  const handleComponentChange = (component: keyof ImagePromptComponents, value: string) => {
    setPromptComponents(prev => ({
      ...prev,
      [component]: value
    }));
  };

  const generatePreview = () => {
    const composer = avatarController.getPromptComposer();
    if (useCustomPrompt) {
      return customPrompt;
    }
    return composer.compilePrompt(promptComponents);
  };

  const handleGenerate = async () => {
    const provider = imageManager.getActiveProvider();
    if (!provider) {
      console.error('No active provider');
      return;
    }

    setIsGenerating(true);
    try {
      const composer = avatarController.getPromptComposer();
      let finalPrompt: string;
      let negativePrompt: string;

      if (useCustomPrompt) {
        finalPrompt = customPrompt;
        negativePrompt = promptComponents.negativePrompt || '';
      } else {
        finalPrompt = composer.compilePrompt(promptComponents);
        negativePrompt = composer.getNegativePrompt(promptComponents);
      }

      const response = await provider.generateImage({
        prompt: finalPrompt,
        negativePrompt,
        width: 512,
        height: 512,
        steps: 20,
        guidance: 7.5
      });

      // Update avatar with new image
      const avatarState = avatarController.getState();
      avatarController.setState({
        ...avatarState,
        imageUrl: response.imageUrl,
        visible: true
      });

      setLastGeneratedImage(response.imageUrl);
    } catch (error) {
      console.error('Failed to generate image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetToDefaults = () => {
    const composer = avatarController.getPromptComposer();
    const avatarState = avatarController.getState();
    
    const defaultComponents = composer.generatePromptComponents({
      expression: avatarState.expression,
      pose: avatarState.pose,
      action: avatarState.action,
      style: 'realistic digital art, warm cozy style',
      background: 'none',
      lighting: 'soft',
      quality: 'high'
    });
    
    setPromptComponents(defaultComponents);
    setUseCustomPrompt(false);
    setCustomPrompt('');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={`${styles.modal} ${styles[theme.id] || ''}`}
        style={{
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.foreground || '#333',
          color: theme.colors.foreground
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title} style={{ color: theme.colors.accent }}>
            🖼️ Image Generation Settings
          </h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            style={{ color: theme.colors.foreground }}
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          {/* Provider Selection */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>
              Provider Settings
            </h3>
            <div className={styles.providerSection}>
              <label className={styles.label}>Active Provider:</label>
              <select 
                value={activeProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className={styles.select}
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.foreground || '#333',
                  color: theme.colors.foreground
                }}
              >
                <option value="">Select Provider</option>
                {availableProviders.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} {!provider.configured && '(Not Configured)'}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Model Selection for Replicate */}
            {activeProvider === 'replicate' && Object.keys(availableModels).length > 0 && (
              <div className={styles.modelSection}>
                <label className={styles.label}>Model:</label>
                <select 
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className={styles.select}
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.foreground || '#333',
                    color: theme.colors.foreground
                  }}
                >
                  {Object.entries(availableModels).map(([modelId, config]) => (
                    <option key={modelId} value={modelId}>
                      {modelId} - {config.description}
                    </option>
                  ))}
                </select>
                
                {/* Model Info */}
                {modelConfig && (
                  <div className={styles.modelInfo}>
                    <small style={{ color: theme.colors.foreground, opacity: 0.7 }}>
                      Max Steps: {modelConfig.maxSteps} | 
                      Max Guidance: {modelConfig.maxGuidance} | 
                      Negative Prompt: {modelConfig.supportsNegativePrompt ? 'Yes' : 'No'}
                    </small>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Image Style Settings */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>
              Image Style
            </h3>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Style Description:</label>
              <textarea
                value={imageStyle}
                onChange={(e) => setImageStyle(e.target.value)}
                className={styles.textarea}
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.foreground || '#333',
                  color: theme.colors.foreground
                }}
                placeholder="Describe the overall style for generated images..."
                rows={3}
              />
              <small style={{ color: theme.colors.foreground, opacity: 0.7 }}>
                This style will be applied to all AI-generated photos of Claudia. 
                Examples: "realistic photography, warm lighting", "anime art style", "oil painting style"
              </small>
              <button
                onClick={handleStyleSave}
                className={styles.button}
                style={{
                  backgroundColor: theme.colors.accent,
                  color: theme.colors.background,
                  marginTop: '8px'
                }}
              >
                Save Style
              </button>
            </div>
          </div>

          {/* Prompt Mode Toggle */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>
              Prompt Mode
            </h3>
            <div className={styles.toggleGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  checked={!useCustomPrompt}
                  onChange={() => setUseCustomPrompt(false)}
                />
                <span>Component-based (Recommended)</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  checked={useCustomPrompt}
                  onChange={() => setUseCustomPrompt(true)}
                />
                <span>Custom Prompt</span>
              </label>
            </div>
          </div>

          {/* Custom Prompt */}
          {useCustomPrompt && (
            <div className={styles.section}>
              <label className={styles.label}>Custom Prompt:</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className={styles.textarea}
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.foreground || '#333',
                  color: theme.colors.foreground
                }}
                placeholder="Enter your custom prompt here..."
                rows={4}
              />
            </div>
          )}

          {/* Component-based Settings */}
          {!useCustomPrompt && (
            <>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>
                  Character & Expression
                </h3>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Character:</label>
                  <input
                    type="text"
                    value={promptComponents.character}
                    onChange={(e) => handleComponentChange('character', e.target.value)}
                    className={styles.input}
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.foreground || '#333',
                      color: theme.colors.foreground
                    }}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Expression:</label>
                  <input
                    type="text"
                    value={promptComponents.expression}
                    onChange={(e) => handleComponentChange('expression', e.target.value)}
                    className={styles.input}
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.foreground || '#333',
                      color: theme.colors.foreground
                    }}
                  />
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>
                  Pose & Action
                </h3>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Pose:</label>
                  <input
                    type="text"
                    value={promptComponents.pose}
                    onChange={(e) => handleComponentChange('pose', e.target.value)}
                    className={styles.input}
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.foreground || '#333',
                      color: theme.colors.foreground
                    }}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Action:</label>
                  <input
                    type="text"
                    value={promptComponents.action}
                    onChange={(e) => handleComponentChange('action', e.target.value)}
                    className={styles.input}
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.foreground || '#333',
                      color: theme.colors.foreground
                    }}
                  />
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>
                  Style & Environment
                </h3>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Style:</label>
                  <input
                    type="text"
                    value={promptComponents.style}
                    onChange={(e) => handleComponentChange('style', e.target.value)}
                    className={styles.input}
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.foreground || '#333',
                      color: theme.colors.foreground
                    }}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Lighting:</label>
                  <input
                    type="text"
                    value={promptComponents.lighting}
                    onChange={(e) => handleComponentChange('lighting', e.target.value)}
                    className={styles.input}
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.foreground || '#333',
                      color: theme.colors.foreground
                    }}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Background:</label>
                  <input
                    type="text"
                    value={promptComponents.background}
                    onChange={(e) => handleComponentChange('background', e.target.value)}
                    className={styles.input}
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.foreground || '#333',
                      color: theme.colors.foreground
                    }}
                  />
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>
                  Quality & Negative Prompt
                </h3>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Quality:</label>
                  <input
                    type="text"
                    value={promptComponents.quality}
                    onChange={(e) => handleComponentChange('quality', e.target.value)}
                    className={styles.input}
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.foreground || '#333',
                      color: theme.colors.foreground
                    }}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Negative Prompt:</label>
                  <textarea
                    value={promptComponents.negativePrompt || ''}
                    onChange={(e) => handleComponentChange('negativePrompt', e.target.value)}
                    className={styles.textarea}
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.foreground || '#333',
                      color: theme.colors.foreground
                    }}
                    rows={2}
                  />
                </div>
              </div>
            </>
          )}

          {/* Preview */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>
              Preview
            </h3>
            <div 
              className={styles.preview}
              style={{
                backgroundColor: `${theme.colors.accent}10`,
                borderColor: theme.colors.accent
              }}
            >
              <pre className={styles.previewText}>
                {generatePreview()}
              </pre>
            </div>
          </div>

          {/* Last Generated Image */}
          {lastGeneratedImage && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>
                Last Generated
              </h3>
              <div className={styles.imagePreview}>
                <img 
                  src={lastGeneratedImage} 
                  alt="Generated avatar"
                  className={styles.generatedImage}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.buttonGroup}>
            <button
              onClick={resetToDefaults}
              className={styles.button}
              style={{
                backgroundColor: 'transparent',
                borderColor: theme.colors.foreground || '#333',
                color: theme.colors.foreground
              }}
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !activeProvider}
              className={`${styles.button} ${styles.primaryButton}`}
              style={{
                backgroundColor: theme.colors.accent,
                borderColor: theme.colors.accent,
                color: theme.colors.background,
                opacity: (isGenerating || !activeProvider) ? 0.5 : 1
              }}
            >
              {isGenerating ? 'Generating...' : 'Generate Avatar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};