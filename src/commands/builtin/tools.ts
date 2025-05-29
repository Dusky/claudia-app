import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import type { MCPToolCall } from '../../providers/mcp/types';

export const toolsCommand: Command = {
  name: 'tools',
  description: 'Manage and execute MCP tools',
  usage: '/tools <subcommand> [args...]',
  aliases: ['tool', 't'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    
    if (args.length === 0) {
      return showToolsHelp(timestamp);
    }

    const subcommand = args[0].toLowerCase();
    const subArgs = args.slice(1);

    switch (subcommand) {
      case 'list':
      case 'ls':
        return await listTools(context, timestamp);
      
      case 'call':
      case 'exec':
      case 'run':
        return await callTool(subArgs, context, timestamp);
      
      case 'info':
      case 'describe':
        return await describeTool(subArgs, context, timestamp);
      
      case 'servers':
        return await listServers(context, timestamp);
      
      case 'help':
      default:
        return showToolsHelp(timestamp);
    }
  }
};

function showToolsHelp(timestamp: string): CommandResult {
  const helpLines: TerminalLine[] = [
    {
      id: `tools-help-1-${timestamp}`,
      type: 'output',
      content: '🔧 MCP Tools Commands:',
      timestamp,
      user: 'claudia'
    },
    {
      id: `tools-help-2-${timestamp}`,
      type: 'output',
      content: '  /tools list              - List all available tools',
      timestamp,
      user: 'claudia'
    },
    {
      id: `tools-help-3-${timestamp}`,
      type: 'output',
      content: '  /tools call <name> [args] - Execute a tool',
      timestamp,
      user: 'claudia'
    },
    {
      id: `tools-help-4-${timestamp}`,
      type: 'output',
      content: '  /tools info <name>       - Get tool information',
      timestamp,
      user: 'claudia'
    },
    {
      id: `tools-help-5-${timestamp}`,
      type: 'output',
      content: '  /tools servers           - List MCP servers',
      timestamp,
      user: 'claudia'
    },
    {
      id: `tools-help-6-${timestamp}`,
      type: 'output',
      content: '',
      timestamp,
      user: 'claudia'
    },
    {
      id: `tools-help-7-${timestamp}`,
      type: 'output',
      content: 'Examples:',
      timestamp,
      user: 'claudia'
    },
    {
      id: `tools-help-8-${timestamp}`,
      type: 'output',
      content: '  /tools call filesystem.read_file path="/tmp/test.txt"',
      timestamp,
      user: 'claudia'
    },
    {
      id: `tools-help-9-${timestamp}`,
      type: 'output',
      content: '  /tools info filesystem.write_file',
      timestamp,
      user: 'claudia'
    }
  ];

  return { success: true, lines: helpLines };
}

