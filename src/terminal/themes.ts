export interface TerminalTheme {
  id: string;
  name: string;
  era: string;
  colors: {
    background: string;
    foreground: string;
    cursor: string;
    selection: string;
    accent: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
  };
  highContrast?: {
    background: string;
    foreground: string;
    cursor: string;
    selection: string;
    accent: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
  };
  font: {
    family: string;
    size: string;
    weight: string;
    lineHeight: string;
  };
  effects: {
    scanlines: boolean; // CSS-based scanlines (fallback)
    glow: boolean; // Text-shadow glow/blur
    flicker: boolean; // Text opacity flicker
    crt: boolean; // CSS-based CRT bezel and vignette (bezel always applies, vignette is fallback)
    noise: boolean; // CSS-based noise (fallback)
    noiseIntensity?: number;
    screenCurvature?: boolean; // CSS-based curvature (fallback)
    appBackground?: string; // For the background behind the terminal
  };
  spacing: {
    padding: string;
    lineSpacing: string;
    characterSpacing: string;
  };
  overlayClassName?: string;
}

export const themes: Record<string, TerminalTheme> = {
  mainframe70s: {
    id: 'mainframe70s',
    name: '70s Mainframe',
    era: '1970s',
    colors: {
      background: '#0A0A0A', 
      foreground: '#33FF33', 
      cursor: '#66FF66',
      selection: '#003300',
      accent: '#44DD44',
      secondary: '#22AA22',
      success: '#33FF33',
      warning: '#FFFF33',
      error: '#FF3333'
    },
    highContrast: {
      background: '#000000',
      foreground: '#00FF00',
      cursor: '#FFFFFF',
      selection: '#004400',
      accent: '#00FF00',
      secondary: '#FFFFFF',
      success: '#00FF00',
      warning: '#FFFF00',
      error: '#FF0000'
    },
    font: {
      family: '"VT323", "IBM Plex Mono", "Courier New", monospace', 
      size: '18px', 
      weight: '400', 
      lineHeight: '1.4'
    },
    effects: {
      scanlines: true,
      glow: true, 
      flicker: false,
      crt: true,
      noise: true,
      noiseIntensity: 0.1,
      screenCurvature: true,
      // Made the SVG stroke color much lighter for better visibility
      appBackground: '#0a0a0a url("data:image/svg+xml,%3Csvg width=\'10\' height=\'10\' viewBox=\'0 0 10 10\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0L10 10ZM10 0L0 10Z\' stroke=\'%23404040\' stroke-width=\'0.8\'/%3E%3C/svg%3E") repeat',
    },
    spacing: {
      padding: '25px', 
      lineSpacing: '3px',
      characterSpacing: '0.75px'
    },
    overlayClassName: 'mainframe-70s-overlay'
  },

  pc80s: {
    id: 'pc80s',
    name: '80s Personal Computer',
    era: '1980s',
    colors: {
      background: '#0000AA', 
      foreground: '#FFFFFF',
      cursor: '#FFFF00',
      selection: '#000055',
      accent: '#55FFFF',
      secondary: '#AAAAAA',
      success: '#55FF55',
      warning: '#FFFF55',
      error: '#FF5555'
    },
    highContrast: {
      background: '#000000',
      foreground: '#FFFFFF',
      cursor: '#FFFF00',
      selection: '#444444',
      accent: '#00FFFF',
      secondary: '#FFFFFF',
      success: '#00FF00',
      warning: '#FFFF00',
      error: '#FF0000'
    },
    font: {
      family: '"Perfect DOS VGA 437", "Fixedsys Excelsior", "Monaco", monospace', 
      size: '16px', 
      weight: '400',
      lineHeight: '1.25' 
    },
    effects: {
      scanlines: true, 
      glow: true, 
      flicker: false,
      crt: true,
      noise: false,
      noiseIntensity: 0.05,
      screenCurvature: true,
      // This one was working, keeping its contrast
      appBackground: '#000033 url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'0\' y=\'0\' width=\'100%25\' height=\'100%25\' fill=\'none\' stroke=\'%23000050\' stroke-width=\'0.5\'/%3E%3C/svg%3E") repeat',
    },
    spacing: {
      padding: '16px',
      lineSpacing: '1px',
      characterSpacing: '0px'
    },
    overlayClassName: 'pc-80s-overlay'
  },

  bbs90s: {
    id: 'bbs90s',
    name: '90s BBS',
    era: '1990s',
    colors: {
      background: '#000000',
      foreground: '#CCCCCC', 
      cursor: '#FF00FF',
      selection: '#333333',
      accent: '#00AAAA', 
      secondary: '#AAAA00', 
      success: '#00FF00',
      warning: '#FFFF00',
      error: '#FF0000'
    },
    highContrast: {
      background: '#000000',
      foreground: '#FFFFFF',
      cursor: '#FF00FF',
      selection: '#555555',
      accent: '#00FFFF',
      secondary: '#FFFF00',
      success: '#00FF00',
      warning: '#FFFF00',
      error: '#FF0000'
    },
    font: {
      family: '"Terminal", "Fixedsys Excelsior", "Consolas", monospace', 
      size: '15px',
      weight: '400',
      lineHeight: '1.3'
    },
    effects: {
      scanlines: true,
      glow: true, 
      flicker: true, 
      crt: true, 
      noise: true,
      noiseIntensity: 0.25, 
      screenCurvature: true,
      // Made the gradient much more visible with better contrast
      appBackground: 'radial-gradient(ellipse at center, #2a2a40 0%, #0a0a10 70%, #000000 100%)',
    },
    spacing: {
      padding: '12px',
      lineSpacing: '1.5px',
      characterSpacing: '0.1px'
    },
    overlayClassName: 'bbs-90s-overlay'
  },

  modern: {
    id: 'modern',
    name: 'Modern Terminal',
    era: '2020s',
    colors: {
      background: '#1E1E1E', 
      foreground: '#D4D4D4',
      cursor: '#00AACC',
      selection: '#264F78',
      accent: '#00AACC',
      secondary: '#569CD6',
      success: '#4EC9B0',
      warning: '#DCDCAA',
      error: '#F44747'
    },
    highContrast: {
      background: '#000000',
      foreground: '#FFFFFF',
      cursor: '#FFFF00',
      selection: '#666666',
      accent: '#00FFFF',
      secondary: '#FFFFFF',
      success: '#00FF00',
      warning: '#FFFF00',
      error: '#FF0000'
    },
    font: {
      family: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
      size: '14px',
      weight: '400',
      lineHeight: '1.6' 
    },
    effects: {
      scanlines: true, 
      glow: true, 
      flicker: false,
      crt: true, 
      noise: true,
      noiseIntensity: 0.05,
      screenCurvature: true,
      appBackground: '#121212', // Solid color, should be fine
    },
    spacing: {
      padding: '20px',
      lineSpacing: '2px',
      characterSpacing: '0px'
    },
    overlayClassName: 'modern-subtle-overlay'
  },

  claudia: {
    id: 'claudia',
    name: 'Claudia',
    era: 'AI Era',
    colors: {
      background: '#0A0A0A', 
      foreground: '#FFED4A', // Bright yellow
      cursor: '#FFED4A',
      selection: '#333300',
      accent: '#FFED4A', // Bright yellow accent
      secondary: '#FFD700', // Gold secondary
      success: '#FFED4A',
      warning: '#FFA500',
      error: '#FF6B6B'
    },
    highContrast: {
      background: '#000000',
      foreground: '#FFFF00',
      cursor: '#FFFFFF',
      selection: '#444400',
      accent: '#FFFF00',
      secondary: '#FFFFFF',
      success: '#00FF00',
      warning: '#FFFF00',
      error: '#FF0000'
    },
    font: {
      family: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
      size: '15px',
      weight: '400',
      lineHeight: '1.5' 
    },
    effects: {
      scanlines: true, 
      glow: true, 
      flicker: false,
      crt: true, 
      noise: true,
      noiseIntensity: 0.08,
      screenCurvature: true,
      // Daisy-inspired pattern with yellow on black
      appBackground: '#000000 url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'3\' fill=\'%23FFED4A\' opacity=\'0.1\'/%3E%3Cpath d=\'M20 8L22 18L20 20L18 18ZM32 20L22 22L20 20L22 18ZM20 32L18 22L20 20L22 22ZM8 20L18 18L20 20L18 22Z\' fill=\'%23FFED4A\' opacity=\'0.05\'/%3E%3C/svg%3E") repeat',
    },
    spacing: {
      padding: '22px',
      lineSpacing: '2px',
      characterSpacing: '0.3px'
    },
    overlayClassName: 'claudia-overlay'
  }
};

/**
 * Get a theme with optional high contrast override
 */
export const getTheme = (themeId: string, highContrast: boolean = false): TerminalTheme => {
  const theme = themes[themeId] || themes.modern;
  
  if (highContrast && theme.highContrast) {
    return {
      ...theme,
      colors: theme.highContrast
    };
  }
  
  return theme;
};

/**
 * Check if a theme supports high contrast mode
 */
export const supportsHighContrast = (themeId: string): boolean => {
  const theme = themes[themeId];
  return theme && !!theme.highContrast;
};

/**
 * Get all available theme IDs
 */
export const getAvailableThemes = (): string[] => {
  return Object.keys(themes);
};

/**
 * Get theme metadata
 */
export const getThemeMetadata = (themeId: string) => {
  const theme = themes[themeId];
  if (!theme) return null;
  
  return {
    id: theme.id,
    name: theme.name,
    era: theme.era,
    supportsHighContrast: !!theme.highContrast
  };
};

export const getAllThemes = (): TerminalTheme[] => {
  return Object.values(themes);
};
