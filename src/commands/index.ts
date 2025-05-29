export * from './types';
export * from './registry';

// Builtin commands
import { helpCommand } from './builtin/help';
import { themeCommand, themesCommand, clearCommand } from './builtin/theme';
import { askCommand } from './builtin/ai'; 
import { avatarCommand, imagineCommand } from './builtin/avatar';
import { providersCommand, testReplicateCommand } from './builtin/providers';
import { imagesCommand } from './builtin/images';
import { testCommand } from './builtin/test';
import { configCommand } from './builtin/config';
import { debugCommand } from './builtin/debug';
import { retryCommand, continueCommand, undoCommand, contextCommand } from './builtin/conversation-tools';
import {
  conversationCommand,
  listConversationsCommand,
  newConversationCommand,
  loadConversationCommand,
  deleteConversationCommand,
  renameConversationCommand,
  clearConversationHistoryCommand,
} from './builtin/conversation';
import { manageConversationsCommand } from './builtin/manageConversationsCommand'; // Import the new command
import { toolsCommand } from './builtin/tools';
import { mcpCommand } from './builtin/mcp';
import { crtCommand } from './builtin/crt';
import { shortcutsCommand } from './builtin/shortcuts';
import { 
  whoamiCommand,
  dateCommand
} from './builtin/os-commands';

// Enhanced Phase 3 commands
import {
  lsEnhancedCommand,
  cdCommand,
  pwdEnhancedCommand,
  catCommand as catEnhancedCommand
} from './builtin/filesystem';

import {
  psEnhancedCommand,
  topCommand as topEnhancedCommand,
  killCommand,
  jobsCommand
} from './builtin/process-manager';

import {
  freeEnhancedCommand,
  dfCommand,
  uptimeEnhancedCommand,
  systemInfoCommand,
  cpuInfoCommand,
  memInfoCommand
} from './builtin/system-monitor';

import {
  envCommand,
  exportCommand,
  unsetCommand,
  setCommand,
  echoCommand,
  aliasCommand
} from './builtin/environment';

// Phase 4: Intelligent Interaction Layer
import {
  smartHelpCommand,
  analyticsCommand
} from './builtin/intelligent-help';

import {
  workflowCommand
} from './builtin/workflow-assistant';

// Phase 5: System Integration Features
import {
  sessionCommand,
  servicesCommand
} from './builtin/session-management';

import {
  pluginCommand
} from './builtin/plugin-management';

import {
  logsCommand,
  metricsCommand
} from './builtin/logging';

import {
  preferencesCommand
} from './builtin/preferences';

import {
  personalityCommand, 
  personalityGuiCommand, 
  listPersonalitiesCommand,
  createPersonalityCommand,
  editPersonalityCommand,
  deletePersonalityCommand,
  setPersonalityCommand,
  currentPersonalityCommand,
  initDefaultPersonalityCommand,
  viewPersonalityCommand,
} from './builtin/personality';

import { CommandRegistryImpl } from './registry';
import type { Command } from './types';


export function createCommandRegistry(): CommandRegistryImpl {
  const registry = new CommandRegistryImpl();
  
  const commandsToRegister: Command[] = [
    helpCommand,
    themeCommand,
    themesCommand,
    clearCommand,
    askCommand,
    avatarCommand,
    imagineCommand,
    providersCommand,
    testReplicateCommand,
    imagesCommand,
    testCommand,
    configCommand,
    debugCommand,
    retryCommand,
    continueCommand, 
    undoCommand,
    contextCommand,
    
    personalityCommand, 
    personalityGuiCommand, 
    listPersonalitiesCommand,
    createPersonalityCommand,
    editPersonalityCommand,
    deletePersonalityCommand,
    setPersonalityCommand,
    currentPersonalityCommand,
    initDefaultPersonalityCommand,
    viewPersonalityCommand,

    conversationCommand,
    listConversationsCommand,
    newConversationCommand,
    loadConversationCommand,
    deleteConversationCommand,
    renameConversationCommand,
    clearConversationHistoryCommand,
    manageConversationsCommand, // Add the new command to the registry
    toolsCommand,
    mcpCommand,
    crtCommand,
    shortcutsCommand,
    
    // Basic OS-style commands (keeping for compatibility)
    whoamiCommand,
    dateCommand,
    
    // Enhanced Phase 3 commands (replace basic ones)
    lsEnhancedCommand,
    cdCommand,
    pwdEnhancedCommand,
    catEnhancedCommand,
    psEnhancedCommand,
    topEnhancedCommand,
    freeEnhancedCommand,
    uptimeEnhancedCommand,
    
    // New system commands
    dfCommand,
    killCommand,
    jobsCommand,
    systemInfoCommand,
    cpuInfoCommand,
    memInfoCommand,
    
    // Environment and configuration
    envCommand,
    exportCommand,
    unsetCommand,
    setCommand,
    echoCommand,
    aliasCommand,
    
    // Phase 4: Intelligent Interaction Layer
    smartHelpCommand,
    analyticsCommand,
    workflowCommand,
    
    // Phase 5: System Integration Features
    sessionCommand,
    servicesCommand,
    pluginCommand,
    logsCommand,
    metricsCommand,
    preferencesCommand,
  ];

  commandsToRegister.forEach(command => {
    if (command) { 
      registry.register(command);
    } else {
      console.warn('Attempted to register an undefined command. Check imports in src/commands/index.ts');
    }
  });
  
  return registry;
}
