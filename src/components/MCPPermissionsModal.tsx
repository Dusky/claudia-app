import React, { useState, useEffect } from 'react';
import type { MCPTool } from '../providers/mcp/types';
import type { MCPProviderManager } from '../providers/mcp/manager';
import './MCPPermissionsModal.css';

interface MCPPermission {
  serverId: string;
  serverName: string;
  tools: string[];
  enabled: boolean;
}

interface MCPPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mcpManager: MCPProviderManager;
  onPermissionsChange: (permissions: MCPPermission[]) => void;
}

export const MCPPermissionsModal: React.FC<MCPPermissionsModalProps> = ({
  isOpen,
  onClose,
  mcpManager,
  onPermissionsChange,
}) => {
  const [permissions, setPermissions] = useState<MCPPermission[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPermissions();
    }
  }, [isOpen]);

  const loadPermissions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get connected servers
      const connectedServers = mcpManager.getConnectedServers();
      
      // Get all available tools
      const allTools = await mcpManager.listTools();
      setTools(allTools);
      
      // Group tools by server
      const serverPermissions: MCPPermission[] = connectedServers.map(server => {
        const serverTools = allTools
          .filter(tool => tool.name.startsWith(`${server.id}.`))
          .map(tool => tool.name);
        
        return {
          serverId: server.id,
          serverName: server.name,
          tools: serverTools,
          enabled: true, // Default to enabled
        };
      });
      
      // Add built-in servers
      const builtinTools = allTools.filter(tool => !tool.name.includes('.'));
      if (builtinTools.length > 0) {
        serverPermissions.unshift({
          serverId: 'builtin',
          serverName: 'Built-in Tools',
          tools: builtinTools.map(tool => tool.name),
          enabled: true,
        });
      }
      
      setPermissions(serverPermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const toggleServerPermission = (serverId: string) => {
    setPermissions(prev => 
      prev.map(perm => 
        perm.serverId === serverId 
          ? { ...perm, enabled: !perm.enabled }
          : perm
      )
    );
  };

  const handleSave = () => {
    onPermissionsChange(permissions);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const getToolDescription = (toolName: string): string => {
    const tool = tools.find(t => t.name === toolName);
    return tool?.description || 'No description available';
  };

  const getToolSchema = (toolName: string): any => {
    const tool = tools.find(t => t.name === toolName);
    return tool?.inputSchema;
  };

  const formatSchema = (schema: any): string => {
    if (!schema) return 'No schema available';
    
    try {
      return JSON.stringify(schema, null, 2);
    } catch {
      return 'Invalid schema format';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="mcp-permissions-modal-overlay">
      <div className="mcp-permissions-modal">
        <div className="mcp-permissions-header">
          <h2>🛡️ MCP Server Permissions</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="mcp-permissions-content">
          {loading && (
            <div className="loading-section">
              <p>Loading permissions...</p>
            </div>
          )}
          
          {error && (
            <div className="error-section">
              <p className="error-message">❌ {error}</p>
              <button onClick={loadPermissions}>Retry</button>
            </div>
          )}
          
          {!loading && !error && permissions.length === 0 && (
            <div className="empty-section">
              <p>No MCP servers found. Connect to servers first using <code>/mcp add</code></p>
            </div>
          )}
          
          {!loading && !error && permissions.length > 0 && (
            <div className="permissions-list">
              <div className="permissions-header-info">
                <p>Configure which MCP servers and tools are allowed to execute:</p>
              </div>
              
              {permissions.map(permission => (
                <div key={permission.serverId} className="server-permission">
                  <div className="server-header">
                    <label className="server-toggle">
                      <input
                        type="checkbox"
                        checked={permission.enabled}
                        onChange={() => toggleServerPermission(permission.serverId)}
                      />
                      <span className="server-name">
                        {permission.serverName}
                        <span className="server-id">({permission.serverId})</span>
                      </span>
                      <span className="tool-count">
                        {permission.tools.length} tool{permission.tools.length !== 1 ? 's' : ''}
                      </span>
                    </label>
                  </div>
                  
                  {permission.enabled && permission.tools.length > 0 && (
                    <div className="tools-list">
                      {permission.tools.map(toolName => (
                        <div key={toolName} className="tool-item">
                          <div className="tool-header">
                            <span className="tool-name">{toolName}</span>
                          </div>
                          <div className="tool-description">
                            {getToolDescription(toolName)}
                          </div>
                          <details className="tool-schema">
                            <summary>View Schema</summary>
                            <pre className="schema-content">
                              {formatSchema(getToolSchema(toolName))}
                            </pre>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {permission.enabled && permission.tools.length === 0 && (
                    <div className="no-tools">
                      <p className="muted">No tools available for this server</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mcp-permissions-footer">
          <button className="cancel-button" onClick={handleCancel}>
            Cancel
          </button>
          <button 
            className="save-button" 
            onClick={handleSave}
            disabled={loading}
          >
            Save Permissions
          </button>
        </div>
      </div>
    </div>
  );
};