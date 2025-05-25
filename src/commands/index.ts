export * from './types';
export * from './registry';

// Builtin commands
import { helpCommand } from './builtin/help';
import { themeCommand, themesCommand, clearCommand } from './builtin/theme';
import { askCommand } from './builtin/ai'; // handleAIMessage removed from here
import { avatarCommand, imagineCommand } from './builtin/avatar';
import { providersCommand } from './builtin/providers';
import { testCommand } from './builtin/test'; 

// Import all personality commands (main and subcommands)
import {
  personalityCommand, 
  personalityGuiCommand, // New GUI command
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
    testCommand, 
    
    // Personality commands
    personalityCommand, 
    personalityGuiCommand, // Register new GUI command
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
    if (command) { 
      registry.register(command);
    } else {
      console.warn('Attempted to register an undefined command. Check imports in src/commands/index.ts');
    }
  });
  
  return registry;
}

// handleAIMessage is no longer exported as its logic is in CommandRegistryImpl
