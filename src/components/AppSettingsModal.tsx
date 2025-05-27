import React, { useState, useEffect } from 'react';
import type { StorageService } from '../storage/types';
import type { TerminalTheme } from '../terminal/themes';
import styles from './AppSettingsModal.module.css';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storage: StorageService;
  theme: TerminalTheme;
}

// Settings keys for persistence
export const APP_SETTINGS_KEYS = {
  GLOBAL_IMAGE_GENERATION: 'app.globalImageGeneration',
  USE_META_PROMPTING_FOR_IMAGES: 'app.useMetaPromptingForImages', // New key
  LOG_PROMPTS_TO_FILE: 'image.logPromptsToFile', // New key for prompt logging
  AUTO_SAVE_IMAGES: 'app.autoSaveImages',
  IMAGE_CACHE_SIZE: 'app.imageCacheSize',
  DEBUG_MODE: 'app.debugMode',
  BOOT_ANIMATION: 'app.bootAnimation',
  CONVERSATION_HISTORY_LIMIT: 'app.conversationHistoryLimit',
  AUTO_SCROLL: 'app.autoScroll',
  SOUND_EFFECTS: 'app.soundEffects',
  // MCP Settings
  MCP_ENABLED: 'mcp.enabled',
  MCP_AUTO_CONNECT: 'mcp.autoConnect',
  MCP_TIMEOUT: 'mcp.timeout',
  MCP_SERVERS: 'mcp.servers',
  MCP_TOOL_CONFIRMATION: 'mcp.toolConfirmation'
} as const;

// Default values
const DEFAULT_SETTINGS = {
  globalImageGeneration: true,
  useMetaPromptingForImages: false, // New default
  logPromptsToFile: false, // New default for prompt logging
  autoSaveImages: true,
  imageCacheSize: 100,
  debugMode: false,
  bootAnimation: true,
  conversationHistoryLimit: 50,
  autoScroll: true,
  soundEffects: false,
  // MCP Settings
  mcpEnabled: true,
  mcpAutoConnect: true,
  mcpTimeout: 10000,
  mcpToolConfirmation: true
};

