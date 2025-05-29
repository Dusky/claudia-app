// Mock database for browser compatibility
// This provides the same interface as ClaudiaDatabase but stores data in memory/localStorage

import type { Personality } from '../types/personality';
import type {
  StorageService,
  Conversation,
  ConversationMessage,
  AppSetting, // Use AppSetting from common types
  CachedAvatarImage, // Use CachedAvatarImage from common types
  MemoryEntry,
  ImageMetadata, // Add ImageMetadata import
} from './types'; // Import from the new types file

export class MockDatabase implements StorageService {
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, ConversationMessage[]> = new Map();
  private settings: Map<string, AppSetting> = new Map(); // Use AppSetting
  private avatarCache: Map<string, CachedAvatarImage> = new Map(); // Use CachedAvatarImage
  private personalities: Map<string, Personality> = new Map();
  private memoryEntries: Map<number, MemoryEntry> = new Map(); // For MemoryEntry
  private imageMetadata: Map<string, ImageMetadata> = new Map(); // For ImageMetadata
  private memoryIdCounter = 0;
  private messageIdCounter = 0; // For generating message IDs

  constructor() {
    // Try to load from localStorage if available
    if (typeof localStorage !== 'undefined') {
      this.loadFromLocalStorage();
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const conversationsData = localStorage.getItem('claudia_conversations');
      if (conversationsData) {
        this.conversations = new Map(JSON.parse(conversationsData) as [string, Conversation][]);
      }

      const messagesData = localStorage.getItem('claudia_messages');
      if (messagesData) {
        this.messages = new Map(JSON.parse(messagesData) as [string, ConversationMessage[]][]);
        // Initialize messageIdCounter based on loaded messages
        let maxId = 0;
        this.messages.forEach(msgs => msgs.forEach(msg => {
          if (msg.id && msg.id > maxId) maxId = msg.id;
        }));
        this.messageIdCounter = maxId;
      }

      const settingsData = localStorage.getItem('claudia_settings');
      if (settingsData) {
        this.settings = new Map(JSON.parse(settingsData) as [string, AppSetting][]);
      }

      const avatarCacheData = localStorage.getItem('claudia_avatar_cache');
      if (avatarCacheData) {
        const parsedCache = JSON.parse(avatarCacheData) as [string, CachedAvatarImage][]; // Parse as cached avatar image type
        this.avatarCache = new Map(parsedCache.map(([key, value]) => {
          // Ensure parameters is an object, not a string
          if (typeof value.parameters === 'string') { // Check if params is string (new format but stringified)
            try {
              value.parameters = JSON.parse(value.parameters);
            } catch (e) {
              console.warn(`Failed to parse avatar parameters for ${key}`, e);
              value.parameters = {}; // Default to empty object on error
            }
          } else if ('params' in value && typeof (value as { params?: string }).params === 'string') { // Check for old 'params' field (old format)
             try {
              value.parameters = JSON.parse((value as { params: string }).params);
            } catch (e) {
              console.warn(`Failed to parse avatar 'params' for ${key}`, e);
              value.parameters = {}; // Default to empty object on error
            }
            delete (value as { params?: string }).params; // remove old field
          } else if (!value.parameters) { // If parameters field is missing
            value.parameters = {};
          }


          // Ensure accessedAt exists, defaulting from createdAt or now
          if (!value.accessedAt) {
            value.accessedAt = value.createdAt || new Date().toISOString();
          }
          return [key, value as CachedAvatarImage];
        }));
      }

      const personalitiesData = localStorage.getItem('claudia_personalities');
      if (personalitiesData) {
        this.personalities = new Map(JSON.parse(personalitiesData) as [string, Personality][]);
      }
      
      const memoryData = localStorage.getItem('claudia_memory_entries');
      if (memoryData) {
        this.memoryEntries = new Map(JSON.parse(memoryData) as [number, MemoryEntry][]);
        let maxId = 0;
        this.memoryEntries.forEach(entry => {
            if (entry.id && entry.id > maxId) maxId = entry.id;
        });
        this.memoryIdCounter = maxId;
      }
      
      const imageMetadataData = localStorage.getItem('claudia_image_metadata');
      if (imageMetadataData) {
        this.imageMetadata = new Map(JSON.parse(imageMetadataData) as [string, ImageMetadata][]);
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
      localStorage.setItem('claudia_memory_entries', JSON.stringify(Array.from(this.memoryEntries.entries())));
      localStorage.setItem('claudia_image_metadata', JSON.stringify(Array.from(this.imageMetadata.entries())));
    } catch (error) {
      console.warn('Failed to save data to localStorage:', error);
    }
  }

  // Conversation methods
  async createConversation(
    conversationInput: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string; }
  ): Promise<Conversation> {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const newConversation: Conversation = {
      id,
      title: conversationInput.title,
      createdAt: conversationInput.createdAt || now,
      updatedAt: conversationInput.updatedAt || now,
      metadata: conversationInput.metadata,
      totalTokens: conversationInput.totalTokens || 0,
    };
    this.conversations.set(id, newConversation);
    this.saveToLocalStorage();
    return newConversation;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) || null;
  }

  async getAllConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async updateConversation(id: string, updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>): Promise<boolean> {
    const conversation = this.conversations.get(id);
    if (!conversation) return false;
    
    const updatedConversation = { ...conversation, ...updates, updatedAt: new Date().toISOString() };
    this.conversations.set(id, updatedConversation);
    this.saveToLocalStorage();
    return true;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const deleted = this.conversations.delete(id);
    if (deleted) {
      this.messages.delete(id); // Also delete associated messages
      this.saveToLocalStorage();
    }
    return deleted;
  }

  // Message methods
  async addMessage(messageInput: Omit<ConversationMessage, 'id'>): Promise<ConversationMessage> {
    const messagesList = this.messages.get(messageInput.conversationId) || [];
    this.messageIdCounter += 1;
    const newMessage: ConversationMessage = {
      ...messageInput,
      id: this.messageIdCounter,
    };
    messagesList.push(newMessage);
    this.messages.set(messageInput.conversationId, messagesList);
    this.saveToLocalStorage();
    return newMessage;
  }

  async getMessages(conversationId: string, limit?: number): Promise<ConversationMessage[]> {
    const messagesList = this.messages.get(conversationId) || [];
    // Ensure messages are sorted by timestamp if not already guaranteed
    const sortedMessages = messagesList.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return limit ? sortedMessages.slice(-limit) : sortedMessages;
  }

  async deleteMessage(messageId: string): Promise<void> {
    const numericId = typeof messageId === 'string' ? parseInt(messageId, 10) : messageId;
    
    for (const [conversationId, messagesList] of this.messages.entries()) {
      const messageIndex = messagesList.findIndex(m => m.id === numericId);
      if (messageIndex !== -1) {
        messagesList.splice(messageIndex, 1);
        this.messages.set(conversationId, messagesList);
        this.saveToLocalStorage();
        return;
      }
    }
  }

  // Settings methods
  async setSetting(key: string, value: unknown, type?: AppSetting['type']): Promise<void> {
    let resolvedType = type;
    if (!resolvedType) { // Infer type if not provided
        if (typeof value === 'string') resolvedType = 'string';
        else if (typeof value === 'number') resolvedType = 'number';
        else if (typeof value === 'boolean') resolvedType = 'boolean';
        else resolvedType = 'json'; // Default for objects/arrays
    }
    this.settings.set(key, { key, value, type: resolvedType });
    this.saveToLocalStorage();
  }

  async getSetting<T = unknown>(key: string, defaultValue?: T): Promise<T | null> {
    const setting = this.settings.get(key);
    if (!setting) return defaultValue !== undefined ? defaultValue : null;

    // For mock, value is already stored in its correct type, unless it was stringified JSON from old format
    if (setting.type === 'json' && typeof setting.value === 'string') {
      try {
        return JSON.parse(setting.value) as T;
      } catch (e) {
        console.warn(`Failed to parse JSON setting for ${key} from string:`, e);
        return setting.value as unknown as T; // Fallback to raw string value
      }
    }
    return setting.value as unknown as T;
  }
  
  async getAllSettings(): Promise<Record<string, unknown>> {
    const allSettings: Record<string, unknown> = {};
    for (const [key, setting] of this.settings.entries()) {
       if (setting.type === 'json' && typeof setting.value === 'string') {
        try {
          allSettings[key] = JSON.parse(setting.value);
        } catch { allSettings[key] = setting.value; } // fallback
      } else {
        allSettings[key] = setting.value;
      }
    }
    return allSettings;
  }

  // Avatar cache methods
  async cacheAvatarImage(
    promptHash: string,
    imageUrl: string,
    parameters: Record<string, unknown>, // Expect parameters as object
    localPath?: string,
    fileSize?: number
  ): Promise<void> {
    const now = new Date().toISOString();
    
    // For browser compatibility, just store the original URL without blob conversion
    // This avoids CORS issues with external image providers like Replicate
    console.log('💾 Caching avatar image URL:', imageUrl.substring(0, 50) + '...');
    
    this.avatarCache.set(promptHash, {
      promptHash,
      imageUrl,
      parameters,
      createdAt: now,
      accessedAt: now,
      localPath,
      file_size: fileSize,
    });
    this.saveToLocalStorage();
    console.log('✅ Avatar image URL cached successfully');
  }

  async getCachedAvatar(promptHash: string): Promise<CachedAvatarImage | null> {
    const cached = this.avatarCache.get(promptHash);
    if (cached) {
      // Check cache expiration (24 hours for external URLs)
      const cacheAge = Date.now() - new Date(cached.createdAt).getTime();
      const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (cacheAge > maxCacheAge) {
        console.log('🗑️ Removing expired cache entry:', cached.imageUrl.substring(0, 50) + '...');
        this.avatarCache.delete(promptHash);
        this.saveToLocalStorage();
        return null;
      }
      
      cached.accessedAt = new Date().toISOString(); // Update accessedAt
      this.avatarCache.set(promptHash, cached); // Save updated cache entry
      this.saveToLocalStorage();
      console.log('✅ Using cached avatar URL');
      return cached;
    }
    return null;
  }

  async clearAvatarCache(): Promise<void> {
    this.avatarCache.clear();
    this.saveToLocalStorage();
  }

  async cleanupExpiredAvatarCache(): Promise<number> {
    let cleanedCount = 0;
    const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    
    for (const [key, value] of this.avatarCache.entries()) {
      // Remove cache entries older than 24 hours
      const cacheAge = now - new Date(value.createdAt).getTime();
      if (cacheAge > maxCacheAge) {
        console.log('🗑️ Cleaning up expired avatar cache:', value.imageUrl.substring(0, 50) + '...');
        this.avatarCache.delete(key);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      this.saveToLocalStorage();
    }
    return cleanedCount;
  }
  
  async cleanupOldAvatarCache(maxAgeDays = 7): Promise<number> {
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - maxAgeMs;
    let deletedCount = 0;
    for (const [key, value] of this.avatarCache.entries()) {
      if (new Date(value.accessedAt).getTime() < cutoffTime) {
        this.avatarCache.delete(key);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      this.saveToLocalStorage();
    }
    return deletedCount;
  }


  // Memory/RAG methods
  async addMemory(memoryInput: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry> {
    this.memoryIdCounter += 1;
    const newMemory: MemoryEntry = {
      ...memoryInput,
      id: this.memoryIdCounter,
    };
    this.memoryEntries.set(newMemory.id!, newMemory);
    this.saveToLocalStorage(); // Persist memory entries
    return newMemory;
  }

  async searchMemory(type?: string, limit = 50): Promise<MemoryEntry[]> {
    let results = Array.from(this.memoryEntries.values());
    if (type) {
      results = results.filter(entry => entry.type === type);
    }
    // Sort by timestamp descending
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return results.slice(0, limit);
  }

  // Personality methods
  async savePersonality(personality: Personality): Promise<void> {
    this.personalities.set(personality.id, personality);
    this.saveToLocalStorage();
  }

  async getPersonality(id: string): Promise<Personality | null> {
    return this.personalities.get(id) || null;
  }

  async getAllPersonalities(): Promise<Personality[]> {
    return Array.from(this.personalities.values()).sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async deletePersonality(id: string): Promise<boolean> {
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

  async updatePersonality(id: string, updates: Partial<Personality>): Promise<boolean> {
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

  async getActivePersonality(): Promise<Personality | null> {
    const activeId = await this.getSetting<string>('active_personality');
    if (activeId) {
      const personality = await this.getPersonality(activeId);
      if (personality) return personality;
    }
    
    // Return default personality if no active one is set
    const allPersonalities = await this.getAllPersonalities();
    return allPersonalities.find(p => p.isDefault) || null;
  }

  async setActivePersonality(id: string): Promise<boolean> {
    const personality = await this.getPersonality(id);
    if (!personality) return false;
    
    await this.setSetting('active_personality', id);
    
    // Increment usage count if it exists, otherwise initialize
    const updatedPersonality = {
      ...personality,
      usage_count: (personality.usage_count || 0) + 1,
    };
    await this.savePersonality(updatedPersonality);
    
    return true;
  }

  // Image Metadata methods
  async saveImageMetadata(metadata: ImageMetadata): Promise<void> {
    this.imageMetadata.set(metadata.id, metadata);
    this.saveToLocalStorage();
  }

  async getImageMetadata(id: string): Promise<ImageMetadata | null> {
    return this.imageMetadata.get(id) || null;
  }

  async getAllImageMetadata(options?: {
    limit?: number;
    offset?: number;
    sortBy?: keyof ImageMetadata;
    sortOrder?: 'asc' | 'desc';
    filterTags?: string[];
    searchTerm?: string;
  }): Promise<ImageMetadata[]> {
    let results = Array.from(this.imageMetadata.values());
    
    // Filter by tags
    if (options?.filterTags && options.filterTags.length > 0) {
      results = results.filter(metadata => 
        options.filterTags!.some(tag => metadata.tags.includes(tag))
      );
    }
    
    // Filter by search term
    if (options?.searchTerm) {
      const searchLower = options.searchTerm.toLowerCase();
      results = results.filter(metadata => 
        metadata.prompt.toLowerCase().includes(searchLower) ||
        metadata.description?.toLowerCase().includes(searchLower) ||
        metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort
    if (options?.sortBy) {
      const sortOrder = options.sortOrder || 'desc';
      results.sort((a, b) => {
        const aVal = a[options.sortBy!];
        const bVal = b[options.sortBy!];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortOrder === 'asc' ? ((aVal ?? 0) < (bVal ?? 0) ? -1 : 1) : ((aVal ?? 0) > (bVal ?? 0) ? -1 : 1);
      });
    } else {
      // Default sort by generatedAt descending
      results.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    }
    
    // Apply offset and limit
    const offset = options?.offset || 0;
    const limit = options?.limit;
    
    if (limit) {
      return results.slice(offset, offset + limit);
    }
    
    return results.slice(offset);
  }

  async countAllImageMetadata(options?: {
    filterTags?: string[];
    searchTerm?: string;
  }): Promise<number> {
    let results = Array.from(this.imageMetadata.values());
    
    // Filter by tags
    if (options?.filterTags && options.filterTags.length > 0) {
      results = results.filter(metadata => 
        options.filterTags!.some(tag => metadata.tags.includes(tag))
      );
    }
    
    // Filter by search term
    if (options?.searchTerm) {
      const searchLower = options.searchTerm.toLowerCase();
      results = results.filter(metadata => 
        metadata.prompt.toLowerCase().includes(searchLower) ||
        metadata.description?.toLowerCase().includes(searchLower) ||
        metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    return results.length;
  }

  async deleteImageMetadata(id: string): Promise<boolean> {
    const deleted = this.imageMetadata.delete(id);
    if (deleted) {
      this.saveToLocalStorage();
    }
    return deleted;
  }

  async updateImageMetadata(id: string, updates: Partial<Omit<ImageMetadata, 'id' | 'generatedAt'>>): Promise<boolean> {
    const metadata = this.imageMetadata.get(id);
    if (!metadata) return false;
    
    const updatedMetadata = { ...metadata, ...updates };
    this.imageMetadata.set(id, updatedMetadata);
    this.saveToLocalStorage();
    return true;
  }

  async deleteOldestImageMetadata(count: number): Promise<number> {
    const allMetadata = Array.from(this.imageMetadata.values())
      .sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime());
    
    const toDelete = allMetadata.slice(0, count);
    let deletedCount = 0;
    
    for (const metadata of toDelete) {
      if (this.imageMetadata.delete(metadata.id)) {
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      this.saveToLocalStorage();
    }
    
    return deletedCount;
  }

  // Close method (no-op for mock)
  async close(): Promise<void> {
    // Nothing to close in browser mock
  }
}
