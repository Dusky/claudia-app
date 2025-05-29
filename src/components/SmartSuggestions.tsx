import React, { useState, useEffect, useCallback } from 'react';
import type { TerminalTheme } from '../terminal/themes';
import { intelligentInteraction, type Suggestion } from '../services/intelligentInteraction';

interface SmartSuggestionsProps {
  input: string;
  cursorPosition: number;
  theme: TerminalTheme;
  onSuggestionSelect: (suggestion: string) => void;
  isVisible: boolean;
  currentContext?: string;
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  input,
  cursorPosition,
  theme,
  onSuggestionSelect,
  isVisible,
  currentContext = ''
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showWorkflowTips, setShowWorkflowTips] = useState(false);

  // Get suggestions when input changes
  useEffect(() => {
    if (!isVisible || !input.trim()) {
      setSuggestions([]);
      return;
    }

    const newSuggestions = intelligentInteraction.getSuggestions(input, currentContext);
    setSuggestions(newSuggestions);
    setSelectedIndex(0);
  }, [input, currentContext, isVisible]);

  // Handle keyboard navigation
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!isVisible || suggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Tab':
      case 'Enter':
        if (event.key === 'Tab') event.preventDefault();
        if (suggestions[selectedIndex]) {
          onSuggestionSelect(suggestions[selectedIndex].text);
        }
        break;
      case 'Escape':
        setSuggestions([]);
        break;
    }
  }, [isVisible, suggestions, selectedIndex, onSuggestionSelect]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '120px',
    left: '20px',
    right: '20px',
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: `${theme.colors.background}f0`,
    border: `1px solid ${theme.colors.accent}60`,
    borderRadius: '8px',
    boxShadow: theme.effects.glow 
      ? `0 4px 20px ${theme.colors.accent}30`
      : '0 4px 20px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(10px)',
    zIndex: 1000,
    maxHeight: '300px',
    overflowY: 'auto',
  };

  const headerStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: `1px solid ${theme.colors.accent}40`,
    fontSize: '12px',
    fontWeight: 'bold',
    color: theme.colors.accent,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const suggestionStyle = (index: number): React.CSSProperties => ({
    padding: '8px 12px',
    cursor: 'pointer',
    borderBottom: index < suggestions.length - 1 ? `1px solid ${theme.colors.accent}20` : 'none',
    backgroundColor: index === selectedIndex ? `${theme.colors.accent}20` : 'transparent',
    transition: 'background-color 0.2s ease',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  });

  const suggestionTextStyle: React.CSSProperties = {
    color: theme.colors.foreground,
    fontSize: '14px',
    fontFamily: 'monospace',
    marginBottom: '2px',
  };

  const suggestionDescStyle: React.CSSProperties = {
    color: `${theme.colors.foreground}80`,
    fontSize: '11px',
    fontStyle: 'italic',
  };

  const badgeStyle = (type: string): React.CSSProperties => ({
    fontSize: '9px',
    padding: '2px 6px',
    borderRadius: '3px',
    color: theme.colors.background,
    backgroundColor: 
      type === 'command' ? theme.colors.accent :
      type === 'workflow' ? '#4CAF50' :
      type === 'correction' ? '#FF9800' :
      '#9C27B0',
    marginLeft: '8px',
    alignSelf: 'flex-start',
  });

  const confidenceBarStyle = (confidence: number): React.CSSProperties => ({
    width: '40px',
    height: '3px',
    backgroundColor: `${theme.colors.accent}20`,
    borderRadius: '2px',
    overflow: 'hidden',
    marginLeft: '8px',
    alignSelf: 'center',
  });

  const confidenceFillStyle = (confidence: number): React.CSSProperties => ({
    width: `${confidence * 100}%`,
    height: '100%',
    backgroundColor: confidence > 0.7 ? '#4CAF50' : confidence > 0.4 ? '#FF9800' : '#F44336',
    transition: 'width 0.3s ease',
  });

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'command': return '⚡';
      case 'workflow': return '🔄';
      case 'correction': return '🔧';
      case 'argument': return '📝';
      default: return '💡';
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span>💡 Smart Suggestions</span>
        <span style={{ fontSize: '10px', opacity: 0.7 }}>
          ↑↓ navigate • Tab/Enter select • Esc close
        </span>
      </div>
      
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          style={suggestionStyle(index)}
          onClick={() => onSuggestionSelect(suggestion.text)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div style={{ flex: 1 }}>
            <div style={suggestionTextStyle}>
              {getTypeIcon(suggestion.type)} {suggestion.text}
            </div>
            <div style={suggestionDescStyle}>
              {suggestion.description}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={badgeStyle(suggestion.type)}>
              {suggestion.type.toUpperCase()}
            </div>
            <div style={confidenceBarStyle(suggestion.confidence)}>
              <div style={confidenceFillStyle(suggestion.confidence)} />
            </div>
          </div>
        </div>
      ))}
      
      {suggestions.length > 0 && (
        <div style={{
          padding: '6px 12px',
          fontSize: '10px',
          color: `${theme.colors.foreground}60`,
          borderTop: `1px solid ${theme.colors.accent}20`,
          textAlign: 'center',
        }}>
          ClaudiaOS learns from your usage patterns to provide better suggestions
        </div>
      )}
    </div>
  );
};

export default SmartSuggestions;