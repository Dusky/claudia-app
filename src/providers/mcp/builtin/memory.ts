// Built-in Memory MCP Server for browser environment
// Provides persistent knowledge storage using localStorage

import type { MCPTool, MCPToolCall, MCPToolResult } from '../types';

interface MemoryEntry {
  id: string;
  content: string;
  tags: string[];
  category?: string;
  timestamp: string;
  lastAccessed: string;
}

export class BuiltinMemoryServer {
  readonly id = 'builtin-memory';
  readonly name = 'Built-in Memory';
  readonly description = 'Persistent knowledge and information storage';
  private readonly storageKey = 'claudia-memory-entries';

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'store_memory',
        description: 'Store information in memory with optional tags and category',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The information to store'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags to associate with this memory'
            },
            category: {
              type: 'string',
              description: 'Optional category for organization'
            }
          },
          required: ['content']
        }
      },
      {
        name: 'search_memory',
        description: 'Search stored memories by content, tags, or category',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for content'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by specific tags'
            },
            category: {
              type: 'string',
              description: 'Filter by category'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
              default: 10
            }
          }
        }
      },
      {
        name: 'get_memory',
        description: 'Retrieve a specific memory by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Memory entry ID'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'delete_memory',
        description: 'Delete a memory by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Memory entry ID to delete'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'list_memories',
        description: 'List all stored memories with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Filter by category'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 20
            },
            sort_by: {
              type: 'string',
              description: 'Sort order',
              enum: ['newest', 'oldest', 'recent_access'],
              default: 'newest'
            }
          }
        }
      },
      {
        name: 'get_memory_stats',
        description: 'Get statistics about stored memories',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'clear_memory',
        description: 'Clear all stored memories (use with caution)',
        inputSchema: {
          type: 'object',
          properties: {
            confirm: {
              type: 'boolean',
              description: 'Must be true to confirm deletion'
            }
          },
          required: ['confirm']
        }
      }
    ];
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      switch (toolCall.name) {
        case 'store_memory':
          return await this.handleStoreMemory(toolCall.arguments);
        case 'search_memory':
          return await this.handleSearchMemory(toolCall.arguments);
        case 'get_memory':
          return await this.handleGetMemory(toolCall.arguments);
        case 'delete_memory':
          return await this.handleDeleteMemory(toolCall.arguments);
        case 'list_memories':
          return await this.handleListMemories(toolCall.arguments);
        case 'get_memory_stats':
          return await this.handleGetMemoryStats(toolCall.arguments);
        case 'clear_memory':
          return await this.handleClearMemory(toolCall.arguments);
        default:
          return {
            content: [{
              type: 'text',
              text: `Unknown tool: ${toolCall.name}`
            }],
            isError: true
          };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error executing ${toolCall.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleStoreMemory(args: Record<string, unknown>): Promise<MCPToolResult> {
    const content = args.content as string;
    const tags = (args.tags as string[]) || [];
    const category = args.category as string;

    if (!content) {
      return {
        content: [{ type: 'text', text: 'Content is required' }],
        isError: true
      };
    }

    try {
      const memories = this.loadMemories();
      const id = this.generateId();
      const timestamp = new Date().toISOString();

      const newMemory: MemoryEntry = {
        id,
        content,
        tags,
        category,
        timestamp,
        lastAccessed: timestamp
      };

      memories.push(newMemory);
      this.saveMemories(memories);

      return {
        content: [{
          type: 'text',
          text: `Memory stored successfully with ID: ${id}\nContent: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to store memory: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleSearchMemory(args: Record<string, unknown>): Promise<MCPToolResult> {
    const query = args.query as string;
    const filterTags = (args.tags as string[]) || [];
    const filterCategory = args.category as string;
    const limit = (args.limit as number) || 10;

    try {
      const memories = this.loadMemories();
      let results = memories;

      // Filter by category
      if (filterCategory) {
        results = results.filter(m => m.category === filterCategory);
      }

      // Filter by tags
      if (filterTags.length > 0) {
        results = results.filter(m => 
          filterTags.some(tag => m.tags.includes(tag))
        );
      }

      // Search content
      if (query) {
        const lowerQuery = query.toLowerCase();
        results = results.filter(m => 
          m.content.toLowerCase().includes(lowerQuery) ||
          m.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      }

      // Sort by relevance (simple scoring)
      if (query) {
        results.sort((a, b) => {
          const aScore = this.calculateRelevanceScore(a, query);
          const bScore = this.calculateRelevanceScore(b, query);
          return bScore - aScore;
        });
      } else {
        // Sort by newest first
        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }

      // Update last accessed time for results
      const resultIds = results.slice(0, limit).map(r => r.id);
      this.updateLastAccessed(resultIds);

      const limitedResults = results.slice(0, limit);

      if (limitedResults.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No memories found matching the search criteria.'
          }]
        };
      }

      const formatted = limitedResults.map(m => 
        `ID: ${m.id}\nContent: ${m.content}\nTags: ${m.tags.join(', ')}\nCategory: ${m.category || 'None'}\nStored: ${new Date(m.timestamp).toLocaleString()}\n`
      ).join('\n---\n');

      return {
        content: [{
          type: 'text',
          text: `Found ${limitedResults.length} memories:\n\n${formatted}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to search memories: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleGetMemory(args: Record<string, unknown>): Promise<MCPToolResult> {
    const id = args.id as string;

    if (!id) {
      return {
        content: [{ type: 'text', text: 'Memory ID is required' }],
        isError: true
      };
    }

    try {
      const memories = this.loadMemories();
      const memory = memories.find(m => m.id === id);

      if (!memory) {
        return {
          content: [{
            type: 'text',
            text: `Memory with ID '${id}' not found.`
          }],
          isError: true
        };
      }

      // Update last accessed
      this.updateLastAccessed([id]);

      return {
        content: [{
          type: 'text',
          text: `Memory ID: ${memory.id}\nContent: ${memory.content}\nTags: ${memory.tags.join(', ')}\nCategory: ${memory.category || 'None'}\nStored: ${new Date(memory.timestamp).toLocaleString()}\nLast Accessed: ${new Date(memory.lastAccessed).toLocaleString()}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to get memory: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleDeleteMemory(args: Record<string, unknown>): Promise<MCPToolResult> {
    const id = args.id as string;

    if (!id) {
      return {
        content: [{ type: 'text', text: 'Memory ID is required' }],
        isError: true
      };
    }

    try {
      const memories = this.loadMemories();
      const index = memories.findIndex(m => m.id === id);

      if (index === -1) {
        return {
          content: [{
            type: 'text',
            text: `Memory with ID '${id}' not found.`
          }],
          isError: true
        };
      }

      const deletedMemory = memories.splice(index, 1)[0];
      this.saveMemories(memories);

      return {
        content: [{
          type: 'text',
          text: `Memory deleted successfully.\nDeleted: ${deletedMemory.content.substring(0, 100)}${deletedMemory.content.length > 100 ? '...' : ''}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to delete memory: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleListMemories(args: Record<string, unknown>): Promise<MCPToolResult> {
    const filterCategory = args.category as string;
    const limit = (args.limit as number) || 20;
    const sortBy = (args.sort_by as string) || 'newest';

    try {
      let memories = this.loadMemories();

      // Filter by category
      if (filterCategory) {
        memories = memories.filter(m => m.category === filterCategory);
      }

      // Sort
      switch (sortBy) {
        case 'oldest':
          memories.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          break;
        case 'recent_access':
          memories.sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
          break;
        case 'newest':
        default:
          memories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }

      const limitedMemories = memories.slice(0, limit);

      if (limitedMemories.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No memories found.'
          }]
        };
      }

      const formatted = limitedMemories.map(m => 
        `ID: ${m.id} | ${m.content.substring(0, 60)}${m.content.length > 60 ? '...' : ''} | Tags: [${m.tags.join(', ')}] | ${new Date(m.timestamp).toLocaleDateString()}`
      ).join('\n');

      return {
        content: [{
          type: 'text',
          text: `Memories (${limitedMemories.length} shown, sorted by ${sortBy}):\n\n${formatted}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to list memories: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleGetMemoryStats(_args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      const memories = this.loadMemories();
      
      const categories = new Set(memories.map(m => m.category).filter(Boolean));
      const allTags = new Set(memories.flatMap(m => m.tags));
      
      const stats = {
        totalMemories: memories.length,
        categories: Array.from(categories),
        totalTags: allTags.size,
        mostCommonTags: this.getMostCommonTags(memories, 5),
        storageUsed: this.getStorageUsage(),
        oldestMemory: memories.length > 0 ? new Date(Math.min(...memories.map(m => new Date(m.timestamp).getTime()))).toLocaleDateString() : 'None',
        newestMemory: memories.length > 0 ? new Date(Math.max(...memories.map(m => new Date(m.timestamp).getTime()))).toLocaleDateString() : 'None'
      };

      return {
        content: [{
          type: 'text',
          text: `Memory Statistics:\n${JSON.stringify(stats, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to get memory stats: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleClearMemory(args: Record<string, unknown>): Promise<MCPToolResult> {
    const confirm = args.confirm as boolean;

    if (!confirm) {
      return {
        content: [{
          type: 'text',
          text: 'To clear all memories, you must set confirm=true. This action cannot be undone.'
        }],
        isError: true
      };
    }

    try {
      const memories = this.loadMemories();
      const count = memories.length;
      
      localStorage.removeItem(this.storageKey);

      return {
        content: [{
          type: 'text',
          text: `All memories cleared. Deleted ${count} memory entries.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to clear memories: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private loadMemories(): MemoryEntry[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveMemories(memories: MemoryEntry[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(memories));
    } catch (error) {
      throw new Error(`Failed to save memories: ${error instanceof Error ? error.message : 'Storage error'}`);
    }
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateRelevanceScore(memory: MemoryEntry, query: string): number {
    const lowerQuery = query.toLowerCase();
    const lowerContent = memory.content.toLowerCase();
    
    let score = 0;
    
    // Exact phrase match (highest score)
    if (lowerContent.includes(lowerQuery)) {
      score += 10;
    }
    
    // Word matches
    const queryWords = lowerQuery.split(/\s+/);
    const contentWords = lowerContent.split(/\s+/);
    
    for (const word of queryWords) {
      if (contentWords.includes(word)) {
        score += 2;
      }
    }
    
    // Tag matches
    for (const tag of memory.tags) {
      if (tag.toLowerCase().includes(lowerQuery)) {
        score += 5;
      }
    }
    
    return score;
  }

  private updateLastAccessed(ids: string[]): void {
    const memories = this.loadMemories();
    const now = new Date().toISOString();
    
    for (const memory of memories) {
      if (ids.includes(memory.id)) {
        memory.lastAccessed = now;
      }
    }
    
    this.saveMemories(memories);
  }

  private getMostCommonTags(memories: MemoryEntry[], limit: number): string[] {
    const tagCounts = new Map<string, number>();
    
    for (const memory of memories) {
      for (const tag of memory.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  }

  private getStorageUsage(): string {
    try {
      const data = localStorage.getItem(this.storageKey) || '';
      const bytes = new Blob([data]).size;
      
      if (bytes < 1024) return `${bytes} bytes`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } catch {
      return 'Unknown';
    }
  }
}