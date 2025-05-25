import Database from 'better-sqlite3';
import { join } from 'path';

export interface ConversationMessage {
  id?: number;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: string; // JSON string for additional data
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata?: string; // JSON string for additional data
}

export interface MemoryEntry {
  id?: number;
  content: string;
  embedding?: string; // JSON string for vector embeddings
  type: 'conversation' | 'avatar' | 'system' | 'user_preference';
  timestamp: string;
  metadata?: string;
}

export interface AppSettings {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
}

export class ClaudiaDatabase {
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
  createConversation(conversation: Omit<Conversation, 'id'>): string {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, title, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, conversation.title, conversation.createdAt, conversation.updatedAt, conversation.metadata);
    return id;
  }

  getConversation(id: string): Conversation | null {
    const stmt = this.db.prepare('SELECT * FROM conversations WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata
    };
  }

  getAllConversations(): Conversation[] {
    const stmt = this.db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata
    }));
  }

  updateConversation(id: string, updates: Partial<Conversation>): void {
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
    
    if (fields.length > 0) {
      values.push(id);
      const stmt = this.db.prepare(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }
  }

  deleteConversation(id: string): void {
    const stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?');
    stmt.run(id);
  }

  // Message methods
  addMessage(message: Omit<ConversationMessage, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO messages (conversation_id, role, content, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      message.conversationId,
      message.role,
      message.content,
      message.timestamp,
      message.metadata
    );
    
    return result.lastInsertRowid as number;
  }

  getMessages(conversationId: string): ConversationMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp ASC
    `);
    
    const rows = stmt.all(conversationId) as any[];
    
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
  addMemory(memory: Omit<MemoryEntry, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO memory (content, embedding, type, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      memory.content,
      memory.embedding,
      memory.type,
      memory.timestamp,
      memory.metadata
    );
    
    return result.lastInsertRowid as number;
  }

  searchMemory(type?: string, limit = 50): MemoryEntry[] {
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
  setSetting(key: string, value: any, type: AppSettings['type'] = 'string'): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, type)
      VALUES (?, ?, ?)
    `);
    
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    stmt.run(key, stringValue, type);
  }

  getSetting(key: string): any {
    const stmt = this.db.prepare('SELECT * FROM settings WHERE key = ?');
    const row = stmt.get(key) as any;
    
    if (!row) return null;
    
    switch (row.type) {
      case 'number':
        return parseFloat(row.value);
      case 'boolean':
        return row.value === 'true';
      case 'json':
        return JSON.parse(row.value);
      default:
        return row.value;
    }
  }

  getAllSettings(): Record<string, any> {
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
  cacheAvatarImage(promptHash: string, imageUrl: string, parameters: Record<string, any>, localPath?: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO avatar_cache 
      (prompt_hash, image_url, local_path, parameters, created_at, accessed_at, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(promptHash, imageUrl, localPath, JSON.stringify(parameters), now, now, 0);
  }

  getCachedAvatar(promptHash: string): any {
    const stmt = this.db.prepare('SELECT * FROM avatar_cache WHERE prompt_hash = ?');
    const row = stmt.get(promptHash) as any;
    
    if (row) {
      // Update accessed_at timestamp
      const updateStmt = this.db.prepare('UPDATE avatar_cache SET accessed_at = ? WHERE prompt_hash = ?');
      updateStmt.run(new Date().toISOString(), promptHash);
      
      return {
        promptHash: row.prompt_hash,
        imageUrl: row.image_url,
        localPath: row.local_path,
        parameters: JSON.parse(row.parameters),
        createdAt: row.created_at,
        accessedAt: row.accessed_at
      };
    }
    
    return null;
  }

  cleanupOldAvatarCache(maxAge = 7 * 24 * 60 * 60 * 1000): number { // 7 days default
    const cutoff = new Date(Date.now() - maxAge).toISOString();
    const stmt = this.db.prepare('DELETE FROM avatar_cache WHERE accessed_at < ?');
    const result = stmt.run(cutoff);
    return result.changes;
  }

  close(): void {
    this.db.close();
  }
}