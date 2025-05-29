// IndexedDB cache utility for MCP capabilities and metadata

interface CacheEntry {
  key: string;
  value: unknown;
  timestamp: number;
  expiresAt?: number;
}

class IndexedDBCache {
  private dbName = 'claudia-mcp-cache';
  private dbVersion = 1;
  private storeName = 'cache';
  private db: IDBDatabase | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined
    };

    return new Promise((resolve, reject) => {
      const request = store.put(entry);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to store cache entry: ${request.error}`));
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onsuccess = () => {
        const entry: CacheEntry | undefined = request.result;
        
        if (!entry) {
          resolve(null);
          return;
        }

        // Check if entry has expired
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          // Clean up expired entry
          this.delete(key).catch(console.warn);
          resolve(null);
          return;
        }

        resolve(entry.value as T);
      };
      
      request.onerror = () => reject(new Error(`Failed to get cache entry: ${request.error}`));
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete cache entry: ${request.error}`));
    });
  }

  async clear(): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear cache: ${request.error}`));
    });
  }

  async cleanup(): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('expiresAt');

    const now = Date.now();
    const range = IDBKeyRange.upperBound(now);

    return new Promise((resolve, reject) => {
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(new Error(`Failed to cleanup cache: ${request.error}`));
    });
  }

  async getAllKeys(): Promise<string[]> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(new Error(`Failed to get all keys: ${request.error}`));
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
let instance: IndexedDBCache | null = null;

export function getIndexedDBCache(): IndexedDBCache {
  if (!instance) {
    instance = new IndexedDBCache();
  }
  return instance;
}

// Specific cache keys for MCP
export const MCP_CACHE_KEYS = {
  CAPABILITIES: (serverId: string) => `mcp:capabilities:${serverId}`,
  SERVER_INFO: (serverId: string) => `mcp:server:${serverId}`,
  TOOLS: (serverId: string) => `mcp:tools:${serverId}`,
  RESOURCES: (serverId: string) => `mcp:resources:${serverId}`,
  PROMPTS: (serverId: string) => `mcp:prompts:${serverId}`,
} as const;

// Cleanup function to run periodically
export async function cleanupMCPCache(): Promise<void> {
  try {
    const cache = getIndexedDBCache();
    await cache.cleanup();
    console.log('✅ MCP cache cleanup completed');
  } catch (error) {
    console.warn('⚠️ MCP cache cleanup failed:', error);
  }
}

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupMCPCache, 5 * 60 * 1000);
}