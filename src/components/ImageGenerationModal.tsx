import React, { useState, useEffect, useCallback } from 'react';
import type { TerminalTheme } from '../terminal/themes';
import type { ImageProviderManager } from '../providers/image/manager';
import type { AvatarController } from '../avatar/AvatarController';
import type { StorageService } from '../storage/types';
import type { ModelConfig, ReplicateProvider } from '../providers/image/replicate';
import { configManager } from '../config/env';
import { useAppStore } from '../store/appStore'; // For accessing useMetaPromptingForImages config
import styles from './ImageGenerationModal.module.css';

interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageManager: ImageProviderManager;
  avatarController: AvatarController;
  storage: StorageService; // Kept for potential future settings persistence
  theme: TerminalTheme;
}

type GenerationMode = 'currentState' | 'describeScene' | 'fullCustom';

export const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({
  isOpen,
  onClose,
  imageManager,
  avatarController,
  storage, // Keep for future settings if needed
  theme
}) => {
  const [activeProviderId, setActiveProviderId] = useState<string>('');
  const [availableProviders, setAvailableProviders] = useState<Array<{ id: string; name: string; configured: boolean }>>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<Record<string, ModelConfig>>({});
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  
  const [globalImageStyle, setGlobalImageStyle] = useState<string>('');
  
  const [generationMode, setGenerationMode] = useState<GenerationMode>('currentState');
  const [sceneDescription, setSceneDescription] = useState<string>('');
  const [fullCustomPromptText, setFullCustomPromptText] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>('');

  const [currentAvatarStateDisplay, setCurrentAvatarStateDisplay] = useState<string>('');
  const [previewPrompt, setPreviewPrompt] = useState<string>('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedImage, setLastGeneratedImage] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  const appConfig = useAppStore(state => state.config);

  const updateCurrentAvatarStateDisplay = useCallback(() => {
    if (avatarController) {
      const state = avatarController.getState();
      setCurrentAvatarStateDisplay(`Expression: ${state.expression}, Pose: ${state.pose}, Action: ${state.action}`);
    }
  }, [avatarController]);

  useEffect(() => {
    if (isOpen) {
      console.log("ImageGenerationModal: Opening, attempting to load settings.");
      setModalError(null);
      const loadTimeout = setTimeout(() => {
        if (isOpen && !activeProviderId) { // Check if still open and not loaded
             setModalError('Modal loading timed out. Please close and try again.');
        }
      }, 10000);

      loadModalSettings()
        .then(() => clearTimeout(loadTimeout))
        .catch(err => {
          clearTimeout(loadTimeout);
          console.error("ImageGenerationModal: Critical error during loadModalSettings:", err);
          setModalError(`Failed to load modal settings: ${err instanceof Error ? err.message : String(err)}. Please check console.`);
        });
    }
  }, [isOpen]); // Only re-run when isOpen changes

  const loadModalSettings = async () => {
    console.log("ImageGenerationModal: loadModalSettings started.");
    try {
      const currentActiveProvider = imageManager.getActiveProvider();
      setActiveProviderId(currentActiveProvider?.id || '');
      setAvailableProviders(imageManager.getAvailableProviders() || []);
      
      setGlobalImageStyle(configManager.getImageStyle());
      updateCurrentAvatarStateDisplay();
      
      setAvailableModels({}); 
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
          if (currentProviderModel) setSelectedModel(currentProviderModel);
          else if (models && Object.keys(models).length > 0) setSelectedModel(Object.keys(models)[0]);
        } else {
          setAvailableModels({});
        }
      }
      
      // Load last used values for text areas if desired (using storage prop)
      if (storage && typeof storage.getSetting === 'function') {
        const savedSceneDesc = await storage.getSetting<string>('imageModal.sceneDescription');
        if (savedSceneDesc) setSceneDescription(savedSceneDesc);
        const savedCustomPrompt = await storage.getSetting<string>('imageModal.fullCustomPrompt');
        if (savedCustomPrompt) setFullCustomPromptText(savedCustomPrompt);
        const savedNegativePrompt = await storage.getSetting<string>('imageModal.negativePrompt');
        if (savedNegativePrompt) setNegativePrompt(savedNegativePrompt);
        const savedGenMode = await storage.getSetting<GenerationMode>('imageModal.generationMode');
        if (savedGenMode) setGenerationMode(savedGenMode);
      } else {
        // Fallback to composer's default negative prompt if storage isn't available
        setNegativePrompt(avatarController.getPromptComposer().getNegativePrompt({} as any));
      }


      console.log("ImageGenerationModal: loadModalSettings finished successfully.");
    } catch (error) {
      console.error('ImageGenerationModal: Failed to load settings:', error);
      setModalError(`Error loading settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Update preview whenever relevant state changes
  useEffect(() => {
    updatePreviewPrompt();
    updateCurrentAvatarStateDisplay();
  }, [generationMode, sceneDescription, fullCustomPromptText, negativePrompt, globalImageStyle, appConfig.useMetaPromptingForImages, avatarController, updateCurrentAvatarStateDisplay]);


  const updatePreviewPrompt = () => {
    if (!avatarController) {
      setPreviewPrompt("Avatar controller not available.");
      return;
    }
    const composer = avatarController.getPromptComposer();
    const currentAvatarState = avatarController.getState();

    let desc = "";
    let isAiDesc = false;

    if (generationMode === 'currentState') {
      desc = `Claudia, ${currentAvatarState.expression}, ${currentAvatarState.pose}, ${currentAvatarState.action}`;
    } else if (generationMode === 'describeScene') {
      desc = sceneDescription;
      isAiDesc = true; // Treat manual scene description like an AI-provided one for composer logic
    } else if (generationMode === 'fullCustom') {
      setPreviewPrompt(`Full Custom Prompt:\n${fullCustomPromptText}\n\nNegative: ${negativePrompt}`);
      return;
    }

    if (appConfig.useMetaPromptingForImages) {
      let metaContext = `Current State: ${currentAvatarState.expression}, ${currentAvatarState.pose}, ${currentAvatarState.action}. `;
      if (generationMode === 'describeScene') metaContext += `Scene Request: "${sceneDescription}". `;
      metaContext += `Style: ${globalImageStyle}.`;
      setPreviewPrompt(`Meta-Prompt Input (Simplified):\n${metaContext}\n(Actual prompt will be generated by LLM)\n\nNegative: ${negativePrompt}`);
    } else {
      const components = composer.generatePromptComponents({
        expression: currentAvatarState.expression,
        pose: currentAvatarState.pose,
        action: currentAvatarState.action,
        style: globalImageStyle,
        aiDescription: isAiDesc ? desc : undefined, // Pass scene description if in that mode
        // Other params like background, lighting will use defaults or be influenced by composer logic
      });
      setPreviewPrompt(`Directly Composed Prompt:\n${composer.compilePrompt(components)}\n\nNegative: ${composer.getNegativePrompt(components)}`);
    }
  };


  const handleProviderChange = async (providerId: string) => {
    try {
      imageManager.setActiveProvider(providerId);
      setActiveProviderId(providerId);
      await loadModalSettings(); 
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
        }
      }
    } catch (error) {
      console.error('Failed to switch model:', error);
      setModalError(`Error switching model: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleGlobalStyleSave = () => {
    localStorage.setItem('claudia-image-style', globalImageStyle);
    (configManager as any).config.imageStyle = globalImageStyle; // Directly update runtime config
    avatarController.getPromptComposer().setBasePrompts({ styleKeywords: globalImageStyle }); // Update composer's base
    console.log('💾 Global Image style saved:', globalImageStyle);
    updatePreviewPrompt(); // Refresh preview
  };


  const handleGenerate = async () => {
    const imageGenProvider = imageManager.getActiveProvider();
    if (!imageGenProvider) {
      setModalError("No active image provider selected.");
      return;
    }
    if (!avatarController) {
      setModalError("Avatar controller not available.");
      return;
    }

    setModalError(null);
    setIsGenerating(true);
    setLastGeneratedImage(''); // Clear previous image

    try {
      let finalPromptForGeneration: string;
      let finalNegativePrompt = negativePrompt || avatarController.getPromptComposer().getNegativePrompt({} as any);

      if (generationMode === 'fullCustom') {
        finalPromptForGeneration = fullCustomPromptText;
        // Negative prompt is already set via state
      } else {
        // For 'currentState' or 'describeScene', let AvatarController handle it
        // It will use meta-prompting if enabled.
        // We need to ensure AvatarController's internal state is what we want for 'currentState'
        // or that it uses the sceneDescription appropriately.
        
        // For 'describeScene', we call generateAvatarFromDescription
        // For 'currentState', we call generateAvatarImage (or a more specific state-based method)
        
        let tempImageUrl = ''; // To capture the URL from AvatarController methods

        const tempOnStateChange = (newState: any) => { // Temp listener
            if(newState.imageUrl && newState.imageUrl !== avatarController.getState().imageUrl) {
                 tempImageUrl = newState.imageUrl;
            }
            if(!newState.isGenerating && newState.hasError) {
                setModalError(newState.errorMessage || "Error during avatar generation.");
            }
        };
        const originalOnStateChange = (avatarController as any).onStateChange;
        (avatarController as any).onStateChange = tempOnStateChange;


        if (generationMode === 'describeScene') {
          await avatarController.generateAvatarFromDescription(sceneDescription);
        } else { // currentState
          // Ensure current state is used by calling generateAvatarImage without specific description
          await avatarController.generateAvatarWithContext();
        }
        
        (avatarController as any).onStateChange = originalOnStateChange; // Restore original

        if (avatarController.getState().hasError) {
            throw new Error(avatarController.getState().errorMessage || "Avatar generation failed via controller.");
        }
        tempImageUrl = avatarController.getState().imageUrl || ''; // Get the latest URL

        // The actual prompt used by AvatarController (especially if meta-prompted) isn't directly available here
        // unless we modify AvatarController to return it or store it.
        // For now, the preview gives an idea.
        // We'll use the generated image URL.
        if (tempImageUrl) {
          setLastGeneratedImage(tempImageUrl);
        } else if (!avatarController.getState().hasError) {
          // This case might happen if caching was hit and no new URL was set via the temp listener
          setLastGeneratedImage(avatarController.getState().imageUrl || '');
        }
        // finalPromptForGeneration and finalNegativePrompt are handled by AvatarController in these modes.
        // So, we don't need to call imageGenProvider.generateImage directly here for these modes.
        setIsGenerating(false);
        return; // Generation handled by AvatarController
      }

      // This part is now only for 'fullCustom' mode
      const response = await imageGenProvider.generateImage({
        prompt: finalPromptForGeneration,
        negativePrompt: finalNegativePrompt,
        width: 512,
        height: 512,
        steps: modelConfig?.defaultSteps || 20,
        guidance: modelConfig?.defaultGuidance || 7.5
      });

      setLastGeneratedImage(response.imageUrl);
      // Optionally update avatar controller if this custom image should be the new avatar
      // avatarController.setState({ imageUrl: response.imageUrl, visible: true });

    } catch (error) {
      console.error('Failed to generate image:', error);
      setModalError(`Image generation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Persist text area contents
  useEffect(() => {
    if (isOpen && storage && typeof storage.setSetting === 'function') {
      const timer = setTimeout(() => {
        storage.setSetting('imageModal.sceneDescription', sceneDescription, 'string');
        storage.setSetting('imageModal.fullCustomPrompt', fullCustomPromptText, 'string');
        storage.setSetting('imageModal.negativePrompt', negativePrompt, 'string');
        storage.setSetting('imageModal.generationMode', generationMode, 'string');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, storage, sceneDescription, fullCustomPromptText, negativePrompt, generationMode]);


  if (!isOpen) return null;

  if (!theme || !theme.colors) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{padding: '20px', background: 'black', color: 'red', border: '1px solid red'}}>
          Error: Theme not available. Cannot render modal.
          <button onClick={onClose} style={{marginTop: '10px'}}>Close</button>
        </div>
      </div>
    );
  }
  
  if (modalError && !modalError.startsWith("Modal loading timed out")) { // Don't show full error page for timeout during initial load
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
            <button className={styles.closeButton} onClick={onClose} style={{ color: theme.colors.foreground }}>×</button>
          </div>
          <div className={styles.content}><p>{modalError}</p></div>
           <div className={styles.footer}><button onClick={onClose} className={styles.button}>Close</button></div>
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
            🖼️ Image Generation Lab
          </h2>
          <button className={styles.closeButton} onClick={onClose} style={{ color: theme.colors.foreground }}>×</button>
        </div>

        <div className={styles.content}>
          {modalError && <div className={styles.modalError} style={{color: theme.colors.warning}}>{modalError}</div>}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>Provider & Model</h3>
            <div className={styles.providerSection}>
              <label className={styles.label}>Active Provider:</label>
              <select 
                value={activeProviderId}
                onChange={(e) => handleProviderChange(e.target.value)}
                className={styles.select}
                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.foreground || '#333', color: theme.colors.foreground }}
              >
                <option value="">Select Provider</option>
                {availableProviders.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {!p.configured && '(Not Configured)'}
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
                  style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.foreground || '#333', color: theme.colors.foreground }}
                >
                  {Object.entries(availableModels).map(([modelId, config]) => ( <option key={modelId} value={modelId}>{modelId} - {config.description}</option> ))}
                </select>
                {modelConfig && <div className={styles.modelInfo}><small>Max Steps: {modelConfig.maxSteps} | Max Guidance: {modelConfig.maxGuidance} | Neg Prompt: {modelConfig.supportsNegativePrompt ? 'Yes' : 'No'}</small></div>}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>Global Image Style</h3>
            <textarea
              value={globalImageStyle}
              onChange={(e) => setGlobalImageStyle(e.target.value)}
              className={styles.textarea}
              rows={2}
              placeholder="e.g., photorealistic, oil painting, anime sketch"
              style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.foreground || '#333', color: theme.colors.foreground }}
            />
            <button onClick={handleGlobalStyleSave} className={`${styles.button} ${styles.smallButton}`} style={{ backgroundColor: theme.colors.accent, color: theme.colors.background, marginTop: '8px' }}>Save Global Style</button>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>Generation Mode</h3>
            <div className={styles.toggleGroup}>
              <label className={styles.radioLabel}><input type="radio" name="generationMode" value="currentState" checked={generationMode === 'currentState'} onChange={() => setGenerationMode('currentState')} /> From Current Avatar State</label>
              <label className={styles.radioLabel}><input type="radio" name="generationMode" value="describeScene" checked={generationMode === 'describeScene'} onChange={() => setGenerationMode('describeScene')} /> Describe a Scene</label>
              <label className={styles.radioLabel}><input type="radio" name="generationMode" value="fullCustom" checked={generationMode === 'fullCustom'} onChange={() => setGenerationMode('fullCustom')} /> Full Custom Prompt (Advanced)</label>
            </div>
          </div>

          {generationMode === 'currentState' && (
            <div className={styles.section}>
              <p className={styles.description}>Current Avatar: {currentAvatarStateDisplay}</p>
              <p className={styles.description}>Uses current expression, pose, action. Meta-prompting will be used if enabled.</p>
            </div>
          )}

          {generationMode === 'describeScene' && (
            <div className={styles.section}>
              <label className={styles.label}>Scene Description:</label>
              <textarea
                value={sceneDescription}
                onChange={(e) => setSceneDescription(e.target.value)}
                className={styles.textarea}
                rows={3}
                placeholder="e.g., Claudia coding at her desk in a sunlit room, looking focused."
                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.foreground || '#333', color: theme.colors.foreground }}
              />
            </div>
          )}

          {generationMode === 'fullCustom' && (
            <div className={styles.section}>
              <label className={styles.label}>Custom Image Prompt:</label>
              <textarea
                value={fullCustomPromptText}
                onChange={(e) => setFullCustomPromptText(e.target.value)}
                className={styles.textarea}
                rows={4}
                placeholder="Enter the exact prompt for the image generator."
                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.foreground || '#333', color: theme.colors.foreground }}
              />
            </div>
          )}
          
          <div className={styles.section}>
            <label className={styles.label}>Negative Prompt:</label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className={styles.textarea}
              rows={2}
              placeholder="e.g., blurry, ugly, text, watermark"
              style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.foreground || '#333', color: theme.colors.foreground }}
            />
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>Prompt Preview</h3>
            <div className={styles.preview} style={{ backgroundColor: `${theme.colors.accent}10`, borderColor: theme.colors.accent }}>
              <pre className={styles.previewText}>{previewPrompt}</pre>
            </div>
          </div>

          {lastGeneratedImage && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle} style={{ color: theme.colors.accent }}>Last Generated</h3>
              <div className={styles.imagePreview}><img src={lastGeneratedImage} alt="Generated avatar" className={styles.generatedImage}/></div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !activeProviderId}
            className={`${styles.button} ${styles.primaryButton}`}
            style={{ backgroundColor: theme.colors.accent, borderColor: theme.colors.accent, color: theme.colors.background, opacity: (isGenerating || !activeProviderId) ? 0.5 : 1 }}
          >
            {isGenerating ? 'Generating...' : 'Generate Image'}
          </button>
        </div>
      </div>
    </div>
  );
};
