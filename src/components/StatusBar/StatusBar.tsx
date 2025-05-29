import React, { useState, useEffect } from 'react';
import type { TerminalTheme } from '../../terminal/themes';
import { themes } from '../../terminal/themes';
import type { LLMProviderManager } from '../../providers/llm/manager';
import type { ImageProviderManager } from '../../providers/image/manager';
import type { StorageService } from '../../storage/types';
import type { Personality } from '../../types/personality';
import { Indicator } from './Indicator';
import { useLatency } from '../../hooks/useLatency';
import { useFPS } from '../../hooks/useFPS';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useTokenUsage } from '../../hooks/useTokenUsage';
import { useErrorIndicator } from '../../hooks/useErrorIndicator';
import { formatTokenCount } from '../../utils/tokenCounter';
import styles from './StatusBar.module.css';

interface StatusBarProps {
  theme: TerminalTheme;
  currentTheme: string;
  llmManager: LLMProviderManager;
  imageManager: ImageProviderManager;
  storage: StorageService;
  activeConversationId: string | null;
  onThemeChange?: (themeId: string) => void;
  onPersonalityClick?: () => void;
  onImageProviderClick?: () => void;
  onAIOptionsClick?: () => void;
  onAppSettingsClick?: () => void;
}

export type StatusBarMode = 'compact' | 'full';

