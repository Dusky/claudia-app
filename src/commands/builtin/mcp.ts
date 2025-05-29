import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import type { MCPServer } from '../../providers/mcp/types';
import type { MCPProviderManager } from '../../providers/mcp/manager';

export const mcpCommand: Command = {
  name: 'mcp',
  description: 'Manage MCP servers and connections',
  usage: '/mcp <subcommand> [args...]',
  aliases: ['servers'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    
    if (args.length === 0) {
      return showMCPHelp(timestamp);
    }

    const subcommand = args[0].toLowerCase();
    const subArgs = args.slice(1);

    switch (subcommand) {
      case 'list':
      case 'ls':
        return await listServers(context, timestamp);
      
      case 'add':
        return await addServer(subArgs, context, timestamp);
      
      case 'remove':
      case 'rm':
        return await removeServer(subArgs, context, timestamp);
      
      case 'connect':
        return await connectServer(subArgs, context, timestamp);
      
      case 'disconnect':
        return await disconnectServer(subArgs, context, timestamp);
      
      case 'status':
        return await serverStatus(subArgs, context, timestamp);
      
      case 'perms':
      case 'permissions':
        return await openPermissionsModal(context, timestamp);
      
      case 'tools':
        return await listTools(subArgs, context, timestamp);
      
      case 'cache':
        return await cacheCommand(subArgs, context, timestamp);
      
      case 'help':
      default:
        return showMCPHelp(timestamp);
    }
  }
};

function showMCPHelp(timestamp: string): CommandResult {
  const helpLines: TerminalLine[] = [
    {
      id: `mcp-help-1-${timestamp}`,
      type: 'output',
      content: '🖥️  MCP Server Management Commands:',
      timestamp,
      user: 'claudia'
    },
    {
      id: `mcp-help-2-${timestamp}`,
      type: 'output',
      content: '  /mcp list                    - List all configured MCP servers',
      timestamp,
      user: 'claudia'
    },
    {
      id: `mcp-help-3-${timestamp}`,
      type: 'output',
      content: '  /mcp add <id> <url> [name]   - Add new MCP server',
      timestamp,
      user: 'claudia'
    },
    {
      id: `mcp-help-4-${timestamp}`,
      type: 'output',
      content: '  /mcp remove <id>             - Remove MCP server',
      timestamp,
      user: 'claudia'
    },
    {
      id: `mcp-help-5-${timestamp}`,
      type: 'output',
      content: '  /mcp connect <id>            - Connect to MCP server',
      timestamp,
      user: 'claudia'
    },
    {
      id: `mcp-help-6-${timestamp}`,
      type: 'output',
      content: '  /mcp disconnect <id>         - Disconnect from MCP server',
      timestamp,
      user: 'claudia'
    },
    {
      id: `mcp-help-7-${timestamp}`,
      type: 'output',
      content: '  /mcp status [id]             - Show server status',
      timestamp,
      user: 'claudia'
    },
    {
      id: `mcp-help-7b-${timestamp}`,
      type: 'output',
      content: '  /mcp perms                   - Manage server permissions',
      timestamp,
      user: 'claudia'
    },
    {
      id: `mcp-help-7c-${timestamp}`,
      type: 'output',
      content: '  /mcp tools [server]          - List available tools',
      timestamp,
      user: 'claudia'
    },
    {
      id: `mcp-help-7d-${timestamp}`,
      type: 'output',
      content: '  /mcp cache clear             - Clear cached data',
      timestamp,
      user: 'claudia'
    },
    {
      id: `mcp-help-8-${timestamp}`,
      type: 'output',
      content: '',
      timestamp,
      user: 'claudia'
    },
    {
      id: `mcp-help-9-${timestamp}`,
      type: 'output',
      content: 'Examples:',
      timestamp,
      user: 'claudia'
    },
    {
      id: `mcp-help-10-${timestamp}`,
      type: 'output',
      content: '  /mcp add fs-server ws://localhost:8080/mcp "File System"',
      timestamp,
      user: 'claudia'
    },
    {
      id: `mcp-help-11-${timestamp}`,
      type: 'output',
      content: '  /mcp add api-server http://localhost:3000 "API Tools"',
      timestamp,
      user: 'claudia'
    }
  ];

  return { success: true, lines: helpLines };
}

