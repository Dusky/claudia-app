import React, { useState, useEffect, useRef } from 'react';
import type { StorageService, Conversation } from '../storage/types';
import type { TerminalTheme } from '../terminal/themes';
import styles from './TopBar.module.css';

interface TopBarProps {
  theme: TerminalTheme;
  storage: StorageService;
  activeConversationId: string | null;
  onConversationSwitch: (conversationId: string) => void;
  onNewConversation: () => void;
  onConversationDelete: (conversationId: string) => void;
  onConversationRename: (conversationId: string, newTitle: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  theme,
  storage,
  activeConversationId,
  onConversationSwitch,
  onNewConversation,
  onConversationDelete,
  onConversationRename
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingConversation, setEditingConversation] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load conversations when component mounts or active conversation changes
  useEffect(() => {
    loadConversations();
  }, [activeConversationId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setEditingConversation(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadConversations = async () => {
    try {
      const allConversations = await storage.getAllConversations();
      setConversations(allConversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleNewConversation = async () => {
    setIsLoading(true);
    try {
      await onNewConversation();
      await loadConversations();
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    } finally {
      setIsLoading(false);
      setIsDropdownOpen(false);
    }
  };

  const handleConversationSwitch = async (conversationId: string) => {
    if (conversationId === activeConversationId) {
      setIsDropdownOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await onConversationSwitch(conversationId);
    } catch (error) {
      console.error('Failed to switch conversation:', error);
    } finally {
      setIsLoading(false);
      setIsDropdownOpen(false);
    }
  };

  const handleDelete = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    if (confirm(`Are you sure you want to delete "${conversation.title}"?`)) {
      setIsLoading(true);
      try {
        await onConversationDelete(conversationId);
        await loadConversations();
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startEdit = (conversation: Conversation, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingConversation(conversation.id);
    setEditTitle(conversation.title);
  };

  const handleEditSubmit = async (conversationId: string, event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!editTitle.trim()) return;

    setIsLoading(true);
    try {
      await onConversationRename(conversationId, editTitle.trim());
      await loadConversations();
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    } finally {
      setIsLoading(false);
      setEditingConversation(null);
    }
  };

  const cancelEdit = () => {
    setEditingConversation(null);
    setEditTitle('');
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const displayTitle = activeConversation?.title || 'No Conversation';

  return (
    <div 
      className={`${styles.topBar} ${styles[theme.id] || ''}`}
      style={{
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.foreground || '#333',
        color: theme.colors.foreground
      }}
    >
      <div className={styles.leftSection}>
        {/* Conversation Dropdown */}
        <div className={styles.dropdown} ref={dropdownRef}>
          <button
            className={styles.dropdownTrigger}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isLoading}
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.foreground || '#333',
              color: theme.colors.foreground
            }}
          >
            <span className={styles.conversationTitle}>
              💬 {displayTitle}
            </span>
            <span className={styles.dropdownArrow}>
              {isDropdownOpen ? '▲' : '▼'}
            </span>
          </button>

          {isDropdownOpen && (
            <div 
              className={styles.dropdownMenu}
              style={{
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.foreground || '#333',
                boxShadow: `0 4px 12px ${theme.colors.background}40`
              }}
            >
              {/* New Conversation Button */}
              <div className={styles.dropdownSection}>
                <button
                  className={styles.newConversationButton}
                  onClick={handleNewConversation}
                  disabled={isLoading}
                  style={{
                    backgroundColor: theme.colors.accent || '#4fc3f7',
                    color: theme.colors.background
                  }}
                >
                  ➕ New Conversation
                </button>
              </div>

              {/* Conversations List */}
              <div className={styles.dropdownSection}>
                <div className={styles.sectionLabel}>Recent Conversations</div>
                {conversations.length === 0 ? (
                  <div className={styles.emptyState}>
                    No conversations yet
                  </div>
                ) : (
                  <div className={styles.conversationsList}>
                    {conversations.slice(0, 10).map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`${styles.conversationItem} ${
                          conversation.id === activeConversationId ? styles.active : ''
                        }`}
                        onClick={() => handleConversationSwitch(conversation.id)}
                        style={{
                          backgroundColor: conversation.id === activeConversationId 
                            ? `${theme.colors.accent}20` 
                            : 'transparent'
                        }}
                      >
                        {editingConversation === conversation.id ? (
                          <form 
                            onSubmit={(e) => handleEditSubmit(conversation.id, e)}
                            className={styles.editForm}
                          >
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={cancelEdit}
                              onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                              autoFocus
                              className={styles.editInput}
                              style={{
                                backgroundColor: theme.colors.background,
                                borderColor: theme.colors.accent,
                                color: theme.colors.foreground
                              }}
                            />
                          </form>
                        ) : (
                          <>
                            <div className={styles.conversationInfo}>
                              <div className={styles.conversationTitle}>
                                {conversation.title}
                              </div>
                              <div className={styles.conversationMeta}>
                                {new Date(conversation.updatedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className={styles.conversationActions}>
                              <button
                                className={styles.actionButton}
                                onClick={(e) => startEdit(conversation, e)}
                                title="Rename conversation"
                                style={{ color: theme.colors.foreground }}
                              >
                                ✏️
                              </button>
                              <button
                                className={styles.actionButton}
                                onClick={(e) => handleDelete(conversation.id, e)}
                                title="Delete conversation"
                                style={{ color: '#ff6b6b' }}
                              >
                                🗑️
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.centerSection}>
        <div className={styles.appTitle}>
          Claudia Terminal
        </div>
      </div>

      <div className={styles.rightSection}>
        {/* Future navigation items can go here */}
        <div className={styles.placeholder}>
          {/* Space for additional nav items */}
        </div>
      </div>
    </div>
  );
};