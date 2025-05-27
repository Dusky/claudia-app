import type { 
  MCPProvider, 
  MCPProviderConfig, 
  MCPTool, 
  MCPToolCall, 
  MCPToolResult,
  MCPResource,
  MCPPrompt,
  MCPServer
} from './types';
import { RealMCPClient } from './realClient';
import { BuiltinServerRegistry } from './builtin';
import { getIndexedDBCache, MCP_CACHE_KEYS } from '../../utils/indexedDbCache';

export class MCPProviderManager implements MCPProvider {
  public readonly id = 'mcp';
  public readonly name = 'MCP Tools';
  
  private clients = new Map<string, RealMCPClient>();
  private builtinRegistry = new BuiltinServerRegistry();
  private config: MCPProviderConfig | null = null;
  private cachedTools: MCPTool[] = [];
  private lastToolsUpdate = 0;
  private readonly toolsCacheTimeout = 30000; // 30 seconds
  private cache = getIndexedDBCache();

  isConfigured(): boolean {
    // Always configured due to built-in servers
    return true;
  }

  isConnected(): boolean {
    // Always connected due to built-in servers
    return true;
  }

  async initialize(config?: MCPProviderConfig): Promise<void> {
    this.config = config || {
      servers: [
        // Example WebSocket MCP server
        {
          id: 'example-ws',
          name: 'Example WebSocket MCP Server',
          type: 'websocket',
          url: 'ws://localhost:8080/mcp',
          connected: false
        },
        // Example HTTP MCP server
        {
          id: 'example-http',
          name: 'Example HTTP MCP Server', 
          type: 'http',
          url: 'http://localhost:8080',
          connected: false
        }
      ],
      timeout: 10000,
      maxRetries: 3
    };

    console.log('🔧 Initializing MCP provider with config:', this.config);

    // Connect to all configured servers
    if (this.config.servers) {
      for (const server of this.config.servers) {
        // Skip servers without URLs for now (process-based servers need Node.js)
        if (!server.url) {
          console.log(`⏭️  Skipping process-based MCP server ${server.name} (not supported in browser)`);
          continue;
        }

        try {
          // Try to restore cached capabilities first
          await this.loadCachedCapabilities(server);
          
          const client = new RealMCPClient(server);
          await client.connect();
          this.clients.set(server.id, client);
          
          // Cache the new capabilities after successful connection
          await this.cacheServerCapabilities(server);
          
          console.log(`✅ Connected to MCP server: ${server.name}`);
        } catch (error) {
          console.error(`❌ Failed to connect to MCP server ${server.name}:`, error);
        }
      }
    }

    // Cache initial tools
    await this.refreshToolsCache();
  }

  async listTools(): Promise<MCPTool[]> {
    // Return cached tools if recent enough
    const now = Date.now();
    if (this.cachedTools.length > 0 && (now - this.lastToolsUpdate) < this.toolsCacheTimeout) {
      return this.cachedTools;
    }

    return this.refreshToolsCache();
  }

  private async refreshToolsCache(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];
    
    // Add built-in server tools
    try {
      const builtinTools = await this.builtinRegistry.listAllTools();
      allTools.push(...builtinTools);
    } catch (error) {
      console.error('Error listing builtin tools:', error);
    }
    
    // Add external server tools in parallel
    const toolPromises = Array.from(this.clients.entries()).map(async ([serverId, client]) => {
      try {
        // Try to get cached tools first
        const cachedTools = await this.getCachedTools(serverId);
        if (cachedTools) {
          console.log(`📋 Using cached tools for server ${serverId}`);
          return cachedTools.map(tool => ({
            ...tool,
            name: `${serverId}.${tool.name}`,
            description: `[${serverId}] ${tool.description}`
          }));
        }

        // Fetch fresh tools if no cache
        const tools = await client.listTools();
        
        // Cache the fresh tools
        await this.cacheServerTools(serverId, tools);
        
        // Prefix tool names with server ID to avoid conflicts
        return tools.map(tool => ({
          ...tool,
          name: `${serverId}.${tool.name}`,
          description: `[${serverId}] ${tool.description}`
        }));
      } catch (error) {
        console.error(`Error listing tools from server ${serverId}:`, error);
        
        // Try to fall back to cached tools even if they might be stale
        const cachedTools = await this.getCachedTools(serverId);
        if (cachedTools) {
          console.log(`📋 Falling back to cached tools for server ${serverId}`);
          return cachedTools.map(tool => ({
            ...tool,
            name: `${serverId}.${tool.name}`,
            description: `[${serverId}] ${tool.description}`
          }));
        }
        
        return [];
      }
    });

