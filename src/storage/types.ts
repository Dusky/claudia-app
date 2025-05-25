import type { Personality } from '../types/personality'; // Assuming Personality type is defined here

export interface ConversationMessage {
  id?: number; // Optional: SQLite uses auto-increment, MockDB can generate
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: string; // JSON string
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata?: string; // JSON string
}

export interface AppSetting {
  key: string;
  value: any; // Implementations will handle serialization/deserialization
  type: 'string' | 'number' | 'boolean' | 'json';
}

export interface CachedAvatarImage {
  // id is an implementation detail for SQLite, not part of the core identifiable fields
  promptHash: string;
  imageUrl: string;
  localPath?: string;
  parameters: Record<string, any>; // Store as object, implementations handle JSON
  createdAt: string;
  accessedAt: string; // Ensure this is always set/updated on access
  file_size?: number;
}

export interface MemoryEntry {
  id?: number; // Optional: SQLite uses auto-increment, MockDB can generate
  content: string;
  embedding?: string; // JSON string for vector embeddings
  type: 'conversation' | 'avatar' | 'system' | 'user_preference';
  timestamp: string;
  metadata?: string; // JSON string
}

export interface StorageService {
  // Conversation methods
  createConversation(
    conversationInput: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string; }
  ): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  getAllConversations(): Promise<Conversation[]>;
  updateConversation(id: string, updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>): Promise<boolean>;
  deleteConversation(id: string): Promise<boolean>;

  // Message methods
  addMessage(messageInput: Omit<ConversationMessage, 'id'>): Promise<ConversationMessage>;
  getMessages(conversationId: string, limit?: number): Promise<ConversationMessage[]>;

  // Settings methods
  setSetting(key: string, value: any, type?: AppSetting['type']): Promise<void>;
  getSetting<T = any>(key: string, defaultValue?: T): Promise<T | null>;
  getAllSettings(): Promise<Record<string, any>>;

  // Avatar cache methods
  cacheAvatarImage(
    promptHash: string,
    imageUrl: string,
    parameters: Record<string, any>,
    localPath?: string,
    fileSize?: number
  ): Promise<void>;
  getCachedAvatar(promptHash: string): Promise<CachedAvatarImage | null>;
  cleanupOldAvatarCache(maxAgeDays?: number): Promise<number>;
  clearAvatarCache?(): Promise<void>; // Optional, as MockDB has it

  // Memory/RAG methods
  addMemory(memoryInput: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry>;
  searchMemory(type?: string, limit?: number): Promise<MemoryEntry[]>;

  // Personality methods
  savePersonality(personality: Personality): Promise<void>;
  getPersonality(id: string): Promise<Personality | null>;
  getAllPersonalities(): Promise<Personality[]>;
  deletePersonality(id: string): Promise<boolean>;
  updatePersonality(id: string, updates: Partial<Personality>): Promise<boolean>;
  getActivePersonality(): Promise<Personality | null>;
  setActivePersonality(id: string): Promise<boolean>;

  // Lifecycle
  close?(): Promise<void>;
}
