import { useEffect, useState } from 'react';
import { generateCRTGradientCSS, CRT_THEME_PRESETS, type CRTGradientOptions } from '../utils/crtGradient';

/**
 * Hook to manage CRT gradient background based on current theme
 */
export function useCRTGradient(theme: string, enabled: boolean = true) {
  const [gradientBackground, setGradientBackground] = useState<string>('none');

  useEffect(() => {
    if (!enabled) {
      setGradientBackground('none');
      return;
    }

    const generateGradient = () => {
      // Get viewport dimensions
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Get theme preset or use default
      const presetKey = theme as keyof typeof CRT_THEME_PRESETS;
      const preset = CRT_THEME_PRESETS[presetKey] || CRT_THEME_PRESETS.modern;

      const options: CRTGradientOptions = {
        width,
        height,
        ...preset
      };

      const gradient = generateCRTGradientCSS(options);
      setGradientBackground(gradient);
    };

    // Generate initial gradient
    generateGradient();

    // Update gradient on window resize
    const handleResize = () => {
      generateGradient();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [theme, enabled]);

  // Apply gradient to CSS custom property
  useEffect(() => {
    document.documentElement.style.setProperty('--crt-gradient-background', gradientBackground);
    
    return () => {
      // Cleanup on unmount
      document.documentElement.style.removeProperty('--crt-gradient-background');
    };
  }, [gradientBackground]);

  return gradientBackground;
}