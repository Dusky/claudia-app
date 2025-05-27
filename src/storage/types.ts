import type { Personality } from '../types/personality'; 

export interface ConversationMessage {
  id?: number; 
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tokens?: number; 
  metadata?: string; 
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  totalTokens?: number; 
  metadata?: string; 
}

export interface AppSetting {
  key: string;
  value: unknown; 
  type: 'string' | 'number' | 'boolean' | 'json';
}

export interface CachedAvatarImage {
  promptHash: string;
  imageUrl: string;
  localPath?: string;
  parameters: Record<string, unknown>; 
  createdAt: string;
  accessedAt: string; 
  file_size?: number;
}

export interface MemoryEntry {
  id?: number; 
  content: string;
  embedding?: string; 
  type: 'conversation' | 'avatar' | 'system' | 'user_preference';
  timestamp: string;
  metadata?: string; 
}

// Moved ImageMetadata here to be a central type for storage
export interface ImageMetadata {
  id: string; // Unique ID for the metadata entry
  filename: string; // Filename suggested for download
  prompt: string; // The full prompt used for generation
  description?: string; // Optional user-added or AI-generated description
  style: string; // Style keywords or description
  model: string; // Model used (e.g., "stability-ai/sdxl")
  provider: string; // Provider ID (e.g., "replicate", "google-image")
  dimensions: { width: number; height: number };
  generatedAt: string; // ISO8601 timestamp
  tags: string[]; // User-defined or auto-generated tags
  originalUrl: string; // The URL from which the image was sourced/downloaded
  localPath?: string; // Path if saved locally (more relevant for Electron/Node)
  thumbnailUrl?: string; // URL or base64 data for a thumbnail (optional)
  isFavorite?: boolean; // User can mark as favorite
  parameters?: Record<string, any>; // Store all generation parameters
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
  deleteMessage(messageId: string): Promise<void>; // Assuming messageId is string, adjust if it's number

  // Settings methods
  setSetting(key: string, value: unknown, type?: AppSetting['type']): Promise<void>;
  getSetting<T = unknown>(key: string, defaultValue?: T): Promise<T | null>;
  getAllSettings(): Promise<Record<string, unknown>>;

  // Avatar cache methods
  cacheAvatarImage(
    promptHash: string,
    imageUrl: string,
    parameters: Record<string, unknown>,
    localPath?: string,
    fileSize?: number
  ): Promise<void>;
  getCachedAvatar(promptHash: string): Promise<CachedAvatarImage | null>;
  cleanupOldAvatarCache(maxAgeDays?: number): Promise<number>;
  clearAvatarCache?(): Promise<void>; 

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

  // New Image Metadata methods
  saveImageMetadata(metadata: ImageMetadata): Promise<void>;
  getImageMetadata(id: string): Promise<ImageMetadata | null>;
  getAllImageMetadata(options?: { 
    limit?: number; 
    offset?: number; 
    sortBy?: keyof ImageMetadata; 
    sortOrder?: 'asc' | 'desc';
    filterTags?: string[]; // Optional: filter by tags
    searchTerm?: string; // Optional: search term for prompt/description
  }): Promise<ImageMetadata[]>;
  countAllImageMetadata(options?: {
    filterTags?: string[];
    searchTerm?: string;
  }): Promise<number>;
  deleteImageMetadata(id: string): Promise<boolean>;
  updateImageMetadata(id: string, updates: Partial<Omit<ImageMetadata, 'id' | 'generatedAt'>>): Promise<boolean>;
  deleteOldestImageMetadata(count: number): Promise<number>; // For cleanup based on count

  // Lifecycle
  close?(): Promise<void>;
}
