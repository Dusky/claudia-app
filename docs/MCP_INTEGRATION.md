# Model Context Protocol (MCP) Integration

## Overview

Claudia includes comprehensive Model Context Protocol (MCP) integration, providing AI assistants with access to external tools and services. MCP enables secure, sandboxed tool execution while maintaining user control and transparency.

## What is MCP?

The Model Context Protocol is a standard for connecting AI assistants to external tools and data sources. It provides:

- **Secure Tool Execution**: Sandboxed environment for tool operations
- **Standardized Interface**: Consistent API for tool integration
- **Permission Management**: User-controlled access to sensitive operations
- **Extensible Architecture**: Easy addition of new tools and capabilities

## Architecture

### MCP System Structure

```
src/providers/mcp/
├── manager.ts              # MCP server management
├── client.ts               # MCP client interface
├── realClient.ts           # Real MCP client implementation
├── transport.ts            # Communication transport layer
├── toolExecutor.ts         # Tool execution engine
├── types.ts                # TypeScript type definitions
└── builtin/                # Built-in MCP tools
    ├── index.ts            # Tool registry
    ├── fetch.ts            # HTTP request tool
    ├── filesystem.ts       # File system operations
    ├── memory.ts           # Memory management
    ├── sqlite.ts           # Database operations
    ├── time.ts             # Time and date utilities
    └── tts.ts              # Text-to-speech
```

## Built-in Tools

### Core Tools

#### 1. **Fetch Tool** (`mcp_fetch`)
HTTP request capabilities for web APIs and data retrieval.

```typescript
// Usage examples
await mcpClient.callTool('mcp_fetch', {
  url: 'https://api.example.com/data',
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' }
});
```

**Features:**
- GET, POST, PUT, DELETE support
- Custom headers and authentication
- Response caching
- Error handling and retries

#### 2. **Filesystem Tool** (`mcp_filesystem`)
File and directory operations within permitted boundaries.

```typescript
// File operations
await mcpClient.callTool('mcp_filesystem', {
  action: 'read',
  path: '/allowed/path/file.txt'
});

await mcpClient.callTool('mcp_filesystem', {
  action: 'write',
  path: '/allowed/path/output.txt',
  content: 'Hello, World!'
});
```

**Capabilities:**
- Read/write text files
- Directory listing
- File metadata
- Path validation and sandboxing

#### 3. **Memory Tool** (`mcp_memory`)
Persistent memory management for AI context.

```typescript
// Store information
await mcpClient.callTool('mcp_memory', {
  action: 'store',
  key: 'user_preferences',
  value: { theme: 'dark', language: 'en' }
});

// Retrieve information
const memory = await mcpClient.callTool('mcp_memory', {
  action: 'recall',
  key: 'user_preferences'
});
```

**Features:**
- Key-value storage
- Search capabilities
- Automatic cleanup
- Size limits and quotas

#### 4. **Time Tool** (`mcp_time`)
Date, time, and timezone utilities.

```typescript
// Get current time
await mcpClient.callTool('mcp_time', {
  action: 'current',
  timezone: 'America/New_York'
});

// Format dates
await mcpClient.callTool('mcp_time', {
  action: 'format',
  timestamp: Date.now(),
  format: 'YYYY-MM-DD HH:mm:ss'
});
```

#### 5. **SQLite Tool** (`mcp_sqlite`)
Database operations for structured data storage.

```typescript
// Execute query
await mcpClient.callTool('mcp_sqlite', {
  action: 'query',
  sql: 'SELECT * FROM users WHERE active = ?',
  params: [true]
});
```

#### 6. **Text-to-Speech Tool** (`mcp_tts`)
Audio synthesis for voice output.

```typescript
// Generate speech
await mcpClient.callTool('mcp_tts', {
  text: 'Hello, how can I help you today?',
  voice: 'en-US-Wavenet-D',
  rate: 1.0
});
```

## Configuration

### Environment Variables

