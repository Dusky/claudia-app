import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { AvatarState } from '../avatar/types';
import type { TerminalTheme } from '../terminal/themes';
import { useMemoryManager } from '../utils/memoryManager';

type AvatarPosition = 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right'
  | 'floating-left'
  | 'floating-right'
  | 'center-overlay'
  | 'peek-left'
  | 'peek-right'
  | 'peek-bottom';

interface TerminalAvatarPanelProps {
  state: AvatarState;
  theme: TerminalTheme;
  className?: string;
}

export const TerminalAvatarPanel: React.FC<TerminalAvatarPanelProps> = ({ 
  state, 
  theme, 
  className 
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [position, setPosition] = useState<AvatarPosition>('bottom-right');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [speechText, setSpeechText] = useState('');
  
  const memoryManager = useMemoryManager('TerminalAvatarPanel');
  const previousImageUrl = useRef<string | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  const speechTimeoutRef = useRef<NodeJS.Timeout>();

  // Cleanup previous image URL when state changes
  useEffect(() => {
    if (previousImageUrl.current && previousImageUrl.current !== state.imageUrl) {
      if (previousImageUrl.current.startsWith('blob:')) {
        memoryManager.revokeObjectURL(previousImageUrl.current);
      }
    }
    previousImageUrl.current = state.imageUrl || null;
  }, [state.imageUrl, memoryManager]);

  // Handle expression and action changes with animations
  useEffect(() => {
    if (state.visible && (state.expression !== 'neutral' || state.action !== 'idle')) {
      setIsAnimating(true);
      
      // Show contextual speech based on action
      if (state.action === 'wave') {
        setSpeechText('Hello there!');
        setShowSpeechBubble(true);
      } else if (state.action === 'think') {
        setSpeechText('Let me think...');
        setShowSpeechBubble(true);
      } else if (state.expression === 'excited') {
        setSpeechText('This is interesting!');
        setShowSpeechBubble(true);
      } else if (state.expression === 'confused') {
        setSpeechText('Hmm, not sure about that...');
        setShowSpeechBubble(true);
      }
      
      // Clear existing timeouts
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      
      // Reset animation after 3 seconds
      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
      }, 3000);
      
      // Hide speech bubble after 4 seconds
      if (showSpeechBubble) {
        speechTimeoutRef.current = setTimeout(() => {
          setShowSpeechBubble(false);
          setSpeechText('');
        }, 4000);
      }
    }
  }, [state.expression, state.action, state.visible, showSpeechBubble]);

  // Dynamic positioning based on activity or context
  useEffect(() => {
    // Change position based on avatar state
    if (state.action === 'search') {
      setPosition('top-right');
    } else if (state.action === 'think') {
      setPosition('floating-left');
    } else if (state.expression === 'curious') {
      setPosition('peek-left');
    } else if (state.expression === 'excited') {
      setPosition('center-overlay');
    } else {
      setPosition('bottom-right'); // Default
    }
  }, [state.action, state.expression]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previousImageUrl.current && previousImageUrl.current.startsWith('blob:')) {
        memoryManager.revokeObjectURL(previousImageUrl.current);
      }
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    };
  }, [memoryManager]);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
    setHasImageError(false);
  };

  const handleImageError = () => {
    console.warn('🚨 TerminalAvatarPanel: Failed to load avatar image:', state.imageUrl);
    setHasImageError(true);
    setIsImageLoaded(false);
  };

  // Dynamic styling based on position
  const containerStyle = useMemo((): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 1000,
      pointerEvents: 'none',
      transition: 'all 0.5s ease-in-out',
      transformOrigin: 'center',
    };

    const size = position.includes('peek') ? '80px' : 
                 position === 'center-overlay' ? '120px' : '100px';

    // Position-specific styles
    switch (position) {
      case 'top-left':
        return {
          ...baseStyle,
          top: '20px',
          left: '20px',
          width: size,
          height: size,
        };
      case 'top-right':
        return {
          ...baseStyle,
          top: '20px',
          right: '20px',
          width: size,
          height: size,
        };
      case 'bottom-left':
        return {
          ...baseStyle,
          bottom: '20px',
          left: '20px',
          width: size,
          height: size,
        };
      case 'bottom-right':
        return {
          ...baseStyle,
          bottom: '20px',
          right: '20px',
          width: size,
          height: size,
        };
      case 'floating-left':
        return {
          ...baseStyle,
          top: '50%',
          left: '20px',
          transform: `translateY(-50%) ${isAnimating ? 'scale(1.1)' : 'scale(1)'}`,
          width: size,
          height: size,
        };
      case 'floating-right':
        return {
          ...baseStyle,
          top: '50%',
          right: '20px',
          transform: `translateY(-50%) ${isAnimating ? 'scale(1.1)' : 'scale(1)'}`,
          width: size,
          height: size,
        };
      case 'center-overlay':
        return {
          ...baseStyle,
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) ${isAnimating ? 'scale(1.2) rotate(5deg)' : 'scale(1)'}`,
          width: size,
          height: size,
          zIndex: 1100,
        };
      case 'peek-left':
        return {
          ...baseStyle,
          top: '50%',
          left: position === 'peek-left' ? '-40px' : '-40px',
          transform: `translateY(-50%) ${isAnimating ? 'translateX(20px)' : 'translateX(0)'}`,
          width: size,
          height: size,
        };
      case 'peek-right':
        return {
          ...baseStyle,
          top: '50%',
          right: '-40px',
          transform: `translateY(-50%) ${isAnimating ? 'translateX(-20px)' : 'translateX(0)'}`,
          width: size,
          height: size,
        };
      case 'peek-bottom':
        return {
          ...baseStyle,
          bottom: '-40px',
          left: '50%',
          transform: `translateX(-50%) ${isAnimating ? 'translateY(-20px)' : 'translateY(0)'}`,
          width: size,
          height: size,
        };
      default:
        return {
          ...baseStyle,
          bottom: '20px',
          right: '20px',
          width: size,
          height: size,
        };
    }
  }, [position, isAnimating]);

  const avatarStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: `2px solid ${theme.colors.accent}60`,
    backgroundColor: `${theme.colors.background}90`,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
    boxShadow: theme.effects.glow 
      ? `0 0 20px ${theme.colors.accent}40, inset 0 0 20px ${theme.colors.accent}20`
      : `0 4px 12px ${theme.colors.background}60`,
    animation: isAnimating ? 'avatarPulse 2s ease-in-out' : 'avatarIdle 4s ease-in-out infinite',
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
    opacity: isImageLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease',
    filter: theme.effects.glow 
      ? 'contrast(1.1) brightness(0.9) saturate(1.2)' 
      : 'none',
  };

  const speechBubbleStyle: React.CSSProperties = {
    position: 'absolute',
    background: `${theme.colors.background}f0`,
    border: `1px solid ${theme.colors.accent}80`,
    borderRadius: '12px',
    padding: '8px 12px',
    fontSize: '12px',
    color: theme.colors.foreground,
    whiteSpace: 'nowrap',
    boxShadow: `0 4px 12px ${theme.colors.background}80`,
    // Position bubble based on avatar position
    ...(position.includes('right') 
      ? { right: '110%', top: '50%', transform: 'translateY(-50%)' }
      : { left: '110%', top: '50%', transform: 'translateY(-50%)' }
    ),
    opacity: showSpeechBubble ? 1 : 0,
    transition: 'opacity 0.3s ease',
    pointerEvents: 'auto',
  };

  // Don't render if not visible
  if (!state.visible) {
    return null;
  }

  const keyframes = `
    @keyframes avatarPulse {
      0%, 100% { 
        transform: scale(1);
        filter: brightness(1);
      }
      50% { 
        transform: scale(1.05);
        filter: brightness(1.2);
      }
    }
    
    @keyframes avatarIdle {
      0%, 100% { 
        transform: scale(1) translateY(0px);
      }
      50% { 
        transform: scale(1.02) translateY(-2px);
      }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>
      <div 
        className={className}
        style={containerStyle}
      >
        <div style={avatarStyle}>
          {state.imageUrl && !hasImageError ? (
            <img
              src={state.imageUrl}
              alt={`Claudia in ${state.expression} mood`}
              style={imageStyle}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            <div style={{
              fontSize: '24px',
              color: theme.colors.accent,
            }}>
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
          
          {/* Speech Bubble */}
          {showSpeechBubble && speechText && (
            <div style={speechBubbleStyle}>
              {speechText}
              {/* Speech bubble tail */}
              <div style={{
                position: 'absolute',
                ...(position.includes('right') 
                  ? { left: '100%', top: '50%', transform: 'translateY(-50%)' }
                  : { right: '100%', top: '50%', transform: 'translateY(-50%)' }
                ),
                width: 0,
                height: 0,
                borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent',
                ...(position.includes('right')
                  ? { borderLeft: `6px solid ${theme.colors.accent}80` }
                  : { borderRight: `6px solid ${theme.colors.accent}80` }
                ),
              }} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TerminalAvatarPanel;