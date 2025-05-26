import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import type { LLMProviderManager } from '../providers/llm/manager';
import type { ImageProviderManager } from '../providers/image/manager';
import type { MCPProviderManager } from '../providers/mcp/manager';
import type { AvatarController } from '../avatar/AvatarController';
import type { ClaudiaDatabase } from '../storage';
import { config as envConfig, configManager } from '../config/env';
import { DEFAULT_PERSONALITY } from '../types/personality';
import type { TerminalLine } from '../terminal/TerminalDisplay';

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
  
  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (isInitialized || !configLoaded || (import.meta.env.DEV && effectRan.current)) {
      return;
    }

    const initializeSystem = async () => {
      try {
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

        // Restore avatar state from previous session
        await restoreAvatarState();

        // Initialize active conversation
        const { activeConvId: activeConvIdToUse, playBootAnimation } = await initializeActiveConversation(database);
        
        // Initialize providers
        try {
          const imageProviderConfig = configManager.getProviderConfig(envConfig.defaultImageProvider);
          await imageManager.initializeProvider(envConfig.defaultImageProvider, imageProviderConfig);
          console.log('✅ Image provider initialized:', envConfig.defaultImageProvider);
        } catch (error) {
          console.warn('⚠️ Image provider initialization failed:', error);
        }

        try {
          await mcpManager.initialize();
          console.log('✅ MCP provider initialized');
        } catch (error) {
          console.warn('⚠️ MCP provider initialization failed:', error);
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

        // Initialize avatar if no saved state exists
        if (imageManager.getActiveProvider() && avatarController && !avatarState.imageUrl) {
          await avatarController.executeCommands([{
            show: true, expression: 'happy', action: 'wave', pose: 'standing'
          }]);
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