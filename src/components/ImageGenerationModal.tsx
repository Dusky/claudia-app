import React, { useState, useEffect } from 'react';
import type { TerminalTheme } from '../terminal/themes';
import type { ImageProviderManager } from '../providers/image/manager';
import type { AvatarController } from '../avatar/AvatarController';
import type { StorageService } from '../storage/types';
import type { ImagePromptComponents } from '../providers/image/types';
import type { ModelConfig, ReplicateProvider } from '../providers/image/replicate'; // Import ReplicateProvider for type check
import { configManager } from '../config/env';
import styles from './ImageGenerationModal.module.css';

interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageManager: ImageProviderManager;
  avatarController: AvatarController;
  storage: StorageService;
  theme: TerminalTheme;
}

export const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({
  isOpen,
  onClose,
  imageManager,
  avatarController,
  storage,
  theme
}) => {
  const [activeProviderId, setActiveProviderId] = useState<string>('');
  const [availableProviders, setAvailableProviders] = useState<Array<{ id: string; name: string; configured: boolean }>>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<Record<string, ModelConfig>>({});
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [imageStyle, setImageStyle] = useState<string>('realistic digital photography, warm natural lighting, detailed, beautiful composition');
  const [promptComponents, setPromptComponents] = useState<ImagePromptComponents>({
    character: '',
    expressionKeywords: '',
    poseKeywords: '',
    actionKeywords: '',
    style: '',
    lightingKeywords: '',
    backgroundKeywords: '',
    quality: '',
    negativePrompt: '',
    situationalDescription: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedImage, setLastGeneratedImage] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);


  useEffect(() => {
    if (isOpen) {
      console.log("ImageGenerationModal: Opening, attempting to load settings.");
      setModalError(null); 
      loadSettings().catch(err => {
        console.error("ImageGenerationModal: Critical error during loadSettings:", err);
        setModalError(`Failed to load modal settings: ${err instanceof Error ? err.message : String(err)}. Please check console.`);
      });
    }
  }, [isOpen]);

  const loadSettings = async () => {
    console.log("ImageGenerationModal: loadSettings started.");
    try {
      const currentActiveProvider = imageManager.getActiveProvider();
      setActiveProviderId(currentActiveProvider?.id || '');
      setAvailableProviders(imageManager.getAvailableProviders() || []);
      
      setImageStyle(configManager.getImageStyle());
      
      setAvailableModels({}); // Reset before loading
      setModelConfig(null);
      setSelectedModel('');

      if (currentActiveProvider?.id === 'replicate') {
        const replicateProvider = currentActiveProvider as ReplicateProvider; 
        if (replicateProvider && typeof replicateProvider.getAllModelConfigs === 'function') {
          const models = replicateProvider.getAllModelConfigs();
          setAvailableModels(models || {});
          
          if (typeof replicateProvider.getModelConfig === 'function') {
            const currentModelConfig = replicateProvider.getModelConfig();
            setModelConfig(currentModelConfig || null);
          }

          const currentProviderModel = (replicateProvider as any).config?.model; 
          if (currentProviderModel) {
            setSelectedModel(currentProviderModel);
          } else if (models && Object.keys(models).length > 0) {
            setSelectedModel(Object.keys(models)[0]);
          }
        } else {
          console.warn("Replicate provider instance does not have getAllModelConfigs method or is not fully initialized.");
          setAvailableModels({});
        }
      }
      
      let savedComponents: ImagePromptComponents | null = null;
      if (storage && typeof storage.getSetting === 'function') {
        savedComponents = await storage.getSetting<ImagePromptComponents>('image.promptComponents');
      } else {
        console.warn("ImageGenerationModal: storage.getSetting is not available.");
      }

      if (savedComponents) {
        setPromptComponents(savedComponents);
      } else {
        const composer = avatarController.getPromptComposer();
        const avatarState = avatarController.getState();
        const components = composer.generatePromptComponents({
          expression: avatarState.expression,
          pose: avatarState.pose,
          action: avatarState.action,
          style: configManager.getImageStyle(),
          background: 'none',
          lighting: 'soft',
          quality: 'high'
        });
        setPromptComponents(components);
      }

      let savedUseCustomPrompt: boolean | null = null;
      let savedCustomPrompt: string | null = null;

      if (storage && typeof storage.getSetting === 'function') {
        savedUseCustomPrompt = await storage.getSetting<boolean>('image.useCustomPrompt');
        savedCustomPrompt = await storage.getSetting<string>('image.customPrompt');
      }
      
      setUseCustomPrompt(savedUseCustomPrompt ?? false);
      setCustomPrompt(savedCustomPrompt ?? '');
      console.log("ImageGenerationModal: loadSettings finished successfully.");

    } catch (error) {
      console.error('ImageGenerationModal: Failed to load settings:', error);
      setModalError(`Error loading settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleProviderChange = async (providerId: string) => {
    try {
      imageManager.setActiveProvider(providerId);
      setActiveProviderId(providerId);
      await loadSettings(); 
    } catch (error) {
      console.error('Failed to switch provider:', error);
      setModalError(`Error switching provider: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleModelChange = async (modelId: string) => {
    try {
      const provider = imageManager.getActiveProvider();
      if (provider?.id === 'replicate') {
        const replicateProvider = provider as ReplicateProvider;
        if (typeof replicateProvider.initialize === 'function' && 
            typeof replicateProvider.getModelConfig === 'function' &&
            (replicateProvider as any).config) { 
          
          await replicateProvider.initialize({
            ...(replicateProvider as any).config, 
            model: modelId, 
          });
          
          setSelectedModel(modelId);
          const newConfig = replicateProvider.getModelConfig();
          setModelConfig(newConfig || null);
        } else {
          console.warn("Replicate provider methods or config not available for model change.");
        }
      }
    } catch (error) {
      console.error('Failed to switch model:', error);
      setModalError(`Error switching model: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleStyleSave = () => {
    localStorage.setItem('claudia-image-style', imageStyle);
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
      setModalError("No active image provider selected.");
      return;
    }
    setModalError(null);
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
        steps: modelConfig?.defaultSteps || 20,
        guidance: modelConfig?.defaultGuidance || 7.5
      });

      const avatarState = avatarController.getState();
      avatarController.setState({
        ...avatarState,
        imageUrl: response.imageUrl,
        visible: true
      });

      setLastGeneratedImage(response.imageUrl);
    } catch (error) {
      console.error('Failed to generate image:', error);
      setModalError(`Image generation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveSettings = async () => {
    try {
      if (storage && typeof storage.setSetting === 'function') {
        await storage.setSetting('image.promptComponents', promptComponents, 'json');
        await storage.setSetting('image.useCustomPrompt', useCustomPrompt, 'boolean');
        await storage.setSetting('image.customPrompt', customPrompt, 'string');
      } else {
        console.warn("ImageGenerationModal: storage.setSetting is not available. Skipping save.");
      }
      localStorage.setItem('claudia-image-style', imageStyle);
      console.log('✅ Image settings saved successfully');
    } catch (error) {
      console.error('Failed to save image settings:', error);
      setModalError(`Failed to save settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const resetToDefaults = async () => {
    const composer = avatarController.getPromptComposer();
    const avatarState = avatarController.getState();
    
    const defaultComponents = composer.generatePromptComponents({
      expression: avatarState.expression,
      pose: avatarState.pose,
      action: avatarState.action,
      style: configManager.getImageStyle(), 
      background: 'none',
      lighting: 'soft',
      quality: 'high'
    });
    
    setPromptComponents(defaultComponents);
    setUseCustomPrompt(false);
    setCustomPrompt('');
    setImageStyle(configManager.getImageStyle()); 
    
    await saveSettings();
  };

  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        saveSettings().catch(err => console.error("Autosave failed in ImageGenerationModal:", err));
      }, 1000); 
      
      return () => clearTimeout(timeoutId);
    }
  }, [promptComponents, useCustomPrompt, customPrompt, imageStyle, isOpen]);

  if (!isOpen) return null;

  // If there's a modal error, render only the error and close button
  if (modalError) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div 
          className={`${styles.modal} ${styles[theme.id] || ''}`}
          style={{
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.error || '#cc0000',
            color: theme.colors.foreground
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.header}>
            <h2 className={styles.title} style={{ color: theme.colors.error }}>
              Modal Error
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
            <div className={styles.modalError} style={{color: theme.colors.error, padding: '20px'}}>
              <p>Something went wrong while loading or operating this modal:</p>
              <p>{modalError}</p>
              <p>Please try closing and reopening the modal. If the issue persists, check the browser console for more details.</p>
            </div>
          </div>
           <div className={styles.footer}>
            <button 
              onClick={onClose} 
              className={styles.button}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                value={activeProviderId}
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
            
            {activeProviderId === 'replicate' && Object.keys(availableModels).length > 0 && (
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
                
                {modelConfig && (
                  <div className={styles.modelInfo}>
                    <small style={{ color: theme.colors.foreground, opacity: 0.7 }}>
                      Max Steps: {modelConfig.maxSteps} | 
                      Max Guidance: {modelConfig.maxGuidance} | 
                      Neg Prompt: {modelConfig.supportsNegativePrompt ? 'Yes' : 'No'}
                    </small>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Image Style Settings */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>
              Global Image Style
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
                This style is used by default. Changes here are saved immediately.
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
                Save Global Style
              </button>
            </div>
          </div>

          {/* Prompt Mode Toggle */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>
              Prompt Mode (For this Modal)
            </h3>
            <div className={styles.toggleGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="promptMode"
                  checked={!useCustomPrompt}
                  onChange={() => setUseCustomPrompt(false)}
                />
                <span>Component-based (Recommended)</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="promptMode"
                  checked={useCustomPrompt}
                  onChange={() => setUseCustomPrompt(true)}
                />
                <span>Custom Prompt</span>
              </label>
            </div>
          </div>

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

          {!useCustomPrompt && (
            <>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>
                  Prompt Components
                </h3>
                {Object.keys(promptComponents).filter(k => k !== 'negativePrompt' && k !== 'variationSeed' && k !== 'contextualKeywords').map((key) => (
                  <div className={styles.inputGroup} key={key}>
                    <label className={styles.label}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</label>
                    <input
                      type="text"
                      value={(promptComponents as any)[key] || ''}
                      onChange={(e) => handleComponentChange(key as keyof ImagePromptComponents, e.target.value)}
                      className={styles.input}
                      style={{
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.foreground || '#333',
                        color: theme.colors.foreground
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>
                  Negative Prompt
                </h3>
                <div className={styles.inputGroup}>
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
              disabled={isGenerating || !activeProviderId}
              className={`${styles.button} ${styles.primaryButton}`}
              style={{
                backgroundColor: theme.colors.accent,
                borderColor: theme.colors.accent,
                color: theme.colors.background,
                opacity: (isGenerating || !activeProviderId) ? 0.5 : 1
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
