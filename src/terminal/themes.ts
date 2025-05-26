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
  font: {
    family: string;
    size: string;
    weight: string;
    lineHeight: string;
  };
  effects: {
    scanlines: boolean; // CSS-based scanlines (fallback)
    glow: boolean; // Text-shadow glow
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
      background: '#0A0A0A', // Slightly off-black
      foreground: '#33FF33', // Classic green
      cursor: '#66FF66',
      selection: '#003300',
      accent: '#44DD44',
      secondary: '#22AA22',
      success: '#33FF33',
      warning: '#FFFF33',
      error: '#FF3333'
    },
    font: {
      family: '"IBM Plex Mono", "VT323", "Courier New", monospace', // Added VT323 for more pixelated option
      size: '15px', // Slightly larger for older feel
      weight: '500',
      lineHeight: '1.5'
    },
    effects: {
      scanlines: true,
      glow: true,
      flicker: false,
      crt: true,
      noise: true,
      noiseIntensity: 0.1,
      screenCurvature: true,
      appBackground: '#050505 url("data:image/svg+xml,%3Csvg width=\'10\' height=\'10\' viewBox=\'0 0 10 10\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0L10 10ZM10 0L0 10Z\' stroke=\'%23151515\' stroke-width=\'0.5\'/%3E%3C/svg%3E") repeat',
    },
    spacing: {
      padding: '25px', // More padding
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
      background: '#0000AA', // Classic blue
      foreground: '#FFFFFF',
      cursor: '#FFFF00',
      selection: '#000055',
      accent: '#55FFFF',
      secondary: '#AAAAAA',
      success: '#55FF55',
      warning: '#FFFF55',
      error: '#FF5555'
    },
    font: {
      family: '"Perfect DOS VGA 437", "Fixedsys Excelsior", "Monaco", monospace', // Added Fixedsys
      size: '16px',
      weight: '400',
      lineHeight: '1.3'
    },
    effects: {
      scanlines: true, // More subtle scanlines for 80s monitors
      glow: false, // Less glow typically
      flicker: false,
      crt: true,
      noise: false,
      noiseIntensity: 0.05,
      screenCurvature: true,
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
      foreground: '#CCCCCC', // Often slightly off-white
      cursor: '#FF00FF',
      selection: '#333333',
      accent: '#00AAAA', // Cyan was common
      secondary: '#AAAA00', // Yellow/Amber
      success: '#00FF00',
      warning: '#FFFF00',
      error: '#FF0000'
    },
    font: {
      family: '"MS-DOS", "Terminal", "Consolas", monospace',
      size: '15px',
      weight: '400',
      lineHeight: '1.35'
    },
    effects: {
      scanlines: true,
      glow: true, // Some glow for effect
      flicker: true, // BBS often had some flicker
      crt: true, // Still CRT era
      noise: true,
      noiseIntensity: 0.25, // More noticeable noise/artifacts
      screenCurvature: true,
      appBackground: 'radial-gradient(ellipse at center, #101020 0%, #000000 80%)',
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
      background: '#1E1E1E', // Common modern dark theme
      foreground: '#D4D4D4',
      cursor: '#00AACC',
      selection: '#264F78',
      accent: '#00AACC',
      secondary: '#569CD6',
      success: '#4EC9B0',
      warning: '#DCDCAA',
      error: '#F44747'
    },
    font: {
      family: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
      size: '14px',
      weight: '400',
      lineHeight: '1.6' // More spacious
    },
    effects: {
      scanlines: false, // Off by default for modern
      glow: false,
      flicker: false,
      crt: false, // No CRT bezel by default
      noise: false,
      noiseIntensity: 0,
      screenCurvature: false,
      appBackground: '#121212', // Dark, clean background
    },
    spacing: {
      padding: '20px',
      lineSpacing: '2px',
      characterSpacing: '0px'
    },
    overlayClassName: 'modern-subtle-overlay'
  }
};

export const getTheme = (themeId: string): TerminalTheme => {
  return themes[themeId] || themes.modern;
};

export const getAllThemes = (): TerminalTheme[] => {
  return Object.values(themes);
};
