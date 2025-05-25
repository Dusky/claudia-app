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
  commandRegistry: CommandRegistry; // Passed from App.tsx
}

const calculateLineHeight = (theme: TerminalTheme): number => {
  const fontSize = parseFloat(theme.font.size) || 16;
  const lineHeightMultiplier = parseFloat(theme.font.lineHeight) || 1.5;
  const lineSpacing = parseFloat(theme.spacing.lineSpacing) || 4;
  const buffer = Math.ceil(fontSize * 0.4);
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
      style={style}
      className={`terminal-line terminal-line-${line.type}`}
      data-type={line.type}
      css={{
        color: getLineTypeColor(line.type),
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        display: 'flex',
        alignItems: 'baseline',
        boxSizing: 'border-box',
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
  commandRegistry 
}) => {
  const [currentInput, setCurrentInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<List>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // Command History State
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);
  const inputBeforeHistoryNav = useRef<string>('');

  // Tab Completion State
  const [suggestionCycleIndex, setSuggestionCycleIndex] = useState<number>(-1);
  const [lastTabCompletionPrefix, setLastTabCompletionPrefix] = useState<string | null>(null);

  // Command Suggestions State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);


  const LINE_HEIGHT_ESTIMATE = useMemo(() => calculateLineHeight(theme), [theme]);

  useEffect(() => {
    if (lines.length > 0) {
      listRef.current?.scrollToItem(lines.length - 1, 'smart');
    }
  }, [lines, isLoading]);

  useEffect(() => {
    if (inputRef.current && isInputFocused) {
      inputRef.current.focus();
    }
  }, [isInputFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTypedInput = e.target.value;
    setCurrentInput(newTypedInput);
    
    if (historyPointer !== -1) { 
      inputBeforeHistoryNav.current = newTypedInput; 
      setHistoryPointer(-1); 
    }
    
    setSuggestionCycleIndex(-1); // Reset tab cycle
    setLastTabCompletionPrefix(null);

    if (newTypedInput.startsWith('/') && newTypedInput.length > 1) {
      const commandPrefix = newTypedInput.substring(1).split(' ')[0];
      if (commandPrefix) {
        const allCommandNames = commandRegistry.getAllCommandNames ? commandRegistry.getAllCommandNames() : [];
        const matchingCommands = allCommandNames.filter(name => name.startsWith(commandPrefix));
        if (matchingCommands.length > 0 && matchingCommands.some(cmd => `/${cmd}` !== newTypedInput.trim())) {
          setSuggestions(matchingCommands.map(cmd => `/${cmd}`));
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
        }
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCurrentInput(`${suggestion} `);
    setShowSuggestions(false);
    setSuggestions([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      if (currentInput.trim() && onInput) {
        const commandToSubmit = currentInput.trim();
        onInput(commandToSubmit);
        if (commandToSubmit && (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== commandToSubmit)) {
          setCommandHistory(prev => [...prev, commandToSubmit]);
        }
        setCurrentInput('');
        setHistoryPointer(-1); 
        inputBeforeHistoryNav.current = ''; 
        setSuggestionCycleIndex(-1); 
        setLastTabCompletionPrefix(null);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setShowSuggestions(false);
      if (commandHistory.length === 0) return;

      let newPointer: number;
      if (historyPointer === -1) { 
        inputBeforeHistoryNav.current = currentInput; 
        newPointer = commandHistory.length - 1;
      } else {
        newPointer = Math.max(0, historyPointer - 1);
      }
      setCurrentInput(commandHistory[newPointer]);
      setHistoryPointer(newPointer);
      setSuggestionCycleIndex(-1); 
      setLastTabCompletionPrefix(null);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowSuggestions(false);
      if (historyPointer === -1) return;

      if (historyPointer === commandHistory.length - 1) { 
        setCurrentInput(inputBeforeHistoryNav.current); 
        setHistoryPointer(-1); 
      } else {
        const newPointer = historyPointer + 1;
        setCurrentInput(commandHistory[newPointer]);
        setHistoryPointer(newPointer);
      }
      setSuggestionCycleIndex(-1); 
      setLastTabCompletionPrefix(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setShowSuggestions(false); // Hide suggestions when tabbing for command name
      if (!currentInput.startsWith('/')) return; 

      const parts = currentInput.split(' ');
      const commandPart = parts[0]; 
      const typedPrefix = commandPart.substring(1); 

      if (typedPrefix === "") { 
        setSuggestionCycleIndex(-1);
        setLastTabCompletionPrefix(null);
        return;
      }

      let currentCycleIndex = suggestionCycleIndex;
      if (typedPrefix !== lastTabCompletionPrefix) {
        currentCycleIndex = -1; 
      }
      
      const allCommandNames = commandRegistry.getAllCommandNames ? commandRegistry.getAllCommandNames() : [];
      const matchingCommands = allCommandNames.filter(name => name.startsWith(typedPrefix));

      if (matchingCommands.length > 0) {
        currentCycleIndex = (currentCycleIndex + 1) % matchingCommands.length;
        const completedCommand = matchingCommands[currentCycleIndex];
        setCurrentInput(`/${completedCommand} `);
        setSuggestionCycleIndex(currentCycleIndex);
        setLastTabCompletionPrefix(typedPrefix);
      } else {
        setSuggestionCycleIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
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
          position: 'relative', // For suggestions box positioning
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
            alignItems: 'center',
            position: 'relative' // For suggestions box positioning
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
            onChange={handleInputChange} 
            onKeyDown={handleKeyDown} 
            onFocus={() => {
              setIsInputFocused(true);
              // Optionally re-trigger suggestion check on focus if input is valid for suggestions
              if (currentInput.startsWith('/') && currentInput.length > 1) {
                const commandPrefix = currentInput.substring(1).split(' ')[0];
                 if (commandPrefix) {
                    const allCommandNames = commandRegistry.getAllCommandNames ? commandRegistry.getAllCommandNames() : [];
                    const matchingCommands = allCommandNames.filter(name => name.startsWith(commandPrefix));
                    if (matchingCommands.length > 0 && matchingCommands.some(cmd => `/${cmd}` !== currentInput.trim())) {
                      setSuggestions(matchingCommands.map(cmd => `/${cmd}`));
                      setShowSuggestions(true);
                    }
                 }
              }
            }}
            onBlur={() => {
              setIsInputFocused(false);
              // Delay hiding suggestions to allow click
              setTimeout(() => setShowSuggestions(false), 150);
            }}
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
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-box">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseDown={(e) => e.preventDefault()} // Prevents input blur before click
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
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

        .terminal-output-area > div { /* AutoSizer child */
          height: 100% !important;
          width: 100% !important;
        }
        .terminal-virtualized-list > div { /* react-window inner scrollable */
           scrollbar-width: thin;
           scrollbar-color: ${theme.colors.accent}60 ${theme.colors.background}30;
        }

        .suggestions-box {
          position: absolute;
          bottom: 100%; /* Position above the input line initially */
          left: ${prompt.length + 1}ch; /* Align with where text starts after prompt */
          width: calc(100% - ${prompt.length + 1}ch);
          max-height: 150px;
          overflow-y: auto;
          background-color: ${theme.colors.background || '#1e1e1e'}EE; /* Slightly transparent */
          border: 1px solid ${theme.colors.accent || '#00FFFF'}80;
          border-bottom: none; /* Avoid double border with input line */
          border-radius: 4px 4px 0 0;
          z-index: 100; /* Ensure it's above other elements */
          color: ${theme.colors.foreground || '#FFFFFF'};
          font-family: ${theme.font.family};
          font-size: calc(${theme.font.size} * 0.9); /* Slightly smaller than input */
        }

        .suggestion-item {
          padding: 6px 10px;
          cursor: pointer;
          border-bottom: 1px solid ${theme.colors.accent || '#00FFFF'}30;
        }
        .suggestion-item:last-child {
          border-bottom: none;
        }

        .suggestion-item:hover {
          background-color: ${theme.colors.accent || '#00FFFF'}40; /* Highlight on hover */
          color: ${theme.colors.background}; /* Ensure text is readable on hover */
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
