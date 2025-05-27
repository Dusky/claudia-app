import React, { useState, useEffect } from 'react';
import type { Personality, PersonalityFormData } from '../types/personality';
import { DEFAULT_PERSONALITY } from '../types/personality';
import type { TerminalTheme } from '../terminal/themes';
import { InputValidator } from '../utils/inputValidation';
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
    system_prompt: DEFAULT_PERSONALITY.system_prompt,
    allowImageGeneration: DEFAULT_PERSONALITY.allowImageGeneration,
    preferredClothingStyle: DEFAULT_PERSONALITY.preferredClothingStyle || '',
    typicalEnvironmentKeywords: DEFAULT_PERSONALITY.typicalEnvironmentKeywords || '',
    artStyleModifiers: DEFAULT_PERSONALITY.artStyleModifiers || '',
    baseCharacterIdentity: DEFAULT_PERSONALITY.baseCharacterIdentity || '',
    styleKeywords: DEFAULT_PERSONALITY.styleKeywords || '',
    qualityKeywords: DEFAULT_PERSONALITY.qualityKeywords || '',
  });
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [createdAt, setCreatedAt] = useState<string>(new Date().toISOString());
  const [usageCount, setUsageCount] = useState<number>(0);
  const [error, setError] = useState<string>('');

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
      system_prompt: p.system_prompt,
      allowImageGeneration: p.allowImageGeneration,
      preferredClothingStyle: p.preferredClothingStyle || '',
      typicalEnvironmentKeywords: p.typicalEnvironmentKeywords || '',
      artStyleModifiers: p.artStyleModifiers || '',
      baseCharacterIdentity: p.baseCharacterIdentity || '',
      styleKeywords: p.styleKeywords || '',
      qualityKeywords: p.qualityKeywords || '',
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
      system_prompt: 'You are a helpful AI assistant...',
      allowImageGeneration: false,
      preferredClothingStyle: DEFAULT_PERSONALITY.preferredClothingStyle || '',
      typicalEnvironmentKeywords: DEFAULT_PERSONALITY.typicalEnvironmentKeywords || '',
      artStyleModifiers: DEFAULT_PERSONALITY.artStyleModifiers || '',
      baseCharacterIdentity: DEFAULT_PERSONALITY.baseCharacterIdentity || '',
      styleKeywords: DEFAULT_PERSONALITY.styleKeywords || '',
      qualityKeywords: DEFAULT_PERSONALITY.qualityKeywords || '',
    });
    setCurrentId(null);
    setIsDefault(false);
    setCreatedAt(new Date().toISOString());
    setUsageCount(0);
  };

  const handleSave = async () => {
    setError(''); // Clear previous errors
    
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    const personalityId = currentId || `personality-${Date.now()}`;
    const personality: Personality = {
      id: personalityId,
      name: formData.name.trim(),
      description: formData.description.trim(),
      system_prompt: formData.system_prompt.trim(),
      isDefault: isDefault,
      allowImageGeneration: formData.allowImageGeneration,
      preferredClothingStyle: formData.preferredClothingStyle?.trim(),
      typicalEnvironmentKeywords: formData.typicalEnvironmentKeywords?.trim(),
      artStyleModifiers: formData.artStyleModifiers?.trim(),
      baseCharacterIdentity: formData.baseCharacterIdentity?.trim(),
      styleKeywords: formData.styleKeywords?.trim(),
      qualityKeywords: formData.qualityKeywords?.trim(),
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

  const updateFormData = (field: keyof PersonalityFormData, value: string | boolean) => {
    let sanitizedValue = value;
    
    // Validate and sanitize string inputs
    if (typeof value === 'string') {
      let validationResult;
      
      switch (field) {
        case 'name':
          validationResult = InputValidator.validateName(value);
          break;
        case 'description':
        case 'preferredClothingStyle':
        case 'typicalEnvironmentKeywords':
        case 'artStyleModifiers':
        case 'baseCharacterIdentity':
        case 'styleKeywords':
        case 'qualityKeywords':
          validationResult = InputValidator.validateText(value, 500);
          break;
        case 'system_prompt':
          validationResult = InputValidator.validatePrompt(value);
          break;
        default:
          validationResult = InputValidator.validateText(value);
      }
      
      sanitizedValue = validationResult.sanitizedValue;
      
      // Show warnings if validation failed
      if (!validationResult.isValid) {
        setError(`${field}: ${validationResult.errors.join(', ')}`);
        return; // Don't update if validation failed
      } else if (validationResult.warnings.length > 0) {
        console.warn(`Input validation warnings for ${field}:`, validationResult.warnings);
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    // Clear error when user makes valid input
    if (error) setError('');
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
            {/* Error Display */}
            {error && (
              <div style={{
                background: 'rgba(244, 67, 54, 0.1)',
                border: '1px solid #f44336',
                borderRadius: '4px',
                padding: '8px 12px',
                marginBottom: '16px',
                color: '#f44336',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ❌ {error}
              </div>
            )}
            
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
                rows={10} /* Reduced rows for system prompt to make space */
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.foreground || '#333',
                  color: theme.colors.foreground,
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }}
              />
            </div>

            <div className={styles.field}>
              <label>Preferred Clothing Style:</label>
              <input
                type="text"
                value={formData.preferredClothingStyle || ''}
                onChange={(e) => updateFormData('preferredClothingStyle', e.target.value)}
                placeholder="e.g., modern techwear, vintage floral dresses"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.foreground || '#333',
                  color: theme.colors.foreground
                }}
              />
            </div>

            <div className={styles.field}>
              <label>Typical Environment Keywords:</label>
              <input
                type="text"
                value={formData.typicalEnvironmentKeywords || ''}
                onChange={(e) => updateFormData('typicalEnvironmentKeywords', e.target.value)}
                placeholder="e.g., cyberpunk city, cozy library, futuristic lab"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.foreground || '#333',
                  color: theme.colors.foreground
                }}
              />
            </div>

            <div className={styles.field}>
              <label>Art Style Modifiers:</label>
              <input
                type="text"
                value={formData.artStyleModifiers || ''}
                onChange={(e) => updateFormData('artStyleModifiers', e.target.value)}
                placeholder="e.g., oil painting effect, anime cel shading, grainy film"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.foreground || '#333',
                  color: theme.colors.foreground
                }}
              />
            </div>

            <div className={styles.field}>
              <label>Base Character Identity:</label>
              <textarea
                value={formData.baseCharacterIdentity || ''}
                onChange={(e) => updateFormData('baseCharacterIdentity', e.target.value)}
                placeholder="e.g., A petite woman in her early 20s, wavy hair, bright eyes..."
                rows={3}
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.foreground || '#333',
                  color: theme.colors.foreground,
                  fontFamily: 'monospace',
                  fontSize: '0.9em'
                }}
              />
              <small style={{ color: theme.colors.foreground, opacity: 0.7 }}>
                Core physical description used as the foundation for all generated images
              </small>
            </div>

            <div className={styles.field}>
              <label>Style Keywords:</label>
              <input
                type="text"
                value={formData.styleKeywords || ''}
                onChange={(e) => updateFormData('styleKeywords', e.target.value)}
                placeholder="e.g., realistic digital art, cinematic, anime style"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.foreground || '#333',
                  color: theme.colors.foreground
                }}
              />
              <small style={{ color: theme.colors.foreground, opacity: 0.7 }}>
                Art style keywords that define the visual aesthetic
              </small>
            </div>

            <div className={styles.field}>
              <label>Quality Keywords:</label>
              <input
                type="text"
                value={formData.qualityKeywords || ''}
                onChange={(e) => updateFormData('qualityKeywords', e.target.value)}
                placeholder="e.g., high quality, detailed, masterpiece, sharp focus"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.foreground || '#333',
                  color: theme.colors.foreground
                }}
              />
              <small style={{ color: theme.colors.foreground, opacity: 0.7 }}>
                Quality and rendering keywords for improved image generation
              </small>
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

            <div className={styles.checkbox}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.allowImageGeneration || false}
                  onChange={(e) => updateFormData('allowImageGeneration', e.target.checked)}
                />
                Allow image generation
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
            {currentId && onDelete && !isDefault && ( // Prevent deleting default
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