```env
# MCP Configuration
VITE_MCP_ENABLED=true                    # Enable MCP integration
VITE_MCP_DEBUG=true                      # Debug logging
VITE_MCP_TIMEOUT=30000                   # Tool execution timeout (ms)
VITE_MCP_MAX_TOOLS=50                    # Maximum concurrent tools

# Tool-specific settings
VITE_MCP_FILESYSTEM_ROOT=/app/data       # Filesystem tool root directory
VITE_MCP_MEMORY_MAX_SIZE=10485760        # Memory tool max size (bytes)
VITE_MCP_FETCH_TIMEOUT=10000             # Fetch tool timeout (ms)
```

### Permission Management

MCP tools require explicit user permission for sensitive operations:

```typescript
interface MCPPermission {
  toolId: string;
  action: string;
  resource?: string;
  granted: boolean;
  expiresAt?: Date;
}
```

### Security Policies

```typescript
interface MCPSecurityPolicy {
  allowedDomains: string[];        // Fetch tool allowed domains
  blockedPaths: string[];          # Filesystem blocked paths
  maxFileSize: number;             # Maximum file size
  maxMemorySize: number;           # Memory quota
  requirePermission: boolean;      # Require user permission
}
```

## Usage

### Command Interface

Users can interact with MCP tools through the `/mcp` command:

```bash
# List available tools
/mcp list

# Show tool details
/mcp info fetch

# Execute tool with parameters
/mcp exec fetch --url="https://api.github.com/user" --method=GET

# Manage permissions
/mcp permissions

# Enable/disable tools
/mcp enable filesystem
/mcp disable tts
```

### AI Integration

AI assistants can request tool execution through natural language:

```
User: "Can you fetch the weather data from the API?"

Claudia: I'll fetch the weather data for you.
[MCP:fetch:url=https://api.weather.com/current,method=GET]

User: "Save this conversation to a file"

Claudia: I'll save our conversation to a file.
[MCP:filesystem:action=write,path=/conversations/chat_2024.txt,content=...]
```

### React Component Integration

```typescript
import { MCPManager } from '../providers/mcp/manager';

const MCPToolsPanel: React.FC = () => {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const mcpManager = useMemo(() => new MCPManager(), []);
  
  useEffect(() => {
    mcpManager.getAvailableTools().then(setTools);
  }, []);
  
  const executeTool = async (toolId: string, params: any) => {
    try {
      const result = await mcpManager.executeTool(toolId, params);
      console.log('Tool result:', result);
    } catch (error) {
      console.error('Tool execution failed:', error);
    }
  };
  
  return (
    <div className="mcp-tools-panel">
      {tools.map(tool => (
        <MCPToolCard 
          key={tool.id} 
          tool={tool} 
          onExecute={executeTool} 
        />
      ))}
    </div>
  );
};
```

## Development

### Creating Custom Tools

1. **Implement Tool Interface**:

```typescript
import { MCPTool, MCPToolResult } from '../types';

export class CustomTool implements MCPTool {
  id = 'custom_tool';
  name = 'Custom Tool';
  description = 'A custom MCP tool';
  
  async execute(params: any): Promise<MCPToolResult> {
    // Implement tool logic
    return {
      success: true,
      data: { message: 'Tool executed successfully' }
    };
  }
  
  async validate(params: any): Promise<boolean> {
    // Validate parameters
    return true;
  }
}
```

2. **Register Tool**:

```typescript
// In manager.ts
import { CustomTool } from './custom';

export class MCPManager {
  constructor() {
    this.tools.set('custom_tool', new CustomTool());
  }
}
```

3. **Add Permissions**:

```typescript
// Define required permissions
const toolPermissions = {
  'custom_tool': {
    requires: ['filesystem.read', 'network.fetch'],
    description: 'Requires file access and network requests'
  }
};
```

### Tool Testing

