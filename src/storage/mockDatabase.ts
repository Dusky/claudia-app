// Mock database for browser compatibility
// This provides the same interface as ClaudiaDatabase but stores data in memory/localStorage

import type { Personality } from '../types/personality';

export interface ConversationMessage {
  id?: number;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata?: string;
}

export interface Setting {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
}

export interface AvatarImageCache {
  promptHash: string;
  imageUrl: string;
  params: string; // JSON string
  createdAt: string;
}

export class MockDatabase {
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, ConversationMessage[]> = new Map();
  private settings: Map<string, Setting> = new Map();
  private avatarCache: Map<string, AvatarImageCache> = new Map();
  private personalities: Map<string, Personality> = new Map();
  
  constructor() {
    // Try to load from localStorage if available
    if (typeof localStorage !== 'undefined') {
      this.loadFromLocalStorage();
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const conversations = localStorage.getItem('claudia_conversations');
      if (conversations) {
        const data = JSON.parse(conversations);
        this.conversations = new Map(data);
      }

      const messages = localStorage.getItem('claudia_messages');
      if (messages) {
        const data = JSON.parse(messages);
        this.messages = new Map(data);
      }

      const settings = localStorage.getItem('claudia_settings');
      if (settings) {
        const data = JSON.parse(settings);
        this.settings = new Map(data);
      }

      const avatarCache = localStorage.getItem('claudia_avatar_cache');
      if (avatarCache) {
        const data = JSON.parse(avatarCache);
        this.avatarCache = new Map(data);
      }

      const personalities = localStorage.getItem('claudia_personalities');
      if (personalities) {
        const data = JSON.parse(personalities);
        this.personalities = new Map(data);
      }
    } catch (error) {
      console.warn('Failed to load data from localStorage:', error);
    }
  }

  private saveToLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      localStorage.setItem('claudia_conversations', JSON.stringify(Array.from(this.conversations.entries())));
      localStorage.setItem('claudia_messages', JSON.stringify(Array.from(this.messages.entries())));
      localStorage.setItem('claudia_settings', JSON.stringify(Array.from(this.settings.entries())));
      localStorage.setItem('claudia_avatar_cache', JSON.stringify(Array.from(this.avatarCache.entries())));
      localStorage.setItem('claudia_personalities', JSON.stringify(Array.from(this.personalities.entries())));
    } catch (error) {
      console.warn('Failed to save data to localStorage:', error);
    }
  }

  // Conversation methods
  createConversation(conversation: Conversation): Conversation {
    this.conversations.set(conversation.id, conversation);
    this.saveToLocalStorage();
    return conversation;
  }

  getConversation(id: string): Conversation | null {
    return this.conversations.get(id) || null;
  }

  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  updateConversation(id: string, updates: Partial<Conversation>): boolean {
    const conversation = this.conversations.get(id);
    if (!conversation) return false;
    
    Object.assign(conversation, updates, { updatedAt: new Date().toISOString() });
    this.conversations.set(id, conversation);
    this.saveToLocalStorage();
    return true;
  }

  deleteConversation(id: string): boolean {
    const deleted = this.conversations.delete(id);
    this.messages.delete(id);
    this.saveToLocalStorage();
    return deleted;
  }

  // Message methods
  addMessage(message: ConversationMessage): ConversationMessage {
    const messages = this.messages.get(message.conversationId) || [];
    const newMessage = { ...message, id: Date.now() };
    messages.push(newMessage);
    this.messages.set(message.conversationId, messages);
    this.saveToLocalStorage();
    return newMessage;
  }

  getMessages(conversationId: string, limit?: number): ConversationMessage[] {
    const messages = this.messages.get(conversationId) || [];
    return limit ? messages.slice(-limit) : messages;
  }

  // Settings methods
  setSetting(key: string, value: string, type: Setting['type'] = 'string'): void {
    this.settings.set(key, { key, value, type });
    this.saveToLocalStorage();
  }

  getSetting(key: string, defaultValue?: string): string | null {
    const setting = this.settings.get(key);
    return setting ? setting.value : (defaultValue || null);
  }

  // Avatar cache methods
  cacheAvatarImage(promptHash: string, imageUrl: string, params: any): void {
    this.avatarCache.set(promptHash, {
      promptHash,
      imageUrl,
      params: JSON.stringify(params),
      createdAt: new Date().toISOString()
    });
    this.saveToLocalStorage();
  }

  getCachedAvatar(promptHash: string): AvatarImageCache | null {
    return this.avatarCache.get(promptHash) || null;
  }

  clearAvatarCache(): void {
    this.avatarCache.clear();
    this.saveToLocalStorage();
  }

  // Memory/RAG methods (simplified for browser)
  addMemory(content: string, type: string, metadata?: any): void {
    // For now, just store in settings as a simple implementation
    const memories = JSON.parse(this.getSetting('memories', '[]') || '[]');
    memories.push({
      content,
      type,
      timestamp: new Date().toISOString(),
      metadata: metadata ? JSON.stringify(metadata) : null
    });
    this.setSetting('memories', JSON.stringify(memories), 'json');
  }

  // Personality methods
  savePersonality(personality: Personality): void {
    this.personalities.set(personality.id, personality);
    this.saveToLocalStorage();
  }

  getPersonality(id: string): Personality | null {
    return this.personalities.get(id) || null;
  }

  getAllPersonalities(): Personality[] {
    return Array.from(this.personalities.values()).sort((a, b) => 
      a.isDefault ? -1 : b.isDefault ? 1 : a.name.localeCompare(b.name)
    );
  }

  deletePersonality(id: string): boolean {
    // Don't allow deleting the default personality
    const personality = this.personalities.get(id);
    if (personality?.isDefault) {
      return false;
    }
    
    const deleted = this.personalities.delete(id);
    if (deleted) {
      this.saveToLocalStorage();
    }
    return deleted;
  }

  updatePersonality(id: string, updates: Partial<Personality>): boolean {
    const personality = this.personalities.get(id);
    if (!personality) return false;
    
    const updatedPersonality = {
      ...personality,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    this.personalities.set(id, updatedPersonality);
    this.saveToLocalStorage();
    return true;
  }

  getActivePersonality(): Personality | null {
    const activeId = this.getSetting('active_personality');
    if (activeId) {
      return this.getPersonality(activeId);
    }
    
    // Return default personality if no active one is set
    return Array.from(this.personalities.values()).find(p => p.isDefault) || null;
  }

  setActivePersonality(id: string): boolean {
    const personality = this.personalities.get(id);
    if (!personality) return false;
    
    this.setSetting('active_personality', id);
    
    // Increment usage count
    personality.usage_count++;
    this.savePersonality(personality);
    
    return true;
  }

  // Close method (no-op for mock)
  close(): void {
    // Nothing to close in browser mock
  }
}