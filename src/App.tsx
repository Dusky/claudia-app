import React, { useEffect, useMemo, useRef, useState } from 'react'; // Added useState
import { TerminalDisplay, type TerminalLine } from './terminal/TerminalDisplay';
import { AvatarDisplay } from './avatar/AvatarDisplay';
import { PersonalityModal } from './components/PersonalityModal';
import { StatusBar } from './components/StatusBar';
import { getTheme, type TerminalTheme } from './terminal/themes';
import { config } from './config/env';
import { LLMProviderManager } from './providers/llm/manager';
import { ImageProviderManager } from './providers/image/manager';
import { AvatarController } from './avatar/AvatarController';
import { ClaudiaDatabase } from './storage';
import { createCommandRegistry, type CommandContext } from './commands';
import { DEFAULT_PERSONALITY, type Personality } from './types/personality';
import { useAppStore } from './store/appStore';
import './App.css';
import './styles/overlays.css';

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


function App() {
  const [isInitialized, setIsInitialized] = useState(false); // Initialization flag

  // Zustand store selectors
  const currentTheme = useAppStore(state => state.currentTheme);
  const lines = useAppStore(state => state.lines);
  const isLoading = useAppStore(state => state.isLoading);
  const avatarState = useAppStore(state => state.avatarState);
  const personalityModalOpen = useAppStore(state => state.personalityModalOpen);
  const editingPersonalityInModal = useAppStore(state => state.editingPersonalityInModal);
  const allPersonalitiesInModal = useAppStore(state => state.allPersonalitiesInModal);
  const activePersonalityIdInModal = useAppStore(state => state.activePersonalityIdInModal);
  const activeConversationId = useAppStore(state => state.activeConversationId);

  // Zustand store actions (references should be stable)
  const storeActions = useAppStore(state => ({
    setTheme: state.setTheme,
    addLines: state.addLines,
    setLines: state.setLines,
    setLoading: state.setLoading,
    setAvatarState: state.setAvatarState,
    openPersonalityEditorModal: state.openPersonalityEditorModal,
    closePersonalityModal: state.closePersonalityModal,
    savePersonalityInModal: state.savePersonalityInModal,
    deletePersonalityInModal: state.deletePersonalityInModal,
    setActiveConversationAndLoadMessages: state.setActiveConversationAndLoadMessages,
    loadConversationMessages: state.loadConversationMessages,
    initializeActiveConversation: state.initializeActiveConversation,
    clearTerminalForNewSession: state.clearTerminalForNewSession,
  }));
  
  const effectRan = useRef(false);

  const llmManager = useMemo(() => new LLMProviderManager(), []);
  const imageManager = useMemo(() => new ImageProviderManager(), []);
  const database = useMemo(() => new ClaudiaDatabase(), []);
  
  const avatarController = useMemo(() =>
    new AvatarController(imageManager, database, storeActions.setAvatarState),
    [imageManager, database, storeActions.setAvatarState] 
  );
  const commandRegistry = useMemo(() => createCommandRegistry(), []);

  const themeObject: TerminalTheme = getTheme(currentTheme);

  useEffect(() => {
    // Prevent re-initialization
    if (isInitialized || (import.meta.env.DEV && effectRan.current)) {
      return;
    }

    const initializeSystem = async () => {
      try {
        const activeP = await database.getActivePersonality();
        if (!activeP) {
          const existingDefault = await database.getPersonality('default');
          if (!existingDefault) {
            await database.savePersonality(DEFAULT_PERSONALITY);
          }
          await database.setActivePersonality('default');
        }

        const { activeConvId: activeConvIdToUse, playBootAnimation } = await storeActions.initializeActiveConversation(database);
        
        try {
          const imageProvider = imageManager.getProvider(config.defaultImageProvider);
          if (imageProvider && imageProvider.isConfigured()) {
            await imageManager.initializeProvider(config.defaultImageProvider, {});
          }
        } catch (error) {
          console.warn('Image provider initialization failed:', error);
        }

        if (playBootAnimation) {
          // storeActions.setLines([]); // This is now handled reliably inside initializeActiveConversation
          const bootLines: TerminalLine[] = [
            { id: 'boot-1', type: 'system', content: 'INITIALIZING CLAUDIA OS...', timestamp: new Date().toISOString() },
            { id: 'boot-2', type: 'system', content: 'BOOT SEQUENCE v2.0.0', timestamp: new Date().toISOString() },
            { id: 'boot-3', type: 'system', content: 'MEMORY CHECK................PASS', timestamp: new Date().toISOString() },
            { id: 'boot-4', type: 'system', content: 'AI CORE LINK ESTABLISHED....ACTIVE', timestamp: new Date().toISOString() },
            { id: 'boot-5', type: 'system', content: 'AVATAR MODULE..............ONLINE', timestamp: new Date().toISOString() },
            { id: 'boot-6', type: 'system', content: 'PERSONALITY MATRIX.........LOADED', timestamp: new Date().toISOString() },
            { id: 'boot-7', type: 'system', content: 'SYSTEM ONLINE. ALL MODULES LOADED.', timestamp: new Date().toISOString() },
            { id: 'boot-8', type: 'output', content: 'Hey there! I\'m Claudia, your AI companion. Ready to assist!', timestamp: new Date().toISOString(), user: 'claudia', isChatResponse: true },
            { id: 'boot-9', type: 'output', content: 'Type /help to see available commands, or just start chatting!', timestamp: new Date().toISOString(), user: 'claudia', isChatResponse: true },
          ];
          for (const line of bootLines) {
            const delay = (line.id === 'boot-8' || line.id === 'boot-9') ? 1000 : (line.id === 'boot-1' || line.id === 'boot-2' ? 500 : (Math.random() * 200 + 600));
            await addLineWithDelay(storeActions.addLines, line, delay);
          }
        } else if (activeConvIdToUse) {
          await storeActions.loadConversationMessages(database, activeConvIdToUse);
        }

        if (imageManager.getActiveProvider() && avatarController) {
          await avatarController.executeCommands([{
            show: true, expression: 'happy', position: 'beside-text', action: 'wave', pose: 'standing'
          }]);
        }

      } catch (error) {
        console.error('System initialization error:', error);
        const errorLine: TerminalLine = {
          id: 'init-error', type: 'error',
          content: `Warning: System Warning: ${error instanceof Error ? error.message : 'Unknown error during initialization.'}`,
          timestamp: new Date().toISOString()
        };
        storeActions.addLines(errorLine);
      } finally {
        setIsInitialized(true); // Mark initialization as complete
      }
    };

    initializeSystem();

    return () => {
      if (import.meta.env.DEV) {
        effectRan.current = true;
      }
    };
  // Dependencies: only include things that, if they change, *should* re-trigger initialization.
  // Store actions are stable. Managers and DB are memoized.
  }, [isInitialized, llmManager, imageManager, database, avatarController, storeActions]);


  const handleThemeStatusClick = () => handleInput("/themes");

  const handleInput = async (input: string) => {
    const userLine: TerminalLine = {
      id: `user-${Date.now()}`, type: 'input', content: input,
      timestamp: new Date().toISOString(), user: 'user'
    };
    storeActions.addLines(userLine);

    if (activeConversationId && !input.startsWith('/')) {
      await database.addMessage({
        conversationId: activeConversationId, role: 'user',
        content: userLine.content, timestamp: userLine.timestamp,
      });
    } else if (activeConversationId && input.startsWith('/ask')) {
      await database.addMessage({
        conversationId: activeConversationId, role: 'user',
        content: input.substring(input.indexOf(' ') + 1),
        timestamp: userLine.timestamp,
      });
    }

    const context: CommandContext = {
      llmManager, imageManager, avatarController, storage: database,
      addLines: storeActions.addLines, 
      setLoading: storeActions.setLoading, 
      currentTheme, 
      setTheme: storeActions.setTheme,
      openPersonalityEditor: (p) => storeActions.openPersonalityEditorModal(database, p),
      commandRegistry,
      activeConversationId: activeConversationId,
      setActiveConversationId: (id, loadMsgs) => storeActions.setActiveConversationAndLoadMessages(database, id, loadMsgs),
    };

    try {
      storeActions.setLoading(true);
      const result = await commandRegistry.execute(input.trim(), context);
      if (result.lines && result.lines.length > 0) storeActions.addLines(result.lines);

      if (result.shouldContinue === false && (input.trim().toLowerCase().startsWith('/clear') ||
        (input.trim().toLowerCase().startsWith('/conversation') &&
          (input.includes('new') || input.includes('load') || input.includes('clearhist'))
        ))) {
        if (input.trim().toLowerCase().startsWith('/clear') || input.trim().toLowerCase() === '/conversation-clearhist') {
          await storeActions.clearTerminalForNewSession();
        }
      }
    } catch (error) {
      console.error('Input handling error:', error);
      const errorLine: TerminalLine = {
        id: `error-${Date.now()}`, type: 'error',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(), user: 'claudia'
      };
      storeActions.addLines(errorLine);
      if (activeConversationId) {
        await database.addMessage({
          conversationId: activeConversationId, role: 'assistant',
          content: `System Error: ${errorLine.content}`, timestamp: errorLine.timestamp
        });
      }
    } finally {
      storeActions.setLoading(false);
    }
  };

  return (
    <div className="App" style={{ position: 'relative', minHeight: '100vh', paddingBottom: '50px' }}>
      {themeObject.overlayClassName && (
        <div className={`shader-overlay ${themeObject.overlayClassName}`}></div>
      )}
      <TerminalDisplay
        theme={themeObject} lines={lines} onInput={handleInput}
        prompt=">" isLoading={isLoading} commandRegistry={commandRegistry}
      />
      <AvatarDisplay state={avatarState} className="claudia-avatar" />
      <StatusBar
        theme={themeObject} currentTheme={currentTheme}
        llmManager={llmManager} imageManager={imageManager} storage={database}
        onThemeClick={handleThemeStatusClick}
        onPersonalityClick={() => storeActions.openPersonalityEditorModal(database)}
      />
      {personalityModalOpen && (
        <PersonalityModal
          isOpen={personalityModalOpen} onClose={storeActions.closePersonalityModal}
          onSave={(p) => storeActions.savePersonalityInModal(database, p)}
          onDelete={(id) => storeActions.deletePersonalityInModal(database, id)}
          editingPersonality={editingPersonalityInModal}
          allPersonalities={allPersonalitiesInModal}
          activePersonalityId={activePersonalityIdInModal}
          theme={themeObject}
        />
      )}
    </div>
  );
}

export default App;
