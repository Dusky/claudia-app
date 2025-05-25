import React, { useState, useEffect } from 'react';
import type { TerminalTheme } from '../terminal/themes';
import type { LLMProviderManager } from '../providers/llm/manager';
import type { ImageProviderManager } from '../providers/image/manager';
import type { StorageService } from '../storage/types';
import type { Personality } from '../types/personality';
import styles from './StatusBar.module.css';

interface StatusBarProps {
  theme: TerminalTheme;
  currentTheme: string; // ID of the current theme
  llmManager: LLMProviderManager;
  imageManager: ImageProviderManager;
  storage: StorageService;
  onThemeClick?: () => void;
  onPersonalityClick?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  theme,
  currentTheme, // This is the ID, e.g., "mainframe70s"
  llmManager,
  imageManager,
  storage,
  onThemeClick,
  onPersonalityClick,
}) => {
  const [activeLLM, setActiveLLM] = useState(llmManager.getActiveProvider());
  const [activeImage, setActiveImage] = useState(imageManager.getActiveProvider());
  const [activePersonality, setActivePersonality] = useState<Personality | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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

  const themeDisplayName = theme.name; // Use the full name from the theme object
  const llmProviderId = activeLLM?.id || 'N/A';
  const llmConfigured = activeLLM?.isConfigured() ?? false;
  const imageProviderId = activeImage?.id || 'N/A';
  const imageConfigured = activeImage?.isConfigured() ?? false;
  const personalityName = activePersonality?.name || 'Default';

  const themeClass = `theme-${theme.id}`; // For CSS module scoping if needed, or direct var use

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className={`${styles.statusBar} ${styles[themeClass]}`}>
      <div className={styles.statusBarSection}>
        <div className={styles.statusBarItem}>
          <span>🎨</span>
          <span 
            onClick={onThemeClick} 
            className={onThemeClick ? styles.clickableItem : ''}
            title="Click to list themes"
          >
            {themeDisplayName}
          </span>
        </div>
        <div className={styles.statusBarItem}>
          <span>🎭</span>
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
          <span>🤖</span>
          <span 
            className={`${styles.providerStatus} ${llmConfigured ? styles.configured : styles.notConfigured}`}
            title={`LLM: ${activeLLM?.name || 'None'} - ${llmConfigured ? 'Ready' : 'Needs API Key'}`}
          >
            {llmProviderId}
          </span>
        </div>
        <div className={styles.statusBarItem}>
          <span>🖼️</span>
           <span 
            className={`${styles.providerStatus} ${imageConfigured ? styles.configured : styles.notConfigured}`}
            title={`Image: ${activeImage?.name || 'None'} - ${imageConfigured ? 'Ready' : 'Needs API Key'}`}
          >
            {imageProviderId}
          </span>
        </div>
      </div>
      <div className={styles.statusBarSection}>
        <div className={styles.statusBarItem}>
            <span>{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  );
};
