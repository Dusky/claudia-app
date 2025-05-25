import Database from 'better-sqlite3';
import { join } from 'path';
import type {
  StorageService,
  Conversation,
  ConversationMessage,
  MemoryEntry,
  AppSetting,
  CachedAvatarImage,
} from './types'; // Import from the new types file
import type { Personality } from '../types/personality'; // Import Personality type
import { config } from '../config/env'; // Import the global config

export class ClaudiaDatabase implements StorageService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    // Use provided path, or config path, or default to local app data
    const path = dbPath || config.databasePath || join(process.cwd(), 'claudia.db');
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

    // Personalities table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS personalities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0, -- 0 for false, 1 for true
        traits TEXT NOT NULL, -- JSON string of Personality['traits']
        background TEXT NOT NULL, -- JSON string of Personality['background']
        behavior TEXT NOT NULL, -- JSON string of Personality['behavior']
        constraints TEXT NOT NULL, -- JSON string of Personality['constraints']
        system_prompt TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        usage_count INTEGER NOT NULL DEFAULT 0
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
      CREATE INDEX IF NOT EXISTS idx_personalities_name ON personalities(name);
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
    
    // Always update 'updated_at' if there are other changes or if it's explicitly provided
    if (fields.length > 0 || updates.updatedAt) {
        fields.push('updated_at = ?');
        values.push(updates.updatedAt || new Date().toISOString());
    } else if (updates.updatedAt) { 
        fields.push('updated_at = ?');
        values.push(updates.updatedAt);
    }

    if (updates.metadata !== undefined) { 
      fields.push('metadata = ?');
      values.push(updates.metadata);
    }
    
    if (fields.length === 0) {
      return false; 
    }
    values.push(id);
    const stmt = this.db.prepare(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?');
    const result = stmt.run(id);
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
    
    this.updateConversation(messageInput.conversationId, { updatedAt: new Date().toISOString() });

    return {
      ...messageInput,
      id: result.lastInsertRowid as number,
    };
  }

  async getMessages(conversationId: string, limit?: number): Promise<ConversationMessage[]> {
    let query: string;
    const params: any[] = [conversationId];

    if (limit !== undefined && limit > 0) {
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
    } else if (value === null || value === undefined) {
      resolvedType = resolvedType || 'string'; 
      stringValue = String(value); 
    } else if (typeof value === 'object' || Array.isArray(value)) {
      stringValue = JSON.stringify(value);
      resolvedType = resolvedType || 'json';
    } else {
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
          try {
            settings[row.key] = JSON.parse(row.value);
          } catch (e) {
            console.error(`Error parsing JSON setting for key ${row.key} in getAllSettings:`, e);
            settings[row.key] = row.value; 
          }
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

    const newAccessedAt = new Date().toISOString();
    const updateStmt = this.db.prepare('UPDATE avatar_cache SET accessed_at = ? WHERE prompt_hash = ?');
    updateStmt.run(newAccessedAt, promptHash);
      
    let parsedParameters: Record<string, any>;
    try {
      parsedParameters = JSON.parse(row.parameters);
    } catch (e) {
      console.error(`Error parsing parameters for cached avatar ${promptHash}:`, e);
      parsedParameters = {};
    }

    return {
      promptHash: row.prompt_hash,
      imageUrl: row.image_url,
      localPath: row.local_path,
      parameters: parsedParameters,
      createdAt: row.created_at,
      accessedAt: newAccessedAt,
      file_size: row.file_size,
    };
  }

  async cleanupOldAvatarCache(maxAgeDays?: number): Promise<number> {
    // Use configured TTL in seconds, convert to days. Default to 7 days if config is not available or zero.
    const ttlSeconds = config.avatarCacheTTL > 0 ? config.avatarCacheTTL : 604800; // Default to 7 days in seconds
    const effectiveMaxAgeDays = maxAgeDays !== undefined ? maxAgeDays : Math.floor(ttlSeconds / (24 * 60 * 60));

    const maxAgeMs = effectiveMaxAgeDays * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
    const stmt = this.db.prepare('DELETE FROM avatar_cache WHERE accessed_at < ? OR accessed_at IS NULL');
    const result = stmt.run(cutoff);
    return result.changes;
  }

  // Personality methods
  async savePersonality(personality: Personality): Promise<void> {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO personalities (
        id, name, description, is_default, 
        traits, background, behavior, constraints, system_prompt, 
        usage_count, created_at, updated_at
      )
      VALUES (
        ?, ?, ?, ?, 
        ?, ?, ?, ?, ?, 
        ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        is_default = excluded.is_default,
        traits = excluded.traits,
        background = excluded.background,
        behavior = excluded.behavior,
        constraints = excluded.constraints,
        system_prompt = excluded.system_prompt,
        usage_count = excluded.usage_count,
        updated_at = excluded.updated_at -- For conflict, updated_at is taken from excluded (which will be 'now')
        -- created_at is NOT updated in the ON CONFLICT clause, so it preserves its original value
    `);
    
    const runSave = () => stmt.run(
      personality.id,
      personality.name,
      personality.description,
      personality.isDefault ? 1 : 0,
      JSON.stringify(personality.traits),
      JSON.stringify(personality.background),
      JSON.stringify(personality.behavior),
      JSON.stringify(personality.constraints),
      personality.system_prompt,
      personality.usage_count,
      now, // created_at for new inserts (excluded.created_at for updates, but not used)
      now  // updated_at for new inserts and for updates (via excluded.updated_at)
    );

    if (personality.isDefault) {
      const transaction = this.db.transaction(() => {
        const unsetDefaultStmt = this.db.prepare('UPDATE personalities SET is_default = 0 WHERE id != ?');
        unsetDefaultStmt.run(personality.id);
        runSave();
      });
      transaction();
    } else {
      runSave();
    }
  }

  private parsePersonalityRow(row: any): Personality | null {
    try {
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        isDefault: !!row.is_default,
        traits: JSON.parse(row.traits),
        background: JSON.parse(row.background),
        behavior: JSON.parse(row.behavior),
        constraints: JSON.parse(row.constraints),
        system_prompt: row.system_prompt,
        created_at: row.created_at,
        updated_at: row.updated_at,
        usage_count: row.usage_count,
      };
    } catch (e) {
      console.error(`Error parsing JSON for personality ${row.id}:`, e);
      return null;
    }
  }

  async getPersonality(id: string): Promise<Personality | null> {
    const stmt = this.db.prepare('SELECT * FROM personalities WHERE id = ?');
    const row = stmt.get(id) as any; // Raw row from DB
    if (!row) return null;
    return this.parsePersonalityRow(row);
  }

  async getAllPersonalities(): Promise<Personality[]> {
    const stmt = this.db.prepare('SELECT * FROM personalities ORDER BY name ASC');
    const rows = stmt.all() as any[]; // Raw rows
    
    return rows.map(row => this.parsePersonalityRow(row))
               .filter(p => p !== null) as Personality[];
  }

  async deletePersonality(id: string): Promise<boolean> {
    const activeId = await this.getSetting<string>('active_personality_id');
    if (activeId === id) {
      await this.setSetting('active_personality_id', null, 'string');
    }

    const stmt = this.db.prepare('DELETE FROM personalities WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async updatePersonality(id: string, updates: Partial<Personality>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    const now = new Date().toISOString();

    // Prevent updating created_at
    if ('created_at' in updates) {
      console.warn("Attempted to update 'created_at' for personality. This field cannot be changed.");
      delete updates.created_at;
    }

    for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key) && key !== 'id') {
        const value = (updates as any)[key];
        if (key === 'isDefault') {
          fields.push('is_default = ?');
          values.push(value ? 1 : 0);
        } else if (['traits', 'background', 'behavior', 'constraints'].includes(key)) {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`); // Convert camelCase to snake_case for DB columns
          values.push(value);
        }
      }
    }
    
    if (fields.length === 0) return false;

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id); // For the WHERE clause

    const doUpdate = () => {
      const stmt = this.db.prepare(`UPDATE personalities SET ${fields.join(', ')} WHERE id = ?`);
      return stmt.run(...values).changes > 0;
    };
    
    if (updates.isDefault === true) {
      let success = false;
      const transaction = this.db.transaction(() => {
        const unsetDefaultStmt = this.db.prepare('UPDATE personalities SET is_default = 0 WHERE id != ?');
        unsetDefaultStmt.run(id); // Unset for others
        success = doUpdate();
      });
      transaction();
      return success;
    } else {
      // If isDefault is explicitly set to false, or not part of updates, just run the update.
      // If isDefault is part of updates and is false, it's handled by the general field update.
      return doUpdate();
    }
  }

  async getActivePersonality(): Promise<Personality | null> {
    const activePersonalityId = await this.getSetting<string>('active_personality_id');
    if (!activePersonalityId) return null;
    return this.getPersonality(activePersonalityId);
  }

  async setActivePersonality(id: string): Promise<boolean> {
    const personality = await this.getPersonality(id);
    if (!personality) {
        return false;
    }
    await this.setSetting('active_personality_id', id, 'string');
    return true;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
