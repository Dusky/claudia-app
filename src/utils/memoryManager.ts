/**
 * Memory management utilities for preventing memory leaks in image handling
 */

interface ManagedObjectURL {
  url: string;
  createdAt: number;
  id: string;
  source: string; // For debugging - where the URL was created
}

/**
 * Memory manager for tracking and cleaning up object URLs and other resources
 */
export class MemoryManager {
  private static instance: MemoryManager;
  private objectUrls: Map<string, ManagedObjectURL> = new Map();
  private cleanupInterval: number | null = null;
  private maxAge = 5 * 60 * 1000; // 5 minutes default
  private maxConcurrentUrls = 50; // Maximum concurrent object URLs

  private constructor() {
    this.startCleanupInterval();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Create a managed object URL that will be automatically cleaned up
   */
  createObjectURL(blob: Blob, source: string = 'unknown'): string {
    const url = URL.createObjectURL(blob);
    const id = this.generateId();
    
    const managedUrl: ManagedObjectURL = {
      url,
      createdAt: Date.now(),
      id,
      source
    };
    
    this.objectUrls.set(id, managedUrl);
    
    // If we have too many URLs, cleanup oldest ones
    if (this.objectUrls.size > this.maxConcurrentUrls) {
      this.cleanupOldestUrls(this.maxConcurrentUrls * 0.8); // Keep 80% of max
    }
    
    console.debug(`🔗 Created managed object URL from ${source}:`, id);
    return url;
  }

  /**
   * Manually revoke a managed object URL
   */
  revokeObjectURL(url: string): void {
    const entry = Array.from(this.objectUrls.values()).find(u => u.url === url);
    if (entry) {
      URL.revokeObjectURL(url);
      this.objectUrls.delete(entry.id);
      console.debug(`🗑️ Manually revoked object URL:`, entry.id);
    } else {
      // Still try to revoke it in case it's not managed
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Get a managed URL by ID for manual cleanup
   */
  getManagedUrl(id: string): ManagedObjectURL | undefined {
    return this.objectUrls.get(id);
  }

  /**
   * Revoke a managed URL by ID
   */
  revokeManagedUrl(id: string): boolean {
    const managedUrl = this.objectUrls.get(id);
    if (managedUrl) {
      URL.revokeObjectURL(managedUrl.url);
      this.objectUrls.delete(id);
      console.debug(`🗑️ Revoked managed URL:`, id);
      return true;
    }
    return false;
  }

  /**
   * Clean up all URLs older than maxAge
   */
  private cleanupOldUrls(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [id, managedUrl] of this.objectUrls.entries()) {
      if (now - managedUrl.createdAt > this.maxAge) {
        URL.revokeObjectURL(managedUrl.url);
        toDelete.push(id);
      }
    }
    
    toDelete.forEach(id => this.objectUrls.delete(id));
    
    if (toDelete.length > 0) {
      console.debug(`🧹 Cleaned up ${toDelete.length} expired object URLs`);
    }
  }

  /**
   * Clean up oldest URLs to keep count under limit
   */
  private cleanupOldestUrls(keepCount: number): void {
    const sorted = Array.from(this.objectUrls.entries())
      .sort(([, a], [, b]) => a.createdAt - b.createdAt);
    
    const toDelete = sorted.slice(0, sorted.length - keepCount);
    
    toDelete.forEach(([id, managedUrl]) => {
      URL.revokeObjectURL(managedUrl.url);
      this.objectUrls.delete(id);
    });
    
    if (toDelete.length > 0) {
      console.debug(`🧹 Cleaned up ${toDelete.length} oldest object URLs`);
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    if (typeof window !== 'undefined' && !this.cleanupInterval) {
      this.cleanupInterval = window.setInterval(() => {
        this.cleanupOldUrls();
      }, 60000); // Cleanup every minute
    }
  }

  /**
   * Stop automatic cleanup (for tests or cleanup)
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Force cleanup of all managed URLs
   */
  cleanupAll(): void {
    for (const [, managedUrl] of this.objectUrls.entries()) {
      URL.revokeObjectURL(managedUrl.url);
    }
    this.objectUrls.clear();
    console.debug('🧹 Cleaned up all managed object URLs');
  }

  /**
   * Get memory usage statistics
   */
  getStats(): {
    activeUrls: number;
    oldestAge: number;
    newestAge: number;
    totalSize: number;
    sources: { [key: string]: number };
  } {
    const now = Date.now();
    const urls = Array.from(this.objectUrls.values());
    const sources: { [key: string]: number } = {};
    
    urls.forEach(url => {
      sources[url.source] = (sources[url.source] || 0) + 1;
    });
    
    return {
      activeUrls: urls.length,
      oldestAge: urls.length > 0 ? Math.max(...urls.map(u => now - u.createdAt)) : 0,
      newestAge: urls.length > 0 ? Math.min(...urls.map(u => now - u.createdAt)) : 0,
      totalSize: urls.length,
      sources
    };
  }

  /**
   * Generate unique ID for tracking
   */
  private generateId(): string {
    return `url_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Configure cleanup settings
   */
  configure(options: {
    maxAge?: number;
    maxConcurrentUrls?: number;
  }): void {
    if (options.maxAge !== undefined) {
      this.maxAge = options.maxAge;
    }
    if (options.maxConcurrentUrls !== undefined) {
      this.maxConcurrentUrls = options.maxConcurrentUrls;
    }
  }

  /**
   * Cleanup resources when app is shutting down
   */
  destroy(): void {
    this.stopCleanupInterval();
    this.cleanupAll();
  }
}

/**
 * Component-level memory manager for tracking resources per component
 */
export class ComponentMemoryManager {
  private memoryManager: MemoryManager;
  private managedResources: Set<string> = new Set();
  private componentName: string;

  constructor(componentName: string) {
    this.memoryManager = MemoryManager.getInstance();
    this.componentName = componentName;
  }

  /**
   * Create object URL and track it for this component
   */
  createObjectURL(blob: Blob): string {
    const url = this.memoryManager.createObjectURL(blob, this.componentName);
    this.managedResources.add(url);
    return url;
  }

  /**
   * Revoke specific URL managed by this component
   */
  revokeObjectURL(url: string): void {
    this.memoryManager.revokeObjectURL(url);
    this.managedResources.delete(url);
  }

  /**
   * Cleanup all resources managed by this component
   */
  cleanup(): void {
    for (const url of this.managedResources) {
      this.memoryManager.revokeObjectURL(url);
    }
    this.managedResources.clear();
    console.debug(`🧹 Cleaned up all resources for ${this.componentName}`);
  }

  /**
   * Get count of resources managed by this component
   */
  getResourceCount(): number {
    return this.managedResources.size;
  }
}

/**
 * React hook for automatic memory management in components
 */
export const useMemoryManager = (componentName: string) => {
  const manager = React.useMemo(() => new ComponentMemoryManager(componentName), [componentName]);
  
  React.useEffect(() => {
    return () => {
      manager.cleanup();
    };
  }, [manager]);
  
  return manager;
};

// Import React for the hook
import React from 'react';

// Global instance for easy access
export const memoryManager = MemoryManager.getInstance();

// Utility functions for common use cases
export const createManagedObjectURL = (blob: Blob, source?: string): string => {
  return memoryManager.createObjectURL(blob, source);
};

export const revokeManagedObjectURL = (url: string): void => {
  memoryManager.revokeObjectURL(url);
};

// Initialize cleanup on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryManager.destroy();
  });
  
  // Also cleanup on visibility change (user switches tabs)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Force cleanup when tab becomes hidden
      const stats = memoryManager.getStats();
      if (stats.activeUrls > 10) {
        console.debug('🧹 Forcing cleanup due to tab becoming hidden');
        memoryManager.cleanupAll();
      }
    }
  });
}