import React, { useState } from 'react';
import type { AvatarState } from '../avatar/types';
import type { TerminalTheme } from '../terminal/themes';
import styles from './AvatarPanel.module.css';

interface AvatarPanelProps {
  state: AvatarState;
  theme: TerminalTheme;
  className?: string;
}

export const AvatarPanel: React.FC<AvatarPanelProps> = ({ 
  state, 
  theme, 
  className 
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
    setHasImageError(false);
  };

  const handleImageError = () => {
    setHasImageError(true);
    setIsImageLoaded(false);
  };

  const getPanelTitle = () => {
    if (state.isGenerating) return 'Generating...';
    if (state.hasError) return 'Generation Failed';
    if (!state.visible || !state.imageUrl) return 'Claudia';
    return `Claudia - ${state.expression}`;
  };

  const getStatusIndicator = () => {
    if (state.isGenerating) return styles.statusGenerating;
    if (state.hasError) return styles.statusError;
    if (state.visible && state.imageUrl && isImageLoaded) return styles.statusActive;
    return styles.statusInactive;
  };

  return (
    <div 
      className={`${styles.avatarPanel} ${styles[theme.id] || ''} ${className || ''}`}
      style={{
        borderColor: theme.colors.foreground || '#333',
        backgroundColor: `${theme.colors.background}E6`, // Semi-transparent background
      }}
    >
      {/* Panel Header */}
      <div 
        className={styles.panelHeader}
        style={{
          borderBottomColor: theme.colors.foreground || '#333',
          color: theme.colors.foreground
        }}
      >
        <div className={styles.titleSection}>
          <span className={styles.panelTitle}>{getPanelTitle()}</span>
          <div className={`${styles.statusIndicator} ${getStatusIndicator()}`}></div>
        </div>
      </div>

      {/* Main Avatar Display Area */}
      <div className={styles.avatarContainer}>
        {/* Generation Loading State */}
        {state.isGenerating && (
          <div 
            className={styles.loadingState}
            style={{ color: theme.colors.accent || '#4fc3f7' }}
          >
            <div className={styles.loadingSpinner}></div>
            <div className={styles.loadingText}>Creating image...</div>
          </div>
        )}

        {/* Error State */}
        {state.hasError && !state.isGenerating && (
          <div 
            className={styles.errorState}
            style={{ color: '#ff6b6b' }}
            title={state.errorMessage || 'Image generation failed'}
          >
            <div className={styles.errorIcon}>!</div>
            <div className={styles.errorText}>
              {state.errorMessage || 'Generation failed'}
            </div>
          </div>
        )}

        {/* Image Loading State */}
        {state.imageUrl && !state.isGenerating && !isImageLoaded && !hasImageError && (
          <div 
            className={styles.imageLoadingState}
            style={{ color: theme.colors.foreground }}
          >
            <div className={styles.imageLoadingSpinner}></div>
            <div className={styles.imageLoadingText}>Loading image...</div>
          </div>
        )}

        {/* Actual Avatar Image */}
        {state.imageUrl && !state.isGenerating && (
          <img
            src={state.imageUrl}
            alt={`Claudia avatar - ${state.expression} expression`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={styles.avatarImage}
            style={{
              opacity: isImageLoaded ? (state.visible ? state.opacity : 0.3) : 0,
              filter: hasImageError ? 'grayscale(100%)' : 'none'
            }}
          />
        )}

        {/* Empty State */}
        {!state.imageUrl && !state.isGenerating && !state.hasError && (
          <div 
            className={styles.emptyState}
            style={{ color: theme.colors.foreground }}
          >
            <div className={styles.emptyIcon}>C</div>
            <div className={styles.emptyText}>Ready to chat</div>
          </div>
        )}
      </div>

      {/* Panel Footer with Avatar Info */}
      <div 
        className={styles.panelFooter}
        style={{
          borderTopColor: theme.colors.foreground || '#333',
          color: theme.colors.foreground
        }}
      >
        <div className={styles.avatarInfo}>
          {state.visible && state.imageUrl && isImageLoaded && (
            <>
              <span className={styles.infoItem}>
                {state.pose} pose
              </span>
              <span className={styles.infoSeparator}>•</span>
              <span className={styles.infoItem}>
                {state.action} action
              </span>
            </>
          )}
          {state.isGenerating && (
            <span className={styles.infoItem}>Processing request...</span>
          )}
          {!state.visible && !state.isGenerating && (
            <span className={styles.infoItem}>Ask me to show myself</span>
          )}
        </div>
      </div>
    </div>
  );
};