import type { MCPProviderManager } from './manager';
import type { MCPToolCall, MCPToolResult } from './types';

export interface ToolExecutionResult {
  success: boolean;
  result?: MCPToolResult;
  error?: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export class MCPToolExecutor {
  private mcpManager: MCPProviderManager;
  
  constructor(mcpManager: MCPProviderManager) {
    this.mcpManager = mcpManager;
  }

  async executeToolCall(toolCall: MCPToolCall): Promise<ToolExecutionResult> {
    try {
      if (!this.mcpManager.isConfigured() || !this.mcpManager.isConnected()) {
        return {
          success: false,
          error: 'No MCP servers connected',
          toolName: toolCall.name,
          arguments: toolCall.arguments
        };
      }

      const result = await this.mcpManager.callTool(toolCall);
      
      return {
        success: !result.isError,
        result,
        error: result.isError ? this.extractErrorMessage(result) : undefined,
        toolName: toolCall.name,
        arguments: toolCall.arguments
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolName: toolCall.name,
        arguments: toolCall.arguments
      };
    }
  }

  async getAvailableTools(): Promise<string[]> {
    try {
      if (!this.mcpManager.isConfigured() || !this.mcpManager.isConnected()) {
        return [];
      }

      const tools = await this.mcpManager.listTools();
      return tools.map(tool => tool.name);
    } catch (error) {
      console.error('Error getting available tools:', error);
      return [];
    }
  }

  async getToolDescription(toolName: string): Promise<string | null> {
    try {
      if (!this.mcpManager.isConfigured() || !this.mcpManager.isConnected()) {
        return null;
      }

      const tools = await this.mcpManager.listTools();
      const tool = tools.find(t => t.name === toolName);
      return tool?.description || null;
    } catch (error) {
      console.error('Error getting tool description:', error);
      return null;
    }
  }

  private extractErrorMessage(result: MCPToolResult): string {
    const errorContent = result.content.find(c => c.type === 'text');
    return errorContent?.text || 'Tool execution failed';
  }

  formatToolResultForAI(result: ToolExecutionResult): string {
    if (!result.success) {
      return `Tool execution failed: ${result.error}`;
    }

    if (!result.result) {
      return 'Tool executed successfully but returned no result.';
    }

    const textContent = result.result.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');

    return textContent || 'Tool executed successfully.';
  }
}