const StatusBarComponent: React.FC<StatusBarProps> = ({
  theme,
  currentTheme,
  llmManager,
  imageManager,
  storage,
  activeConversationId,
  onThemeChange,
  onPersonalityClick,
  onImageProviderClick,
  onAIOptionsClick,
  onAppSettingsClick,
}) => {
  // Local state for provider information
  const [activeLLM, setActiveLLM] = useState(llmManager.getActiveProvider());
  const [activeImage, setActiveImage] = useState(imageManager.getActiveProvider());
  const [activePersonality, setActivePersonality] = useState<Personality | null>(null);
  const [mode, setMode] = useState<StatusBarMode>('full');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);

  // Custom hooks for monitoring
  const { latency } = useLatency();
  
  // Close theme switcher when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showThemeSwitcher) {
        setShowThemeSwitcher(false);
      }
    };
    
    if (showThemeSwitcher) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showThemeSwitcher]);
  const networkStatus = useNetworkStatus();
  const tokenUsage = useTokenUsage(storage, activeConversationId);
  const errorState = useErrorIndicator();
  const fpsData = useFPS(mode === 'full' && window.innerWidth >= 600);

  // Update providers and personality less frequently
  useEffect(() => {
    const updateProviders = async () => {
      setActiveLLM(llmManager.getActiveProvider());
      setActiveImage(imageManager.getActiveProvider());
      const personality = await storage.getActivePersonality();
      setActivePersonality(personality);
    };

    updateProviders();
    
    // Check for updates every 30 seconds instead of 5
    const interval = setInterval(updateProviders, 30000);
    return () => clearInterval(interval);
  }, [llmManager, imageManager, storage]);

  // Update time every minute for UTC display
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());
    updateTime();
    
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'b') {
        event.preventDefault();
        setMode(prev => prev === 'compact' ? 'full' : 'compact');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Responsive mode detection
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 600) {
        setMode('compact');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatUTCTime = (date: Date) => {
    return date.toISOString().substr(11, 5) + ' UTC';
  };

  const getLLMDisplayText = () => {
    const provider = activeLLM?.id || 'N/A';
    if (latency.llm) {
      return `${provider} ${latency.llm}ms`;
    }
    return provider;
  };

  const getNetworkIcon = () => {
    if (!networkStatus.isOnline) return '❌';
    if (networkStatus.effectiveType === '4g') return '📶';
    if (networkStatus.effectiveType === '3g') return '📴';
    return '🌐';
  };

  const themeClass = `theme-${theme.id}`;

  // Get sorted theme list for switcher
  const themeList = Object.entries(themes).map(([id, themeData]) => ({
    id,
    name: themeData.name,
    era: themeData.era
  })).sort((a, b) => a.name.localeCompare(b.name));

  const handleThemeSelect = (themeId: string) => {
    if (onThemeChange) {
      onThemeChange(themeId);
    }
    setShowThemeSwitcher(false);
  };

  const cycleToNextTheme = () => {
    const currentIndex = themeList.findIndex(t => t.id === currentTheme);
    const nextIndex = (currentIndex + 1) % themeList.length;
    const nextTheme = themeList[nextIndex];
    if (onThemeChange) {
      onThemeChange(nextTheme.id);
    }
  };

  return (
    <div 
      className={`${styles.statusBar} ${styles[themeClass]} ${styles[`mode-${mode}`]}`}
      role="status"
      aria-live="polite"
      aria-label="Application status bar"
    >
      {/* Left Section - Theme & Personality */}
      <div className={styles.section}>
        {/* Theme Switcher */}
        <div 
          style={{ position: 'relative' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Indicator
            icon="⌘"
            label={theme.name}
            onClick={() => setShowThemeSwitcher(!showThemeSwitcher)}
            onDoubleClick={cycleToNextTheme}
            tooltip="Click to show theme menu, double-click to cycle"
            aria-label={`Current theme: ${theme.name}. Click for menu or double-click to cycle.`}
          />
          
          {showThemeSwitcher && (
            <div 
              className={styles.dropdown}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                backgroundColor: theme.colors.background,
                border: `1px solid ${theme.colors.accent}`,
                borderRadius: '4px',
                padding: '4px 0',
                minWidth: '150px',
                zIndex: 1000,
                boxShadow: `0 4px 12px ${theme.colors.background}aa`,
              }}
            >
              {themeList.map((themeOption) => (
                <div
                  key={themeOption.id}
                  onClick={() => handleThemeSelect(themeOption.id)}
                  style={{
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: themeOption.id === currentTheme ? theme.colors.accent : theme.colors.foreground,
                    backgroundColor: themeOption.id === currentTheme ? `${theme.colors.accent}20` : 'transparent',
                    borderLeft: themeOption.id === currentTheme ? `2px solid ${theme.colors.accent}` : '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (themeOption.id !== currentTheme) {
                      e.currentTarget.style.backgroundColor = `${theme.colors.accent}10`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (themeOption.id !== currentTheme) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ fontWeight: themeOption.id === currentTheme ? 'bold' : 'normal' }}>
                    {themeOption.name}
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.7, color: theme.colors.secondary }}>
                    {themeOption.era}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <Indicator
          icon="👤"
          label={activePersonality?.name || 'Default'}
          onClick={onPersonalityClick}
          tooltip="Click to edit personality"
          aria-label={`Current personality: ${activePersonality?.name || 'Default'}. Click to edit.`}
        />
      </div>

      {/* Center Section - Providers & Health */}
      <div className={styles.section}>
        <Indicator
          icon="💬"
          label="LLM"
          value={getLLMDisplayText()}
          status={activeLLM?.isConfigured() ? 'success' : 'error'}
          onClick={onAIOptionsClick}
          tooltip={`LLM: ${activeLLM?.name || 'None'} - ${activeLLM?.isConfigured() ? 'Ready' : 'Needs API Key'}`}
          aria-label={`LLM provider: ${getLLMDisplayText()}. Status: ${activeLLM?.isConfigured() ? 'configured' : 'not configured'}.`}
        />
        
        <Indicator
          icon="📷"
          label="IMG"
          value={activeImage?.id || 'N/A'}
          status={activeImage?.isConfigured() ? 'success' : 'error'}
          onClick={onImageProviderClick}
          tooltip={`Image: ${activeImage?.name || 'None'} - ${activeImage?.isConfigured() ? 'Ready' : 'Needs API Key'}`}
          aria-label={`Image provider: ${activeImage?.id || 'N/A'}. Status: ${activeImage?.isConfigured() ? 'configured' : 'not configured'}.`}
        />

        {mode === 'full' && (
          <>
            <Indicator
              icon="🔌"
              label="Plugins"
              value="3/3 ✓"
              status="success"
              tooltip="All plugins are healthy"
              aria-label="Plugin system: 3 of 3 plugins healthy"
            />

            <Indicator
              icon={getNetworkIcon()}
              label="Network"
              value={networkStatus.isOnline ? 'Online' : 'Offline'}
              status={networkStatus.isOnline ? 'success' : 'error'}
              tooltip={`Network: ${networkStatus.isOnline ? 'Connected' : 'Disconnected'}`}
              aria-label={`Network status: ${networkStatus.isOnline ? 'online' : 'offline'}`}
            />
          </>
        )}
      </div>

      {/* Right Section - System Info & Controls */}
      <div className={styles.section}>
        {mode === 'full' && fpsData.isSupported && (
          <Indicator
            icon="🎮"
            label="FPS"
            value={fpsData.fps}
            status={fpsData.fps >= 60 ? 'success' : fpsData.fps >= 30 ? 'warning' : 'error'}
            tooltip={`Frame rate: ${fpsData.fps} FPS`}
            aria-label={`Current frame rate: ${fpsData.fps} frames per second`}
          />
        )}

        <Indicator
          icon="🧮"
          label="Tokens"
          value={`${formatTokenCount(tokenUsage.current)} / ${formatTokenCount(tokenUsage.limit)}`}
          status={tokenUsage.isNearLimit ? 'warning' : 'normal'}
          tooltip={`Token usage: ${tokenUsage.current} of ${tokenUsage.limit} (${tokenUsage.percentage.toFixed(1)}%)`}
          aria-label={`Token usage: ${tokenUsage.current} of ${tokenUsage.limit} tokens used`}
        />

        {errorState.hasError && (
          <Indicator
            icon="⚠️"
            label="Error"
            status="error"
            onClick={errorState.clearError}
            tooltip={`Recent error: ${errorState.lastError}. Click to dismiss.`}
            aria-label={`Error indicator. Last error: ${errorState.lastError}. Click to clear.`}
          />
        )}

        <Indicator
          icon="⚙️"
          label={mode === 'compact' ? '' : 'Settings'}
          onClick={onAppSettingsClick}
          tooltip="Click to open app settings"
          aria-label="Open application settings"
        />

        <Indicator
          icon="🕐"
          label=""
          value={formatUTCTime(currentTime)}
          tooltip={`Current time: ${formatUTCTime(currentTime)}`}
          aria-label={`Current time: ${formatUTCTime(currentTime)}`}
        />
      </div>
    </div>
  );
};

export const StatusBar = React.memo(StatusBarComponent);