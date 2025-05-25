import React, { useEffect, useRef, useState } from 'react';
import type { TerminalTheme } from './themes';

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error';
  content: string;
  timestamp: string;
  user?: 'user' | 'claudia';
}

import type { CommandRegistry } from '../commands/types'; // Added CommandRegistry import

interface TerminalDisplayProps {
  theme: TerminalTheme;
  lines: TerminalLine[];
  onInput?: (input: string) => void;
  prompt?: string;
  isLoading?: boolean;
  commandRegistry: CommandRegistry; // Added commandRegistry prop
}

export const TerminalDisplay: React.FC<TerminalDisplayProps> = ({
  theme,
  lines,
  onInput,
  prompt = '>',
  isLoading = false,
  commandRegistry // Destructure commandRegistry
}) => {
  const [currentInput, setCurrentInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

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
  };

  const handleTerminalClick = () => {
    setIsInputFocused(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getLineTypeColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'error':
        return theme.colors.error;
      case 'system':
        return theme.colors.accent;
      case 'input':
        return theme.colors.foreground;
      case 'output':
        return theme.colors.foreground;
      default:
        return theme.colors.foreground;
    }
  };

  const getUserPrefix = (line: TerminalLine) => {
    if (line.type === 'input' && line.user === 'user') {
      return `${prompt} `;
    }
    if (line.type === 'output' && line.user === 'claudia') {
      return 'claudia> ';
    }
    if (line.type === 'system') {
      return '[system] ';
    }
    return '';
  };

  return (
    <div 
      className="terminal-container"
      data-theme={theme.id}
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.foreground,
        fontFamily: theme.font.family,
        fontSize: theme.font.size,
        fontWeight: theme.font.weight,
        lineHeight: theme.font.lineHeight,
        padding: theme.spacing.padding,
        letterSpacing: theme.spacing.characterSpacing,
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        cursor: 'text'
      }}
      onClick={handleTerminalClick}
    >
      {/* Background effects */}
      {theme.effects.scanlines && (
        <div 
          className="scanlines"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />
      )}
      
      {theme.effects.noise && (
        <div 
          className="noise"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.02,
            background: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'1\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />
      )}

      {/* Terminal content */}
      <div 
        ref={terminalRef}
        className="terminal-content"
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          overflowY: 'auto',
          paddingBottom: '100px' // Space for input line and status bar
        }}
      >
        {lines.map((line) => (
          <div 
            key={line.id}
            className={`terminal-line terminal-line-${line.type}`}
            data-type={line.type}
            style={{
              color: getLineTypeColor(line.type),
              marginBottom: theme.spacing.lineSpacing,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              ...(theme.effects.glow && {
                textShadow: `0 0 10px ${getLineTypeColor(line.type)}40`
              })
            }}
          >
            <span className="line-prefix" style={{ color: theme.colors.accent }}>
              {getUserPrefix(line)}
            </span>
            <span className="line-content">
              {line.content}
            </span>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div 
            className="terminal-line loading"
            style={{
              color: theme.colors.accent,
              marginBottom: theme.spacing.lineSpacing
            }}
          >
            <span className="line-prefix">claudia{'>'} </span>
            <span className="loading-dots">
              <span style={{ animation: 'blink 1s infinite' }}>.</span>
              <span style={{ animation: 'blink 1s infinite 0.33s' }}>.</span>
              <span style={{ animation: 'blink 1s infinite 0.66s' }}>.</span>
            </span>
          </div>
        )}

        {/* Input line */}
        <div 
          className="terminal-input-line"
          style={{
            color: theme.colors.foreground,
            marginBottom: theme.spacing.lineSpacing,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <span 
            className="input-prompt"
            style={{ color: theme.colors.accent }}
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

      {/* CSS animations */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        .terminal-container::-webkit-scrollbar {
          width: 8px;
        }
        
        .terminal-container::-webkit-scrollbar-track {
          background: ${theme.colors.background};
        }
        
        .terminal-container::-webkit-scrollbar-thumb {
          background: ${theme.colors.accent}40;
          border-radius: 4px;
        }
        
        .terminal-container::-webkit-scrollbar-thumb:hover {
          background: ${theme.colors.accent}60;
        }

        ${theme.effects.flicker ? `
          .terminal-content {
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
