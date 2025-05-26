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
