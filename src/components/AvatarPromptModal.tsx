import React from 'react';
import type { AvatarState } from '../avatar/types';
import type { TerminalTheme } from '../terminal/themes';

interface AvatarPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  avatarState: AvatarState;
  theme: TerminalTheme;
}

export const AvatarPromptModal: React.FC<AvatarPromptModalProps> = ({
  isOpen,
  onClose,
  avatarState,
  theme
}) => {
  if (!isOpen) return null;

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    backdropFilter: 'blur(8px)',
  };

  const contentStyle: React.CSSProperties = {
    backgroundColor: theme.colors.background,
    border: `2px solid ${theme.colors.accent}`,
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'auto',
    color: theme.colors.foreground,
    boxShadow: theme.effects.glow 
      ? `0 0 30px ${theme.colors.accent}60`
      : '0 8px 32px rgba(0, 0, 0, 0.5)',
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: theme.colors.accent,
    borderBottom: `1px solid ${theme.colors.accent}40`,
    paddingBottom: '8px',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '16px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: theme.colors.accent,
    marginBottom: '4px',
    display: 'block',
  };

  const textStyle: React.CSSProperties = {
    fontSize: '13px',
    lineHeight: '1.4',
    backgroundColor: `${theme.colors.background}80`,
    border: `1px solid ${theme.colors.accent}40`,
    borderRadius: '6px',
    padding: '8px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  };

  const infoStyle: React.CSSProperties = {
    fontSize: '12px',
    color: theme.colors.foreground + '80',
    marginBottom: '2px',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: theme.colors.accent,
    color: theme.colors.background,
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '16px',
    float: 'right',
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Prompt copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy prompt:', err);
    });
  };

  const formatTimestamp = (iso: string) => {
    return new Date(iso).toLocaleString();
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          🎨 Avatar Generation Details
        </div>

        {/* Current State */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Current State:</label>
          <div style={infoStyle}>
            Expression: {avatarState.expression} | Pose: {avatarState.pose} | Action: {avatarState.action}
          </div>
          {avatarState.generatedAt && (
            <div style={infoStyle}>
              Generated: {formatTimestamp(avatarState.generatedAt)}
            </div>
          )}
          {avatarState.generationModel && (
            <div style={infoStyle}>
              Model: {avatarState.generationModel}
            </div>
          )}
        </div>

        {/* Generation Prompt */}
        {avatarState.generationPrompt && (
          <div style={sectionStyle}>
            <label style={labelStyle}>
              Generation Prompt:
              <button 
                onClick={() => copyToClipboard(avatarState.generationPrompt || '')}
                style={{...buttonStyle, fontSize: '10px', padding: '4px 8px', marginLeft: '8px', float: 'none'}}
              >
                Copy
              </button>
            </label>
            <div style={textStyle}>
              {avatarState.generationPrompt}
            </div>
          </div>
        )}

        {/* Negative Prompt */}
        {avatarState.negativePrompt && (
          <div style={sectionStyle}>
            <label style={labelStyle}>
              Negative Prompt:
              <button 
                onClick={() => copyToClipboard(avatarState.negativePrompt || '')}
                style={{...buttonStyle, fontSize: '10px', padding: '4px 8px', marginLeft: '8px', float: 'none'}}
              >
                Copy
              </button>
            </label>
            <div style={textStyle}>
              {avatarState.negativePrompt}
            </div>
          </div>
        )}

        {/* No prompt available message */}
        {!avatarState.generationPrompt && (
          <div style={sectionStyle}>
            <div style={{...infoStyle, textAlign: 'center', padding: '20px'}}>
              No generation prompt available for this avatar.
              <br />
              Generate a new avatar to see prompt details.
            </div>
          </div>
        )}

        <button style={buttonStyle} onClick={onClose}>
          Close
        </button>
        <div style={{clear: 'both'}} />
      </div>
    </div>
  );
};

export default AvatarPromptModal;