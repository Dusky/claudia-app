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
    scanlines: boolean; // This existing property might be related, but overlayClassName offers more flexibility
    glow: boolean;
    flicker: boolean;
    crt: boolean;
    noise: boolean;
  };
  spacing: {
    padding: string;
    lineSpacing: string;
    characterSpacing: string;
  };
  overlayClassName?: string; // Added for theme-specific shader overlay CSS class
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
      noise: false
    },
    spacing: {
      padding: '20px',
      lineSpacing: '2px',
      characterSpacing: '0.5px'
    },
    overlayClassName: 'mainframe-70s-overlay' // Example overlay class
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
      noise: false
    },
    spacing: {
      padding: '16px',
      lineSpacing: '1px',
      characterSpacing: '0px'
    },
    overlayClassName: 'pc-80s-overlay' // Example overlay class
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
      noise: true
    },
    spacing: {
      padding: '12px',
      lineSpacing: '1px',
      characterSpacing: '0.2px'
    },
    overlayClassName: 'bbs-90s-overlay' // Example overlay class
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
      noise: false
    },
    spacing: {
      padding: '20px',
      lineSpacing: '2px',
      characterSpacing: '0px'
    },
    overlayClassName: undefined // No overlay for modern theme, or you can define one e.g., 'modern-subtle-overlay'
  }
};

export const getTheme = (themeId: string): TerminalTheme => {
  return themes[themeId] || themes.modern;
};

export const getAllThemes = (): TerminalTheme[] => {
  return Object.values(themes);
};
