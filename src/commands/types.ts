import type { LLMProviderManager } from '../providers/llm/manager';
import type { ImageProviderManager } from '../providers/image/manager';
import type { MCPProviderManager } from '../providers/mcp/manager';
import type { AvatarController } from '../avatar/AvatarController';
import type { StorageService } from '../storage/types';
import type { ImageStorageManager } from '../utils/imageStorage';
// import type { ClaudiaDatabase } from '../storage/database';
import type { TerminalLine } from '../terminal/TerminalDisplay';
import type { Personality } from '../types/personality';
// Removed direct import of CommandRegistry from './registry' to avoid circular dependency potential
// The CommandRegistry type will be available via CommandContext.commandRegistry

export interface CommandContext {
  llmManager: LLMProviderManager;
  imageManager: ImageProviderManager;
  mcpManager: MCPProviderManager;
  avatarController: AvatarController;
  storage: StorageService;
  imageStorageManager: ImageStorageManager; 
  addLines: (lines: TerminalLine | TerminalLine[]) => void; // Can accept single or multiple lines
  setLoading: (loading: boolean) => void;
  updateStreamingLine?: (lineId: string, content: string) => void; // For real-time content updates
  currentTheme: string;
  setTheme: (theme: string) => void;
  openPersonalityEditor: (personality?: Personality | null | undefined) => void; 
  openConfigModal?: () => void; // Function to open config modal
  showModal?: (modalType: string, data?: unknown) => void; // Function to show modals
  commandRegistry: CommandRegistry; // Provide access to the registry itself for sub-commands or help
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null, loadMessages?: boolean) => Promise<void>;
  resetConversationAndTerminal: (db: StorageService) => Promise<void>; // Action to clear terminal and start new conversation
}

export interface CommandResult {
  success: boolean;
  lines?: TerminalLine[];
  message?: string;
  error?: string;
  shouldContinue?: boolean; // e.g., false for /exit or /clear that might reset UI
  metadata?: Record<string, unknown>; // For commands to return extra data if needed
}

export interface Command {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  requiresAI?: boolean; // Does the command need an LLM?
  requiresImageGen?: boolean; // Does the command need an Image Generator?
  execute: (args: string[], context: CommandContext) => Promise<CommandResult>;
  subCommands?: Command[]; // For nested commands like /settings get <key>
  // TODO: Add a getSuggestions(args: string[], context: CommandContext): Promise<string[]> for arg-level autocomplete
}

// Forward declare CommandRegistry interface here if it's not imported to break cycles
// This is a common pattern if CommandRegistryImpl needs Command or CommandContext
export interface CommandRegistry {
  register(command: Command): void;
  get(name: string): Command | undefined;
  execute(input: string, context: CommandContext): Promise<CommandResult>;
  getAllCommands(): Command[];
  getAllCommandNames(): string[];
  // parseInput(input: string): { commandName: string; args: string[] }; // This was in Impl, decide if it belongs in interface
}


// Example of a more specific command type if needed
export interface AICommand extends Command {
  requiresAI: true;
}
