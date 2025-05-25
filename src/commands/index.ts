export * from './types';
export * from './registry';

// Builtin commands
export * from './builtin/help';
export * from './builtin/theme';
export * from './builtin/ai';
export * from './builtin/avatar';
export * from './builtin/providers';
export * from './builtin/test';
export * from './builtin/personality';

import { CommandRegistryImpl } from './registry';
import { helpCommand } from './builtin/help';
import { themeCommand, themesCommand, clearCommand } from './builtin/theme';
import { askCommand } from './builtin/ai';
import { avatarCommand, imagineCommand } from './builtin/avatar';
import { providersCommand } from './builtin/providers';
import { testCommand } from './builtin/test';
import { personalityCommand } from './builtin/personality';

// Create and configure the default command registry
export function createCommandRegistry(): CommandRegistryImpl {
  const registry = new CommandRegistryImpl();
  
  // Register all builtin commands
  registry.register(helpCommand);
  registry.register(themeCommand);
  registry.register(themesCommand);
  registry.register(clearCommand);
  registry.register(askCommand);
  registry.register(avatarCommand);
  registry.register(imagineCommand);
  registry.register(providersCommand);
  registry.register(testCommand);
  registry.register(personalityCommand);
  
  return registry;
}

// Export the AI message handler
export { handleAIMessage } from './builtin/ai';
