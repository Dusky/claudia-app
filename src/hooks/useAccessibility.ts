import { useState, useEffect } from 'react';

interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  largeFonts: boolean;
}

const ACCESSIBILITY_STORAGE_KEY = 'claudia-accessibility-settings';

const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  largeFonts: false
};

/**
 * Hook for managing accessibility preferences
 */
export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Initialize from localStorage and system preferences
    try {
      const stored = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
      const storedSettings = stored ? JSON.parse(stored) : {};
      
      // Detect system preferences
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      return {
        ...DEFAULT_ACCESSIBILITY_SETTINGS,
        ...storedSettings,
        // Override with system preferences if not explicitly set
        reducedMotion: storedSettings.reducedMotion ?? prefersReducedMotion,
        highContrast: storedSettings.highContrast ?? prefersHighContrast
      };
    } catch (error) {
      console.warn('Failed to load accessibility settings:', error);
      return DEFAULT_ACCESSIBILITY_SETTINGS;
    }
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save accessibility settings:', error);
    }
  }, [settings]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQueries = [
      { query: '(prefers-reduced-motion: reduce)', key: 'reducedMotion' as const },
      { query: '(prefers-contrast: high)', key: 'highContrast' as const }
    ];

    const listeners: Array<() => void> = [];

    mediaQueries.forEach(({ query, key }) => {
      const mediaQuery = window.matchMedia(query);
      
      const listener = (e: MediaQueryListEvent) => {
        // Only update if user hasn't explicitly set this preference
        const stored = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
        const storedSettings = stored ? JSON.parse(stored) : {};
        
        if (storedSettings[key] === undefined) {
          setSettings(prev => ({
            ...prev,
            [key]: e.matches
          }));
        }
      };

      mediaQuery.addEventListener('change', listener);
      listeners.push(() => mediaQuery.removeEventListener('change', listener));
    });

    return () => {
      listeners.forEach(cleanup => cleanup());
    };
  }, []);

  // Apply accessibility classes to body
  useEffect(() => {
    const classes = [];
    
    if (settings.highContrast) {
      classes.push('high-contrast');
    }
    
    if (settings.reducedMotion) {
      classes.push('reduced-motion');
    }
    
    if (settings.largeFonts) {
      classes.push('large-fonts');
    }

    // Remove existing accessibility classes
    document.body.classList.remove('high-contrast', 'reduced-motion', 'large-fonts');
    
    // Add current classes
    if (classes.length > 0) {
      document.body.classList.add(...classes);
    }

    return () => {
      // Cleanup on unmount
      document.body.classList.remove('high-contrast', 'reduced-motion', 'large-fonts');
    };
  }, [settings]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_ACCESSIBILITY_SETTINGS);
  };

  const resetToSystemDefaults = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    setSettings({
      ...DEFAULT_ACCESSIBILITY_SETTINGS,
      reducedMotion: prefersReducedMotion,
      highContrast: prefersHighContrast
    });
  };

  return {
    settings,
    updateSetting,
    resetToDefaults,
    resetToSystemDefaults,
    
    // Convenience getters
    isHighContrast: settings.highContrast,
    isReducedMotion: settings.reducedMotion,
    isLargeFonts: settings.largeFonts,
    
    // Convenience setters
    toggleHighContrast: () => updateSetting('highContrast', !settings.highContrast),
    toggleReducedMotion: () => updateSetting('reducedMotion', !settings.reducedMotion),
    toggleLargeFonts: () => updateSetting('largeFonts', !settings.largeFonts)
  };
}