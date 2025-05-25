import React, { useEffect, useState } from 'react';
import { AvatarState, AvatarPosition } from './types';

interface AvatarDisplayProps {
  state: AvatarState;
  className?: string;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ state, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setError(false);
  }, [state.imageUrl]);

  if (!state.visible || !state.imageUrl) {
    return null;
  }

  const handleImageLoad = () => {
    setIsLoaded(true);
    setError(false);
  };

  const handleImageError = () => {
    setError(true);
    setIsLoaded(false);
  };

  const getPositionStyles = (position: AvatarPosition): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'fixed',
      zIndex: 1000,
      transition: 'all 0.5s ease-in-out',
      maxWidth: '200px',
      maxHeight: '200px',
      pointerEvents: 'none'
    };

    switch (position) {
      case 'center':
        return {
          ...baseStyles,
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${state.scale})`,
          maxWidth: '300px',
          maxHeight: '300px'
        };

      case 'top-left':
        return {
          ...baseStyles,
          top: '20px',
          left: '20px',
          transform: `scale(${state.scale})`
        };

      case 'top-right':
        return {
          ...baseStyles,
          top: '20px',
          right: '20px',
          transform: `scale(${state.scale})`
        };

      case 'bottom-left':
        return {
          ...baseStyles,
          bottom: '20px',
          left: '20px',
          transform: `scale(${state.scale})`
        };

      case 'bottom-right':
        return {
          ...baseStyles,
          bottom: '20px',
          right: '20px',
          transform: `scale(${state.scale})`
        };

      case 'beside-text':
        return {
          ...baseStyles,
          top: '50%',
          right: '40px',
          transform: `translateY(-50%) scale(${state.scale})`,
          maxWidth: '150px',
          maxHeight: '150px'
        };

      case 'overlay-left':
        return {
          ...baseStyles,
          top: '30%',
          left: '10px',
          transform: `translateY(-50%) scale(${state.scale})`,
          maxWidth: '180px',
          maxHeight: '180px'
        };

      case 'overlay-right':
        return {
          ...baseStyles,
          top: '30%',
          right: '10px',
          transform: `translateY(-50%) scale(${state.scale})`,
          maxWidth: '180px',
          maxHeight: '180px'
        };

      case 'floating':
        return {
          ...baseStyles,
          top: '20%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${state.scale})`,
          animation: 'float 3s ease-in-out infinite'
        };

      case 'peeking':
        return {
          ...baseStyles,
          bottom: '-50px',
          right: '20px',
          transform: `scale(${state.scale})`,
          maxWidth: '120px',
          maxHeight: '120px'
        };

      default:
        return baseStyles;
    }
  };

  const getAnimationClass = () => {
    let animationClass = '';
    
    if (state.isAnimating) {
      animationClass += ' avatar-entering';
    }

    // Add gesture-specific animations
    if (state.gesture) {
      animationClass += ` avatar-gesture-${state.gesture}`;
    }

    // Add action-specific animations
    if (state.action && state.action !== 'idle') {
      animationClass += ` avatar-action-${state.action}`;
    }

    return animationClass;
  };

  return (
    <>
      <div
        className={`avatar-container ${className || ''} ${getAnimationClass()}`}
        style={{
          ...getPositionStyles(state.position),
          opacity: isLoaded ? state.opacity : 0
        }}
      >
        {/* Loading placeholder */}
        {!isLoaded && !error && (
          <div 
            className="avatar-loading"
            style={{
              width: '100px',
              height: '100px',
              background: 'rgba(0, 255, 255, 0.1)',
              border: '2px dashed rgba(0, 255, 255, 0.5)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(0, 255, 255, 0.8)',
              fontSize: '12px',
              animation: 'pulse 2s infinite'
            }}
          >
            Loading...
          </div>
        )}

        {/* Error placeholder */}
        {error && (
          <div 
            className="avatar-error"
            style={{
              width: '100px',
              height: '100px',
              background: 'rgba(255, 0, 0, 0.1)',
              border: '2px dashed rgba(255, 0, 0, 0.5)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 0, 0, 0.8)',
              fontSize: '12px'
            }}
          >
            Error
          </div>
        )}

        {/* Actual avatar image */}
        <img
          src={state.imageUrl}
          alt={`Claudia - ${state.expression} ${state.pose}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: '8px',
            filter: 'drop-shadow(0 0 20px rgba(0, 255, 255, 0.3))',
            display: isLoaded ? 'block' : 'none'
          }}
        />

        {/* Expression indicator */}
        {isLoaded && (
          <div
            className="avatar-expression-indicator"
            style={{
              position: 'absolute',
              bottom: '-20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'rgba(0, 255, 255, 0.9)',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '10px',
              fontFamily: 'monospace',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              opacity: 0.7
            }}
          >
            {state.expression}
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) scale(${state.scale}) translateY(0px); }
          50% { transform: translate(-50%, -50%) scale(${state.scale}) translateY(-10px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }

        .avatar-entering {
          animation: avatarEnter 0.5s ease-out;
        }

        @keyframes avatarEnter {
          0% { 
            opacity: 0; 
            transform: scale(0.5);
          }
          100% { 
            opacity: ${state.opacity}; 
            transform: scale(${state.scale});
          }
        }

        /* Gesture animations */
        .avatar-gesture-wave {
          animation: wave 1s ease-in-out;
        }

        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
        }

        .avatar-gesture-point-down {
          animation: pointDown 0.5s ease-out;
        }

        @keyframes pointDown {
          0% { transform: translateY(0); }
          50% { transform: translateY(10px); }
          100% { transform: translateY(0); }
        }

        .avatar-gesture-thumbs-up {
          animation: thumbsUp 0.8s ease-out;
        }

        @keyframes thumbsUp {
          0% { transform: scale(${state.scale}); }
          50% { transform: scale(${state.scale * 1.1}); }
          100% { transform: scale(${state.scale}); }
        }

        /* Action animations */
        .avatar-action-type {
          animation: typing 1.5s ease-in-out infinite;
        }

        @keyframes typing {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .avatar-action-think {
          animation: thinking 2s ease-in-out infinite;
        }

        @keyframes thinking {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 20px rgba(0, 255, 255, 0.3)); }
          50% { filter: brightness(1.1) drop-shadow(0 0 25px rgba(0, 255, 255, 0.5)); }
        }

        .avatar-action-nod {
          animation: nod 1s ease-in-out;
        }

        @keyframes nod {
          0%, 100% { transform: rotateX(0deg); }
          50% { transform: rotateX(15deg); }
        }

        /* Hover effects */
        .avatar-container:hover {
          filter: brightness(1.1) contrast(1.1);
        }
      `}</style>
    </>
  );
};