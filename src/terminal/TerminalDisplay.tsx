import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { TerminalTheme } from './themes';
import type { CommandRegistry } from '../commands/types';
import type { ConfigSettings } from '../store/appStore';
import { SecureContentRenderer } from './SecureContentRenderer';

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error';
  content: string;
  timestamp: string;
  user?: 'user' | 'claudia';
  isChatResponse?: boolean; // New flag to identify AI chat responses
  metadata?: {
    commandSuccess?: boolean;
    commandExecuting?: boolean;
    [key: string]: any;
  };
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

// Helper function to group consecutive messages
const groupMessages = (lines: TerminalLine[]): Array<{ type: 'single' | 'group'; lines: TerminalLine[]; groupType?: 'claudia' | 'user' | 'system' }> => {
  const groups: Array<{ type: 'single' | 'group'; lines: TerminalLine[]; groupType?: 'claudia' | 'user' | 'system' }> = [];
  let currentGroup: TerminalLine[] = [];
  let currentGroupType: 'claudia' | 'user' | 'system' | null = null;

  for (const line of lines) {
    // Determine line type with improved logic
    let lineType: 'claudia' | 'user' | 'system' | null = null;
    
    // Explicit user field takes priority
    if (line.user === 'claudia') {
      lineType = 'claudia';
    } else if (line.user === 'user') {
      lineType = 'user';
    } else if (line.user === 'system' || line.type === 'system' || line.type === 'error') {
      // System messages, errors, or anything explicitly marked as system
      lineType = 'system';
    } else if (line.type === 'output' && line.isChatResponse) {
      // AI chat responses should be grouped as claudia even without explicit user field
      lineType = 'claudia';
    } else if (line.type === 'output') {
      // Other output (commands, etc.) - treat as claudia for consistency
      lineType = 'claudia';
    } else if (line.type === 'input') {
      // Input lines should always be user (fallback in case user field missing)
      lineType = 'user';
    }

    // Group consecutive messages of same type, with minimum gap consideration
    const shouldGroup = lineType && lineType === currentGroupType && currentGroup.length > 0;
    
    if (shouldGroup) {
      // Continue the current group
      currentGroup.push(line);
    } else {
      // End current group if it exists
      if (currentGroup.length > 0) {
        const groupType = currentGroup.length > 1 ? 'group' : 'single';
        groups.push({ type: groupType, lines: [...currentGroup], groupType: currentGroupType || undefined });
      }
      // Start new group
      currentGroup = [line];
      currentGroupType = lineType;
    }
  }

  // Handle remaining group
  if (currentGroup.length > 0) {
    const groupType = currentGroup.length > 1 ? 'group' : 'single';
    groups.push({ type: groupType, lines: [...currentGroup], groupType: currentGroupType || undefined });
  }

  return groups;
};

