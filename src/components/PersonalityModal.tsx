import React, { useState, useEffect } from 'react';
import type { Personality, PersonalityFormData } from '../types/personality';
import { DEFAULT_PERSONALITY } from '../types/personality';
import type { TerminalTheme } from '../terminal/themes';
import styles from './PersonalityModal.module.css';

interface PersonalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (personality: Personality) => Promise<void>;
  onDelete?: (personalityId: string) => Promise<void>;
  editingPersonality: Personality | null;
  allPersonalities: Personality[];
  activePersonalityId: string | null;
  theme: TerminalTheme;
}

const NEW_PERSONALITY_ID = '__NEW__';

export const PersonalityModal: React.FC<PersonalityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingPersonality: initialEditingPersonality,
  allPersonalities,
  activePersonalityId,
  theme,
}) => {
  const [selectedPersonalityId, setSelectedPersonalityId] = useState<string>(NEW_PERSONALITY_ID);
  const [formData, setFormData] = useState<PersonalityFormData>({
    name: DEFAULT_PERSONALITY.name,
    description: DEFAULT_PERSONALITY.description,
    system_prompt: DEFAULT_PERSONALITY.system_prompt
  });
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [createdAt, setCreatedAt] = useState<string>(new Date().toISOString());
  const [usageCount, setUsageCount] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      let personalityToLoad: Personality | null = null;
      if (initialEditingPersonality) {
        personalityToLoad = initialEditingPersonality;
        setSelectedPersonalityId(initialEditingPersonality.id);
      } else if (activePersonalityId && allPersonalities.find(p => p.id === activePersonalityId)) {
        personalityToLoad = allPersonalities.find(p => p.id === activePersonalityId) || null;
        setSelectedPersonalityId(activePersonalityId);
      } else {
        setSelectedPersonalityId(NEW_PERSONALITY_ID);
      }
      
      if (personalityToLoad) {
        loadPersonalityData(personalityToLoad);
      } else {
        resetToNew();
      }
    }
  }, [isOpen, initialEditingPersonality, allPersonalities, activePersonalityId]);
  
  useEffect(() => {
    if (selectedPersonalityId === NEW_PERSONALITY_ID) {
      resetToNew();
    } else {
      const personality = allPersonalities.find(p => p.id === selectedPersonalityId);
      if (personality) {
        loadPersonalityData(personality);
      }
    }
  }, [selectedPersonalityId, allPersonalities]);

  const loadPersonalityData = (p: Personality) => {
    setFormData({
      name: p.name,
      description: p.description,
      system_prompt: p.system_prompt
    });
    setCurrentId(p.id);
    setIsDefault(p.isDefault || false);
    setCreatedAt(p.created_at);
    setUsageCount(p.usage_count);
  };

  const resetToNew = () => {
    setFormData({
      name: 'New Personality',
      description: 'A custom personality for Claudia.',
      system_prompt: 'You are a helpful AI assistant...'
    });
    setCurrentId(null);
    setIsDefault(false);
    setCreatedAt(new Date().toISOString());
    setUsageCount(0);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }

    const personalityId = currentId || `personality-${Date.now()}`;
    const personality: Personality = {
      id: personalityId,
      name: formData.name.trim(),
      description: formData.description.trim(),
      system_prompt: formData.system_prompt.trim(),
      isDefault: isDefault,
      created_at: createdAt,
      updated_at: new Date().toISOString(),
      usage_count: usageCount
    };

    await onSave(personality);
  };

  const handleDelete = async () => {
    if (!currentId || !onDelete) return;
    if (confirm(`Are you sure you want to delete "${formData.name}"?`)) {
      await onDelete(currentId);
    }
  };

  const updateFormData = (field: keyof PersonalityFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${styles[theme.id] || ''}`} style={{ 
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.foreground || '#333',
        color: theme.colors.foreground
      }}>
        <div className={styles.header}>
          <h2>Personality Editor</h2>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
            style={{ color: theme.colors.foreground }}
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.selector}>
            <label>Edit Personality:</label>
            <select
              value={selectedPersonalityId}
              onChange={(e) => setSelectedPersonalityId(e.target.value)}
              style={{
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.foreground || '#333',
                color: theme.colors.foreground
              }}
            >
              <option value={NEW_PERSONALITY_ID}>+ Create New</option>
              {allPersonalities.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.id === activePersonalityId ? '(active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.form}>
            <div className={styles.field}>
              <label>Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="Personality name"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.foreground || '#333',
                  color: theme.colors.foreground
                }}
              />
            </div>

            <div className={styles.field}>
              <label>Description:</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Brief description of this personality"
                rows={2}
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.foreground || '#333',
                  color: theme.colors.foreground
                }}
              />
            </div>

            <div className={styles.field}>
              <label>System Prompt:</label>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => updateFormData('system_prompt', e.target.value)}
                placeholder="The full system prompt that defines this personality..."
                rows={15}
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.foreground || '#333',
                  color: theme.colors.foreground,
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }}
              />
            </div>

            <div className={styles.checkbox}>
              <label>
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                Set as default personality
              </label>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.info}>
            {currentId && (
              <span>Created: {new Date(createdAt).toLocaleDateString()}</span>
            )}
          </div>
          <div className={styles.actions}>
            {currentId && onDelete && (
              <button 
                onClick={handleDelete} 
                className={styles.deleteButton}
                style={{ 
                  color: theme.colors.error || '#ff6b6b',
                  borderColor: theme.colors.error || '#ff6b6b'
                }}
              >
                Delete
              </button>
            )}
            <button onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              className={styles.saveButton}
              style={{
                backgroundColor: theme.colors.accent,
                borderColor: theme.colors.accent
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};