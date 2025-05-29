// MCP (Model Context Protocol) types and interfaces

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description: string;
  promptArguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {};
}

export interface MCPClientCapabilities {
  sampling?: {};
  roots?: {
    listChanged?: boolean;
  };
}

export interface MCPInitializeRequest {
  protocolVersion: string;
  capabilities: MCPClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface MCPInitializeResponse {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPServer {
  id: string;
  name: string;
  // For process-based servers (Node.js)
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  // For network-based servers (WebSocket/HTTP)
  url?: string;
  // Server state
  connected: boolean;
  capabilities?: MCPServerCapabilities;
  // Server type
  type?: 'process' | 'websocket' | 'http' | 'builtin';
}

export interface MCPProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  isConnected(): boolean;
  initialize(config?: MCPProviderConfig): Promise<void>;
  listTools(): Promise<MCPTool[]>;
  callTool(toolCall: MCPToolCall): Promise<MCPToolResult>;
  listResources(): Promise<MCPResource[]>;
  readResource(uri: string): Promise<{ contents: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }>;
  listPrompts(): Promise<MCPPrompt[]>;
  getPrompt(name: string, promptArguments?: Record<string, any>): Promise<{ description?: string; messages: Array<{ role: string; content: { type: string; text: string } }> }>;
  disconnect(): Promise<void>;
}

export interface MCPProviderConfig {
  servers?: MCPServer[];
  timeout?: number;
  maxRetries?: number;
}