async function listTools(context: CommandContext, timestamp: string): Promise<CommandResult> {
  try {
    // Get MCP provider from context
    const mcpProvider = context.mcpManager;
    
    if (!mcpProvider || !mcpProvider.isConfigured()) {
      const errorLine: TerminalLine = {
        id: `tools-error-${timestamp}`,
        type: 'error',
        content: '❌ No MCP provider configured. Tools are not available.',
        timestamp,
        user: 'claudia'
      };
      return { success: false, lines: [errorLine] };
    }

    const tools = await mcpProvider.listTools();
    
    if (tools.length === 0) {
      const noToolsLine: TerminalLine = {
        id: `tools-empty-${timestamp}`,
        type: 'output',
        content: '📭 No tools available from connected MCP servers.',
        timestamp,
        user: 'claudia'
      };
      return { success: true, lines: [noToolsLine] };
    }

    const lines: TerminalLine[] = [
      {
        id: `tools-header-${timestamp}`,
        type: 'output',
        content: `🔧 Available Tools (${tools.length}):`,
        timestamp,
        user: 'claudia'
      }
    ];

    tools.forEach((tool, index) => {
      lines.push({
        id: `tool-${index}-${timestamp}`,
        type: 'output',
        content: `  ${tool.name} - ${tool.description}`,
        timestamp,
        user: 'claudia'
      });
    });

    return { success: true, lines };
  } catch (error) {
    const errorLine: TerminalLine = {
      id: `tools-list-error-${timestamp}`,
      type: 'error',
      content: `❌ Error listing tools: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }
}

async function callTool(args: string[], context: CommandContext, timestamp: string): Promise<CommandResult> {
  if (args.length === 0) {
    const errorLine: TerminalLine = {
      id: `tool-call-error-${timestamp}`,
      type: 'error',
      content: '❌ Tool name required. Usage: /tools call <name> [args]',
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }

  const toolName = args[0];
  const toolArgs = parseToolArguments(args.slice(1));

  try {
    const mcpProvider = context.mcpManager;
    
    if (!mcpProvider || !mcpProvider.isConfigured()) {
      const errorLine: TerminalLine = {
        id: `tool-call-no-provider-${timestamp}`,
        type: 'error',
        content: '❌ No MCP provider configured.',
        timestamp,
        user: 'claudia'
      };
      return { success: false, lines: [errorLine] };
    }

    const toolCall: MCPToolCall = {
      name: toolName,
      arguments: toolArgs
    };

    const result = await mcpProvider.callTool(toolCall);
    
    const lines: TerminalLine[] = [
      {
        id: `tool-call-header-${timestamp}`,
        type: 'output',
        content: `🔧 Tool: ${toolName}`,
        timestamp,
        user: 'claudia'
      }
    ];

    if (result.isError) {
      lines.push({
        id: `tool-call-error-result-${timestamp}`,
        type: 'error',
        content: '❌ Tool execution failed:',
        timestamp,
        user: 'claudia'
      });
    }

    result.content.forEach((content, index) => {
      if (content.type === 'text' && content.text) {
        lines.push({
          id: `tool-result-${index}-${timestamp}`,
          type: result.isError ? 'error' : 'output',
          content: content.text,
          timestamp,
          user: 'claudia'
        });
      }
    });

    return { success: !result.isError, lines };
  } catch (error) {
    const errorLine: TerminalLine = {
      id: `tool-call-exception-${timestamp}`,
      type: 'error',
      content: `❌ Error calling tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }
}

async function describeTool(args: string[], context: CommandContext, timestamp: string): Promise<CommandResult> {
  if (args.length === 0) {
    const errorLine: TerminalLine = {
      id: `tool-info-error-${timestamp}`,
      type: 'error',
      content: '❌ Tool name required. Usage: /tools info <name>',
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }

  const toolName = args[0];

  try {
    const mcpProvider = context.mcpManager;
    
    if (!mcpProvider || !mcpProvider.isConfigured()) {
      const errorLine: TerminalLine = {
        id: `tool-info-no-provider-${timestamp}`,
        type: 'error',
        content: '❌ No MCP provider configured.',
        timestamp,
        user: 'claudia'
      };
      return { success: false, lines: [errorLine] };
    }

    const tools = await mcpProvider.listTools();
    const tool = tools.find(t => t.name === toolName);

    if (!tool) {
      const errorLine: TerminalLine = {
        id: `tool-info-not-found-${timestamp}`,
        type: 'error',
        content: `❌ Tool '${toolName}' not found.`,
        timestamp,
        user: 'claudia'
      };
      return { success: false, lines: [errorLine] };
    }

    const lines: TerminalLine[] = [
      {
        id: `tool-info-header-${timestamp}`,
        type: 'output',
        content: `🔧 Tool Information: ${tool.name}`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `tool-info-desc-${timestamp}`,
        type: 'output',
        content: `Description: ${tool.description}`,
        timestamp,
        user: 'claudia'
      }
    ];

    if (tool.inputSchema.properties) {
      lines.push({
        id: `tool-info-params-header-${timestamp}`,
        type: 'output',
        content: 'Parameters:',
        timestamp,
        user: 'claudia'
      });

      Object.entries(tool.inputSchema.properties).forEach(([param, schema], index) => {
        const required = tool.inputSchema.required?.includes(param) ? ' (required)' : '';
        const description = (schema as any).description || '';
        lines.push({
          id: `tool-info-param-${index}-${timestamp}`,
          type: 'output',
          content: `  ${param}${required}: ${description}`,
          timestamp,
          user: 'claudia'
        });
      });
    }

    return { success: true, lines };
  } catch (error) {
    const errorLine: TerminalLine = {
      id: `tool-info-exception-${timestamp}`,
      type: 'error',
      content: `❌ Error getting tool info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }
}

async function listServers(context: CommandContext, timestamp: string): Promise<CommandResult> {
  try {
    const mcpProvider = context.mcpManager;
    
    if (!mcpProvider || !mcpProvider.isConfigured()) {
      const errorLine: TerminalLine = {
        id: `servers-error-${timestamp}`,
        type: 'error',
        content: '❌ No MCP provider configured.',
        timestamp,
        user: 'claudia'
      };
      return { success: false, lines: [errorLine] };
    }

    const servers = mcpProvider.getConnectedServers() || [];
    
    if (servers.length === 0) {
      const noServersLine: TerminalLine = {
        id: `servers-empty-${timestamp}`,
        type: 'output',
        content: '📭 No MCP servers connected.',
        timestamp,
        user: 'claudia'
      };
      return { success: true, lines: [noServersLine] };
    }

    const lines: TerminalLine[] = [
      {
        id: `servers-header-${timestamp}`,
        type: 'output',
        content: `🖥️  Connected MCP Servers (${servers.length}):`,
        timestamp,
        user: 'claudia'
      }
    ];

    servers.forEach((server, index) => {
      const status = server.connected ? '🟢' : '🔴';
      lines.push({
        id: `server-${index}-${timestamp}`,
        type: 'output',
        content: `  ${status} ${server.name} (${server.id})`,
        timestamp,
        user: 'claudia'
      });
    });

    return { success: true, lines };
  } catch (error) {
    const errorLine: TerminalLine = {
      id: `servers-exception-${timestamp}`,
      type: 'error',
      content: `❌ Error listing servers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }
}

function parseToolArguments(args: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const arg of args) {
    // Support key=value format
    const match = arg.match(/^([^=]+)=(.+)$/);
    if (match) {
      const [, key, value] = match;
      // Try to parse as JSON, fallback to string
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    }
  }
  
  return result;
}