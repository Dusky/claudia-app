import React, { useState, useEffect, useRef } from 'react';
import type { AvatarState } from '../avatar/types';
import type { TerminalTheme } from '../terminal/themes';
import { useMemoryManager } from '../utils/memoryManager';

interface SystemTrayAvatarProps {
  state: AvatarState;
  theme: TerminalTheme;
  onClick?: () => void;
  className?: string;
}

export const SystemTrayAvatar: React.FC<SystemTrayAvatarProps> = ({ 
  state, 
  theme, 
  onClick,
  className = ''
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const memoryManager = useMemoryManager('SystemTrayAvatar');
  const previousImageUrl = useRef<string | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();

  // Cleanup previous image URL when state changes
  useEffect(() => {
    if (previousImageUrl.current && previousImageUrl.current !== state.imageUrl) {
      // Only revoke if it's a blob URL we created
      if (previousImageUrl.current.startsWith('blob:')) {
        memoryManager.revokeObjectURL(previousImageUrl.current);
      }
    }
    previousImageUrl.current = state.imageUrl || null;
  }, [state.imageUrl, memoryManager]);

  // Trigger animation when expression or action changes
  useEffect(() => {
    if (state.visible && (state.expression !== 'neutral' || state.action !== 'idle')) {
      setIsAnimating(true);
      
      // Clear existing timeout
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      // Reset animation after 2 seconds
      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
      }, 2000);
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [state.expression, state.action, state.visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previousImageUrl.current && previousImageUrl.current.startsWith('blob:')) {
        memoryManager.revokeObjectURL(previousImageUrl.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [memoryManager]);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
    setHasImageError(false);
  };

  const handleImageError = () => {
    console.warn('🚨 SystemTrayAvatar: Failed to load avatar image:', state.imageUrl);
    setHasImageError(true);
    setIsImageLoaded(false);
  };

  // Don't render if not visible
  if (!state.visible) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    border: `1px solid ${theme.colors.accent}40`,
    backgroundColor: `${theme.colors.background}80`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    // Add theme-based effects
    boxShadow: theme.effects.glow 
      ? `0 0 4px ${theme.colors.accent}60, inset 0 0 4px ${theme.colors.accent}20`
      : `0 1px 3px ${theme.colors.background}40`,
    // Animation effects
    transform: isAnimating ? 'scale(1.1)' : 'scale(1)',
    filter: isAnimating ? 'brightness(1.2)' : 'brightness(1)',
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
    opacity: isImageLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease',
    // Apply theme-consistent filtering for retro look
    filter: theme.effects.glow 
      ? 'contrast(1.1) brightness(0.9)' 
      : 'none',
  };

  const placeholderStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}10`,
    borderRadius: '50%',
  };

  const pulseKeyframes = `
    @keyframes systemTrayPulse {
      0%, 100% { 
        box-shadow: 0 0 4px ${theme.colors.accent}60, inset 0 0 4px ${theme.colors.accent}20;
      }
      50% { 
        box-shadow: 0 0 8px ${theme.colors.accent}80, inset 0 0 6px ${theme.colors.accent}40;
      }
    }
  `;

  return (
    <>
      <style>{pulseKeyframes}</style>
      <div 
        className={className}
        style={{
          ...containerStyle,
          animation: isAnimating ? 'systemTrayPulse 1s ease-in-out' : 'none',
        }}
        onClick={onClick}
        title={`System Avatar: ${state.expression} (${state.action})`}
        role={onClick ? 'button' : 'img'}
        aria-label={`System avatar showing ${state.expression} expression performing ${state.action} action`}
      >
        {state.imageUrl && !hasImageError ? (
          <img
            src={state.imageUrl}
            alt={`Avatar in ${state.expression} mood`}
            style={imageStyle}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div style={placeholderStyle}>
            {state.expression === 'happy' ? '😊' : 
             state.expression === 'thinking' ? '🤔' :
             state.expression === 'curious' ? '🧐' :
             state.expression === 'surprised' ? '😮' :
             state.expression === 'confused' ? '😕' :
             state.expression === 'excited' ? '🤩' :
             state.expression === 'sleepy' ? '😴' :
             state.expression === 'shocked' ? '😱' :
             '🤖'}
          </div>
        )}
        
        {/* Activity indicator dot */}
        {(state.action !== 'idle' || isAnimating) && (
          <div
            style={{
              position: 'absolute',
              top: '0px',
              right: '0px',
              width: '6px',
              height: '6px',
              backgroundColor: theme.colors.accent,
              borderRadius: '50%',
              border: `1px solid ${theme.colors.background}`,
              animation: 'systemTrayPulse 1.5s ease-in-out infinite',
            }}
          />
        )}
      </div>
    </>
  );
};

export default SystemTrayAvatar;