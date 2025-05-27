import Database from 'better-sqlite3';
import { join } from 'path';
import type {
  StorageService,
  Conversation,
  ConversationMessage,
  MemoryEntry,
  AppSetting,
  CachedAvatarImage,
  ImageMetadata, // Import new ImageMetadata type
} from './types'; 
import type { Personality } from '../types/personality'; 
import { config } from '../config/env'; 

export class ClaudiaDatabase implements StorageService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || config.databasePath || join(process.cwd(), 'claudia.db');
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.initializeTables();
  }

  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata TEXT,
        total_tokens INTEGER DEFAULT 0
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        metadata TEXT,
        tokens INTEGER DEFAULT 0,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        embedding TEXT, 
        type TEXT NOT NULL CHECK (type IN ('conversation', 'avatar', 'system', 'user_preference')),
        timestamp TEXT NOT NULL,
        metadata TEXT
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'json'))
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS avatar_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_hash TEXT UNIQUE NOT NULL,
        image_url TEXT NOT NULL,
        local_path TEXT,
        parameters TEXT, 
        created_at TEXT NOT NULL,
        accessed_at TEXT NOT NULL,
        file_size INTEGER
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS personalities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0, 
        allow_image_generation INTEGER NOT NULL DEFAULT 0, 
        system_prompt TEXT NOT NULL,
        preferred_clothing_style TEXT,
        typical_environment_keywords TEXT,
        art_style_modifiers TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        usage_count INTEGER NOT NULL DEFAULT 0
      )
    `);
    
    // New table for Image Metadata
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS image_metadata (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        prompt TEXT NOT NULL,
        description TEXT,
        style TEXT,
        model TEXT,
        provider TEXT,
        dimensions_width INTEGER,
        dimensions_height INTEGER,
        generated_at TEXT NOT NULL,
        tags TEXT, -- JSON array of strings
        original_url TEXT NOT NULL,
        local_path TEXT,
        thumbnail_url TEXT,
        is_favorite INTEGER DEFAULT 0, -- 0 for false, 1 for true
        parameters TEXT -- JSON object of generation parameters
      )
    `);

    // Migrations for personalities table (if needed, from previous steps)
    try { this.db.exec(`ALTER TABLE personalities ADD COLUMN allow_image_generation INTEGER NOT NULL DEFAULT 0`); } catch (e) {/* ignore */}
    try { this.db.exec(`ALTER TABLE personalities ADD COLUMN preferred_clothing_style TEXT`); } catch (e) {/* ignore */}
    try { this.db.exec(`ALTER TABLE personalities ADD COLUMN typical_environment_keywords TEXT`); } catch (e) {/* ignore */}
    try { this.db.exec(`ALTER TABLE personalities ADD COLUMN art_style_modifiers TEXT`); } catch (e) {/* ignore */}
    
    // Migrations for conversations and messages (if needed)
    try { this.db.exec(`ALTER TABLE conversations ADD COLUMN total_tokens INTEGER DEFAULT 0`); } catch (e) {/* ignore */}
    try { this.db.exec(`ALTER TABLE messages ADD COLUMN tokens INTEGER DEFAULT 0`); } catch (e) {/* ignore */}

    // Indices
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_memory_type ON memory(type);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_memory_timestamp ON memory(timestamp);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_avatar_cache_hash ON avatar_cache(prompt_hash);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_avatar_cache_accessed ON avatar_cache(accessed_at);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_personalities_name ON personalities(name);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_image_metadata_generated_at ON image_metadata(generated_at);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_image_metadata_provider ON image_metadata(provider);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_image_metadata_model ON image_metadata(model);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_image_metadata_favorite ON image_metadata(is_favorite);`);
  }

  // ... (existing Conversation, Message, Memory, Settings, Avatar Cache methods remain unchanged) ...
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
    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, title, created_at, updated_at, metadata, total_tokens)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(newConversation.id, newConversation.title, newConversation.createdAt, newConversation.updatedAt, newConversation.metadata, newConversation.totalTokens);
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
      totalTokens: row.total_tokens || 0,
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
      totalTokens: row.total_tokens || 0,
    }));
  }

  async updateConversation(id: string, updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    
    // Use explicit field validation for security
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    
    if (updates.metadata !== undefined) { 
      fields.push('metadata = ?');
      values.push(updates.metadata);
    }
    
    if (updates.totalTokens !== undefined) {
      fields.push('total_tokens = ?');
      values.push(updates.totalTokens);
    }
    
    // Always update the updated_at timestamp when making changes
    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(updates.updatedAt || new Date().toISOString());
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
      INSERT INTO messages (conversation_id, role, content, timestamp, metadata, tokens)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      messageInput.conversationId,
      messageInput.role,
      messageInput.content,
      messageInput.timestamp,
      messageInput.metadata,
      messageInput.tokens || 0
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
      metadata: row.metadata,
      tokens: row.tokens || 0
    }));
  }

  async deleteMessage(messageId: string): Promise<void> { // Assuming messageId is string from type
    const stmt = this.db.prepare('DELETE FROM messages WHERE id = ?');
    stmt.run(messageId); // If id is actually number, this might need parseInt(messageId)
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
    const ttlSeconds = config.avatarCacheTTL > 0 ? config.avatarCacheTTL : 604800; 
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
        id, name, description, is_default, allow_image_generation,
        system_prompt, preferred_clothing_style, typical_environment_keywords, art_style_modifiers,
        usage_count, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        is_default = excluded.is_default,
        allow_image_generation = excluded.allow_image_generation,
        system_prompt = excluded.system_prompt,
        preferred_clothing_style = excluded.preferred_clothing_style,
        typical_environment_keywords = excluded.typical_environment_keywords,
        art_style_modifiers = excluded.art_style_modifiers,
        usage_count = excluded.usage_count,
        updated_at = excluded.updated_at
    `);
    
    const runSave = () => stmt.run(
      personality.id, personality.name, personality.description,
      personality.isDefault ? 1 : 0, personality.allowImageGeneration ? 1 : 0,
      personality.system_prompt, personality.preferredClothingStyle, 
      personality.typicalEnvironmentKeywords, personality.artStyleModifiers,
      personality.usage_count, personality.created_at || now, now
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
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isDefault: !!row.is_default,
      allowImageGeneration: !!row.allow_image_generation,
      system_prompt: row.system_prompt,
      preferredClothingStyle: row.preferred_clothing_style,
      typicalEnvironmentKeywords: row.typical_environment_keywords,
      artStyleModifiers: row.art_style_modifiers,
      created_at: row.created_at,
      updated_at: row.updated_at,
      usage_count: row.usage_count,
    };
  }

  async getPersonality(id: string): Promise<Personality | null> {
    const stmt = this.db.prepare('SELECT * FROM personalities WHERE id = ?');
    const row = stmt.get(id) as any; 
    return this.parsePersonalityRow(row);
  }

  async getAllPersonalities(): Promise<Personality[]> {
    const stmt = this.db.prepare('SELECT * FROM personalities ORDER BY name ASC');
    const rows = stmt.all() as any[]; 
    return rows.map(row => this.parsePersonalityRow(row)).filter(p => p !== null) as Personality[];
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
    // Whitelist of valid personality fields mapped to database column names
    const VALID_PERSONALITY_FIELDS: Record<string, string> = {
      'name': 'name',
      'description': 'description',
      'isDefault': 'is_default',
      'allowImageGeneration': 'allow_image_generation',
      'system_prompt': 'system_prompt',
      'preferredClothingStyle': 'preferred_clothing_style',
      'typicalEnvironmentKeywords': 'typical_environment_keywords',
      'artStyleModifiers': 'art_style_modifiers',
      'usage_count': 'usage_count'
    };

    const fields: string[] = [];
    const values: any[] = [];
    const now = new Date().toISOString();

    // Never allow updating created_at
    if ('created_at' in updates) delete updates.created_at;

    for (const key in updates) {
      if (!Object.prototype.hasOwnProperty.call(updates, key) || key === 'id') continue;
      
      const value = (updates as any)[key];
      const dbColumnName = VALID_PERSONALITY_FIELDS[key];
      
      if (dbColumnName) {
        if (key === 'isDefault' || key === 'allowImageGeneration') {
          fields.push(`${dbColumnName} = ?`);
          values.push(value ? 1 : 0);
        } else {
          fields.push(`${dbColumnName} = ?`);
          values.push(value);
        }
      }
      // Silently ignore unknown fields to prevent injection
    }
    
    if (fields.length === 0) return false;

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id); 

    const doUpdate = () => {
      const stmt = this.db.prepare(`UPDATE personalities SET ${fields.join(', ')} WHERE id = ?`);
      return stmt.run(...values).changes > 0;
    };
    
    if (updates.isDefault === true) {
      let success = false;
      const transaction = this.db.transaction(() => {
        const unsetDefaultStmt = this.db.prepare('UPDATE personalities SET is_default = 0 WHERE id != ?');
        unsetDefaultStmt.run(id); 
        success = doUpdate();
      });
      transaction();
      return success;
    } else {
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
    if (!personality) return false;
    await this.setSetting('active_personality_id', id, 'string');
    return true;
  }

  // New Image Metadata methods implementation
  async saveImageMetadata(metadata: ImageMetadata): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO image_metadata (
        id, filename, prompt, description, style, model, provider,
        dimensions_width, dimensions_height, generated_at, tags,
        original_url, local_path, thumbnail_url, is_favorite, parameters
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      metadata.id, metadata.filename, metadata.prompt, metadata.description,
      metadata.style, metadata.model, metadata.provider,
      metadata.dimensions.width, metadata.dimensions.height, metadata.generatedAt,
      JSON.stringify(metadata.tags || []), metadata.originalUrl, metadata.localPath,
      metadata.thumbnailUrl, metadata.isFavorite ? 1 : 0, JSON.stringify(metadata.parameters || {})
    );
  }

  async getImageMetadata(id: string): Promise<ImageMetadata | null> {
    const stmt = this.db.prepare('SELECT * FROM image_metadata WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.parseImageMetadataRow(row);
  }

  async getAllImageMetadata(options?: { 
    limit?: number; 
    offset?: number; 
    sortBy?: keyof ImageMetadata; 
    sortOrder?: 'asc' | 'desc';
    filterTags?: string[];
    searchTerm?: string;
  }): Promise<ImageMetadata[]> {
    // Whitelist of valid sort columns mapped to actual database column names
    const VALID_SORT_COLUMNS: Record<keyof ImageMetadata, string> = {
      'id': 'id',
      'filename': 'filename',
      'prompt': 'prompt',
      'description': 'description',
      'style': 'style',
      'model': 'model',
      'provider': 'provider',
      'dimensions': 'dimensions_width', // Default to width for sorting
      'generatedAt': 'generated_at',
      'tags': 'tags',
      'originalUrl': 'original_url',
      'localPath': 'local_path',
      'thumbnailUrl': 'thumbnail_url',
      'isFavorite': 'is_favorite',
      'parameters': 'parameters'
    };

    let query = 'SELECT * FROM image_metadata';
    const params: any[] = [];
    const whereClauses: string[] = [];

    // Build WHERE clauses with parameterized queries only
    if (options?.filterTags && options.filterTags.length > 0) {
      options.filterTags.forEach(tag => {
        whereClauses.push(`tags LIKE ?`);
        params.push(`%${tag}%`); 
      });
    }
    if (options?.searchTerm && options.searchTerm.trim().length > 0) {
      whereClauses.push(`(prompt LIKE ? OR description LIKE ?)`);
      params.push(`%${options.searchTerm}%`);
      params.push(`%${options.searchTerm}%`);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Secure ORDER BY with whitelisted columns
    const sortBy = options?.sortBy || 'generatedAt';
    const sortOrder = options?.sortOrder || 'desc';
    const dbColumnName = VALID_SORT_COLUMNS[sortBy] || VALID_SORT_COLUMNS['generatedAt'];
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${dbColumnName} ${safeSortOrder}`;
    
    // Add LIMIT and OFFSET with parameterized queries
    if (options?.limit !== undefined) {
      query += ' LIMIT ?';
      params.push(Math.max(0, Math.min(options.limit, 10000))); // Cap at 10000 for safety
    }
    if (options?.offset !== undefined) {
      query += ' OFFSET ?';
      params.push(Math.max(0, options.offset));
    }
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map(row => this.parseImageMetadataRow(row)).filter(m => m !== null) as ImageMetadata[];
  }

  async countAllImageMetadata(options?: {
    filterTags?: string[];
    searchTerm?: string;
  }): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM image_metadata';
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (options?.filterTags && options.filterTags.length > 0) {
      options.filterTags.forEach(tag => {
        whereClauses.push(`tags LIKE ?`);
        params.push(`%${tag}%`);
      });
    }
    if (options?.searchTerm && options.searchTerm.trim().length > 0) {
      whereClauses.push(`(prompt LIKE ? OR description LIKE ?)`);
      params.push(`%${options.searchTerm}%`);
      params.push(`%${options.searchTerm}%`);
    }
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }
    const stmt = this.db.prepare(query);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }
  
  async deleteImageMetadata(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM image_metadata WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async updateImageMetadata(id: string, updates: Partial<Omit<ImageMetadata, 'id' | 'generatedAt'>>): Promise<boolean> {
    // Whitelist of valid update fields mapped to database column names
    const VALID_UPDATE_FIELDS: Record<string, string> = {
      'filename': 'filename',
      'prompt': 'prompt',
      'description': 'description',
      'style': 'style',
      'model': 'model',
      'provider': 'provider',
      'tags': 'tags',
      'originalUrl': 'original_url',
      'localPath': 'local_path',
      'thumbnailUrl': 'thumbnail_url',
      'isFavorite': 'is_favorite',
      'parameters': 'parameters'
    };

    const fields: string[] = [];
    const values: any[] = [];

    for (const key in updates) {
      if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
      
      const value = (updates as any)[key];
      
      // Handle special cases first
      if (key === 'dimensions' && value && typeof value === 'object') {
        // Special handling for dimensions object
        fields.push('dimensions_width = ?', 'dimensions_height = ?');
        values.push(
          (value as {width: number, height: number}).width || 0, 
          (value as {width: number, height: number}).height || 0
        );
        continue;
      }
      
      if (key === 'tags') {
        fields.push('tags = ?');
        values.push(JSON.stringify(Array.isArray(value) ? value : []));
        continue;
      }
      
      if (key === 'parameters') {
        fields.push('parameters = ?');
        values.push(JSON.stringify(value || {}));
        continue;
      }
      
      if (key === 'isFavorite') {
        fields.push('is_favorite = ?');
        values.push(value ? 1 : 0);
        continue;
      }
      
      // Use whitelist for all other fields
      const dbColumnName = VALID_UPDATE_FIELDS[key];
      if (dbColumnName) {
        fields.push(`${dbColumnName} = ?`);
        values.push(value);
      }
      // Silently ignore unknown fields to prevent injection
    }
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const stmt = this.db.prepare(`UPDATE image_metadata SET ${fields.join(', ')} WHERE id = ?`);
    return stmt.run(...values).changes > 0;
  }

  async deleteOldestImageMetadata(count: number): Promise<number> {
    if (count <= 0) return 0;
    // Find IDs of the oldest 'count' images
    const selectStmt = this.db.prepare('SELECT id FROM image_metadata ORDER BY generated_at ASC LIMIT ?');
    const rowsToDelete = selectStmt.all(count) as { id: string }[];
    
    if (rowsToDelete.length === 0) return 0;

    const idsToDelete = rowsToDelete.map(r => r.id);
    const placeholders = idsToDelete.map(() => '?').join(',');
    const deleteStmt = this.db.prepare(`DELETE FROM image_metadata WHERE id IN (${placeholders})`);
    const result = deleteStmt.run(...idsToDelete);
    return result.changes;
  }

  private parseImageMetadataRow(row: any): ImageMetadata | null {
    if (!row) return null;
    try {
      return {
        id: row.id,
        filename: row.filename,
        prompt: row.prompt,
        description: row.description,
        style: row.style,
        model: row.model,
        provider: row.provider,
        dimensions: { width: row.dimensions_width, height: row.dimensions_height },
        generatedAt: row.generated_at,
        tags: JSON.parse(row.tags || '[]'),
        originalUrl: row.original_url,
        localPath: row.local_path,
        thumbnailUrl: row.thumbnail_url,
        isFavorite: !!row.is_favorite,
        parameters: JSON.parse(row.parameters || '{}'),
      };
    } catch (e) {
      console.error(`Error parsing JSON for image metadata ${row.id}:`, e);
      return null;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
