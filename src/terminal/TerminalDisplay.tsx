import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { TerminalTheme } from './themes';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import type { CommandRegistry } from '../commands/types';

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error';
  content: string;
  timestamp: string;
  user?: 'user' | 'claudia';
}

interface TerminalDisplayProps {
  theme: TerminalTheme;
  lines: TerminalLine[];
  onInput?: (input: string) => void;
  prompt?: string;
  isLoading?: boolean;
  commandRegistry: CommandRegistry;
}

// Calculate a reasonable fixed line height.
const calculateLineHeight = (theme: TerminalTheme): number => {
  const fontSize = parseFloat(theme.font.size) || 16; // Default to 16px if not a number
  const lineHeightMultiplier = parseFloat(theme.font.lineHeight) || 1.5; // Default to 1.5
  const lineSpacing = parseFloat(theme.spacing.lineSpacing) || 4; // Default to 4px
  
  // Increased buffer to give more vertical space per item, anticipating some wrapping.
  // This is a heuristic. If lines can wrap extensively, VariableSizeList is a more robust solution.
  const buffer = Math.ceil(fontSize * 0.4); // Increased buffer (e.g., 40% of font size)
  
  return Math.ceil(fontSize * lineHeightMultiplier + lineSpacing + buffer);
};


interface LineRendererProps {
  index: number;
  style: React.CSSProperties; // This style from react-window is crucial!
  data: {
    lines: TerminalLine[];
    theme: TerminalTheme;
    getLineTypeColor: (type: TerminalLine['type']) => string;
    getUserPrefix: (line: TerminalLine) => string;
  };
}

const LineRenderer = React.memo(({ index, style, data }: LineRendererProps) => {
  const { lines, theme, getLineTypeColor, getUserPrefix } = data;
  const line = lines[index];

  if (!line) return null;

  return (
    <div
      style={style} // Apply the style from react-window (includes height, width, top, left)
      className={`terminal-line terminal-line-${line.type}`}
      data-type={line.type}
      css={{ // Using css prop for additional styling
        color: getLineTypeColor(line.type),
        // marginBottom: theme.spacing.lineSpacing, // REMOVED: itemSize in List already accounts for spacing between lines
        whiteSpace: 'pre-wrap', // Allows wrapping of long lines
        wordBreak: 'break-word', // Breaks words to prevent horizontal overflow
        display: 'flex',
        alignItems: 'baseline',
        boxSizing: 'border-box', // Good practice
        // Ensure content fits within the height provided by `style.height` from react-window
        // If content (due to wrapping) exceeds this, overlaps will occur.
        ...(theme.effects.glow && {
          textShadow: `0 0 10px ${getLineTypeColor(line.type)}40`
        })
      }}
    >
      <span className="line-prefix" style={{ color: theme.colors.accent, marginRight: '0.5em' }}>
        {getUserPrefix(line)}
      </span>
      <span className="line-content" style={{ flex: 1 }}>
        {line.content}
      </span>
    </div>
  );
});
LineRenderer.displayName = 'LineRenderer';


