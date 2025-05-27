// Built-in MCP Servers Registry

import { BuiltinFetchServer } from './fetch';
import { BuiltinTimeServer } from './time';
import { BuiltinMemoryServer } from './memory';
import { BuiltinSQLiteServer } from './sqlite';
import { BuiltinFilesystemServer } from './filesystem';
import { BuiltinTTSServer } from './tts';
import type { MCPTool, MCPToolCall, MCPToolResult } from '../types';

export interface BuiltinMCPServer {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  listTools(): Promise<MCPTool[]>;
  callTool(toolCall: MCPToolCall): Promise<MCPToolResult>;
}

export class BuiltinServerRegistry {
  private servers = new Map<string, BuiltinMCPServer>();

  constructor() {
    // Register built-in servers
    this.registerServer(new BuiltinFetchServer());
    this.registerServer(new BuiltinTimeServer());
    this.registerServer(new BuiltinMemoryServer());
    this.registerServer(new BuiltinSQLiteServer());
    this.registerServer(new BuiltinFilesystemServer());
    this.registerServer(new BuiltinTTSServer());
  }

  private registerServer(server: BuiltinMCPServer): void {
    this.servers.set(server.id, server);
  }

  getServer(id: string): BuiltinMCPServer | undefined {
    return this.servers.get(id);
  }

  getAllServers(): BuiltinMCPServer[] {
    return Array.from(this.servers.values());
  }

  getServerIds(): string[] {
    return Array.from(this.servers.keys());
  }

  async listAllTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];
    
    for (const [serverId, server] of this.servers) {
      try {
        const tools = await server.listTools();
        // Prefix tool names with server ID to avoid conflicts
        const prefixedTools = tools.map(tool => ({
          ...tool,
          name: `${serverId}.${tool.name}`,
          description: `[${server.name}] ${tool.description}`
        }));
        allTools.push(...prefixedTools);
      } catch (error) {
        console.error(`Error listing tools from builtin server ${serverId}:`, error);
      }
    }
    
    return allTools;
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    // Parse server ID from tool name
    const [serverId, ...toolNameParts] = toolCall.name.split('.');
    const actualToolName = toolNameParts.join('.');
    
    const server = this.servers.get(serverId);
    if (!server) {
      return {
        content: [{
          type: 'text',
          text: `Built-in server '${serverId}' not found`
        }],
        isError: true
      };
    }

    try {
      return await server.callTool({
        name: actualToolName,
        arguments: toolCall.arguments
      });
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error calling builtin tool ${toolCall.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  isBuiltinTool(toolName: string): boolean {
    const [serverId] = toolName.split('.');
    return this.servers.has(serverId);
  }
}

// Export built-in server classes
export { 
  BuiltinFetchServer, 
  BuiltinTimeServer, 
  BuiltinMemoryServer, 
  BuiltinSQLiteServer, 
  BuiltinFilesystemServer, 
  BuiltinTTSServer 
};