const LineComponent = React.memo(({ line, theme, getLineTypeColor, getUserPrefix, isWebGLShaderActive, isInGroup = false }: {
  line: TerminalLine;
  theme: TerminalTheme;
  getLineTypeColor: (type: TerminalLine['type']) => string;
  getUserPrefix: (line: TerminalLine) => string;
  isWebGLShaderActive: boolean;
  isInGroup?: boolean;
}) => {
  let textShadowStyle = {};
  if (theme.effects.glow) {
    if (isWebGLShaderActive) {
      // Subtle glow/halo when WebGL shader is active, slightly more visible
      textShadowStyle = { textShadow: `0 0 5px ${getLineTypeColor(line.type)}50, 0 0 2px ${getLineTypeColor(line.type)}30` };
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

  // Add command success feedback styling
  const isCommandSuccess = line.metadata?.commandSuccess;
  const successStyle = isCommandSuccess ? {
    borderLeft: `2px solid ${theme.colors.success}`,
    paddingLeft: '8px',
    background: `linear-gradient(90deg, ${theme.colors.success}10 0%, transparent 50%)`,
    animation: 'commandSuccess 0.8s ease-out'
  } : {};

  return (
    <div
      className={`terminal-line terminal-line-${line.type} ${isInGroup ? 'in-group' : ''} ${isCommandSuccess ? 'command-success' : ''}`}
      data-type={line.type}
      style={{
        color: getLineTypeColor(line.type),
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        display: 'flex',
        alignItems: 'baseline',
        marginBottom: isInGroup ? '4px' : '12px',
        paddingLeft: isInGroup ? '12px' : '0',
        ...textShadowStyle,
        ...successStyle
      }}
    >
      <span className="line-prefix" style={{ 
        color: theme.colors.accent, 
        marginRight: '0.5em',
        fontSize: isInGroup ? '0.9em' : '1em',
        opacity: isInGroup ? 0.7 : 1
      }}>
        {isInGroup ? '' : getUserPrefix(line)}
      </span>
      <span className="line-content" style={{ flex: 1 }}>
        <SecureContentRenderer content={line.content} />
      </span>
    </div>
  );
});

const MessageGroup = React.memo(({ group, theme, getLineTypeColor, getUserPrefix, isWebGLShaderActive }: {
  group: { type: 'single' | 'group'; lines: TerminalLine[]; groupType?: 'claudia' | 'user' | 'system' };
  theme: TerminalTheme;
  getLineTypeColor: (type: TerminalLine['type']) => string;
  getUserPrefix: (line: TerminalLine) => string;
  isWebGLShaderActive: boolean;
}) => {
  if (group.type === 'single') {
    return (
      <>
        {group.lines.map((line) => (
          <LineComponent 
            key={line.id} 
            line={line} 
            theme={theme} 
            getLineTypeColor={getLineTypeColor} 
            getUserPrefix={getUserPrefix} 
            isWebGLShaderActive={isWebGLShaderActive} 
          />
        ))}
      </>
    );
  }

  // Group styling with better theme support
  const getGroupStyles = () => {
    const baseStyles = {
      marginBottom: '16px',
      padding: '12px 16px',
      borderRadius: '6px',
      position: 'relative' as const,
      background: 'rgba(0, 0, 0, 0.15)',
      border: `1px solid ${theme.colors.accent}15`,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    };

    if (group.groupType === 'claudia') {
      return {
        ...baseStyles,
        borderLeft: `4px solid ${theme.colors.accent}`,
        background: `linear-gradient(90deg, ${theme.colors.accent}10, ${theme.colors.accent}05 30%, transparent 70%)`,
        boxShadow: `0 2px 8px ${theme.colors.accent}20, inset 0 1px 0 ${theme.colors.accent}10`,
      };
    } else if (group.groupType === 'user') {
      return {
        ...baseStyles,
        borderLeft: `4px solid ${theme.colors.secondary || theme.colors.foreground}`,
        background: `linear-gradient(90deg, ${theme.colors.secondary || theme.colors.foreground}08, transparent 50%)`,
        boxShadow: `0 2px 8px ${theme.colors.secondary || theme.colors.foreground}15`,
      };
    } else {
      return {
        ...baseStyles,
        borderLeft: `4px solid ${theme.colors.error}`,
        background: `linear-gradient(90deg, ${theme.colors.error}08, transparent 50%)`,
        boxShadow: `0 2px 8px ${theme.colors.error}15`,
      };
    }
  };

  return (
    <div className={`message-group message-group-${group.groupType}`} style={getGroupStyles()}>
      {/* Group header */}
      <div className="group-header" style={{
        fontSize: '0.75em',
        color: group.groupType === 'claudia' ? theme.colors.accent 
             : group.groupType === 'user' ? (theme.colors.secondary || theme.colors.foreground)
             : theme.colors.error,
        marginBottom: '10px',
        opacity: 0.9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span style={{ 
          width: '6px', 
          height: '6px', 
          borderRadius: '50%', 
          backgroundColor: 'currentColor',
          opacity: 0.8 
        }} />
        {getUserPrefix(group.lines[0]).replace('>', '').trim()}
      </div>
      
      {/* Group content */}
      {group.lines.map((line) => (
        <LineComponent 
          key={line.id} 
          line={line} 
          theme={theme} 
          getLineTypeColor={getLineTypeColor} 
          getUserPrefix={getUserPrefix} 
          isWebGLShaderActive={isWebGLShaderActive} 
          isInGroup={true}
        />
      ))}
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
    const messages = [
      'thinking...',
      'processing your request...',
      'analyzing context...',
      'generating response...',
      'crafting the perfect reply...',
      'accessing knowledge base...',
      'almost ready...',
      'finalizing thoughts...'
    ];
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
        case 't': 
          if (e.shiftKey) { 
            e.preventDefault(); 
            if (onInput) onInput('/themes'); 
            return; 
          } else {
            e.preventDefault();
            if (onInput) onInput('/theme claudia');
            return;
          }
        case 'n': if (e.shiftKey) { e.preventDefault(); if (onInput) onInput('/conversation-new'); return; } break;
        case 'i': e.preventDefault(); if (onInput) onInput('/imagine '); return;
        case 'a': e.preventDefault(); if (onInput) onInput('/avatar '); return;
        case 'o': e.preventDefault(); window.dispatchEvent(new CustomEvent('openAppSettings')); return;
        case 'p': e.preventDefault(); window.dispatchEvent(new CustomEvent('openPersonalityModal')); return;
        case 'd': e.preventDefault(); if (onInput) onInput('/debug'); return;
        case ',': e.preventDefault(); window.dispatchEvent(new CustomEvent('openConfig')); return;
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
    if (line.user === 'user') return `${prompt} `;
    if (line.user === 'claudia') return 'claudia> ';
    if (line.type === 'system' || line.type === 'error') return '[system] ';
    return '';
  }, [prompt]);

  const effectiveAppBackground = useMemo(() => {
    if (config?.enableAppBackground) {
      if (config.appBackgroundOverride && config.appBackgroundOverride.trim().length > 0) {
        return config.appBackgroundOverride;
      }
      if (theme.effects.appBackground && theme.effects.appBackground.trim().length > 0) {
        return theme.effects.appBackground;
      }
    }
    return 'transparent'; // Default if no app background is active or defined
  }, [theme.effects.appBackground, config?.enableAppBackground, config?.appBackgroundOverride]);

  const appBackgroundStyle = useMemo((): React.CSSProperties => ({
    width: '100%', height: '100%',
    background: effectiveAppBackground, // This is the "screen wallpaper"
    position: 'relative', display: 'flex', flexDirection: 'column',
    zIndex: 0, 
  }), [effectiveAppBackground]);

  const terminalContainerOuterStyle = useMemo((): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'relative', overflow: 'hidden', width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      zIndex: 1, // Sits on top of appBackgroundStyle
    };
    if (config?.terminalBreathing) baseStyle.animation = 'terminalBreathe 4s ease-in-out infinite';
    if (config?.crtGlow) baseStyle.filter = 'brightness(1.1) contrast(1.1)';
    return baseStyle;
  }, [config?.terminalBreathing, config?.crtGlow]);

  const terminalContentWrapperStyle = useMemo((): React.CSSProperties => {
    // This wrapper holds the text lines. It should be transparent if appBackgroundStyle is showing a wallpaper.
    // Otherwise, it uses the theme's default color for the text area.
    const useTransparentBgForContent = effectiveAppBackground !== 'transparent';
    return {
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: theme.spacing.padding, 
      background: useTransparentBgForContent ? 'transparent' : theme.colors.background,
      position: 'relative', zIndex: 2, // Sits on top of terminalContainerOuterStyle (and its ::before for CSS vignette)
      transition: 'transform 0.3s ease-out',
      transform: (!isWebGLShaderActive && (theme.effects.screenCurvature || config?.screenCurvature)) ? 'scale(1.01, 1.025)' : 'none',
      borderRadius: (!isWebGLShaderActive && (theme.effects.screenCurvature || config?.screenCurvature)) ? '5px' : '0px',
    };
  }, [effectiveAppBackground, theme.colors.background, theme.spacing.padding, theme.effects.screenCurvature, config?.screenCurvature, isWebGLShaderActive]);

  const outputAreaStyle = useMemo((): React.CSSProperties => ({
    position: 'relative', flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px', 
  }), []);

  const inputAreaStyle = useMemo((): React.CSSProperties => ({
    position: 'relative', paddingTop: theme.spacing.lineSpacing, flexShrink: 0,
  }), [theme.spacing.lineSpacing]);

  return (
    <>
      {/* Off-screen accessibility log for screen readers */}
      <div
        ref={accessibilityLogRef}
        role="log"
        aria-live="polite"
        aria-label="Terminal output for screen readers"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)'
        }}
      />
      
      {/* Hidden accessibility buffer for screen reader navigation */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)'
        }}
      >
        {accessibilityBuffer.map((line, index) => (
          <div key={`accessibility-${index}`}>{line}</div>
        ))}
      </div>
      
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
              backgroundImage: 'linear-gradient(transparent 50%, rgba(0,0,0,0.4) 50%)',
              backgroundSize: `100% ${config?.scanLines === 'heavy' ? '2px' : config?.scanLines === 'subtle' ? '4px' : '3px'}`, 
              animation: 'scanmove 8s linear infinite',
              pointerEvents: 'none', zIndex: 3, // Above terminal-content-wrapper
              opacity: config?.scanLines === 'heavy' ? 0.8 : config?.scanLines === 'subtle' ? 0.4 : (theme.effects.scanlines ? 0.6 : 0)
            }}
          />
        )}
        {!isWebGLShaderActive && (theme.effects.noise || config?.staticOverlay) && (
          <div 
            className="noise-overlay"
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`,
              pointerEvents: 'none', zIndex: 3, // Above terminal-content-wrapper
              opacity: config?.staticOverlay ? 0.4 : (theme.effects.noiseIntensity ?? 0.3),
              animation: 'noiseShimmer 0.1s linear infinite alternate'
            }}
          />
        )}
        
        {config?.visualArtifacts && ( 
          <div 
            className="visual-artifacts-overlay"
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              pointerEvents: 'none', zIndex: 3, // Above terminal-content-wrapper
              animation: 'artifacts 8s ease-in-out infinite'
            }}
          />
        )}

        <div
          className="terminal-content-wrapper"
          style={terminalContentWrapperStyle}
        >
          <div ref={outputRef} className="terminal-output-area" style={outputAreaStyle}>
            {useMemo(() => {
              const messageGroups = groupMessages(lines);
              
              return messageGroups.map((group, index) => (
                <MessageGroup 
                  key={`group-${index}-${group.lines[0]?.id}`}
                  group={group}
                  theme={theme}
                  getLineTypeColor={getLineTypeColor}
                  getUserPrefix={getUserPrefix}
                  isWebGLShaderActive={isWebGLShaderActive}
                />
              ));
            }, [lines, theme, getLineTypeColor, getUserPrefix, isWebGLShaderActive])}
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
                     textShadow: `0 0 5px ${theme.colors.foreground}55, 0 0 2px ${theme.colors.foreground}35` 
                  }),
                  ...(isInputFocused && {
                    filter: 'brightness(1.1)',
                    textShadow: theme.effects.glow 
                      ? (isWebGLShaderActive ? `0 0 5px ${theme.colors.foreground}60, 0 0 2px ${theme.colors.cursor}45` : `0 0 5px ${theme.colors.foreground}80, 0 0 2px ${theme.colors.cursor}60`)
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
          @keyframes noiseShimmer { 0% { opacity: 0.8; } 100% { opacity: 1.2; } }
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

          .message-group {
            animation: messageGroupAppear 0.3s ease-out;
            transform-origin: left center;
          }
          
          @keyframes messageGroupAppear {
            0% { 
              opacity: 0; 
              transform: translateX(-10px) scale(0.98);
            }
            100% { 
              opacity: 1; 
              transform: translateX(0) scale(1);
            }
          }
          
          .message-group:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            transition: all 0.2s ease-in-out;
          }
          
          .message-group-claudia:hover {
            box-shadow: 0 4px 12px ${theme.colors.accent}25 !important;
          }
          
          .message-group-user:hover {
            box-shadow: 0 4px 12px ${theme.colors.secondary || theme.colors.foreground}20 !important;
          }
          
          .message-group-system:hover {
            box-shadow: 0 4px 12px ${theme.colors.error}20 !important;
          }
          
          .terminal-line.in-group {
            transition: all 0.15s ease-in-out;
          }
          
          .terminal-line.in-group:hover {
            padding-left: 16px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 4px;
          }

          ${theme.effects.crt ? `
            .terminal-container.crt-effect { 
              border-radius: 20px; 
              box-shadow: 
                inset 0 0 50px ${theme.colors.background}aa, 
                inset 0 0 80px rgba(100,100,150,0.25), 
                0 0 20px rgba(0,0,0,0.7), 
                0 0 60px ${theme.colors.accent}30; 
              ${!isWebGLShaderActive ? 'transform: perspective(1000px) rotateX(0.5deg) rotateY(0deg);' : ''}
            }
            ${!isWebGLShaderActive ? `
            .terminal-container.crt-effect::before { 
              content: '';
              position: absolute;
              top: 0; left: 0; right: 0; bottom: 0;
              border-radius: inherit; 
              background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0.7) 100%);
              pointer-events: none;
              z-index: 1; /* Relative to .terminal-container, below .terminal-content-wrapper */
            }
            ` : ''}
          ` : ''}
        `}</style>
      </div>
    </div>
    </>
  );
};
