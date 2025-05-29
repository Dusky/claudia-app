import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { sessionManager } from '../../services/sessionManager';

// Session management commands for ClaudiaOS Phase 5
export const sessionCommand: Command = {
  name: 'session',
  description: 'Manage ClaudiaOS sessions',
  usage: '/session [new|switch|list|save|delete|info] [name]',
  aliases: ['sess'],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const subcommand = args[0];
    const sessionName = args[1];
    
    switch (subcommand) {
      case 'new':
        return await handleSessionNew(sessionName, timestamp);
      case 'switch':
        return await handleSessionSwitch(sessionName, timestamp);
      case 'list':
        return await handleSessionList(timestamp);
      case 'save':
        return await handleSessionSave(sessionName, timestamp);
      case 'delete':
        return await handleSessionDelete(sessionName, timestamp);
      case 'info':
        return await handleSessionInfo(timestamp);
      default:
        return await handleSessionOverview(timestamp);
    }
  }
};

async function handleSessionNew(name: string | undefined, timestamp: string): Promise<CommandResult> {
  const lines: TerminalLine[] = [];
  
  try {
    const sessionId = await sessionManager.createSession(name);
    
    lines.push({
      id: `session-new-success-${timestamp}`,
      type: 'output',
      content: name 
        ? `✅ Created new session: ${name} (${sessionId})`
        : `✅ Created new session: ${sessionId}`,
      timestamp,
      user: 'claudia'
    });
    
    lines.push({
      id: `session-new-info-${timestamp}`,
      type: 'output',
      content: '📁 Current directory: /home/claudia',
      timestamp,
      user: 'claudia'
    });
    
    lines.push({
      id: `session-new-tip-${timestamp}`,
      type: 'output',
      content: '💡 Use /session save <name> to save this session for later',
      timestamp,
      user: 'claudia'
    });
    
  } catch (error) {
    lines.push({
      id: `session-new-error-${timestamp}`,
      type: 'error',
      content: `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  return { success: true, lines };
}

async function handleSessionSwitch(name: string | undefined, timestamp: string): Promise<CommandResult> {
  const lines: TerminalLine[] = [];
  
  if (!name) {
    lines.push({
      id: `session-switch-error-${timestamp}`,
      type: 'error',
      content: 'Please specify a session name: /session switch <name>',
      timestamp,
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  try {
    const success = await sessionManager.switchSession(name);
    
    if (success) {
      const currentSession = sessionManager.getCurrentSession();
      
      lines.push({
        id: `session-switch-success-${timestamp}`,
        type: 'output',
        content: `✅ Switched to session: ${name}`,
        timestamp,
        user: 'claudia'
      });
      
      if (currentSession) {
        lines.push({
          id: `session-switch-info-${timestamp}`,
          type: 'output',
          content: `📁 Directory: ${currentSession.currentDirectory}`,
          timestamp,
          user: 'claudia'
        });
        
        lines.push({
          id: `session-switch-tabs-${timestamp}`,
          type: 'output',
          content: `📑 Open tabs: ${currentSession.openTabs.length}`,
          timestamp,
          user: 'claudia'
        });
      }
    } else {
      lines.push({
        id: `session-switch-notfound-${timestamp}`,
        type: 'error',
        content: `Session not found: ${name}`,
        timestamp,
        user: 'claudia'
      });
      return { success: false, lines };
    }
    
  } catch (error) {
    lines.push({
      id: `session-switch-error-${timestamp}`,
      type: 'error',
      content: `Failed to switch session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  return { success: true, lines };
}

async function handleSessionList(timestamp: string): Promise<CommandResult> {
  const lines: TerminalLine[] = [];
  
  lines.push({
    id: `session-list-header-${timestamp}`,
    type: 'output',
    content: '📋 ClaudiaOS Sessions',
    timestamp,
    user: 'claudia'
  });
  
  lines.push({
    id: `session-list-divider-${timestamp}`,
    type: 'output',
    content: '═'.repeat(50),
    timestamp,
    user: 'claudia'
  });
  
  const sessions = sessionManager.listSessions();
  
  if (Object.keys(sessions).length === 0) {
    lines.push({
      id: `session-list-empty-${timestamp}`,
      type: 'output',
      content: 'No saved sessions found',
      timestamp,
      user: 'claudia'
    });
  } else {
    lines.push({
      id: `session-list-table-header-${timestamp}`,
      type: 'output',
      content: 'NAME           STARTED              LAST ACTIVITY        DIR          TABS',
      timestamp,
      user: 'claudia'
    });
    
    Object.entries(sessions).forEach(([name, session], index) => {
      const startTime = new Date(session.startTime).toLocaleString();
      const lastActivity = new Date(session.lastActivity).toLocaleString();
      const isActive = name === 'current' ? ' *' : '';
      
      lines.push({
        id: `session-list-item-${index}-${timestamp}`,
        type: 'output',
        content: `${(name + isActive).padEnd(14)} ${startTime.padEnd(20)} ${lastActivity.padEnd(20)} ${session.directory.padEnd(12)} ${session.tabs}`,
        timestamp,
        user: 'claudia'
      });
    });
  }
  
  lines.push({
    id: `session-list-tip-${timestamp}`,
    type: 'output',
    content: '',
    timestamp,
    user: 'claudia'
  });
  
  lines.push({
    id: `session-list-commands-${timestamp}`,
    type: 'output',
    content: '💡 Commands: /session new <name> | /session switch <name> | /session save <name>',
    timestamp,
    user: 'claudia'
  });
  
  return { success: true, lines };
}

async function handleSessionSave(name: string | undefined, timestamp: string): Promise<CommandResult> {
  const lines: TerminalLine[] = [];
  
  if (!name) {
    lines.push({
      id: `session-save-error-${timestamp}`,
      type: 'error',
      content: 'Please specify a session name: /session save <name>',
      timestamp,
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  try {
    await sessionManager.saveSession();
    
    // Save as named session
    const namedSessions = JSON.parse(localStorage.getItem('claudiaos-named-sessions') || '{}');
    const currentSession = sessionManager.getCurrentSession();
    
    if (currentSession) {
      namedSessions[name] = { ...currentSession };
      localStorage.setItem('claudiaos-named-sessions', JSON.stringify(namedSessions));
    }
    
    lines.push({
      id: `session-save-success-${timestamp}`,
      type: 'output',
      content: `💾 Session saved as: ${name}`,
      timestamp,
      user: 'claudia'
    });
    
    lines.push({
      id: `session-save-info-${timestamp}`,
      type: 'output',
      content: '✅ Session state, preferences, and history preserved',
      timestamp,
      user: 'claudia'
    });
    
  } catch (error) {
    lines.push({
      id: `session-save-error-${timestamp}`,
      type: 'error',
      content: `Failed to save session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  return { success: true, lines };
}

async function handleSessionDelete(name: string | undefined, timestamp: string): Promise<CommandResult> {
  const lines: TerminalLine[] = [];
  
  if (!name) {
    lines.push({
      id: `session-delete-error-${timestamp}`,
      type: 'error',
      content: 'Please specify a session name: /session delete <name>',
      timestamp,
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  if (name === 'current') {
    lines.push({
      id: `session-delete-current-error-${timestamp}`,
      type: 'error',
      content: 'Cannot delete the current session',
      timestamp,
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  try {
    const success = await sessionManager.deleteSession(name);
    
    if (success) {
      lines.push({
        id: `session-delete-success-${timestamp}`,
        type: 'output',
        content: `🗑️ Session deleted: ${name}`,
        timestamp,
        user: 'claudia'
      });
    } else {
      lines.push({
        id: `session-delete-notfound-${timestamp}`,
        type: 'error',
        content: `Session not found: ${name}`,
        timestamp,
        user: 'claudia'
      });
      return { success: false, lines };
    }
    
  } catch (error) {
    lines.push({
      id: `session-delete-error-${timestamp}`,
      type: 'error',
      content: `Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  return { success: true, lines };
}

async function handleSessionInfo(timestamp: string): Promise<CommandResult> {
  const lines: TerminalLine[] = [];
  const currentSession = sessionManager.getCurrentSession();
  
  if (!currentSession) {
    lines.push({
      id: `session-info-none-${timestamp}`,
      type: 'error',
      content: 'No active session',
      timestamp,
      user: 'claudia'
    });
    return { success: false, lines };
  }
  
  lines.push({
    id: `session-info-header-${timestamp}`,
    type: 'output',
    content: '📊 Current Session Information',
    timestamp,
    user: 'claudia'
  });
  
  lines.push({
    id: `session-info-divider-${timestamp}`,
    type: 'output',
    content: '═'.repeat(40),
    timestamp,
    user: 'claudia'
  });
  
  const sessionInfo = [
    `Session ID: ${currentSession.sessionId}`,
    `Started: ${currentSession.startTime.toLocaleString()}`,
    `Last Activity: ${currentSession.lastActivity.toLocaleString()}`,
    `Current Directory: ${currentSession.currentDirectory}`,
    `Open Tabs: ${currentSession.openTabs.length}`,
    `Command History: ${currentSession.commandHistory.length} commands`,
    `Environment Variables: ${Object.keys(currentSession.environmentVariables).length}`,
    `Aliases: ${Object.keys(currentSession.aliases).length}`,
    `Theme: ${currentSession.themeSettings.current}`,
    `Auto-save: ${currentSession.userPreferences.autoSave ? 'Enabled' : 'Disabled'}`
  ];
  
  sessionInfo.forEach((info, index) => {
    lines.push({
      id: `session-info-item-${index}-${timestamp}`,
      type: 'output',
      content: info,
      timestamp,
      user: 'claudia'
    });
  });
  
  // System resources
  const systemState = currentSession.systemState;
  if (systemState) {
    lines.push({
      id: `session-info-resources-header-${timestamp}`,
      type: 'output',
      content: '',
      timestamp,
      user: 'claudia'
    });
    
    lines.push({
      id: `session-info-resources-title-${timestamp}`,
      type: 'output',
      content: '💻 System Resources:',
      timestamp,
      user: 'claudia'
    });
    
    const resources = systemState.systemResources;
    const resourceInfo = [
      `CPU Usage: ${resources.cpu.usage.toFixed(1)}%`,
      `Memory: ${(resources.memory.used / 1024).toFixed(1)}GB / ${(resources.memory.total / 1024).toFixed(1)}GB`,
      `Disk: ${(resources.disk.used / 1000).toFixed(0)}GB / ${(resources.disk.total / 1000).toFixed(0)}GB`,
      `Network: ↓${(resources.network.bytesIn / 1024 / 1024).toFixed(1)}MB ↑${(resources.network.bytesOut / 1024 / 1024).toFixed(1)}MB`
    ];
    
    resourceInfo.forEach((info, index) => {
      lines.push({
        id: `session-info-resource-${index}-${timestamp}`,
        type: 'output',
        content: `  ${info}`,
        timestamp,
        user: 'claudia'
      });
    });
  }
  
  return { success: true, lines };
}

async function handleSessionOverview(timestamp: string): Promise<CommandResult> {
  const lines: TerminalLine[] = [];
  
  lines.push({
    id: `session-overview-header-${timestamp}`,
    type: 'output',
    content: '📋 ClaudiaOS Session Management',
    timestamp,
    user: 'claudia'
  });
  
  lines.push({
    id: `session-overview-desc-${timestamp}`,
    type: 'output',
    content: 'Comprehensive session persistence and state management',
    timestamp,
    user: 'claudia'
  });
  
  lines.push({
    id: `session-overview-blank-${timestamp}`,
    type: 'output',
    content: '',
    timestamp,
    user: 'claudia'
  });
  
  const commands = [
    '/session new [name]        🆕 Create new session',
    '/session switch <name>     🔄 Switch to saved session',
    '/session list              📋 List all sessions',
    '/session save <name>       💾 Save current session',
    '/session delete <name>     🗑️ Delete saved session',
    '/session info              📊 Show current session info',
    '',
    'Features:',
    '• Automatic session persistence',
    '• Command history preservation',
    '• Environment variable state',
    '• Theme and preference saving',
    '• Multi-tab session support',
    '• System resource monitoring'
  ];
  
  commands.forEach((cmd, index) => {
    lines.push({
      id: `session-cmd-${index}-${timestamp}`,
      type: 'output',
      content: cmd,
      timestamp,
      user: 'claudia'
    });
  });
  
  return { success: true, lines };
}

// System services management
export const servicesCommand: Command = {
  name: 'services',
  description: 'Manage ClaudiaOS system services',
  usage: '/services [list|start|stop|restart|status] [service]',
  aliases: ['systemctl', 'service'],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const timestamp = new Date().toISOString();
    const lines: TerminalLine[] = [];
    const action = args[0] || 'list';
    const serviceName = args[1];
    
    const currentSession = sessionManager.getCurrentSession();
    if (!currentSession) {
      lines.push({
        id: `services-no-session-${timestamp}`,
        type: 'error',
        content: 'No active session',
        timestamp,
        user: 'claudia'
      });
      return { success: false, lines };
    }
    
    const services = currentSession.systemState.services;
    
    switch (action) {
      case 'list':
        lines.push({
          id: `services-header-${timestamp}`,
          type: 'output',
          content: '🔧 ClaudiaOS System Services',
          timestamp,
          user: 'claudia'
        });
        
        lines.push({
          id: `services-table-header-${timestamp}`,
          type: 'output',
          content: 'SERVICE              STATUS    ENABLED   DESCRIPTION',
          timestamp,
          user: 'claudia'
        });
        
        services.forEach((service, index) => {
          const statusIcon = service.status === 'active' ? '🟢' : 
                           service.status === 'inactive' ? '🔴' : '🟡';
          const enabledText = service.enabled ? 'Yes' : 'No';
          
          lines.push({
            id: `services-item-${index}-${timestamp}`,
            type: 'output',
            content: `${service.name.padEnd(20)} ${statusIcon} ${service.status.padEnd(6)} ${enabledText.padEnd(8)} ${service.description}`,
            timestamp,
            user: 'claudia'
          });
        });
        break;
        
      case 'status':
        if (!serviceName) {
          lines.push({
            id: `services-status-error-${timestamp}`,
            type: 'error',
            content: 'Please specify a service name',
            timestamp,
            user: 'claudia'
          });
          return { success: false, lines };
        }
        
        const service = services.find(s => s.name === serviceName);
        if (!service) {
          lines.push({
            id: `services-status-notfound-${timestamp}`,
            type: 'error',
            content: `Service not found: ${serviceName}`,
            timestamp,
            user: 'claudia'
          });
          return { success: false, lines };
        }
        
        lines.push({
          id: `services-status-info-${timestamp}`,
          type: 'output',
          content: `● ${service.name} - ${service.description}`,
          timestamp,
          user: 'claudia'
        });
        
        lines.push({
          id: `services-status-active-${timestamp}`,
          type: 'output',
          content: `   Active: ${service.status} (${service.enabled ? 'enabled' : 'disabled'})`,
          timestamp,
          user: 'claudia'
        });
        break;
        
      case 'start':
      case 'stop':
      case 'restart':
        if (!serviceName) {
          lines.push({
            id: `services-action-error-${timestamp}`,
            type: 'error',
            content: `Please specify a service name for ${action}`,
            timestamp,
            user: 'claudia'
          });
          return { success: false, lines };
        }
        
        const targetService = services.find(s => s.name === serviceName);
        if (!targetService) {
          lines.push({
            id: `services-action-notfound-${timestamp}`,
            type: 'error',
            content: `Service not found: ${serviceName}`,
            timestamp,
            user: 'claudia'
          });
          return { success: false, lines };
        }
        
        // Simulate service action
        if (action === 'start') {
          targetService.status = 'active';
        } else if (action === 'stop') {
          targetService.status = 'inactive';
        } else if (action === 'restart') {
          targetService.status = 'active';
        }
        
        lines.push({
          id: `services-action-success-${timestamp}`,
          type: 'output',
          content: `✅ Service ${serviceName} ${action}ed successfully`,
          timestamp,
          user: 'claudia'
        });
        break;
        
      default:
        lines.push({
          id: `services-invalid-action-${timestamp}`,
          type: 'error',
          content: `Invalid action: ${action}. Use: list, start, stop, restart, status`,
          timestamp,
          user: 'claudia'
        });
        return { success: false, lines };
    }
    
    return { success: true, lines };
  }
};