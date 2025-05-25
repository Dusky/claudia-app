import type { TerminalLine } from '../terminal/TerminalDisplay';
import type { LLMProviderManager } from '../providers/llm/manager';
import type { ImageProviderManager } from '../providers/image/manager';
import type { AvatarController } from '../avatar/AvatarController';
import type { StorageService } from '../storage/types'; // Updated import
import type { Personality } from '../types/personality';

export interface CommandContext {
  llmManager: LLMProviderManager;
  imageManager: ImageProviderManager;
  avatarController: AvatarController;
  storage: StorageService; // Changed from MockDatabase to StorageService
  addLines: (lines: TerminalLine[]) => void;
  setLoading: (loading: boolean) => void;
  currentTheme: string;
  setTheme: (theme: string) => void;
  openPersonalityEditor: (personality?: Personality | null) => void;
  openAIOptionsModal?: () => void; // Added openAIOptionsModal
}

export interface CommandResult {
  success: boolean;
  lines?: TerminalLine[];
  message?: string;
  error?: string;
  shouldContinue?: boolean;
  metadata?: Record<string, unknown>;
}

export interface Command {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  requiresAI?: boolean;
  requiresImageGen?: boolean;
  execute: (args: string[], context: CommandContext) => Promise<CommandResult>;
}

export interface CommandRegistry {
  register(command: Command): void;
  unregister(commandName: string): void;
  get(commandName: string): Command | undefined;
  getAll(): Command[];
  execute(input: string, context: CommandContext): Promise<CommandResult>;
}