export const TerminalDisplay: React.FC<TerminalDisplayProps> = ({
  theme,
  lines,
  onInput,
  prompt = '>',
  isLoading = false,
  commandRegistry: _commandRegistry 
}) => {
  const [currentInput, setCurrentInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<List>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  const LINE_HEIGHT_ESTIMATE = useMemo(() => calculateLineHeight(theme), [theme]);

  // Auto-scroll to bottom when new lines are added or isLoading changes
  useEffect(() => {
    if (lines.length > 0) {
      listRef.current?.scrollToItem(lines.length - 1, 'smart');
    }
  }, [lines, isLoading]);

  // Focus input on mount and when clicking terminal
  useEffect(() => {
    if (inputRef.current && isInputFocused) {
      inputRef.current.focus();
    }
  }, [isInputFocused]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentInput.trim() && onInput) {
      onInput(currentInput.trim());
      setCurrentInput('');
    }
    // Future: Add ArrowUp/ArrowDown for command history here
    // Future: Add Tab for autocomplete here
  };

  const handleTerminalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === terminalContainerRef.current || 
        (e.target as HTMLElement).classList.contains('terminal-output-area') ||
        (e.target as HTMLElement).classList.contains('terminal-input-area') ||
        (e.target as HTMLElement).classList.contains('terminal-input-line') ||
        (e.target as HTMLElement).classList.contains('input-prompt')
    ) {
      setIsInputFocused(true);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const getLineTypeColor = useCallback((type: TerminalLine['type']) => {
    switch (type) {
      case 'error': return theme.colors.error;
      case 'system': return theme.colors.accent;
      case 'input': return theme.colors.foreground;
      case 'output': return theme.colors.foreground;
      default: return theme.colors.foreground;
    }
  }, [theme.colors]);

  const getUserPrefix = useCallback((line: TerminalLine) => {
    if (line.type === 'input' && line.user === 'user') return `${prompt} `;
    if (line.type === 'output' && line.user === 'claudia') return 'claudia> ';
    if (line.type === 'system') return '[system] ';
    return '';
  }, [prompt]);

  const itemData = useMemo(() => ({
    lines,
    theme,
    getLineTypeColor,
    getUserPrefix
  }), [lines, theme, getLineTypeColor, getUserPrefix]);

  return (
    <div
      ref={terminalContainerRef}
      className="terminal-container"
      data-theme={theme.id}
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.foreground,
        fontFamily: theme.font.family,
        fontSize: theme.font.size,
        fontWeight: theme.font.weight,
        padding: theme.spacing.padding,
        letterSpacing: theme.spacing.characterSpacing,
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'text'
      }}
      onClick={handleTerminalClick}
    >
      {theme.effects.scanlines && (
        <div 
          className="scanlines"
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: 'linear-gradient(transparent 50%, rgba(0,0,0,0.2) 50%)',
            backgroundSize: '100% 4px', animation: 'scanmove 10s linear infinite',
            pointerEvents: 'none', zIndex: 1, opacity: 0.5
          }}
        />
      )}
      {theme.effects.noise && (
        <div 
          className="noise"
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.02'/%3E%3C/svg%3E")`,
            pointerEvents: 'none', zIndex: 1, opacity: theme.effects.noiseIntensity ?? 0.5
          }}
        />
      )}

      <div 
        className="terminal-output-area"
        style={{
          position: 'relative',
          flexGrow: 1,
          overflow: 'hidden',
          zIndex: 2,
        }}
      >
        <AutoSizer>
          {({ height, width }) => (
            <List
              ref={listRef}
              height={height}
              width={width}
              itemCount={lines.length}
              itemSize={LINE_HEIGHT_ESTIMATE}
              itemData={itemData}
              className="terminal-virtualized-list"
            >
              {LineRenderer}
            </List>
          )}
        </AutoSizer>
      </div>

      <div 
        className="terminal-input-area"
        style={{
          position: 'relative',
          zIndex: 2,
          paddingTop: theme.spacing.lineSpacing,
          flexShrink: 0,
        }}
      >
        {isLoading && (
          <div 
            className="terminal-line loading"
            style={{
              color: theme.colors.accent,
              marginBottom: theme.spacing.lineSpacing,
              display: 'flex',
              alignItems: 'baseline'
            }}
          >
            <span className="line-prefix" style={{ color: theme.colors.accent, marginRight: '0.5em' }}>claudia{'>'} </span>
            <span className="loading-dots">
              <span style={{ animation: 'blink 1s infinite' }}>.</span>
              <span style={{ animation: 'blink 1s infinite 0.33s' }}>.</span>
              <span style={{ animation: 'blink 1s infinite 0.66s' }}>.</span>
            </span>
          </div>
        )}

        <div 
          className="terminal-input-line"
          style={{
            color: theme.colors.foreground,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <span 
            className="input-prompt"
            style={{ color: theme.colors.accent, marginRight: '0.5em' }}
          >
            {prompt}{' '}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyPress} // Changed from onKeyPress for better ArrowKey support
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: theme.colors.foreground,
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              letterSpacing: 'inherit',
              flex: 1,
              caretColor: theme.colors.cursor,
              ...(theme.effects.glow && {
                textShadow: `0 0 5px ${theme.colors.foreground}60`
              })
            }}
            disabled={isLoading}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes scanmove {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        
        .terminal-virtualized-list::-webkit-scrollbar {
          width: 8px;
        }
        
        .terminal-virtualized-list::-webkit-scrollbar-track {
          background: ${theme.colors.background}30;
        }
        
        .terminal-virtualized-list::-webkit-scrollbar-thumb {
          background: ${theme.colors.accent}60;
          border-radius: 4px;
        }
        
        .terminal-virtualized-list::-webkit-scrollbar-thumb:hover {
          background: ${theme.colors.accent}80;
        }

        .terminal-output-area > div {
          height: 100% !important;
          width: 100% !important;
        }
        .terminal-virtualized-list > div {
           scrollbar-width: thin;
           scrollbar-color: ${theme.colors.accent}60 ${theme.colors.background}30;
        }

        ${theme.effects.flicker ? `
          .terminal-output-area, .terminal-input-area {
            animation: flicker 0.15s infinite linear alternate;
          }
          
          @keyframes flicker {
            0% { opacity: 1; }
            100% { opacity: 0.98; }
          }
        ` : ''}

        ${theme.effects.crt ? `
          .terminal-container {
            border-radius: 15px;
            box-shadow: 
              inset 0 0 50px rgba(255,255,255,0.1),
              0 0 100px rgba(0,0,0,0.8);
          }
          
          .terminal-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%);
            pointer-events: none;
            z-index: 3;
          }
        ` : ''}
      `}</style>
    </div>
  );
};
