import React, { useState, useEffect } from 'react';
import type { TerminalTheme } from '../terminal/themes';
import type { LLMProviderManager } from '../providers/llm/manager';
import type { ImageProviderManager } from '../providers/image/manager';
import type { StorageService } from '../storage/types';
import type { Personality } from '../types/personality';
import { formatTokenCount } from '../utils/tokenCounter';
import styles from './StatusBar.module.css';

interface StatusBarProps {
  theme: TerminalTheme;
  currentTheme: string; // ID of the current theme
  llmManager: LLMProviderManager;
  imageManager: ImageProviderManager;
  storage: StorageService;
  activeConversationId: string | null;
  onThemeClick?: () => void;
  onPersonalityClick?: () => void;
  onImageProviderClick?: () => void;
  onAIOptionsClick?: () => void;
  onAppSettingsClick?: () => void;
}

const StatusBarComponent: React.FC<StatusBarProps> = ({
  theme,
  llmManager,
  imageManager,
  storage,
  activeConversationId,
  onThemeClick,
  onPersonalityClick,
  onImageProviderClick,
  onAIOptionsClick,
  onAppSettingsClick,
}) => {
  const [activeLLM, setActiveLLM] = useState(llmManager.getActiveProvider());
  const [activeImage, setActiveImage] = useState(imageManager.getActiveProvider());
  const [activePersonality, setActivePersonality] = useState<Personality | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [conversationTokens, setConversationTokens] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update time every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateStatus = async () => {
      setActiveLLM(llmManager.getActiveProvider());
      setActiveImage(imageManager.getActiveProvider());
      const p = await storage.getActivePersonality();
      setActivePersonality(p);
    };

    updateStatus();
    const intervalId = setInterval(updateStatus, 5000); // Poll for status updates

    return () => clearInterval(intervalId);
  }, [llmManager, imageManager, storage]);

  useEffect(() => {
    const loadConversationTokens = async () => {
      if (activeConversationId) {
        const conversation = await storage.getConversation(activeConversationId);
        setConversationTokens(conversation?.totalTokens || 0);
      } else {
        setConversationTokens(0);
      }
    };

    loadConversationTokens();
  }, [activeConversationId, storage]);

  const themeDisplayName = theme.name; // Use the full name from the theme object
  const llmProviderId = activeLLM?.id || 'N/A';
  const llmConfigured = activeLLM?.isConfigured() ?? false;
  const imageProviderId = activeImage?.id || 'N/A';
  const imageConfigured = activeImage?.isConfigured() ?? false;
  const personalityName = activePersonality?.name || 'Default';

  const themeClass = `theme-${theme.id}`; 

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className={`${styles.statusBar} ${styles[themeClass]}`}>
      <div className={styles.statusBarSection}>
        <div className={styles.statusBarItem}>
          <span>⌘</span> {/* Theme Icon */}
          <span
            onClick={onThemeClick}
            className={onThemeClick ? styles.clickableItem : ''}
            title="Click to list themes"
          >
            {themeDisplayName}
          </span>
        </div>
        <div className={styles.statusBarItem}>
          <span>👤</span> {/* Personality Icon */}
          <span
            onClick={onPersonalityClick}
            className={onPersonalityClick ? styles.clickableItem : ''}
            title="Click to edit personality"
          >
            {personalityName}
          </span>
        </div>
      </div>

      <div className={styles.statusBarSection}>
        <div className={styles.statusBarItem}>
          <span>💬</span> {/* LLM Icon */}
          <span
            onClick={onAIOptionsClick}
            className={`${styles.providerStatus} ${llmConfigured ? styles.configured : styles.notConfigured} ${onAIOptionsClick ? styles.clickableItem : ''}`}
            data-status={llmConfigured ? 'configured' : 'not-configured'}
            title={`LLM: ${activeLLM?.name || 'None'} - ${llmConfigured ? 'Ready' : 'Needs API Key'} - Click to configure AI options`}
          >
            {llmProviderId}
          </span>
        </div>
        <div className={styles.statusBarItem}>
          <span>📷</span> {/* Image Icon */}
           <span
            onClick={onImageProviderClick}
            className={`${styles.providerStatus} ${imageConfigured ? styles.configured : styles.notConfigured} ${onImageProviderClick ? styles.clickableItem : ''}`}
            data-status={imageConfigured ? 'configured' : 'not-configured'}
            title={`Image: ${activeImage?.name || 'None'} - ${imageConfigured ? 'Ready' : 'Needs API Key'} - Click to configure`}
          >
            {imageProviderId}
          </span>
        </div>
      </div>
      <div className={styles.statusBarSection}>
        <div className={styles.statusBarItem}>
          <span>⚙️</span> {/* Settings Icon */}
          <span
            onClick={onAppSettingsClick}
            className={onAppSettingsClick ? styles.clickableItem : ''}
            title="Click to open app settings"
          >
            Settings
          </span>
        </div>
        <div className={styles.statusBarItem}>
          <span>⌨️</span>
          <span 
            className={styles.shortcuts}
            title="Keyboard Shortcuts: ⌘K (Clear), ⌘/ (Help), ⌘⇧T (Themes), ⌘R (Retry), ⌘⇧N (New Chat)"
          >
            Shortcuts
          </span>
        </div>
        <div className={styles.statusBarItem}>
          <span>🧮</span> {/* Token Count Icon */}
          <span title={`Conversation tokens: ${conversationTokens}`}>
            {formatTokenCount(conversationTokens)}
          </span>
        </div>
        <div className={styles.statusBarItem}>
            <span>{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  );
};

export const StatusBar = React.memo(StatusBarComponent);
