import React, { useState, useEffect } from 'react';
import type { Personality } from '../types/personality';
import './PersonalityModal.css';

interface PersonalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (personality: Personality) => void;
  editingPersonality?: Personality | null;
}

export const PersonalityModal: React.FC<PersonalityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPersonality
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

  useEffect(() => {
    if (editingPersonality) {
      setName(editingPersonality.name);
      setDescription(editingPersonality.description);
      setSystemPrompt(editingPersonality.system_prompt);
    } else {
      setName('');
      setDescription('');
      setSystemPrompt('');
    }
  }, [editingPersonality, isOpen]);

  const handleSave = () => {
    const personality: Personality = {
      id: editingPersonality?.id || `personality_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      system_prompt: systemPrompt.trim(),
      isDefault: editingPersonality?.isDefault || false,
      created_at: editingPersonality?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: editingPersonality?.usage_count || 0,
      // Keep the old structure for compatibility, but these won't be used
      traits: {
        tone: 'friendly',
        formality: 'balanced',
        humor: 'subtle',
        verbosity: 'balanced',
        enthusiasm: 'moderate'
      },
      background: {
        role: '',
        expertise: [],
        personality_description: ''
      },
      behavior: {
        response_style: 'conversational',
        emoji_usage: 'minimal',
        question_asking: 'moderate',
        creativity_level: 'balanced'
      },
      constraints: {
        topics_to_avoid: [],
        preferred_topics: [],
        content_rating: 'general',
        max_response_length: 'medium'
      }
    };

    onSave(personality);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="personality-modal-overlay" onClick={onClose}>
      <div className="personality-modal" onClick={(e) => e.stopPropagation()}>
        <div className="personality-modal-header">
          <h2>◈ {editingPersonality ? 'Edit' : 'Create'} Personality</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="personality-modal-content">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Creative Assistant, Code Expert"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this personality"
            />
          </div>

          <div className="form-group">
            <label>System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful AI assistant who..."
              rows={8}
            />
          </div>
        </div>

        <div className="personality-modal-footer">
          <button className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="button primary" 
            onClick={handleSave}
            disabled={!name.trim() || !systemPrompt.trim()}
          >
            {editingPersonality ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};