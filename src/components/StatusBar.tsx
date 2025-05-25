import React, { useState, useEffect } from 'react';
import type { TerminalTheme } from '../terminal/themes';
import type { LLMProviderManager } from '../providers/llm/manager';
import type { ImageProviderManager } from '../providers/image/manager';
import type { MockDatabase } from '../storage/mockDatabase';
import './StatusBar.css';

interface StatusBarProps {
  theme: TerminalTheme;
  currentTheme: string;
  llmManager: LLMProviderManager;
  imageManager: ImageProviderManager;
  storage: MockDatabase;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  theme,
  currentTheme,
  llmManager,
  imageManager,
  storage
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Get current system status
  const activePersonality = storage.getActivePersonality();
  const activeLLMProvider = llmManager.getActiveProvider();
  const activeImageProvider = imageManager.getActiveProvider();

  const getProviderStatus = (provider: any, type: 'AI' | 'IMG') => {
    if (!provider) {
      return { status: 'offline', name: 'None', icon: '○' };
    }

    const isConfigured = provider.isConfigured();
    const providerName = provider.name || 'Unknown';
    
    if (type === 'AI') {
      if (providerName.toLowerCase().includes('anthropic')) {
        return { 
          status: isConfigured ? 'online' : 'config', 
          name: 'Claude', 
          icon: isConfigured ? '●' : '△' 
        };
      }
      if (providerName.toLowerCase().includes('google')) {
        return { 
          status: isConfigured ? 'online' : 'config', 
          name: 'Gemini', 
          icon: isConfigured ? '●' : '△' 
        };
      }
      if (providerName.toLowerCase().includes('local')) {
        return { 
          status: isConfigured ? 'online' : 'config', 
          name: 'Local', 
          icon: isConfigured ? '●' : '△' 
        };
      }
    } else {
      if (providerName.toLowerCase().includes('replicate')) {
        return { 
          status: isConfigured ? 'online' : 'config', 
          name: 'Replicate', 
          icon: isConfigured ? '●' : '△' 
        };
      }
    }

    return { 
      status: isConfigured ? 'online' : 'config', 
      name: providerName, 
      icon: isConfigured ? '●' : '△' 
    };
  };

  const llmStatus = getProviderStatus(activeLLMProvider, 'AI');
  const imageStatus = getProviderStatus(activeImageProvider, 'IMG');

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return theme.colors.success || theme.colors.accent;
      case 'config': return theme.colors.warning || '#ffaa00';
      case 'offline': return theme.colors.error || '#ff4444';
      default: return theme.colors.foreground;
    }
  };

  return (
    <div 
      className="status-bar"
      data-theme={theme.id}
      style={{
        backgroundColor: theme.colors.background,
        borderTop: `1px solid ${theme.colors.accent}40`,
        color: theme.colors.foreground,
        fontFamily: theme.font.family,
        fontSize: '0.85rem',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        ...(theme.effects.glow && {
          boxShadow: `0 -2px 20px ${theme.colors.accent}20`
        })
      }}
    >
      {/* Left section - System info */}
      <div className="status-left" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        {/* Theme indicator */}
        <div className="status-item theme-info">
          <span style={{ color: theme.colors.accent }}>◈</span>
          <span style={{ marginLeft: '6px', textTransform: 'capitalize' }}>
            {currentTheme.replace(/([A-Z])/g, ' $1').trim()}
          </span>
        </div>

        {/* Personality indicator */}
        <div className="status-item personality-info">
          <span style={{ color: theme.colors.accent }}>☰</span>
          <span style={{ marginLeft: '6px' }}>
            {activePersonality?.name || 'No Personality'}
          </span>
        </div>
      </div>

      {/* Center section - Provider status */}
      <div className="status-center" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {/* AI Provider */}
        <div className="status-item provider-ai">
          <span>{llmStatus.icon}</span>
          <span 
            style={{ 
              marginLeft: '4px',
              color: getStatusColor(llmStatus.status)
            }}
          >
            {llmStatus.name}
          </span>
        </div>

        {/* Image Provider */}
        <div className="status-item provider-img">
          <span>{imageStatus.icon}</span>
          <span 
            style={{ 
              marginLeft: '4px',
              color: getStatusColor(imageStatus.status)
            }}
          >
            {imageStatus.name}
          </span>
        </div>
      </div>

      {/* Right section - System status */}
      <div className="status-right" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {/* Connection status */}
        <div className="status-item connection-status">
          <span style={{ color: theme.colors.success || theme.colors.accent }}>●</span>
          <span style={{ marginLeft: '4px', fontSize: '0.8rem' }}>ONLINE</span>
        </div>

        {/* Current time */}
        <div className="status-item time-info">
          <span style={{ color: theme.colors.accent }}>⧖</span>
          <span style={{ marginLeft: '6px', fontFamily: 'monospace' }}>
            {formatTime(currentTime)}
          </span>
        </div>
      </div>
    </div>
  );
};