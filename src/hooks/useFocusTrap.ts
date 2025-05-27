import { useEffect, useRef } from 'react';

interface FocusTrapOptions {
  /**
   * Whether the focus trap is active
   */
  isActive: boolean;
  
  /**
   * Element to focus when the trap activates
   */
  initialFocusRef?: React.RefObject<HTMLElement>;
  
  /**
   * Element to focus when the trap deactivates
   */
  returnFocusRef?: React.RefObject<HTMLElement>;
  
  /**
   * Called when user tries to escape (Escape key)
   */
  onEscape?: () => void;
  
  /**
   * Whether to allow focus to escape the trap (default: false)
   */
  allowEscape?: boolean;
}

/**
 * Custom hook for managing focus trapping in modals and other components
 */
export function useFocusTrap(options: FocusTrapOptions) {
  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  
  const {
    isActive,
    initialFocusRef,
    returnFocusRef,
    onEscape,
    allowEscape = false
  } = options;

  // Get all focusable elements within the container
  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      '[contenteditable="true"]'
    ];
    
    const elements = container.querySelectorAll(focusableSelectors.join(','));
    return Array.from(elements) as HTMLElement[];
  };

  // Handle Tab key navigation
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!containerRef.current || !isActive) return;

    // Handle Escape key
    if (event.key === 'Escape') {
      event.preventDefault();
      if (onEscape) {
        onEscape();
      }
      return;
    }

    // Handle Tab key
    if (event.key === 'Tab') {
      const focusableElements = getFocusableElements(containerRef.current);
      
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        // Shift + Tab (backwards)
        if (activeElement === firstElement || !containerRef.current.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab (forwards)
        if (activeElement === lastElement || !containerRef.current.contains(activeElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  // Handle focus events to maintain trap
  const handleFocusIn = (event: FocusEvent) => {
    if (!containerRef.current || !isActive || allowEscape) return;

    const target = event.target as HTMLElement;
    
    // Allow focus within the container
    if (containerRef.current.contains(target)) {
      return;
    }

    // Prevent focus from escaping
    event.preventDefault();
    
    const focusableElements = getFocusableElements(containerRef.current);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  };

  useEffect(() => {
    if (isActive) {
      // Store the previously focused element
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      
      // Focus initial element or first focusable element
      if (initialFocusRef?.current) {
        // Small delay to ensure the element is rendered
        setTimeout(() => {
          initialFocusRef.current?.focus();
        }, 10);
      } else if (containerRef.current) {
        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length > 0) {
          setTimeout(() => {
            focusableElements[0].focus();
          }, 10);
        }
      }

      // Add event listeners
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('focusin', handleFocusIn);

      return () => {
        // Remove event listeners
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('focusin', handleFocusIn);
        
        // Return focus to previous element
        const elementToFocus = returnFocusRef?.current || previousActiveElementRef.current;
        if (elementToFocus && document.body.contains(elementToFocus)) {
          elementToFocus.focus();
        }
      };
    }
  }, [isActive, initialFocusRef, returnFocusRef, onEscape, allowEscape]);

  return {
    containerRef,
    
    /**
     * Get the number of focusable elements in the container
     */
    getFocusableCount: () => {
      if (!containerRef.current) return 0;
      return getFocusableElements(containerRef.current).length;
    },
    
    /**
     * Manually focus the first focusable element
     */
    focusFirst: () => {
      if (!containerRef.current) return false;
      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
        return true;
      }
      return false;
    },
    
    /**
     * Manually focus the last focusable element
     */
    focusLast: () => {
      if (!containerRef.current) return false;
      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length > 0) {
        focusableElements[focusableElements.length - 1].focus();
        return true;
      }
      return false;
    }
  };
}