async function listServers(context: CommandContext, timestamp: string): Promise<CommandResult> {
  try {
    const mcpProvider = context.mcpManager;
    
    if (!mcpProvider || !mcpProvider.isConfigured()) {
      const errorLine: TerminalLine = {
        id: `mcp-list-error-${timestamp}`,
        type: 'error',
        content: '❌ No MCP provider configured.',
        timestamp,
        user: 'claudia'
      };
      return { success: false, lines: [errorLine] };
    }

    const connectedServers = mcpProvider.getConnectedServers();
    const allServers = (mcpProvider as any).config?.servers || [];
    
    if (allServers.length === 0) {
      const noServersLine: TerminalLine = {
        id: `mcp-list-empty-${timestamp}`,
        type: 'output',
        content: '📭 No MCP servers configured.',
        timestamp,
        user: 'claudia'
      };
      return { success: true, lines: [noServersLine] };
    }

    const lines: TerminalLine[] = [
      {
        id: `mcp-list-header-${timestamp}`,
        type: 'output',
        content: `🖥️  MCP Servers (${allServers.length} configured, ${connectedServers.length} connected):`,
        timestamp,
        user: 'claudia'
      }
    ];

    allServers.forEach((server: MCPServer, index: number) => {
      const status = connectedServers.some(s => s.id === server.id) ? '🟢' : '🔴';
      const url = server.url || `${server.command} ${server.args?.join(' ') || ''}`;
      lines.push({
        id: `mcp-server-${index}-${timestamp}`,
        type: 'output',
        content: `  ${status} ${server.id} - ${server.name} (${url})`,
        timestamp,
        user: 'claudia'
      });
    });

    return { success: true, lines };
  } catch (error) {
    const errorLine: TerminalLine = {
      id: `mcp-list-exception-${timestamp}`,
      type: 'error',
      content: `❌ Error listing servers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }
}

async function addServer(args: string[], context: CommandContext, timestamp: string): Promise<CommandResult> {
  if (args.length < 2) {
    const errorLine: TerminalLine = {
      id: `mcp-add-error-${timestamp}`,
      type: 'error',
      content: '❌ Usage: /mcp add <id> <url> [name]',
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }

  const [id, url, ...nameParts] = args;
  const name = nameParts.length > 0 ? nameParts.join(' ') : `MCP Server ${id}`;

  // Validate URL
  if (!url.startsWith('ws://') && !url.startsWith('wss://') && !url.startsWith('http://') && !url.startsWith('https://')) {
    const errorLine: TerminalLine = {
      id: `mcp-add-invalid-url-${timestamp}`,
      type: 'error',
      content: '❌ Invalid URL. Must start with ws://, wss://, http://, or https://',
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }

  try {
    const mcpProvider = context.mcpManager;
    
    // Create new server config
    const newServer: MCPServer = {
      id,
      name,
      url,
      type: url.startsWith('ws') ? 'websocket' : 'http',
      connected: false
    };

    // Add to configuration (this would need to be persisted)
    const currentConfig = (mcpProvider as any).config || { servers: [] };
    
    // Check if server ID already exists
    if (currentConfig.servers.some((s: MCPServer) => s.id === id)) {
      const errorLine: TerminalLine = {
        id: `mcp-add-exists-${timestamp}`,
        type: 'error',
        content: `❌ Server with ID '${id}' already exists.`,
        timestamp,
        user: 'claudia'
      };
      return { success: false, lines: [errorLine] };
    }

    currentConfig.servers.push(newServer);
    
    // TODO: Persist configuration to storage
    await context.storage.setSetting('mcp.servers', currentConfig.servers);

    const successLines: TerminalLine[] = [
      {
        id: `mcp-add-success-${timestamp}`,
        type: 'output',
        content: `✅ Added MCP server: ${name}`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `mcp-add-info-${timestamp}`,
        type: 'output',
        content: `   ID: ${id}, URL: ${url}`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `mcp-add-connect-${timestamp}`,
        type: 'output',
        content: `💡 Use '/mcp connect ${id}' to connect to this server.`,
        timestamp,
        user: 'claudia'
      }
    ];

    return { success: true, lines: successLines };
  } catch (error) {
    const errorLine: TerminalLine = {
      id: `mcp-add-exception-${timestamp}`,
      type: 'error',
      content: `❌ Error adding server: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }
}

async function removeServer(args: string[], context: CommandContext, timestamp: string): Promise<CommandResult> {
  if (args.length === 0) {
    const errorLine: TerminalLine = {
      id: `mcp-remove-error-${timestamp}`,
      type: 'error',
      content: '❌ Usage: /mcp remove <id>',
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }

  const serverId = args[0];

  try {
    const mcpProvider = context.mcpManager;
    const currentConfig = (mcpProvider as any).config || { servers: [] };
    
    const serverIndex = currentConfig.servers.findIndex((s: MCPServer) => s.id === serverId);
    if (serverIndex === -1) {
      const errorLine: TerminalLine = {
        id: `mcp-remove-not-found-${timestamp}`,
        type: 'error',
        content: `❌ Server '${serverId}' not found.`,
        timestamp,
        user: 'claudia'
      };
      return { success: false, lines: [errorLine] };
    }

    const server = currentConfig.servers[serverIndex];
    
    // Disconnect if connected
    if (mcpProvider.getConnectedServers().some(s => s.id === serverId)) {
      await mcpProvider.reconnectServer(serverId); // This will disconnect
    }

    // Remove from configuration
    currentConfig.servers.splice(serverIndex, 1);
    await context.storage.setSetting('mcp.servers', currentConfig.servers);

    const successLine: TerminalLine = {
      id: `mcp-remove-success-${timestamp}`,
      type: 'output',
      content: `✅ Removed MCP server: ${server.name} (${serverId})`,
      timestamp,
      user: 'claudia'
    };

    return { success: true, lines: [successLine] };
  } catch (error) {
    const errorLine: TerminalLine = {
      id: `mcp-remove-exception-${timestamp}`,
      type: 'error',
      content: `❌ Error removing server: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }
}

async function connectServer(args: string[], context: CommandContext, timestamp: string): Promise<CommandResult> {
  if (args.length === 0) {
    const errorLine: TerminalLine = {
      id: `mcp-connect-error-${timestamp}`,
      type: 'error',
      content: '❌ Usage: /mcp connect <id>',
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }

  const serverId = args[0];

  try {
    const mcpProvider = context.mcpManager;
    await mcpProvider.reconnectServer(serverId);

    const successLine: TerminalLine = {
      id: `mcp-connect-success-${timestamp}`,
      type: 'output',
      content: `✅ Connected to MCP server: ${serverId}`,
      timestamp,
      user: 'claudia'
    };

    return { success: true, lines: [successLine] };
  } catch (error) {
    const errorLine: TerminalLine = {
      id: `mcp-connect-exception-${timestamp}`,
      type: 'error',
      content: `❌ Failed to connect to server '${serverId}': ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }
}

async function disconnectServer(args: string[], context: CommandContext, timestamp: string): Promise<CommandResult> {
  if (args.length === 0) {
    const errorLine: TerminalLine = {
      id: `mcp-disconnect-error-${timestamp}`,
      type: 'error',
      content: '❌ Usage: /mcp disconnect <id>',
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }

  const serverId = args[0];

  try {
    const mcpProvider = context.mcpManager;
    const currentConfig = (mcpProvider as any).config || { servers: [] };
    const server = currentConfig.servers.find((s: MCPServer) => s.id === serverId);
    
    if (!server) {
      const errorLine: TerminalLine = {
        id: `mcp-disconnect-not-found-${timestamp}`,
        type: 'error',
        content: `❌ Server '${serverId}' not found.`,
        timestamp,
        user: 'claudia'
      };
      return { success: false, lines: [errorLine] };
    }

    // Disconnect the client
    const clients = (mcpProvider as any).clients;
    const client = clients.get(serverId);
    if (client) {
      await client.disconnect();
      clients.delete(serverId);
    }

    const successLine: TerminalLine = {
      id: `mcp-disconnect-success-${timestamp}`,
      type: 'output',
      content: `✅ Disconnected from MCP server: ${server.name}`,
      timestamp,
      user: 'claudia'
    };

    return { success: true, lines: [successLine] };
  } catch (error) {
    const errorLine: TerminalLine = {
      id: `mcp-disconnect-exception-${timestamp}`,
      type: 'error',
      content: `❌ Error disconnecting from server: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }
}

async function serverStatus(args: string[], context: CommandContext, timestamp: string): Promise<CommandResult> {
  try {
    const mcpProvider = context.mcpManager;
    
    if (args.length === 0) {
      // Show status of all servers
      return await listServers(context, timestamp);
    }

    const serverId = args[0];
    const currentConfig = (mcpProvider as any).config || { servers: [] };
    const server = currentConfig.servers.find((s: MCPServer) => s.id === serverId);
    
    if (!server) {
      const errorLine: TerminalLine = {
        id: `mcp-status-not-found-${timestamp}`,
        type: 'error',
        content: `❌ Server '${serverId}' not found.`,
        timestamp,
        user: 'claudia'
      };
      return { success: false, lines: [errorLine] };
    }

    const isConnected = mcpProvider.getConnectedServers().some(s => s.id === serverId);
    const status = isConnected ? '🟢 Connected' : '🔴 Disconnected';

    const statusLines: TerminalLine[] = [
      {
        id: `mcp-status-header-${timestamp}`,
        type: 'output',
        content: `🖥️  MCP Server Status: ${server.name}`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `mcp-status-id-${timestamp}`,
        type: 'output',
        content: `   ID: ${server.id}`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `mcp-status-url-${timestamp}`,
        type: 'output',
        content: `   URL: ${server.url || 'N/A'}`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `mcp-status-type-${timestamp}`,
        type: 'output',
        content: `   Type: ${server.type || 'unknown'}`,
        timestamp,
        user: 'claudia'
      },
      {
        id: `mcp-status-connection-${timestamp}`,
        type: 'output',
        content: `   Status: ${status}`,
        timestamp,
        user: 'claudia'
      }
    ];

    if (isConnected && server.capabilities) {
      statusLines.push({
        id: `mcp-status-capabilities-${timestamp}`,
        type: 'output',
        content: `   Capabilities: ${Object.keys(server.capabilities).join(', ')}`,
        timestamp,
        user: 'claudia'
      });
    }

    return { success: true, lines: statusLines };
  } catch (error) {
    const errorLine: TerminalLine = {
      id: `mcp-status-exception-${timestamp}`,
      type: 'error',
      content: `❌ Error getting server status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }
}

async function openPermissionsModal(context: CommandContext, timestamp: string): Promise<CommandResult> {
  try {
    // Trigger modal opening via context callback if available
    if (context.showModal) {
      context.showModal('mcp-permissions');
      
      const successLine: TerminalLine = {
        id: `mcp-perms-opened-${timestamp}`,
        type: 'output',
        content: '🛡️ MCP Permissions modal opened.',
        timestamp,
        user: 'claudia'
      };
      
      return { success: true, lines: [successLine] };
    } else {
      const errorLine: TerminalLine = {
        id: `mcp-perms-error-${timestamp}`,
        type: 'error',
        content: '❌ Modal functionality not available. Use /mcp list to view servers.',
        timestamp,
        user: 'claudia'
      };
      
      return { success: false, lines: [errorLine] };
    }
  } catch (error) {
    const errorLine: TerminalLine = {
      id: `mcp-perms-exception-${timestamp}`,
      type: 'error',
      content: `❌ Error opening permissions modal: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }
}

async function listTools(args: string[], context: CommandContext, timestamp: string): Promise<CommandResult> {
  try {
    const mcpProvider = context.mcpManager;
    
    if (!mcpProvider || !mcpProvider.isConfigured()) {
      const errorLine: TerminalLine = {
        id: `mcp-tools-error-${timestamp}`,
        type: 'error',
        content: '❌ No MCP provider configured.',
        timestamp,
        user: 'claudia'
      };
      return { success: false, lines: [errorLine] };
    }

    const allTools = await mcpProvider.listTools();
    
    if (allTools.length === 0) {
      const noToolsLine: TerminalLine = {
        id: `mcp-tools-empty-${timestamp}`,
        type: 'output',
        content: '📭 No MCP tools available.',
        timestamp,
        user: 'claudia'
      };
      return { success: true, lines: [noToolsLine] };
    }

    // Filter by server if specified
    let filteredTools = allTools;
    if (args.length > 0) {
      const serverFilter = args[0];
      filteredTools = allTools.filter(tool => 
        tool.name.startsWith(`${serverFilter}.`) || 
        (serverFilter === 'builtin' && !tool.name.includes('.'))
      );
    }

    const lines: TerminalLine[] = [
      {
        id: `mcp-tools-header-${timestamp}`,
        type: 'output',
        content: `🔧 Available MCP Tools (${filteredTools.length}${args.length > 0 ? ` for ${args[0]}` : ''}):`,
        timestamp,
        user: 'claudia'
      }
    ];

    filteredTools.forEach((tool, index) => {
      lines.push({
        id: `mcp-tool-${index}-${timestamp}`,
        type: 'output',
        content: `  ${tool.name}`,
        timestamp,
        user: 'claudia'
      });
      
      if (tool.description) {
        lines.push({
          id: `mcp-tool-desc-${index}-${timestamp}`,
          type: 'output',
          content: `    ${tool.description}`,
          timestamp,
          user: 'claudia'
        });
      }
    });

    return { success: true, lines };
  } catch (error) {
    const errorLine: TerminalLine = {
      id: `mcp-tools-exception-${timestamp}`,
      type: 'error',
      content: `❌ Error listing tools: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }
}

async function cacheCommand(args: string[], context: CommandContext, timestamp: string): Promise<CommandResult> {
  try {
    const mcpProvider = context.mcpManager;
    
    if (!mcpProvider || !mcpProvider.isConfigured()) {
      const errorLine: TerminalLine = {
        id: `mcp-cache-error-${timestamp}`,
        type: 'error',
        content: '❌ No MCP provider configured.',
        timestamp,
        user: 'claudia'
      };
      return { success: false, lines: [errorLine] };
    }

    if (args.length === 0) {
      const helpLines: TerminalLine[] = [
        {
          id: `mcp-cache-help-1-${timestamp}`,
          type: 'output',
          content: '🗄️ MCP Cache Management:',
          timestamp,
          user: 'claudia'
        },
        {
          id: `mcp-cache-help-2-${timestamp}`,
          type: 'output',
          content: '  /mcp cache clear    - Clear all cached data',
          timestamp,
          user: 'claudia'
        },
        {
          id: `mcp-cache-help-3-${timestamp}`,
          type: 'output',
          content: '  /mcp cache status   - Show cache status',
          timestamp,
          user: 'claudia'
        }
      ];
      return { success: true, lines: helpLines };
    }

    const subcommand = args[0].toLowerCase();

    switch (subcommand) {
      case 'clear': {
        await (mcpProvider as MCPProviderManager).clearCache();
        const successLine: TerminalLine = {
          id: `mcp-cache-clear-${timestamp}`,
          type: 'output',
          content: '🧹 MCP cache cleared successfully.',
          timestamp,
          user: 'claudia'
        };
        return { success: true, lines: [successLine] };
      }
      
      case 'status': {
        const statusLines: TerminalLine[] = [
          {
            id: `mcp-cache-status-${timestamp}`,
            type: 'output',
            content: '📊 MCP Cache Status:',
            timestamp,
            user: 'claudia'
          },
          {
            id: `mcp-cache-status-info-${timestamp}`,
            type: 'output',
            content: '   Capabilities cached for 24 hours',
            timestamp,
            user: 'claudia'
          },
          {
            id: `mcp-cache-status-info2-${timestamp}`,
            type: 'output',
            content: '   Tools cached for 1 hour',
            timestamp,
            user: 'claudia'
          },
          {
            id: `mcp-cache-status-info3-${timestamp}`,
            type: 'output',
            content: '   Automatic cleanup every 5 minutes',
            timestamp,
            user: 'claudia'
          }
        ];
        return { success: true, lines: statusLines };
      }
      
      default: {
        const errorLine: TerminalLine = {
          id: `mcp-cache-unknown-${timestamp}`,
          type: 'error',
          content: `❌ Unknown cache command: ${subcommand}`,
          timestamp,
          user: 'claudia'
        };
        return { success: false, lines: [errorLine] };
      }
    }
  } catch (error) {
    const errorLine: TerminalLine = {
      id: `mcp-cache-exception-${timestamp}`,
      type: 'error',
      content: `❌ Error managing cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    };
    return { success: false, lines: [errorLine] };
  }
}