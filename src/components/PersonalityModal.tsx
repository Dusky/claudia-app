import React, { useState, useEffect, useMemo } from 'react';
import type { Personality, PersonalityFormData } from '../types/personality';
import { DEFAULT_PERSONALITY, generateSystemPrompt } from '../types/personality';
import type { TerminalTheme } from '../terminal/themes';
import styles from './PersonalityModal.module.css'; // Import CSS module

interface PersonalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (personality: Personality) => Promise<void>;
  onDelete?: (personalityId: string) => Promise<void>; // Optional delete handler
  editingPersonality: Personality | null; // The personality to edit, or null to create new
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
  const [formData, setFormData] = useState<PersonalityFormData>(DEFAULT_PERSONALITY);
  const [currentId, setCurrentId] = useState<string | null>(null); // Stores ID of personality being edited, or new UUID
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [createdAt, setCreatedAt] = useState<string>(new Date().toISOString());
  const [usageCount, setUsageCount] = useState<number>(0);

  const systemPromptPreview = useMemo(() => generateSystemPrompt(formData), [formData]);

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
         // Default to creating a new one if no initial or active personality
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
      traits: { ...p.traits },
      background: { ...p.background, expertise: [...p.background.expertise] },
      behavior: { ...p.behavior },
      constraints: { ...p.constraints, topics_to_avoid: [...p.constraints.topics_to_avoid], preferred_topics: [...p.constraints.preferred_topics] },
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
      traits: { ...DEFAULT_PERSONALITY.traits },
      background: { ...DEFAULT_PERSONALITY.background, expertise: [...DEFAULT_PERSONALITY.background.expertise] },
      behavior: { ...DEFAULT_PERSONALITY.behavior },
      constraints: { ...DEFAULT_PERSONALITY.constraints, topics_to_avoid: [...DEFAULT_PERSONALITY.constraints.topics_to_avoid], preferred_topics: [...DEFAULT_PERSONALITY.constraints.preferred_topics] },
    });
    setCurrentId(crypto.randomUUID()); // Generate new ID for potential save
    setIsDefault(false);
    setCreatedAt(new Date().toISOString());
    setUsageCount(0);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    section?: keyof PersonalityFormData,
    subField?: string
  ) => {
    const { name, value, type } = e.target;
    let processedValue: any = value;
    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      processedValue = parseFloat(value);
    }

    if (section && subField) {
      // Handle nested fields like traits.tone
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section] as any),
          [subField]: processedValue,
        },
      }));
    } else if (section && name === 'expertise' || name === 'topics_to_avoid' || name === 'preferred_topics') {
      // Handle array fields
       setFormData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section] as any),
          [name]: value.split(',').map(s => s.trim()).filter(s => s),
        },
      }));
    }
    
    else {
      // Handle top-level fields like name, description
      setFormData(prev => ({ ...prev, [name]: processedValue }));
    }
  };
  
  const handleIsDefaultChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDefault(e.target.checked);
  };

  const handleSave = async () => {
    const personalityToSave: Personality = {
      id: currentId || crypto.randomUUID(), // Ensure ID exists
      ...formData,
      isDefault,
      system_prompt: generateSystemPrompt(formData),
      created_at: selectedPersonalityId === NEW_PERSONALITY_ID || !createdAt ? new Date().toISOString() : createdAt,
      updated_at: new Date().toISOString(),
      usage_count: usageCount,
    };
    await onSave(personalityToSave);
    onClose();
  };

  const handleDelete = async () => {
    if (onDelete && currentId && currentId !== DEFAULT_PERSONALITY.id && !isDefault) {
        if (window.confirm(`Are you sure you want to delete personality "${formData.name}"? This cannot be undone.`)) {
            await onDelete(currentId);
            onClose();
        }
    } else {
        alert("Default or active personality cannot be deleted directly from here.");
    }
  };


  if (!isOpen) return null;

  const themeClass = `theme-${theme.id}`;

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles[themeClass]}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {selectedPersonalityId === NEW_PERSONALITY_ID ? 'Create New Personality' : `Edit Personality: ${formData.name}`}
          </h2>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>

        <div className={styles.personalitySelector}>
          <select 
            value={selectedPersonalityId} 
            onChange={(e) => setSelectedPersonalityId(e.target.value)}
            aria-label="Select personality to edit"
          >
            <option value={NEW_PERSONALITY_ID}>-- Create New Personality --</option>
            {allPersonalities.map(p => (
              <option key={p.id} value={p.id}>{p.name} {p.id === activePersonalityId ? '(Active)' : ''} {p.isDefault ? '(Default)' : ''}</option>
            ))}
          </select>
          {selectedPersonalityId !== NEW_PERSONALITY_ID && (
            <button onClick={() => setSelectedPersonalityId(NEW_PERSONALITY_ID)}>Create New</button>
          )}
        </div>

        {/* General Info */}
        <div className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>General Information</h3>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="name">Name</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} />
            </div>
            <div className={styles.formField}>
              <label htmlFor="description">Description</label>
              <textarea id="description" name="description" value={formData.description} onChange={handleChange} />
            </div>
             <div className={styles.checkboxField}>
              <input type="checkbox" id="isDefault" name="isDefault" checked={isDefault} onChange={handleIsDefaultChange} disabled={currentId === DEFAULT_PERSONALITY.id}/>
              <label htmlFor="isDefault">Set as Default Personality</label>
            </div>
          </div>
        </div>

        {/* Traits */}
        <div className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>Core Traits</h3>
          <div className={styles.formGrid}>
            {Object.entries(DEFAULT_PERSONALITY.traits).map(([key, defaultValue]) => (
              <div className={styles.formField} key={key}>
                <label htmlFor={`trait-${key}`}>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                <select id={`trait-${key}`} name={key} value={formData.traits[key as keyof Personality['traits']]} onChange={(e) => handleChange(e, 'traits', key)}>
                  {/* Define options based on Personality type, example for 'tone' */}
                  {key === 'tone' && ['friendly', 'professional', 'casual', 'quirky', 'serious', 'playful'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  {key === 'formality' && ['very-formal', 'formal', 'balanced', 'informal', 'very-casual'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  {key === 'humor' && ['none', 'subtle', 'moderate', 'high', 'sarcastic'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  {key === 'verbosity' && ['concise', 'balanced', 'detailed', 'verbose'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  {key === 'enthusiasm' && ['low', 'moderate', 'high', 'very-high'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
        
        {/* Background */}
        <div className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>Background & Expertise</h3>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="background-role">Role</label>
              <input type="text" id="background-role" name="role" value={formData.background.role} onChange={(e) => handleChange(e, 'background', 'role')} />
            </div>
            <div className={styles.formField} style={{gridColumn: 'span 2'}}>
              <label htmlFor="background-expertise">Expertise (comma-separated)</label>
              <input type="text" id="background-expertise" name="expertise" value={formData.background.expertise.join(', ')} onChange={(e) => handleChange(e, 'background', 'expertise')} />
            </div>
            <div className={styles.formField} style={{gridColumn: 'span 2'}}>
              <label htmlFor="background-description">Personality Description</label>
              <textarea id="background-description" name="personality_description" value={formData.background.personality_description} onChange={(e) => handleChange(e, 'background', 'personality_description')} />
            </div>
          </div>
        </div>

        {/* Behavior */}
        <div className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>Behavior Settings</h3>
          <div className={styles.formGrid}>
            {Object.entries(DEFAULT_PERSONALITY.behavior).map(([key, defaultValue]) => (
              <div className={styles.formField} key={key}>
                <label htmlFor={`behavior-${key}`}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                <select id={`behavior-${key}`} name={key} value={formData.behavior[key as keyof Personality['behavior']]} onChange={(e) => handleChange(e, 'behavior', key)}>
                  {key === 'response_style' && ['direct', 'conversational', 'explanatory', 'storytelling'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  {key === 'emoji_usage' && ['none', 'minimal', 'moderate', 'frequent'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  {key === 'question_asking' && ['never', 'rare', 'moderate', 'frequent'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  {key === 'creativity_level' && ['conservative', 'balanced', 'creative', 'very-creative'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Constraints */}
        <div className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>System Constraints</h3>
          <div className={styles.formGrid}>
            <div className={styles.formField} style={{gridColumn: 'span 2'}}>
              <label htmlFor="constraints-topics_to_avoid">Topics to Avoid (comma-separated)</label>
              <input type="text" id="constraints-topics_to_avoid" name="topics_to_avoid" value={formData.constraints.topics_to_avoid.join(', ')} onChange={(e) => handleChange(e, 'constraints', 'topics_to_avoid')} />
            </div>
            <div className={styles.formField} style={{gridColumn: 'span 2'}}>
              <label htmlFor="constraints-preferred_topics">Preferred Topics (comma-separated)</label>
              <input type="text" id="constraints-preferred_topics" name="preferred_topics" value={formData.constraints.preferred_topics.join(', ')} onChange={(e) => handleChange(e, 'constraints', 'preferred_topics')} />
            </div>
            <div className={styles.formField}>
              <label htmlFor="constraints-content_rating">Content Rating</label>
              <select id="constraints-content_rating" name="content_rating" value={formData.constraints.content_rating} onChange={(e) => handleChange(e, 'constraints', 'content_rating')}>
                {['general', 'teen', 'mature'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className={styles.formField}>
              <label htmlFor="constraints-max_response_length">Max Response Length</label>
              <select id="constraints-max_response_length" name="max_response_length" value={formData.constraints.max_response_length} onChange={(e) => handleChange(e, 'constraints', 'max_response_length')}>
                {['short', 'medium', 'long', 'unlimited'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
        </div>
        
        {/* System Prompt Preview */}
        <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>System Prompt Preview</h3>
            <div className={styles.systemPromptPreview}>
                {systemPromptPreview}
            </div>
        </div>

        <div className={styles.modalActions}>
          {onDelete && selectedPersonalityId !== NEW_PERSONALITY_ID && currentId !== DEFAULT_PERSONALITY.id && !isDefault && (
            <button onClick={handleDelete} className={styles.deleteButton}>Delete</button>
          )}
          <button onClick={onClose} className={styles.cancelButton}>Cancel</button>
          <button onClick={handleSave} className={styles.saveButton}>
            {selectedPersonalityId === NEW_PERSONALITY_ID ? 'Create Personality' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