interface AppSettings {
  globalImageGeneration: boolean;
  useMetaPromptingForImages: boolean; // New setting
  logPromptsToFile: boolean; // New setting for prompt logging
  autoSaveImages: boolean;
  imageCacheSize: number;
  debugMode: boolean;
  bootAnimation: boolean;
  conversationHistoryLimit: number;
  autoScroll: boolean;
  soundEffects: boolean;
  // MCP Settings
  mcpEnabled: boolean;
  mcpAutoConnect: boolean;
  mcpTimeout: number;
  mcpToolConfirmation: boolean;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  onClose,
  storage,
  theme
}) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const loadedSettings: AppSettings = {
        globalImageGeneration: (await storage.getSetting<boolean>(
          APP_SETTINGS_KEYS.GLOBAL_IMAGE_GENERATION, 
          DEFAULT_SETTINGS.globalImageGeneration
        )) ?? DEFAULT_SETTINGS.globalImageGeneration,
        useMetaPromptingForImages: (await storage.getSetting<boolean>( // Load new setting
          APP_SETTINGS_KEYS.USE_META_PROMPTING_FOR_IMAGES,
          DEFAULT_SETTINGS.useMetaPromptingForImages
        )) ?? DEFAULT_SETTINGS.useMetaPromptingForImages,
        logPromptsToFile: (await storage.getSetting<boolean>( // Load prompt logging setting
          APP_SETTINGS_KEYS.LOG_PROMPTS_TO_FILE,
          DEFAULT_SETTINGS.logPromptsToFile
        )) ?? DEFAULT_SETTINGS.logPromptsToFile,
        autoSaveImages: (await storage.getSetting<boolean>(
          APP_SETTINGS_KEYS.AUTO_SAVE_IMAGES, 
          DEFAULT_SETTINGS.autoSaveImages
        )) ?? DEFAULT_SETTINGS.autoSaveImages,
        imageCacheSize: (await storage.getSetting<number>(
          APP_SETTINGS_KEYS.IMAGE_CACHE_SIZE, 
          DEFAULT_SETTINGS.imageCacheSize
        )) ?? DEFAULT_SETTINGS.imageCacheSize,
        debugMode: (await storage.getSetting<boolean>(
          APP_SETTINGS_KEYS.DEBUG_MODE, 
          DEFAULT_SETTINGS.debugMode
        )) ?? DEFAULT_SETTINGS.debugMode,
        bootAnimation: (await storage.getSetting<boolean>(
          APP_SETTINGS_KEYS.BOOT_ANIMATION, 
          DEFAULT_SETTINGS.bootAnimation
        )) ?? DEFAULT_SETTINGS.bootAnimation,
        conversationHistoryLimit: (await storage.getSetting<number>(
          APP_SETTINGS_KEYS.CONVERSATION_HISTORY_LIMIT, 
          DEFAULT_SETTINGS.conversationHistoryLimit
        )) ?? DEFAULT_SETTINGS.conversationHistoryLimit,
        autoScroll: (await storage.getSetting<boolean>(
          APP_SETTINGS_KEYS.AUTO_SCROLL, 
          DEFAULT_SETTINGS.autoScroll
        )) ?? DEFAULT_SETTINGS.autoScroll,
        soundEffects: (await storage.getSetting<boolean>(
          APP_SETTINGS_KEYS.SOUND_EFFECTS, 
          DEFAULT_SETTINGS.soundEffects
        )) ?? DEFAULT_SETTINGS.soundEffects,
        // MCP Settings
        mcpEnabled: (await storage.getSetting<boolean>(
          APP_SETTINGS_KEYS.MCP_ENABLED, 
          DEFAULT_SETTINGS.mcpEnabled
        )) ?? DEFAULT_SETTINGS.mcpEnabled,
        mcpAutoConnect: (await storage.getSetting<boolean>(
          APP_SETTINGS_KEYS.MCP_AUTO_CONNECT, 
          DEFAULT_SETTINGS.mcpAutoConnect
        )) ?? DEFAULT_SETTINGS.mcpAutoConnect,
        mcpTimeout: (await storage.getSetting<number>(
          APP_SETTINGS_KEYS.MCP_TIMEOUT, 
          DEFAULT_SETTINGS.mcpTimeout
        )) ?? DEFAULT_SETTINGS.mcpTimeout,
        mcpToolConfirmation: (await storage.getSetting<boolean>(
          APP_SETTINGS_KEYS.MCP_TOOL_CONFIRMATION, 
          DEFAULT_SETTINGS.mcpToolConfirmation
        )) ?? DEFAULT_SETTINGS.mcpToolConfirmation
      };
      // Ensure all properties are defined by merging with defaults
      const safeLoadedSettings = { ...DEFAULT_SETTINGS, ...loadedSettings };
      setSettings(safeLoadedSettings);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to load app settings:', error);
      // On error, reset to defaults to ensure controlled components
      setSettings({ ...DEFAULT_SETTINGS });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(
    key: K, 
    value: AppSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        storage.setSetting(APP_SETTINGS_KEYS.GLOBAL_IMAGE_GENERATION, settings.globalImageGeneration, 'boolean'),
        storage.setSetting(APP_SETTINGS_KEYS.USE_META_PROMPTING_FOR_IMAGES, settings.useMetaPromptingForImages, 'boolean'), // Save new setting
        storage.setSetting(APP_SETTINGS_KEYS.LOG_PROMPTS_TO_FILE, settings.logPromptsToFile, 'boolean'), // Save prompt logging setting
        storage.setSetting(APP_SETTINGS_KEYS.AUTO_SAVE_IMAGES, settings.autoSaveImages, 'boolean'),
        storage.setSetting(APP_SETTINGS_KEYS.IMAGE_CACHE_SIZE, settings.imageCacheSize, 'number'),
        storage.setSetting(APP_SETTINGS_KEYS.DEBUG_MODE, settings.debugMode, 'boolean'),
        storage.setSetting(APP_SETTINGS_KEYS.BOOT_ANIMATION, settings.bootAnimation, 'boolean'),
        storage.setSetting(APP_SETTINGS_KEYS.CONVERSATION_HISTORY_LIMIT, settings.conversationHistoryLimit, 'number'),
        storage.setSetting(APP_SETTINGS_KEYS.AUTO_SCROLL, settings.autoScroll, 'boolean'),
        storage.setSetting(APP_SETTINGS_KEYS.SOUND_EFFECTS, settings.soundEffects, 'boolean'),
        // MCP Settings
        storage.setSetting(APP_SETTINGS_KEYS.MCP_ENABLED, settings.mcpEnabled, 'boolean'),
        storage.setSetting(APP_SETTINGS_KEYS.MCP_AUTO_CONNECT, settings.mcpAutoConnect, 'boolean'),
        storage.setSetting(APP_SETTINGS_KEYS.MCP_TIMEOUT, settings.mcpTimeout, 'number'),
        storage.setSetting(APP_SETTINGS_KEYS.MCP_TOOL_CONFIRMATION, settings.mcpToolConfirmation, 'boolean')
      ]);
      setHasChanges(false);
      console.log('✅ App settings saved successfully');
      // Optionally, notify other parts of the app that settings have changed
      // This might involve a Zustand action or event bus if immediate effect is needed elsewhere
      // For now, we assume components re-read from store or localStorage on next relevant action
    } catch (error) {
      console.error('Failed to save app settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      setSettings(DEFAULT_SETTINGS);
      setHasChanges(true);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close without saving?')) {
        onClose();
        setHasChanges(false); // Reset changes flag if closing without saving
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div 
        className={`${styles.modal} ${styles[theme.id] || ''}`}
        style={{ 
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.foreground || '#333',
          color: theme.colors.foreground
        }}
      >
        <div className={styles.header}>
          <h2>App Settings</h2>
          <button 
            className={styles.closeButton} 
            onClick={handleClose}
            style={{ color: theme.colors.foreground }}
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>Loading settings...</div>
          ) : (
            <>
              {/* Image Generation Section */}
              <div className={styles.section}>
                <h3>Image Generation</h3>
                <div className={styles.setting}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={settings.globalImageGeneration}
                      onChange={(e) => updateSetting('globalImageGeneration', e.target.checked)}
                    />
                    <span>Enable global image generation</span>
                  </label>
                  <p className={styles.description}>
                    Master switch for all image generation features. When disabled, no personalities can generate images.
                  </p>
                </div>

                <div className={styles.setting}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={settings.useMetaPromptingForImages}
                      onChange={(e) => updateSetting('useMetaPromptingForImages', e.target.checked)}
                      disabled={!settings.globalImageGeneration} // Disable if global image gen is off
                    />
                    <span>Use AI to enhance image prompts (Experimental)</span>
                  </label>
                  <p className={styles.description}>
                    Allow an AI to rewrite and enrich image prompts for more creative results. May increase latency and cost.
                  </p>
                </div>

                <div className={styles.setting}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={settings.logPromptsToFile}
                      onChange={(e) => updateSetting('logPromptsToFile', e.target.checked)}
                      disabled={!settings.globalImageGeneration} // Disable if global image gen is off
                    />
                    <span>Log prompts to file (Development)</span>
                  </label>
                  <p className={styles.description}>
                    Save detailed prompt information as downloadable JSON files for debugging and analysis. Includes full prompts, parameters, and metadata.
                  </p>
                </div>
                
                <div className={styles.setting}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={settings.autoSaveImages}
                      onChange={(e) => updateSetting('autoSaveImages', e.target.checked)}
                      disabled={!settings.globalImageGeneration} // Disable if global image gen is off
                    />
                    <span>Auto-save generated images</span>
                  </label>
                  <p className={styles.description}>
                    Automatically save generated images to your downloads folder.
                  </p>
                </div>

                <div className={styles.setting}>
                  <label className={styles.slider}>
                    <span>Image cache size: {settings.imageCacheSize}</span>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={settings.imageCacheSize || DEFAULT_SETTINGS.imageCacheSize}
                      onChange={(e) => updateSetting('imageCacheSize', parseInt(e.target.value))}
                      style={{ backgroundColor: theme.colors.background }}
                    />
                  </label>
                  <p className={styles.description}>
                    Maximum number of images to keep in cache.
                  </p>
                </div>
              </div>

              {/* Conversation Section */}
              <div className={styles.section}>
                <h3>Conversation</h3>
                <div className={styles.setting}>
                  <label className={styles.slider}>
                    <span>History limit: {settings.conversationHistoryLimit}</span>
                    <input
                      type="range"
                      min="5"
                      max="200"
                      step="5"
                      value={settings.conversationHistoryLimit || DEFAULT_SETTINGS.conversationHistoryLimit}
                      onChange={(e) => updateSetting('conversationHistoryLimit', parseInt(e.target.value))}
                      style={{ backgroundColor: theme.colors.background }}
                    />
                  </label>
                  <p className={styles.description}>
                    Number of messages to include in AI context.
                  </p>
                </div>

                <div className={styles.setting}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={settings.autoScroll}
                      onChange={(e) => updateSetting('autoScroll', e.target.checked)}
                    />
                    <span>Auto-scroll to new messages</span>
                  </label>
                  <p className={styles.description}>
                    Automatically scroll to bottom when new messages arrive.
                  </p>
                </div>
              </div>

              {/* Interface Section */}
              <div className={styles.section}>
                <h3>Interface</h3>
                <div className={styles.setting}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={settings.bootAnimation}
                      onChange={(e) => updateSetting('bootAnimation', e.target.checked)}
                    />
                    <span>Show boot animation</span>
                  </label>
                  <p className={styles.description}>
                    Display the startup sequence animation.
                  </p>
                </div>

                <div className={styles.setting}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={settings.soundEffects}
                      onChange={(e) => updateSetting('soundEffects', e.target.checked)}
                    />
                    <span>Sound effects</span>
                  </label>
                  <p className={styles.description}>
                    Enable audio feedback for actions (coming soon).
                  </p>
                </div>
              </div>

              {/* MCP Section */}
              <div className={styles.section}>
                <h3>MCP Tools</h3>
                <div className={styles.setting}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={settings.mcpEnabled}
                      onChange={(e) => updateSetting('mcpEnabled', e.target.checked)}
                    />
                    <span>Enable MCP tools</span>
                  </label>
                  <p className={styles.description}>
                    Enable Model Context Protocol tools for enhanced capabilities.
                  </p>
                </div>

                <div className={styles.setting}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={settings.mcpAutoConnect}
                      onChange={(e) => updateSetting('mcpAutoConnect', e.target.checked)}
                      disabled={!settings.mcpEnabled}
                    />
                    <span>Auto-connect to MCP servers</span>
                  </label>
                  <p className={styles.description}>
                    Automatically connect to configured MCP servers on startup.
                  </p>
                </div>

                <div className={styles.setting}>
                  <label className={styles.slider}>
                    <span>MCP timeout: {settings.mcpTimeout}ms</span>
                    <input
                      type="range"
                      min="5000"
                      max="60000"
                      step="1000"
                      value={settings.mcpTimeout || DEFAULT_SETTINGS.mcpTimeout}
                      onChange={(e) => updateSetting('mcpTimeout', parseInt(e.target.value))}
                      disabled={!settings.mcpEnabled}
                      style={{ backgroundColor: theme.colors.background }}
                    />
                  </label>
                  <p className={styles.description}>
                    Timeout for MCP server connections and tool calls.
                  </p>
                </div>

                <div className={styles.setting}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={settings.mcpToolConfirmation}
                      onChange={(e) => updateSetting('mcpToolConfirmation', e.target.checked)}
                      disabled={!settings.mcpEnabled}
                    />
                    <span>Require confirmation for tool calls</span>
                  </label>
                  <p className={styles.description}>
                    Ask for confirmation before executing potentially dangerous operations.
                  </p>
                </div>
              </div>

              {/* Advanced Section */}
              <div className={styles.section}>
                <h3>Advanced</h3>
                <div className={styles.setting}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={settings.debugMode}
                      onChange={(e) => updateSetting('debugMode', e.target.checked)}
                    />
                    <span>Debug mode</span>
                  </label>
                  <p className={styles.description}>
                    Show additional debugging information in console.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button 
            onClick={resetToDefaults}
            className={styles.resetButton}
            disabled={isLoading}
          >
            Reset to Defaults
          </button>
          <div className={styles.actions}>
            <button 
              onClick={handleClose} 
              className={styles.cancelButton}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              onClick={saveSettings} 
              className={styles.saveButton}
              disabled={!hasChanges || isLoading}
              style={{
                backgroundColor: hasChanges ? theme.colors.accent : undefined,
                borderColor: hasChanges ? theme.colors.accent : undefined
              }}
            >
              {isLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
