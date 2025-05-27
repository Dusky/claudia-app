import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { TerminalTheme } from './themes';
import type { CommandRegistry } from '../commands/types';
import type { ConfigSettings } from '../store/appStore';
import { ContentRenderer } from './ContentRenderer';

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error';
  content: string;
  timestamp: string;
  user?: 'user' | 'claudia';
  isChatResponse?: boolean; // New flag to identify AI chat responses
}

interface TerminalDisplayProps {
  theme: TerminalTheme;
  lines: TerminalLine[];
  onInput?: (input: string) => void;
  prompt?: string;
  isLoading?: boolean;
  commandRegistry: CommandRegistry;
  config?: ConfigSettings; // Global config from appStore
}

const LineComponent = React.memo(({ line, theme, getLineTypeColor, getUserPrefix, isWebGLShaderActive }: {
  line: TerminalLine;
  theme: TerminalTheme;
  getLineTypeColor: (type: TerminalLine['type']) => string;
  getUserPrefix: (line: TerminalLine) => string;
  isWebGLShaderActive: boolean;
}) => {
  let textShadowStyle = {};
  if (theme.effects.glow) {
    if (isWebGLShaderActive) {
      // Subtle glow/halo when WebGL shader is active, slightly more visible
      textShadowStyle = { textShadow: `0 0 4px ${getLineTypeColor(line.type)}50, 0 0 1.5px ${getLineTypeColor(line.type)}30` };
    } else {
      // More pronounced CSS glow/blur if WebGL shader is off
      if (theme.id === 'mainframe70s') {
        textShadowStyle = { textShadow: `0 0 1px ${getLineTypeColor(line.type)}90, 0 0 3px ${getLineTypeColor(line.type)}50, 0 0 5px ${getLineTypeColor(line.type)}30` };
      } else if (theme.id === 'pc80s') {
        textShadowStyle = { textShadow: `0 0 1px ${getLineTypeColor(line.type)}70, 0 0 2px ${getLineTypeColor(line.type)}40` };
      } else { // bbs90s and others
        textShadowStyle = { textShadow: `0 0 2px ${getLineTypeColor(line.type)}60, 0 0 4px ${getLineTypeColor(line.type)}40` };
      }
    }
  }

  return (
    <div
      className={`terminal-line terminal-line-${line.type}`}
      data-type={line.type}
      style={{
        color: getLineTypeColor(line.type),
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        display: 'flex',
        alignItems: 'baseline',
        marginBottom: '8px',
        ...textShadowStyle
      }}
    >
      <span className="line-prefix" style={{ color: theme.colors.accent, marginRight: '0.5em' }}>
        {getUserPrefix(line)}
      </span>
      <span className="line-content" style={{ flex: 1 }}>
        <ContentRenderer content={line.content} />
      </span>
    </div>
  );
});
LineComponent.displayName = 'LineComponent';

