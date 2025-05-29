import React, { useState, useMemo } from 'react';
import type { Command } from '../commands/types';
import type { TerminalTheme } from '../terminal/themes';
import styles from './HelpModal.module.css';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  commandRegistry: any;
  commandName?: string | null;
  theme: TerminalTheme;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  commandRegistry,
  theme
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const commands = useMemo(() => {
    if (!commandRegistry || typeof commandRegistry.getAllCommands !== 'function') {
      return [];
    }
    return commandRegistry.getAllCommands();
  }, [commandRegistry]);

  // Categorize commands
  const categorizedCommands = useMemo(() => {
    const categories: Record<string, Command[]> = {
      'Basic Commands': commands.filter((cmd: Command) => 
        ['help', 'clear', 'ask'].includes(cmd.name)
      ),
      'Conversation Tools': commands.filter((cmd: Command) => 
        ['retry', 'continue', 'undo', 'context'].includes(cmd.name)
      ),
      'Conversation Management': commands.filter((cmd: Command) => 
        cmd.name.startsWith('conversation') || 
        ['list-conversations', 'new-conversation', 'load-conversation', 'delete-conversation', 'rename-conversation'].includes(cmd.name)
      ),
      'Personality': commands.filter((cmd: Command) => 
        cmd.name.includes('personality') || cmd.name === 'personality-gui'
      ),
      'Avatar & Images': commands.filter((cmd: Command) => 
        ['avatar', 'imagine'].includes(cmd.name)
      ),
      'System': commands.filter((cmd: Command) => 
        ['theme', 'themes', 'providers', 'test', 'config', 'debug'].includes(cmd.name)
      )
    };

    const allCategorized: Command[] = Object.values(categories).flat();
    categories['Other'] = commands.filter((cmd: Command) => !allCategorized.includes(cmd));

    // Filter by search term
    if (searchTerm) {
      Object.keys(categories).forEach(category => {
        categories[category] = categories[category].filter((cmd: Command) =>
          cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cmd.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (cmd.aliases && cmd.aliases.some((alias: string) => alias.toLowerCase().includes(searchTerm.toLowerCase())))
        );
      });
    }

    // Remove empty categories
    Object.keys(categories).forEach(category => {
      if (categories[category].length === 0) {
        delete categories[category];
      }
    });

    return categories;
  }, [commands, searchTerm]);

  // Handle ESC key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={`${styles.modal} ${styles[theme.id] || ''}`}
        style={{
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.foreground || '#333',
          color: theme.colors.foreground
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className={styles.header}>
          <h2 className={styles.title} style={{ color: theme.colors.accent }}>
            🤖 Claudia AI - Command Help
          </h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            style={{ color: theme.colors.foreground }}
            title="Close help (ESC)"
          >
            ×
          </button>
        </div>

        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search commands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.foreground || '#333',
              color: theme.colors.foreground
            }}
            autoFocus
          />
        </div>

        <div className={styles.content}>
          {Object.keys(categorizedCommands).length === 0 ? (
            <div className={styles.noResults}>
              No commands found matching "{searchTerm}"
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: `${theme.colors.accent}15`, borderRadius: '6px', border: `1px solid ${theme.colors.accent}` }}>
                <strong>💬 Pro tip:</strong> Just type naturally - anything without a "/" is sent directly to me for conversation!
              </div>

              {Object.entries(categorizedCommands).map(([category, categoryCommands]) => (
                <div key={category} className={styles.category}>
                  <h3 className={styles.categoryTitle} style={{ color: theme.colors.accent }}>
                    {category} ({categoryCommands.length})
                  </h3>
                  
                  <div className={styles.commandGrid}>
                    {categoryCommands.map((cmd: Command) => (
                      <div 
                        key={cmd.name}
                        className={styles.commandItem}
                        style={{
                          borderColor: theme.colors.foreground || '#333',
                          backgroundColor: `${theme.colors.accent}08`
                        }}
                      >
                        <div className={styles.commandName} style={{ color: theme.colors.accent }}>
                          /{cmd.name}
                        </div>
                        <div className={styles.commandDescription}>
                          {cmd.description}
                        </div>
                        {cmd.aliases && cmd.aliases.length > 0 && (
                          <div className={styles.commandAliases}>
                            Aliases: {cmd.aliases.map((alias: string) => `/${alias}`).join(', ')}
                          </div>
                        )}
                        {(cmd.requiresAI || cmd.requiresImageGen) && (
                          <div style={{ marginTop: '4px', fontSize: '11px' }}>
                            {cmd.requiresAI && <span style={{ marginRight: '8px' }} title="Requires AI provider">🤖 AI</span>}
                            {cmd.requiresImageGen && <span title="Requires image provider">🖼️ Images</span>}
                          </div>
                        )}
                        
                        <div className={styles.tooltip}>
                          {cmd.usage || `/${cmd.name}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};