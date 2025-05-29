import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import type { LLMProviderManager } from '../providers/llm/manager';
import type { ImageProviderManager } from '../providers/image/manager';
import type { MCPProviderManager } from '../providers/mcp/manager';
import type { AvatarController } from '../avatar/AvatarController';
import type { ClaudiaDatabase } from '../storage';
import { DEFAULT_PERSONALITY } from '../types/personality';
import type { TerminalLine } from '../terminal/TerminalDisplay';
import { ProviderManager } from '../services/providerManager';

const addLineWithDelay = (
  storeAddLinesFunc: (line: TerminalLine | TerminalLine[]) => void,
  line: TerminalLine,
  delay: number
): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(() => {
      storeAddLinesFunc(line);
      resolve();
    }, delay);
  });
};

interface UseAppInitializationProps {
  llmManager: LLMProviderManager;
  imageManager: ImageProviderManager;
  mcpManager: MCPProviderManager;
  database: ClaudiaDatabase;
  avatarController: AvatarController;
}


export const useAppInitialization = ({
  llmManager,
  imageManager,
  mcpManager,
  database,
  avatarController
}: UseAppInitializationProps) => {
  const effectRan = useRef(false);
  const providerManager = useRef<ProviderManager | null>(null);
  
  // State selectors
  const isInitialized = useAppStore(state => state.isInitialized);
  const configLoaded = useAppStore(state => state.configLoaded);
  const config = useAppStore(state => state.config);
  const avatarState = useAppStore(state => state.avatarState);
  
  // Actions
  const addLines = useAppStore(state => state.addLines);
  const setIsInitialized = useAppStore(state => state.setIsInitialized);
  const setShowBootSequence = useAppStore(state => state.setShowBootSequence);
  const restoreAvatarState = useAppStore(state => state.restoreAvatarState);
  const initializeActiveConversation = useAppStore(state => state.initializeActiveConversation);
  const loadConversationMessages = useAppStore(state => state.loadConversationMessages);
  const loadConfig = useAppStore(state => state.loadConfig);
  const initializeSettingsManager = useAppStore(state => state.initializeSettingsManager);
  
  // Initialize provider manager
  if (!providerManager.current) {
    providerManager.current = new ProviderManager(llmManager, imageManager, mcpManager);
  }
  
  // Initialize settings manager and load config on mount
  useEffect(() => {
    initializeSettingsManager(database);
    loadConfig();
  }, [loadConfig, initializeSettingsManager, database]);

  useEffect(() => {
    if (isInitialized || !configLoaded || (import.meta.env.DEV && effectRan.current)) {
      return;
    }

    const initializeSystem = async () => {
      try {
        // Clean up expired avatar cache entries
        if (database && typeof database.cleanupExpiredAvatarCache === 'function') {
          const cleanedCount = await database.cleanupExpiredAvatarCache();
          if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} expired avatar cache entries`);
          }
        }

        // Initialize personality system
        const activeP = await database.getActivePersonality();
        if (!activeP) {
          const existingDefault = await database.getPersonality('default');
          if (!existingDefault) {
            await database.savePersonality(DEFAULT_PERSONALITY);
          }
          await database.setActivePersonality('default');
        }

        // Migration: Ensure Claudia has image generation enabled
        const claudiaPersonality = await database.getPersonality('default');
        if (claudiaPersonality && claudiaPersonality.name === 'Claudia' && !claudiaPersonality.allowImageGeneration) {
          await database.updatePersonality('default', { allowImageGeneration: true });
        }

        // Clear any TOS-violating cached avatar URLs before restoring state
        try {
          localStorage.removeItem('claudia_avatar_cache');
          if (database && typeof database.clearAvatarCache === 'function') {
            await database.clearAvatarCache();
            console.log('🧹 Cleared avatar cache for TOS compliance');
          }
        } catch (error) {
          console.warn('Failed to clear avatar cache:', error);
        }

        // Restore avatar state from previous session
        await restoreAvatarState();
        
        // Sync the restored state with avatar controller (without imageUrl to avoid TOS violations)
        const restoredAvatarState = useAppStore.getState().avatarState;
        console.log('🔄 Syncing restored avatar state with controller:', {
          expression: restoredAvatarState.expression,
          pose: restoredAvatarState.pose,
          action: restoredAvatarState.action,
          visible: restoredAvatarState.visible
        });
        // Set state without imageUrl - avatar will be regenerated if needed
        avatarController.setState({
          ...restoredAvatarState,
          imageUrl: undefined // Clear any cached imageUrl to avoid TOS violations
        });

        // Initialize active conversation
        const { activeConvId: activeConvIdToUse, playBootAnimation } = await initializeActiveConversation(database);
        
        // Initialize all providers using unified manager
        if (providerManager.current) {
          const initResults = await providerManager.current.initializeAllProviders();
          
          // Log any initialization errors
          if (!initResults.llm.success && initResults.llm.error) {
            console.warn('LLM initialization issue:', initResults.llm.error);
          }
          if (!initResults.image.success && initResults.image.error) {
            console.warn('Image provider initialization issue:', initResults.image.error);
          }
          if (!initResults.mcp.success && initResults.mcp.error) {
            console.warn('MCP provider initialization issue:', initResults.mcp.error);
          }
        }

        // Handle boot sequence or load conversation
        if (playBootAnimation) {
          if (config.enhancedBoot) {
            setShowBootSequence(true);
            return; // Return early, boot sequence will handle completion
          } else {
            // Fallback to simple boot lines
            const bootLines: TerminalLine[] = [
              { id: 'boot-8', type: 'output', content: 'Hey there! I\'m Claudia, your AI companion. Ready to assist!', timestamp: new Date().toISOString(), user: 'claudia', isChatResponse: true },
              { id: 'boot-9', type: 'output', content: 'Type /help to see available commands, or just start chatting!', timestamp: new Date().toISOString(), user: 'claudia', isChatResponse: true },
            ];
            for (const line of bootLines) {
              await addLineWithDelay(addLines, line, 500);
            }
          }
        } else if (activeConvIdToUse) {
          await loadConversationMessages(database, activeConvIdToUse);
        }

        // Initialize avatar if no saved state exists (check after restoration and sync)
        const finalAvatarState = avatarController.getState();
        if (imageManager.getActiveProvider() && avatarController && !finalAvatarState.imageUrl) {
          console.log('📸 No saved avatar image found, generating initial avatar');
          await avatarController.executeCommands([{
            show: true, expression: 'happy', action: 'wave', pose: 'standing'
          }]);
        } else if (finalAvatarState.imageUrl) {
          console.log('✅ Using restored avatar image:', finalAvatarState.imageUrl.substring(0, 50) + '...');
          // Make sure the avatar is visible if we have a saved image
          if (!finalAvatarState.visible) {
            avatarController.setState({ visible: true });
          }
        }

      } catch (error) {
        console.error('System initialization error:', error);
        const errorLine: TerminalLine = {
          id: 'init-error', type: 'error',
          content: `Warning: System Warning: ${error instanceof Error ? error.message : 'Unknown error during initialization.'}`,
          timestamp: new Date().toISOString()
        };
        addLines(errorLine);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeSystem();

    return () => {
      // Cleanup avatar controller on unmount
      if (avatarController && typeof avatarController.cleanup === 'function') {
        avatarController.cleanup();
      }
      
      if (import.meta.env.DEV) {
        effectRan.current = true;
      }
    };
  }, [
    isInitialized, configLoaded, config.enhancedBoot, 
    llmManager, imageManager, mcpManager, database, avatarController,
    initializeActiveConversation, addLines, loadConversationMessages, 
    restoreAvatarState, avatarState.imageUrl, setIsInitialized, setShowBootSequence
  ]);

  return { isInitialized };
};