export const TerminalDisplay: React.FC<TerminalDisplayProps> = ({
  theme,
  lines,
  onInput,
  prompt = '>',
  isLoading = false,
  commandRegistry,
  config // Global config from appStore
}) => {
  const [currentInput, setCurrentInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLSpanElement>(null);

  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);
  const inputBeforeHistoryNav = useRef<string>('');

  const [suggestionCycleIndex, setSuggestionCycleIndex] = useState<number>(-1);
  const [lastTabCompletionPrefix, setLastTabCompletionPrefix] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [suggestionsLeftOffset, setSuggestionsLeftOffset] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('thinking...');
  const [loadingDots, setLoadingDots] = useState(0);

  const isWebGLShaderActive = config?.enableCRTEffect === true;

  useEffect(() => {
    if (lines.length > 0 && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines, isLoading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
      setIsInputFocused(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []); 

  useEffect(() => {
    if (inputRef.current && isInputFocused) inputRef.current.focus();
  }, [isInputFocused]);

  useEffect(() => {
    if (promptRef.current) setSuggestionsLeftOffset(promptRef.current.offsetWidth);
  }, [prompt, theme.font.family, theme.font.size]);

  useEffect(() => {
    if (!isLoading) return;
    const messages = ['thinking...', 'processing...', 'crafting response...', 'almost ready...', 'finalizing thoughts...'];
    let messageIndex = 0; let dotCount = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingMessage(messages[messageIndex]);
    }, 2000);
    const dotInterval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      setLoadingDots(dotCount);
    }, 400);
    return () => { clearInterval(messageInterval); clearInterval(dotInterval); };
  }, [isLoading]); 

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTypedInput = e.target.value;
    setCurrentInput(newTypedInput);
    if (historyPointer !== -1) { inputBeforeHistoryNav.current = newTypedInput; setHistoryPointer(-1); }
    setSuggestionCycleIndex(-1); setLastTabCompletionPrefix(null);
    if (newTypedInput.startsWith('/') && newTypedInput.length > 1) {
      const commandPrefix = newTypedInput.substring(1).split(' ')[0];
      if (commandPrefix) {
        const allCommandNames = commandRegistry.getAllCommandNames?.() || [];
        const matchingCommands = allCommandNames.filter(name => name.startsWith(commandPrefix));
        const exactMatch = `/${commandPrefix}`;
        const hasPartialMatches = matchingCommands.length > 0 && !matchingCommands.some(cmd => `/${cmd}` === exactMatch);
        setShowSuggestions(hasPartialMatches);
        if (hasPartialMatches) setSuggestions(matchingCommands.map(cmd => `/${cmd}`));
      } else { setShowSuggestions(false); }
    } else { setShowSuggestions(false); }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCurrentInput(`${suggestion} `);
    setShowSuggestions(false); setSuggestions([]);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.ctrlKey || e.metaKey)) {
      switch (e.key) {
        case 'l': case 'k': e.preventDefault(); if (onInput) onInput('/clear'); return;
        case 'r': e.preventDefault(); if (commandHistory.length > 0) setCurrentInput(commandHistory[commandHistory.length - 1]); return;
        case '/': e.preventDefault(); window.dispatchEvent(new CustomEvent('showHelpModal')); return;
        case 't': if (e.shiftKey) { e.preventDefault(); if (onInput) onInput('/themes'); return; } break;
        case 'n': if (e.shiftKey) { e.preventDefault(); if (onInput) onInput('/conversation-new'); return; } break;
      }
    }
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      if (currentInput.trim() && onInput) {
        const commandToSubmit = currentInput.trim();
        onInput(commandToSubmit);
        if (commandToSubmit && (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== commandToSubmit)) {
          setCommandHistory(prev => [...prev, commandToSubmit]);
        }
        setCurrentInput(''); setHistoryPointer(-1); inputBeforeHistoryNav.current = ''; setSuggestionCycleIndex(-1); setLastTabCompletionPrefix(null);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setShowSuggestions(false); if (commandHistory.length === 0) return;
      let newPointer: number;
      if (historyPointer === -1) { inputBeforeHistoryNav.current = currentInput; newPointer = commandHistory.length - 1; } 
      else { newPointer = Math.max(0, historyPointer - 1); }
      setCurrentInput(commandHistory[newPointer]); setHistoryPointer(newPointer); setSuggestionCycleIndex(-1); setLastTabCompletionPrefix(null);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); setShowSuggestions(false); if (historyPointer === -1) return;
      if (historyPointer === commandHistory.length - 1) { setCurrentInput(inputBeforeHistoryNav.current); setHistoryPointer(-1); } 
      else { const newPointer = historyPointer + 1; setCurrentInput(commandHistory[newPointer]); setHistoryPointer(newPointer); }
      setSuggestionCycleIndex(-1); setLastTabCompletionPrefix(null);
    } else if (e.key === 'Tab') {
      e.preventDefault(); setShowSuggestions(false); if (!currentInput.startsWith('/')) return; 
      const parts = currentInput.split(' '); const commandPart = parts[0]; const typedPrefix = commandPart.substring(1); 
      if (typedPrefix === "") { setSuggestionCycleIndex(-1); setLastTabCompletionPrefix(null); return; }
      let currentCycleIndex = suggestionCycleIndex; if (typedPrefix !== lastTabCompletionPrefix) currentCycleIndex = -1; 
      const allCommandNames = commandRegistry.getAllCommandNames ? commandRegistry.getAllCommandNames() : [];
      const matchingCommands = allCommandNames.filter(name => name.startsWith(typedPrefix));
      if (matchingCommands.length > 0) {
        currentCycleIndex = (currentCycleIndex + 1) % matchingCommands.length;
        setCurrentInput(`/${matchingCommands[currentCycleIndex]} `); setSuggestionCycleIndex(currentCycleIndex); setLastTabCompletionPrefix(typedPrefix);
      } else { setSuggestionCycleIndex(-1); }
    } else if (e.key === 'Escape') { setShowSuggestions(false); }
  };

  const handleTerminalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.terminal-container') || target.classList.contains('app-background-layer')) {
      setIsInputFocused(true);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const getLineTypeColor = useCallback((type: TerminalLine['type']) => {
    switch (type) {
      case 'error': return theme.colors.error;
      case 'system': return theme.colors.accent;
      default: return theme.colors.foreground;
    }
  }, [theme.colors]);

  const getUserPrefix = useCallback((line: TerminalLine) => {
    if (line.type === 'input' && line.user === 'user') return `${prompt} `;
    if (line.type === 'output' && line.user === 'claudia' && line.isChatResponse === true) return 'claudia> ';
    if (line.type === 'system') return '[system] ';
    return '';
  }, [prompt]);

  const appBackgroundStyle = useMemo((): React.CSSProperties => ({
    width: '100%', height: '100%',
    background: (config?.enableAppBackground && (config.appBackgroundOverride || theme.effects.appBackground)) || 'transparent',
    position: 'relative', display: 'flex', flexDirection: 'column',
    zIndex: 0, 
  }), [theme.effects.appBackground, config?.enableAppBackground, config?.appBackgroundOverride]);

  const terminalContainerOuterStyle = useMemo((): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'relative', overflow: 'hidden', width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      zIndex: 1, 
    };
    if (config?.terminalBreathing) baseStyle.animation = 'terminalBreathe 4s ease-in-out infinite';
    if (config?.crtGlow) baseStyle.filter = 'brightness(1.1) contrast(1.1)';
    return baseStyle;
  }, [config?.terminalBreathing, config?.crtGlow]);

  const terminalContentWrapperStyle = useMemo((): React.CSSProperties => {
    const showAppBackground = !!(config?.enableAppBackground && (config.appBackgroundOverride || theme.effects.appBackground));
    return {
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: theme.spacing.padding, 
      background: showAppBackground ? 'transparent' : theme.colors.background,
      position: 'relative', zIndex: 2, 
      transition: 'transform 0.3s ease-out',
      transform: (!isWebGLShaderActive && (theme.effects.screenCurvature || config?.screenCurvature)) ? 'scale(1.01, 1.025)' : 'none',
      borderRadius: (!isWebGLShaderActive && (theme.effects.screenCurvature || config?.screenCurvature)) ? '5px' : '0px',
    };
  }, [theme.colors.background, theme.spacing.padding, theme.effects.appBackground, theme.effects.screenCurvature, config?.enableAppBackground, config?.appBackgroundOverride, config?.screenCurvature, isWebGLShaderActive]);

  const outputAreaStyle = useMemo((): React.CSSProperties => ({
    position: 'relative', flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px', 
  }), []);

  const inputAreaStyle = useMemo((): React.CSSProperties => ({
    position: 'relative', paddingTop: theme.spacing.lineSpacing, flexShrink: 0,
  }), [theme.spacing.lineSpacing]);

  return (
    <div className="app-background-layer" style={appBackgroundStyle} onClick={handleTerminalClick}>
      <div
        ref={terminalContainerRef}
        className={`terminal-container ${config?.screenFlicker ? 'screen-flicker' : ''} ${theme.effects.crt ? 'crt-effect' : ''}`}
        data-theme={theme.id}
        style={terminalContainerOuterStyle}
      >
        {!isWebGLShaderActive && (theme.effects.scanlines || config?.scanLines !== 'off') && (
          <div 
            className="scanlines-overlay"
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: 'linear-gradient(transparent 50%, rgba(0,0,0,0.2) 50%)',
              backgroundSize: `100% ${config?.scanLines === 'heavy' ? '3px' : '4px'}`, 
              animation: 'scanmove 10s linear infinite',
              pointerEvents: 'none', zIndex: 3, 
              opacity: config?.scanLines === 'heavy' ? 0.7 : config?.scanLines === 'subtle' ? 0.25 : (theme.effects.scanlines ? 0.4 : 0)
            }}
          />
        )}
        {!isWebGLShaderActive && (theme.effects.noise || config?.staticOverlay) && (
          <div 
            className="noise-overlay"
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.02'/%3E%3C/svg%3E")`,
              pointerEvents: 'none', zIndex: 3, 
              opacity: config?.staticOverlay ? 0.25 : (theme.effects.noiseIntensity ?? 0.15) 
            }}
          />
        )}
        
        {config?.visualArtifacts && ( 
          <div 
            className="visual-artifacts-overlay"
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              pointerEvents: 'none', zIndex: 3, 
              animation: 'artifacts 8s ease-in-out infinite'
            }}
          />
        )}

        <div
          className="terminal-content-wrapper"
          style={terminalContentWrapperStyle}
        >
          <div ref={outputRef} className="terminal-output-area" style={outputAreaStyle}>
            {lines.map((line) => (
              <LineComponent key={line.id} line={line} theme={theme} getLineTypeColor={getLineTypeColor} getUserPrefix={getUserPrefix} isWebGLShaderActive={isWebGLShaderActive} />
            ))}
          </div>
          <div className="terminal-input-area" style={inputAreaStyle}>
            {isLoading && (
              <div className="terminal-line loading" style={{ color: theme.colors.accent, marginBottom: theme.spacing.lineSpacing, display: 'flex', alignItems: 'baseline', opacity: 0.7 }}>
                <span className="line-prefix" style={{ color: theme.colors.accent, marginRight: '0.5em' }}>claudia{'>'} </span>
                <span className="loading-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="loading-dots">
                    <span style={{ animation: 'blink 0.8s infinite' }}>•</span>
                    <span style={{ animation: 'blink 0.8s infinite 0.27s' }}>•</span>
                    <span style={{ animation: 'blink 0.8s infinite 0.54s' }}>•</span>
                  </span>
                  <span style={{ fontSize: '0.9em', fontStyle: 'italic' }}>{loadingMessage}{'.'.repeat(loadingDots)}</span>
                </span>
              </div>
            )}
            <div className="terminal-input-line" style={{ color: theme.colors.foreground, display: 'flex', alignItems: 'center', position: 'relative' }}>
              <span ref={promptRef} className="input-prompt" style={{ color: theme.colors.accent, marginRight: '0.5em' }}>{prompt}{' '}</span>
              <input
                ref={inputRef} type="text" value={currentInput}
                onChange={handleInputChange} onKeyDown={handleKeyDown} 
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => { setIsInputFocused(false); setShowSuggestions(false); }}
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: theme.colors.foreground, fontFamily: 'inherit', fontSize: 'inherit',
                  fontWeight: 'inherit', letterSpacing: 'inherit', flex: 1,
                  caretColor: theme.colors.cursor, transition: 'all 0.2s ease-in-out',
                  ...(theme.effects.glow && !isWebGLShaderActive && { 
                     textShadow: theme.id === 'mainframe70s' ? `0 0 1px ${theme.colors.foreground}90, 0 0 3px ${theme.colors.foreground}50` : `0 0 2px ${theme.colors.foreground}60`
                  }),
                  ...(theme.effects.glow && isWebGLShaderActive && { 
                     textShadow: `0 0 5px ${theme.colors.foreground}45, 0 0 2px ${theme.colors.foreground}30` 
                  }),
                  ...(isInputFocused && {
                    filter: 'brightness(1.1)',
                    textShadow: theme.effects.glow 
                      ? (isWebGLShaderActive ? `0 0 5px ${theme.colors.foreground}50, 0 0 2px ${theme.colors.cursor}35` : `0 0 5px ${theme.colors.foreground}80, 0 0 2px ${theme.colors.cursor}60`)
                      : `0 0 2px ${theme.colors.cursor}40`
                  })
                }}
                autoComplete="off" spellCheck={false}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-box" style={{ left: suggestionsLeftOffset }} >
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="suggestion-item" onClick={() => handleSuggestionClick(suggestion)} onMouseDown={(e) => e.preventDefault()}>{suggestion}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <style>{`
          .terminal-container {
            font-smooth: never;
            -webkit-font-smoothing: none;
            -moz-osx-font-smoothing: grayscale;
            image-rendering: pixelated; 
          }

          @keyframes blink { 0%, 40% { opacity: 1; } 60%, 100% { opacity: 0.3; } }
          @keyframes scanmove { 0% { background-position: 0 0; } 100% { background-position: 0 100%; } }
          @keyframes terminalBreathe {
            0%, 100% { transform: scale(1); filter: brightness(1) ${config?.crtGlow ? 'contrast(1.1)' : 'contrast(1)'}; }
            50% { transform: scale(1.002); filter: brightness(1.05) ${config?.crtGlow ? 'contrast(1.15)' : 'contrast(1.05)'}; }
          }
          @keyframes artifacts { 
            0%, 100% { opacity: 0; }
            2% { opacity: 0.3; background: linear-gradient(90deg, transparent 0%, rgba(255,0,0,0.1) 50%, transparent 100%); }
            4% { opacity: 0; } 85% { opacity: 0; }
            87% { opacity: 0.2; background: linear-gradient(180deg, transparent 0%, rgba(0,255,255,0.1) 50%, transparent 100%); }
            89% { opacity: 0; }
          }
          .screen-flicker { animation: screenFlicker ${config?.flickerIntensity ? (2 / config.flickerIntensity) : 6}s ease-in-out infinite; }
          @keyframes screenFlicker {
            0%, 100% { opacity: 1; filter: brightness(1); } 98% { opacity: 1; filter: brightness(1); }
            99% { opacity: ${1 - (config?.flickerIntensity || 0.3)}; filter: brightness(0.8); }
            99.5% { opacity: 1; filter: brightness(1.2); }
          }
          .terminal-output-area::-webkit-scrollbar { width: 8px; }
          .terminal-output-area::-webkit-scrollbar-track { background: ${theme.colors.background}30; }
          .terminal-output-area::-webkit-scrollbar-thumb { background: ${theme.colors.accent}60; border-radius: 4px; }
          .terminal-output-area::-webkit-scrollbar-thumb:hover { background: ${theme.colors.accent}80; }
          .terminal-output-area { scrollbar-width: thin; scrollbar-color: ${theme.colors.accent}60 ${theme.colors.background}30; }
          
          .suggestions-box {
            position: absolute; bottom: 100%; right: 0; max-height: 150px; overflow-y: auto;
            background-color: ${theme.colors.background || '#1e1e1e'}EE; 
            border: 1px solid ${theme.colors.accent || '#00FFFF'}80; border-bottom: none; 
            border-radius: 4px 4px 0 0; z-index: 100; color: ${theme.colors.foreground || '#FFFFFF'};
            font-family: ${theme.font.family}; font-size: calc(${theme.font.size} * 0.9); 
            box-shadow: 0 -2px 5px rgba(0,0,0,0.2); 
          }
          .suggestion-item {
            padding: 6px 10px; cursor: pointer; border-bottom: 1px solid ${theme.colors.accent || '#00FFFF'}30;
            white-space: nowrap; transition: all 0.15s ease-in-out; position: relative; overflow: hidden;
          }
          .suggestion-item:last-child { border-bottom: none; }
          .suggestion-item::before {
            content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, ${theme.colors.accent}20, transparent);
            transition: left 0.3s ease-in-out;
          }
          .suggestion-item:hover {
            background-color: ${theme.colors.accent || '#00FFFF'}40; color: ${theme.colors.background};
            transform: translateX(2px); box-shadow: 0 2px 4px ${theme.colors.accent}30;
          }
          .suggestion-item:hover::before { left: 100%; }

          ${theme.effects.flicker ? `
            .terminal-content-wrapper { 
              animation: contentFlicker 0.15s infinite linear alternate;
            }
            @keyframes contentFlicker { 0% { opacity: 1; } 100% { opacity: 0.98; } }
          ` : ''}

          ${theme.effects.crt ? `
            .terminal-container.crt-effect { 
              border-radius: 15px; 
              box-shadow: 
                inset 0 0 30px ${theme.colors.background}99, 
                inset 0 0 60px rgba(100,100,150,0.15), 
                0 0 15px rgba(0,0,0,0.5), 
                0 0 40px ${theme.colors.accent}20; 
            }
            ${!isWebGLShaderActive ? `
            .terminal-container.crt-effect::before { 
              content: '';
              position: absolute;
              top: 0; left: 0; right: 0; bottom: 0;
              border-radius: inherit; 
              background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 90%, rgba(0,0,0,0.5) 100%);
              pointer-events: none;
              z-index: 1; /* Relative to .terminal-container, below .terminal-content-wrapper */
            }
            ` : ''}
          ` : ''}
        `}</style>
      </div>
    </div>
  );
};