    const toolResults = await Promise.all(toolPromises);
    toolResults.forEach(tools => allTools.push(...tools));

    this.cachedTools = allTools;
    this.lastToolsUpdate = Date.now();
    return allTools;
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    // Check if it's a built-in tool first
    if (this.builtinRegistry.isBuiltinTool(toolCall.name)) {
      return await this.builtinRegistry.callTool(toolCall);
    }

    // Parse server ID from tool name for external servers
    const [serverId, ...toolNameParts] = toolCall.name.split('.');
    const actualToolName = toolNameParts.join('.');
    
    const client = this.clients.get(serverId);
    if (!client) {
      return {
        content: [{
          type: 'text',
          text: `Error: MCP server '${serverId}' not found or not connected`
        }],
        isError: true
      };
    }

    try {
      const result = await client.callTool({
        name: actualToolName,
        arguments: toolCall.arguments
      });
      return result;
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error calling tool ${toolCall.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  async callToolsParallel(toolCalls: MCPToolCall[]): Promise<MCPToolResult[]> {
    // Execute all tool calls in parallel
    const promises = toolCalls.map(async (toolCall, index) => {
      try {
        const result = await this.callTool(toolCall);
        return { index, result };
      } catch (error) {
        return {
          index,
          result: {
            content: [{
              type: 'text' as const,
              text: `Error calling tool ${toolCall.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          }
        };
      }
    });

    // Wait for all to complete and restore order
    const results = await Promise.all(promises);
    return results
      .sort((a, b) => a.index - b.index)
      .map(r => r.result);
  }

  async listResources(): Promise<MCPResource[]> {
    const allResources: MCPResource[] = [];
    
    // Fetch resources from all servers in parallel
    const resourcePromises = Array.from(this.clients.entries()).map(async ([serverId, client]) => {
      try {
        const resources = await client.listResources();
        // Prefix resource URIs with server ID
        return resources.map(resource => ({
          ...resource,
          uri: `${serverId}://${resource.uri}`,
          name: `[${serverId}] ${resource.name}`
        }));
      } catch (error) {
        console.error(`Error listing resources from server ${serverId}:`, error);
        return [];
      }
    });

    const resourceResults = await Promise.all(resourcePromises);
    resourceResults.forEach(resources => allResources.push(...resources));

    return allResources;
  }

  async readResource(uri: string): Promise<{ contents: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> {
    // Parse server ID from URI
    const match = uri.match(/^([^:]+):\/\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid resource URI format: ${uri}`);
    }

    const [, serverId, actualUri] = match;
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`MCP server '${serverId}' not found or not connected`);
    }

    return client.readResource(actualUri);
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    const allPrompts: MCPPrompt[] = [];
    
    // Fetch prompts from all servers in parallel
    const promptPromises = Array.from(this.clients.entries()).map(async ([serverId, client]) => {
      try {
        const prompts = await client.listPrompts();
        // Prefix prompt names with server ID
        return prompts.map(prompt => ({
          ...prompt,
          name: `${serverId}.${prompt.name}`,
          description: `[${serverId}] ${prompt.description}`
        }));
      } catch (error) {
        console.error(`Error listing prompts from server ${serverId}:`, error);
        return [];
      }
    });

    const promptResults = await Promise.all(promptPromises);
    promptResults.forEach(prompts => allPrompts.push(...prompts));

    return allPrompts;
  }

  async getPrompt(name: string, promptArguments?: Record<string, any>): Promise<{ description?: string; messages: Array<{ role: string; content: { type: string; text: string } }> }> {
    // Parse server ID from prompt name
    const [serverId, ...promptNameParts] = name.split('.');
    const actualPromptName = promptNameParts.join('.');
    
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`MCP server '${serverId}' not found or not connected`);
    }

    return client.getPrompt(actualPromptName, promptArguments);
  }

  async disconnect(): Promise<void> {
    for (const [serverId, client] of this.clients) {
      try {
        await client.disconnect();
        console.log(`🔌 Disconnected from MCP server: ${serverId}`);
      } catch (error) {
        console.error(`Error disconnecting from server ${serverId}:`, error);
      }
    }
    
    this.clients.clear();
    this.cachedTools = [];
    this.lastToolsUpdate = 0;
  }

  // Additional utility methods
  getConnectedServers(): MCPServer[] {
    const servers: MCPServer[] = [];
    
    // Add built-in servers (always connected)
    for (const builtinServer of this.builtinRegistry.getAllServers()) {
      servers.push({
        id: builtinServer.id,
        name: builtinServer.name,
        type: 'builtin' as const,
        connected: true
      });
    }
    
    // Add external servers
    for (const [serverId, client] of this.clients) {
      const serverConfig = this.config?.servers?.find(s => s.id === serverId);
      if (serverConfig && client.isConnected()) {
        servers.push({ ...serverConfig, connected: true });
      }
    }
    
    return servers;
  }

  async reconnectServer(serverId: string): Promise<void> {
    const server = this.config?.servers?.find(s => s.id === serverId);
    if (!server) {
      throw new Error(`Server configuration for '${serverId}' not found`);
    }

    // Disconnect existing client if any
    const existingClient = this.clients.get(serverId);
    if (existingClient) {
      await existingClient.disconnect();
      this.clients.delete(serverId);
    }

    // Create new client and connect
    const client = new RealMCPClient(server);
    await client.connect();
    this.clients.set(serverId, client);
    
    // Refresh tools cache
    await this.refreshToolsCache();
  }

  // Cache management methods
  private async loadCachedCapabilities(server: MCPServer): Promise<void> {
    try {
      const cachedCapabilities = await this.cache.get(MCP_CACHE_KEYS.CAPABILITIES(server.id));
      const cachedServerInfo = await this.cache.get(MCP_CACHE_KEYS.SERVER_INFO(server.id));
      
      if (cachedCapabilities) {
        server.capabilities = cachedCapabilities;
        console.log(`📋 Restored capabilities for ${server.name} from cache`);
      }
      
      if (cachedServerInfo) {
        Object.assign(server, cachedServerInfo);
        console.log(`📋 Restored server info for ${server.name} from cache`);
      }
    } catch (error) {
      console.warn(`Failed to load cached capabilities for ${server.name}:`, error);
    }
  }

  private async cacheServerCapabilities(server: MCPServer): Promise<void> {
    try {
      // Cache capabilities for 24 hours
      const ttl = 24 * 60 * 60 * 1000;
      
      if (server.capabilities) {
        await this.cache.set(MCP_CACHE_KEYS.CAPABILITIES(server.id), server.capabilities, ttl);
      }
      
      // Cache server info (excluding sensitive data)
      const serverInfo = {
        id: server.id,
        name: server.name,
        type: server.type,
        url: server.url,
        connected: server.connected
      };
      await this.cache.set(MCP_CACHE_KEYS.SERVER_INFO(server.id), serverInfo, ttl);
      
      console.log(`💾 Cached capabilities for ${server.name}`);
    } catch (error) {
      console.warn(`Failed to cache capabilities for ${server.name}:`, error);
    }
  }

  private async cacheServerTools(serverId: string, tools: MCPTool[]): Promise<void> {
    try {
      // Cache tools for 1 hour
      const ttl = 60 * 60 * 1000;
      await this.cache.set(MCP_CACHE_KEYS.TOOLS(serverId), tools, ttl);
      console.log(`💾 Cached ${tools.length} tools for server ${serverId}`);
    } catch (error) {
      console.warn(`Failed to cache tools for ${serverId}:`, error);
    }
  }

  private async getCachedTools(serverId: string): Promise<MCPTool[] | null> {
    try {
      return await this.cache.get<MCPTool[]>(MCP_CACHE_KEYS.TOOLS(serverId));
    } catch (error) {
      console.warn(`Failed to get cached tools for ${serverId}:`, error);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      await this.cache.clear();
      console.log('🧹 MCP cache cleared');
    } catch (error) {
      console.warn('Failed to clear MCP cache:', error);
    }
  }
}