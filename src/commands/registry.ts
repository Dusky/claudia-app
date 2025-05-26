// Legacy registry - now imports the simplified implementation
// The original 659-line registry has been refactored into focused modules:
// - AI handling: src/commands/ai/aiHandler.ts
// - Core command execution: src/commands/core/commandRegistry.ts

export { CommandRegistryImpl } from './core/commandRegistry';