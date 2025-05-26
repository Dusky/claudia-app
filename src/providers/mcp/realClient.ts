import type { 
  MCPInitializeRequest, 
  MCPInitializeResponse,
  MCPTool,
  MCPToolCall,
  MCPToolResult,
  MCPResource,
  MCPPrompt,
  MCPServer,
  MCPMessage
} from './types';
import type { MCPTransport } from './transport';
import { createMCPTransport } from './transport';

export class RealMCPClient {
  private transport: MCPTransport | null = null;
  private messageId = 0;
  private pendingRequests = new Map<string | number, { resolve: (value: unknown) => void; reject: (error: unknown) => void; timeout: NodeJS.Timeout }>();
  private server: MCPServer;
  private initialized = false;
  private requestTimeout = 30000; // 30 seconds

  constructor(server: MCPServer) {
    this.server = server;
  }

  async connect(): Promise<void> {
    if (this.transport) {
      throw new Error('Client already connected');
    }

    // Create transport based on server URL
    if (!this.server.url) {
      throw new Error('Server URL is required for real MCP client');
    }

    this.transport = createMCPTransport(this.server.url);

    // Set up message handlers
    this.transport.onMessage((message: string) => {
      this.handleMessage(message);
    });

    this.transport.onError((error: Error) => {
      console.error(`MCP transport error for ${this.server.name}:`, error);
      this.rejectAllPending(error);
    });

    this.transport.onClose(() => {
      console.log(`MCP transport closed for ${this.server.name}`);
      this.server.connected = false;
      this.initialized = false;
      this.rejectAllPending(new Error('Connection closed'));
    });

    await this.transport.connect();
    await this.initialize();
  }

  private handleMessage(messageStr: string): void {
    try {
      const message: MCPMessage = JSON.parse(messageStr);
      
      if (message.id !== undefined) {
        // This is a response to a request
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.id);
          
          if (message.error) {
            pending.reject(new Error(`MCP Error: ${message.error.message}`));
          } else {
            pending.resolve(message.result);
          }
        }
      } else if (message.method) {
        // This is a notification or request from server
        this.handleServerMessage(message);
      }
    } catch (error) {
      console.error('Failed to parse MCP message:', error, messageStr);
    }
  }

  private handleServerMessage(message: MCPMessage): void {
    // Handle server-initiated messages (notifications, requests)
    switch (message.method) {
      case 'notifications/tools/list_changed':
        console.log('MCP server tools list changed');
        break;
      case 'notifications/resources/list_changed':
        console.log('MCP server resources list changed');
        break;
      default:
        console.log('Unhandled server message:', message.method);
    }
  }

  private rejectAllPending(error: Error): void {
    for (const [_id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  private async initialize(): Promise<void> {
    const initRequest: MCPInitializeRequest = {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: true },
        sampling: {}
      },
      clientInfo: {
        name: 'claudia',
        version: '1.0.0'
      }
    };

    const response = await this.sendRequest('initialize', initRequest) as MCPInitializeResponse;
    this.initialized = true;
    this.server.capabilities = response.capabilities;
    this.server.connected = true;
    
    console.log(`✅ MCP server ${this.server.name} initialized (real protocol)`);
    
    // Send initialized notification
    await this.sendNotification('notifications/initialized');
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }

    const response = await this.sendRequest('tools/list') as { tools: MCPTool[] };
    return response.tools || [];
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }

    const response = await this.sendRequest('tools/call', {
      name: toolCall.name,
      arguments: toolCall.arguments
    }) as MCPToolResult;

    return response;
  }

  async listResources(): Promise<MCPResource[]> {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }

    const response = await this.sendRequest('resources/list') as { resources: MCPResource[] };
    return response.resources || [];
  }

  async readResource(uri: string): Promise<{ contents: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }

    const response = await this.sendRequest('resources/read', { uri }) as { contents: Array<{ type: string; text?: string; data?: string; mimeType?: string }> };
    return response;
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }

    const response = await this.sendRequest('prompts/list') as { prompts: MCPPrompt[] };
    return response.prompts || [];
  }

  async getPrompt(name: string, promptArguments?: Record<string, unknown>): Promise<{ description?: string; messages: Array<{ role: string; content: { type: string; text: string } }> }> {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }

    const response = await this.sendRequest('prompts/get', {
      name,
      arguments: promptArguments || {}
    }) as { description?: string; messages: Array<{ role: string; content: { type: string; text: string } }> };
    return response;
  }

  private async sendRequest(method: string, params?: unknown): Promise<unknown> {
    if (!this.transport || !this.transport.isConnected()) {
      throw new Error('Transport not connected');
    }

    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      const message: MCPMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.requestTimeout);

      // Store the promise resolvers
      this.pendingRequests.set(id, { resolve, reject, timeout });

      // Send the message
      this.transport!.send(JSON.stringify(message)).catch(error => {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      });
    });
  }

  private async sendNotification(method: string, params?: unknown): Promise<void> {
    if (!this.transport || !this.transport.isConnected()) {
      throw new Error('Transport not connected');
    }

    const message: MCPMessage = {
      jsonrpc: '2.0',
      method,
      params
    };

    await this.transport.send(JSON.stringify(message));
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.disconnect();
      this.transport = null;
      this.initialized = false;
      this.server.connected = false;
      this.rejectAllPending(new Error('Client disconnected'));
      console.log(`🔌 Disconnected from MCP server: ${this.server.name}`);
    }
  }

  isConnected(): boolean {
    return this.transport?.isConnected() ?? false;
  }
}