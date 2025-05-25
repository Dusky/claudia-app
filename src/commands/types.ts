import type { LLMProviderManager } from '../providers/llm/manager';
import type { ImageProviderManager } from '../providers/image/manager';
import type { AvatarController } from '../avatar/AvatarController';
import type { StorageService } from '../storage/types';
import type { TerminalLine } from '../terminal/TerminalDisplay';
import type { Personality } from '../types/personality';
import type { CommandRegistry } from './registry'; // Import CommandRegistry for context

export interface CommandContext {
  llmManager: LLMProviderManager;
  imageManager: ImageProviderManager;
  avatarController: AvatarController;
  storage: StorageService; 
  addLines: (lines: TerminalLine[]) => void; // Primarily for UI updates from commands
  setLoading: (loading: boolean) => void;
  currentTheme: string;
  setTheme: (theme: string) => void;
  openPersonalityEditor: (personality?: Personality | null | undefined) => void; 
  commandRegistry: CommandRegistry; 
  activeConversationId: string | null; 
  setActiveConversationId: (id: string | null, loadMessages?: boolean) => Promise<void>; 
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
  subCommands?: Command[]; 
}
