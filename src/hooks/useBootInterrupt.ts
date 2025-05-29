import { useEffect, useCallback } from 'react';

interface UseBootInterruptOptions {
  onSkip: () => void;
  enabled: boolean;
}

export const useBootInterrupt = ({ onSkip, enabled }: UseBootInterruptOptions) => {
  const handleSkip = useCallback(() => {
    if (enabled) {
      onSkip();
    }
  }, [onSkip, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Check for reduced motion preference and auto-skip if enabled
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Auto-skip after a minimal delay for reduced motion users
      const autoSkipTimer = setTimeout(handleSkip, 100);
      return () => clearTimeout(autoSkipTimer);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        handleSkip();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      event.preventDefault();
      handleSkip();
    };

    const handleTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      handleSkip();
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [handleSkip, enabled]);

  return { handleSkip };
};