```typescript
import { MCPManager } from '../manager';

describe('Custom Tool', () => {
  let mcpManager: MCPManager;
  
  beforeEach(() => {
    mcpManager = new MCPManager();
  });
  
  it('should execute successfully', async () => {
    const result = await mcpManager.executeTool('custom_tool', {
      param1: 'value1'
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

## Security

### Sandboxing

MCP tools run in a sandboxed environment with:

- **Resource Limits**: CPU time, memory usage, file size
- **Network Restrictions**: Allowed domains, blocked IPs
- **Filesystem Boundaries**: Permitted paths only
- **Permission System**: User-controlled access grants

### Audit Trail

All MCP tool executions are logged:

```typescript
interface MCPAuditLog {
  timestamp: Date;
  toolId: string;
  userId: string;
  parameters: any;
  result: MCPToolResult;
  executionTime: number;
  ipAddress?: string;
}
```

### Permission UI

Users can manage tool permissions through a dedicated interface:

```typescript
const MCPPermissionsModal: React.FC = () => {
  const [permissions, setPermissions] = useState<MCPPermission[]>([]);
  
  const togglePermission = (toolId: string, action: string) => {
    // Update permission state
  };
  
  return (
    <div className="mcp-permissions-modal">
      <h3>MCP Tool Permissions</h3>
      {permissions.map(permission => (
        <PermissionToggle 
          key={`${permission.toolId}-${permission.action}`}
          permission={permission}
          onToggle={togglePermission}
        />
      ))}
    </div>
  );
};
```

## Performance

### Caching Strategy

- **Tool Results**: Cache frequently used tool outputs
- **Permission Checks**: Cache permission validation
- **Resource Limits**: Cache quota calculations

### Async Execution

```typescript
// Non-blocking tool execution
const executeToolAsync = async (toolId: string, params: any) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./toolWorker.js');
    worker.postMessage({ toolId, params });
    
    worker.onmessage = (event) => {
      resolve(event.data.result);
    };
    
    worker.onerror = (error) => {
      reject(error);
    };
  });
};
```

### Resource Monitoring

```typescript
interface MCPResourceUsage {
  cpuTime: number;
  memoryUsage: number;
  networkRequests: number;
  filesAccessed: number;
  executionCount: number;
}
```

## Troubleshooting

### Common Issues

1. **Tool Not Found**
   - Verify tool is registered in MCPManager
   - Check tool ID spelling
   - Ensure tool is enabled

2. **Permission Denied**
   - Check user permissions for the tool
   - Verify security policy allows the operation
   - Review audit logs for details

3. **Execution Timeout**
   - Increase timeout value
   - Optimize tool implementation
   - Check system resources

### Debug Commands

```bash
# Enable MCP debugging
/mcp debug on

# Show resource usage
/mcp stats

# Test tool connectivity
/mcp test <tool_id>

# Clear tool cache
/mcp cache clear

# Export tool logs
/mcp logs export
```

## Integration Examples

### Weather Integration

```typescript
// Custom weather tool
export class WeatherTool implements MCPTool {
  async execute(params: { location: string }) {
    const response = await fetch(`https://api.weather.com/v1/current?location=${params.location}`);
    return {
      success: true,
      data: await response.json()
    };
  }
}
```

### File Processing

```typescript
// File analysis tool
export class FileAnalysisTool implements MCPTool {
  async execute(params: { filePath: string }) {
    const content = await this.readFile(params.filePath);
    const analysis = this.analyzeContent(content);
    
    return {
      success: true,
      data: {
        lineCount: analysis.lines,
        wordCount: analysis.words,
        language: analysis.language
      }
    };
  }
}
```

## API Reference

### Core Types

```typescript
interface MCPTool {
  id: string;
  name: string;
  description: string;
  execute(params: any): Promise<MCPToolResult>;
  validate?(params: any): Promise<boolean>;
}

interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime: number;
    resourceUsage: MCPResourceUsage;
  };
}
```

### Manager API

```typescript
class MCPManager {
  registerTool(tool: MCPTool): void;
  executeTool(toolId: string, params: any): Promise<MCPToolResult>;
  getAvailableTools(): Promise<MCPTool[]>;
  setPermission(toolId: string, action: string, granted: boolean): void;
  getAuditLog(filters?: MCPAuditFilter): Promise<MCPAuditLog[]>;
}
```

---

The MCP integration provides powerful extensibility for AI assistants while maintaining security and user control. It enables Claudia to interact with external systems safely and transparently.