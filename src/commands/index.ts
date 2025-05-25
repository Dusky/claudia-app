export * from './types';
export * from './registry';

// Builtin commands
import { helpCommand } from './builtin/help';
import { themeCommand, themesCommand, clearCommand } from './builtin/theme';
import { askCommand, handleAIMessage } from './builtin/ai';
import { avatarCommand, imagineCommand } from './builtin/avatar';
import { providersCommand } from './builtin/providers';
import { testCommand } from './builtin/test'; // Assuming you have this file and it exports testCommand

// Import all personality commands (main and subcommands)
import {
  personalityCommand, // Main /personality command
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


// Create and configure the default command registry
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
    testCommand, // Make sure testCommand is imported if it exists
    
    // Personality commands
    personalityCommand, // Main /personality
    listPersonalitiesCommand,
    createPersonalityCommand,
    editPersonalityCommand,
    deletePersonalityCommand,
    setPersonalityCommand,
    currentPersonalityCommand,
    initDefaultPersonalityCommand,
    viewPersonalityCommand,
  ];

  commandsToRegister.forEach(command => {
    if (command) { // Add a check to ensure command is not undefined
      registry.register(command);
    } else {
      console.warn('Attempted to register an undefined command. Check imports in src/commands/index.ts');
    }
  });
  
  return registry;
}

// Export the AI message handler
export { handleAIMessage };
