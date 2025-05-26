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
    scanlines: boolean;
    glow: boolean;
    flicker: boolean;
    crt: boolean;
    noise: boolean;
    noiseIntensity?: number;
    screenCurvature?: boolean; // Added for barrel distortion effect
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
      background: '#000000',
      foreground: '#00ff00',
      cursor: '#00ff00',
      selection: '#004400',
      accent: '#00aa00',
      secondary: '#008800',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000'
    },
    font: {
      family: '"IBM Plex Mono", "Courier New", monospace',
      size: '14px',
      weight: '400',
      lineHeight: '1.4'
    },
    effects: {
      scanlines: true,
      glow: true,
      flicker: false,
      crt: true,
      noise: false,
      screenCurvature: true, // Enabled for this theme
      appBackground: '#080808 url("data:image/svg+xml,%3Csvg width=\'12\' height=\'12\' viewBox=\'0 0 12 12\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0L12 12ZM12 0L0 12Z\' stroke=\'%23181818\' stroke-width=\'0.8\'/%3E%3C/svg%3E") repeat',
    },
    spacing: {
      padding: '20px',
      lineSpacing: '2px',
      characterSpacing: '0.5px'
    },
    overlayClassName: 'mainframe-70s-overlay'
  },

  pc80s: {
    id: 'pc80s',
    name: '80s Personal Computer',
    era: '1980s',
    colors: {
      background: '#000080',
      foreground: '#ffffff',
      cursor: '#ffff00',
      selection: '#000040',
      accent: '#00ffff',
      secondary: '#c0c0c0',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff4040'
    },
    font: {
      family: '"Perfect DOS VGA 437", "Monaco", monospace',
      size: '16px',
      weight: '400',
      lineHeight: '1.2'
    },
    effects: {
      scanlines: false,
      glow: false,
      flicker: false,
      crt: true,
      noise: false,
      screenCurvature: true, // Enabled for this theme
      appBackground: '#000020 url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'0\' y=\'0\' width=\'100%25\' height=\'100%25\' fill=\'none\' stroke=\'%23000040\' stroke-width=\'1\'/%3E%3C/svg%3E") repeat',
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
      foreground: '#ffffff',
      cursor: '#ff00ff',
      selection: '#404040',
      accent: '#ff00ff',
      secondary: '#00ffff',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000'
    },
    font: {
      family: '"MS-DOS", "Terminal", monospace',
      size: '15px',
      weight: '400',
      lineHeight: '1.3'
    },
    effects: {
      scanlines: true,
      glow: true,
      flicker: true,
      crt: false,
      noise: true,
      noiseIntensity: 0.6, // Slightly increased noise intensity
      screenCurvature: false,
      appBackground: 'radial-gradient(ellipse at center, #200020 0%, #000000 70%)',
    },
    spacing: {
      padding: '12px',
      lineSpacing: '1px',
      characterSpacing: '0.2px'
    },
    overlayClassName: 'bbs-90s-overlay'
  },

  modern: {
    id: 'modern',
    name: 'Modern Terminal',
    era: '2020s',
    colors: {
      background: '#1a1a1a',
      foreground: '#ffffff',
      cursor: '#00d4aa',
      selection: '#264f78',
      accent: '#00d4aa',
      secondary: '#569cd6',
      success: '#4ec9b0',
      warning: '#dcdcaa',
      error: '#f44747'
    },
    font: {
      family: '"JetBrains Mono", "Fira Code", monospace',
      size: '14px',
      weight: '400',
      lineHeight: '1.5'
    },
    effects: {
      scanlines: false,
      glow: false,
      flicker: false,
      crt: false,
      noise: false,
      screenCurvature: false,
      appBackground: '#101010',
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
