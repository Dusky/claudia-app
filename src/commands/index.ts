export * from './types';
export * from './registry';

// Builtin commands
import { helpCommand } from './builtin/help';
import { themeCommand, themesCommand, clearCommand } from './builtin/theme';
import { askCommand } from './builtin/ai'; 
import { avatarCommand, imagineCommand } from './builtin/avatar';
import { providersCommand } from './builtin/providers';
import { testCommand } from './builtin/test'; 
import {
  conversationCommand,
  listConversationsCommand,
  newConversationCommand,
  loadConversationCommand,
  deleteConversationCommand,
  renameConversationCommand,
  clearConversationHistoryCommand,
} from './builtin/conversation';

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
    testCommand, 
    
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
