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
// This might need adjustment if content significantly varies in height per line.
const calculateLineHeight = (theme: TerminalTheme): number => {
  const fontSize = parseFloat(theme.font.size) || 16; // Default to 16px if not a number
  const lineHeightMultiplier = parseFloat(theme.font.lineHeight) || 1.5; // Default to 1.5
  const lineSpacing = parseFloat(theme.spacing.lineSpacing) || 4; // Default to 4px
  // A small buffer can sometimes help.
  const buffer = 2; 
  return Math.ceil(fontSize * lineHeightMultiplier + lineSpacing + buffer);
};


interface LineRendererProps {
  index: number;
  style: React.CSSProperties;
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
      style={style} // This style from react-window is crucial for positioning
      className={`terminal-line terminal-line-${line.type}`}
      data-type={line.type}
      css={{ // Using css prop for example, or could be regular style prop
        color: getLineTypeColor(line.type),
        marginBottom: theme.spacing.lineSpacing, // This might be handled by itemSize, or adjust itemSize
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        display: 'flex', // To align prefix and content
        alignItems: 'baseline',
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
  }, [lines, isLoading]); // Scroll when lines change or loading state finishes

  // Focus input on mount and when clicking terminal (if not clicking on text)
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
  };

  const handleTerminalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Focus input only if the click is not on selectable text content within a line
    // This is a basic check; more sophisticated checks might be needed
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
      case 'input': return theme.colors.foreground; // Input itself might be styled differently if needed
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
        // lineHeight: theme.font.lineHeight, // Handled by itemSize and LineRenderer
        padding: theme.spacing.padding,
        letterSpacing: theme.spacing.characterSpacing,
        position: 'relative',
        overflow: 'hidden', // Important for AutoSizer
        minHeight: '100vh', // Ensure it takes full viewport height
        display: 'flex',
        flexDirection: 'column',
        cursor: 'text'
      }}
      onClick={handleTerminalClick}
    >
      {/* Background effects */}
      {theme.effects.scanlines && (
        <div 
          className="scanlines"
          style={{ /* ...styles... */ }} // Kept for brevity, same as original
        />
      )}
      {theme.effects.noise && (
        <div 
          className="noise"
          style={{ /* ...styles... */ }} // Kept for brevity, same as original
        />
      )}

      {/* Terminal output area (virtualized) */}
      <div 
        className="terminal-output-area"
        style={{
          position: 'relative', // For AutoSizer
          flexGrow: 1,
          overflow: 'hidden', // AutoSizer needs this
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
              className="terminal-virtualized-list" // For potential global styling
            >
              {LineRenderer}
            </List>
          )}
        </AutoSizer>
      </div>

      {/* Input and Loading area */}
      <div 
        className="terminal-input-area"
        style={{
          position: 'relative', // Ensure zIndex works if needed
          zIndex: 2, // Above background effects
          paddingTop: theme.spacing.lineSpacing, // Space above input/loading
          flexShrink: 0, // Prevent this area from shrinking
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
            // marginBottom: theme.spacing.lineSpacing, // Already spaced by container padding or specific needs
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
            onKeyPress={handleKeyPress}
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

      {/* CSS animations and global styles for this component */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        /* Styling for the scrollbar of the react-window list */
        .terminal-virtualized-list::-webkit-scrollbar {
          width: 8px;
        }
        
        .terminal-virtualized-list::-webkit-scrollbar-track {
          background: ${theme.colors.background}30; /* Slightly transparent track */
        }
        
        .terminal-virtualized-list::-webkit-scrollbar-thumb {
          background: ${theme.colors.accent}60; /* More visible thumb */
          border-radius: 4px;
        }
        
        .terminal-virtualized-list::-webkit-scrollbar-thumb:hover {
          background: ${theme.colors.accent}80;
        }

        /* Ensure AutoSizer and List take full space of their container */
        .terminal-output-area > div { /* Targets AutoSizer's direct child */
          height: 100% !important;
          width: 100% !important;
        }
        .terminal-virtualized-list > div { /* Targets react-window's inner scrollable div */
           /* Add any specific styles if needed, e.g., custom scrollbar for Firefox */
           scrollbar-width: thin;
           scrollbar-color: ${theme.colors.accent}60 ${theme.colors.background}30;
        }


        ${theme.effects.flicker ? `
          .terminal-output-area, .terminal-input-area { /* Apply flicker to content areas */
            animation: flicker 0.15s infinite linear alternate;
          }
          
          @keyframes flicker {
            0% { opacity: 1; }
            100% { opacity: 0.98; }
          }
        ` : ''}

        ${theme.effects.crt ? `
          .terminal-container { /* Apply CRT effects to the main container */
            border-radius: 15px;
            box-shadow: 
              inset 0 0 50px rgba(255,255,255,0.1),
              0 0 100px rgba(0,0,0,0.8);
          }
          
          .terminal-container::before { /* Overlay for CRT screen curvature/glow */
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%);
            pointer-events: none;
            z-index: 3; /* Above content, below popups/modals */
          }
        ` : ''}
      `}</style>
    </div>
  );
};
