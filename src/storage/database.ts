import Database from 'better-sqlite3';
import { join } from 'path';
import type {
  StorageService,
  Conversation,
  ConversationMessage,
  MemoryEntry,
  AppSetting, // Changed from AppSettings
  CachedAvatarImage,
} from './types'; // Import from the new types file

export class ClaudiaDatabase implements StorageService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    // Use provided path or default to local app data
    const path = dbPath || join(process.cwd(), 'claudia.db');
    this.db = new Database(path);
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    
    this.initializeTables();
  }

  private initializeTables(): void {
    // Conversations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata TEXT
      )
    `);

    // Messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        metadata TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // Memory/RAG table for long-term memory
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        embedding TEXT, -- JSON array of float values
        type TEXT NOT NULL CHECK (type IN ('conversation', 'avatar', 'system', 'user_preference')),
        timestamp TEXT NOT NULL,
        metadata TEXT
      )
    `);

    // Settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'json'))
      )
    `);

    // Avatar cache table for image caching
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS avatar_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_hash TEXT UNIQUE NOT NULL,
        image_url TEXT NOT NULL,
        local_path TEXT,
        parameters TEXT, -- JSON string of generation parameters
        created_at TEXT NOT NULL,
        accessed_at TEXT NOT NULL,
        file_size INTEGER
      )
    `);

    // Create indices for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_memory_type ON memory(type);
      CREATE INDEX IF NOT EXISTS idx_memory_timestamp ON memory(timestamp);
      CREATE INDEX IF NOT EXISTS idx_avatar_cache_hash ON avatar_cache(prompt_hash);
      CREATE INDEX IF NOT EXISTS idx_avatar_cache_accessed ON avatar_cache(accessed_at);
    `);
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
    };
    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, title, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(newConversation.id, newConversation.title, newConversation.createdAt, newConversation.updatedAt, newConversation.metadata);
    return newConversation;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const stmt = this.db.prepare('SELECT * FROM conversations WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata,
    };
  }

  async getAllConversations(): Promise<Conversation[]> {
    const stmt = this.db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata,
    }));
  }

  async updateConversation(id: string, updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>): Promise<boolean> {
    const fields = [];
    const values = [];
    
    if (updates.title) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    
    if (updates.updatedAt) {
      fields.push('updated_at = ?');
      values.push(updates.updatedAt);
    }
    
    if (updates.metadata) {
      fields.push('metadata = ?');
      values.push(updates.metadata);
    }
    
    if (fields.length === 0) {
      return false; // No updates to perform
    }
    values.push(id);
    const stmt = this.db.prepare(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?');
    const result = stmt.run(id);
    // Also delete associated messages (handled by ON DELETE CASCADE in schema)
    return result.changes > 0;
  }

  // Message methods
  async addMessage(messageInput: Omit<ConversationMessage, 'id'>): Promise<ConversationMessage> {
    const stmt = this.db.prepare(`
      INSERT INTO messages (conversation_id, role, content, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      messageInput.conversationId,
      messageInput.role,
      messageInput.content,
      messageInput.timestamp,
      messageInput.metadata
    );
    
    return {
      ...messageInput,
      id: result.lastInsertRowid as number,
    };
  }

  async getMessages(conversationId: string, limit?: number): Promise<ConversationMessage[]> {
    let query: string;
    const params: any[] = [conversationId];

    if (limit !== undefined && limit > 0) {
      // Subquery to get the N most recent messages, then order them chronologically
      query = `
        SELECT * FROM (
          SELECT * FROM messages
          WHERE conversation_id = ?
          ORDER BY timestamp DESC
          LIMIT ?
        ) ORDER BY timestamp ASC
      `;
      params.push(limit);
    } else {
      // Get all messages if no limit
      query = 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC';
    }
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      metadata: row.metadata
    }));
  }

  // Memory/RAG methods
  async addMemory(memoryInput: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry> {
    const stmt = this.db.prepare(`
      INSERT INTO memory (content, embedding, type, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      memoryInput.content,
      memoryInput.embedding,
      memoryInput.type,
      memoryInput.timestamp,
      memoryInput.metadata
    );
    
    return {
      ...memoryInput,
      id: result.lastInsertRowid as number,
    };
  }

  async searchMemory(type?: string, limit = 50): Promise<MemoryEntry[]> {
    let query = 'SELECT * FROM memory';
    const params: any[] = [];
    
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ({
      id: row.id,
      content: row.content,
      embedding: row.embedding,
      type: row.type,
      timestamp: row.timestamp,
      metadata: row.metadata
    }));
  }

  // Settings methods
  async setSetting(key: string, value: any, type?: AppSetting['type']): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, type)
      VALUES (?, ?, ?)
    `);
    
    let stringValue = value;
    let resolvedType = type;

    if (typeof value === 'boolean') {
      stringValue = value ? 'true' : 'false';
      resolvedType = resolvedType || 'boolean';
    } else if (typeof value === 'number') {
      stringValue = value.toString();
      resolvedType = resolvedType || 'number';
    } else if (typeof value === 'object' || Array.isArray(value)) {
      stringValue = JSON.stringify(value);
      resolvedType = resolvedType || 'json';
    } else {
      // Default to string if type not provided and value is string
      resolvedType = resolvedType || 'string';
      stringValue = String(value);
    }
    
    stmt.run(key, stringValue, resolvedType);
  }

  async getSetting<T = any>(key: string, defaultValue?: T): Promise<T | null> {
    const stmt = this.db.prepare('SELECT * FROM settings WHERE key = ?');
    const row = stmt.get(key) as AppSetting | undefined;
    
    if (!row) return defaultValue !== undefined ? defaultValue : null;
    
    switch (row.type) {
      case 'number':
        return parseFloat(row.value as string) as unknown as T;
      case 'boolean':
        return (row.value === 'true') as unknown as T;
      case 'json':
        try {
          return JSON.parse(row.value as string) as T;
        } catch (e) {
          console.error(`Error parsing JSON setting for key ${key}:`, e);
          return defaultValue !== undefined ? defaultValue : null;
        }
      default: // string
        return row.value as unknown as T;
    }
  }

  async getAllSettings(): Promise<Record<string, any>> {
    const stmt = this.db.prepare('SELECT * FROM settings');
    const rows = stmt.all() as any[];
    
    const settings: Record<string, any> = {};
    
    rows.forEach(row => {
      switch (row.type) {
        case 'number':
          settings[row.key] = parseFloat(row.value);
          break;
        case 'boolean':
          settings[row.key] = row.value === 'true';
          break;
        case 'json':
          settings[row.key] = JSON.parse(row.value);
          break;
        default:
          settings[row.key] = row.value;
      }
    });
    
    return settings;
  }

  // Avatar cache methods
  async cacheAvatarImage(
    promptHash: string,
    imageUrl: string,
    parameters: Record<string, any>,
    localPath?: string,
    fileSize?: number
  ): Promise<void> {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO avatar_cache 
      (prompt_hash, image_url, local_path, parameters, created_at, accessed_at, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(promptHash, imageUrl, localPath, JSON.stringify(parameters), now, now, fileSize || 0);
  }

  async getCachedAvatar(promptHash: string): Promise<CachedAvatarImage | null> {
    const stmt = this.db.prepare('SELECT * FROM avatar_cache WHERE prompt_hash = ?');
    // Cast to include all fields from DB (snake_case) plus 'id'
    const row = stmt.get(promptHash) as { 
      id: number; 
      prompt_hash: string; 
      image_url: string; 
      local_path?: string; 
      parameters: string; 
      created_at: string; 
      accessed_at: string; 
      file_size?: number;
    } | undefined;
    
    if (!row) return null;

    const newAccessedAt = new Date().toISOString(); // Use a different variable name
    // Update accessed_at timestamp
    const updateStmt = this.db.prepare('UPDATE avatar_cache SET accessed_at = ? WHERE prompt_hash = ?');
    updateStmt.run(newAccessedAt, promptHash);
      
    let parsedParameters: Record<string, any>;
    try {
      parsedParameters = JSON.parse(row.parameters);
    } catch (e) {
      console.error(`Error parsing parameters for cached avatar ${promptHash}:`, e);
      parsedParameters = {}; // Default to empty object on error
    }

    return {
      promptHash: row.prompt_hash, // Map from snake_case DB column
      imageUrl: row.image_url,     // Map from snake_case DB column
      localPath: row.local_path,   // Map from snake_case DB column
      parameters: parsedParameters,
      createdAt: row.created_at,   // Map from snake_case DB column
      accessedAt: newAccessedAt,   // Use the new timestamp
      file_size: row.file_size,    // Assuming this matches or is fine
    };
  }

  async cleanupOldAvatarCache(maxAgeDays = 7): Promise<number> {
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
    const stmt = this.db.prepare('DELETE FROM avatar_cache WHERE accessed_at < ? OR accessed_at IS NULL'); // Also clean up if accessed_at is somehow null
    const result = stmt.run(cutoff);
    return result.changes;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
