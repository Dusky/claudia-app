import { useEffect, useMemo, useRef, useState } from 'react';
import { TerminalDisplay, type TerminalLine } from './terminal/TerminalDisplay';
import { AvatarDisplay } from './avatar/AvatarDisplay';
import { PersonalityModal } from './components/PersonalityModal';
import { ConfigModal, defaultConfig, type ConfigSettings } from './components/ConfigModal';
import { HelpModal } from './components/HelpModal';
import { ImageGenerationModal } from './components/ImageGenerationModal';
import { BootSequence } from './components/BootSequence';
import { StatusBar } from './components/StatusBar';
import { getTheme, type TerminalTheme } from './terminal/themes';
import { config as envConfig, configManager } from './config/env';
import { LLMProviderManager } from './providers/llm/manager';
import { ImageProviderManager } from './providers/image/manager';
import { AvatarController } from './avatar/AvatarController';
import { ClaudiaDatabase } from './storage';
import { createCommandRegistry, type CommandContext } from './commands';
import { DEFAULT_PERSONALITY } from './types/personality';
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
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [helpModalCommandName, setHelpModalCommandName] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [config, setConfig] = useState<ConfigSettings>(defaultConfig);
  const [configLoaded, setConfigLoaded] = useState(false); // Track if config has been loaded from localStorage
  const [showBootSequence, setShowBootSequence] = useState(false);

  // Zustand store selectors for state
  const currentTheme = useAppStore(state => state.currentTheme);
  const lines = useAppStore(state => state.lines);
  const isLoading = useAppStore(state => state.isLoading);
  const avatarState = useAppStore(state => state.avatarState);
  const personalityModalOpen = useAppStore(state => state.personalityModalOpen);
  const editingPersonalityInModal = useAppStore(state => state.editingPersonalityInModal);
  const allPersonalitiesInModal = useAppStore(state => state.allPersonalitiesInModal);
  const activePersonalityIdInModal = useAppStore(state => state.activePersonalityIdInModal);
  const activeConversationId = useAppStore(state => state.activeConversationId);

  // Select actions individually - their references are stable from Zustand
  const setTheme = useAppStore(state => state.setTheme);
  const addLines = useAppStore(state => state.addLines);
  const setLoading = useAppStore(state => state.setLoading);
  const setAvatarState = useAppStore(state => state.setAvatarState);
  const openPersonalityEditorModal = useAppStore(state => state.openPersonalityEditorModal);
  const closePersonalityModal = useAppStore(state => state.closePersonalityModal);
  const savePersonalityInModal = useAppStore(state => state.savePersonalityInModal);
  const deletePersonalityInModal = useAppStore(state => state.deletePersonalityInModal);
  const setActiveConversationAndLoadMessages = useAppStore(state => state.setActiveConversationAndLoadMessages);
  const loadConversationMessages = useAppStore(state => state.loadConversationMessages);
  const initializeActiveConversation = useAppStore(state => state.initializeActiveConversation);
  const clearTerminalForNewSession = useAppStore(state => state.clearTerminalForNewSession);
  const resetConversationAndTerminal = useAppStore(state => state.resetConversationAndTerminal); // Get new action
  
  const effectRan = useRef(false);

  const llmManager = useMemo(() => new LLMProviderManager(), []);
  const imageManager = useMemo(() => new ImageProviderManager(), []);
  const database = useMemo(() => new ClaudiaDatabase(), []);
  
  const avatarController = useMemo(() =>
    new AvatarController(imageManager, database, setAvatarState), // setAvatarState is now stable
    [imageManager, database, setAvatarState] 
  );
  const commandRegistry = useMemo(() => createCommandRegistry(), []);

  const themeObject: TerminalTheme = getTheme(currentTheme);

  useEffect(() => {
    if (isInitialized || !configLoaded || (import.meta.env.DEV && effectRan.current)) {
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

        // Migration: Ensure Claudia has image generation enabled
        const claudiaPersonality = await database.getPersonality('default');
        if (claudiaPersonality && claudiaPersonality.name === 'Claudia' && !claudiaPersonality.allowImageGeneration) {
          await database.updatePersonality('default', { allowImageGeneration: true });
        }

        // initializeActiveConversation is a stable action reference
        const { activeConvId: activeConvIdToUse, playBootAnimation } = await initializeActiveConversation(database);
        
        try {
          // Always try to initialize the image provider with config
          const imageProviderConfig = configManager.getProviderConfig(envConfig.defaultImageProvider);
          await imageManager.initializeProvider(envConfig.defaultImageProvider, imageProviderConfig);
          console.log('✅ Image provider initialized:', envConfig.defaultImageProvider);
        } catch (error) {
          console.warn('⚠️ Image provider initialization failed:', error);
        }

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
          await loadConversationMessages(database, activeConvIdToUse); // loadConversationMessages is stable
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
        addLines(errorLine); // addLines is stable
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
  // Add specific actions used inside this useEffect to the dependency array if they were not stable
  // However, Zustand actions are typically stable by reference.
  // Managers and DB are memoized. isInitialized controls the single run.
  }, [isInitialized, configLoaded, config.enhancedBoot, llmManager, imageManager, database, avatarController, 
      initializeActiveConversation, addLines, loadConversationMessages]);


  const handleThemeStatusClick = () => handleInput("/themes");

  const handleBootSequenceComplete = async () => {
    setShowBootSequence(false);
    
    // Add welcome messages after boot sequence
    const bootLines: TerminalLine[] = [
      { id: 'boot-8', type: 'output', content: 'Hey there! I\'m Claudia, your AI companion. Ready to assist!', timestamp: new Date().toISOString(), user: 'claudia', isChatResponse: true },
      { id: 'boot-9', type: 'output', content: 'Type /help to see available commands, or just start chatting!', timestamp: new Date().toISOString(), user: 'claudia', isChatResponse: true },
    ];
    
    for (const line of bootLines) {
      await addLineWithDelay(addLines, line, 500);
    }

    // Initialize avatar if available
    if (imageManager.getActiveProvider() && avatarController) {
      await avatarController.executeCommands([{
        show: true, expression: 'happy', position: 'beside-text', action: 'wave', pose: 'standing'
      }]);
    }
  };

  const handleBootSequenceSkip = () => {
    setShowBootSequence(false);
    // Skip directly to welcome messages
    const bootLines: TerminalLine[] = [
      { id: 'boot-8', type: 'output', content: 'Hey there! I\'m Claudia, your AI companion. Ready to assist!', timestamp: new Date().toISOString(), user: 'claudia', isChatResponse: true },
      { id: 'boot-9', type: 'output', content: 'Type /help to see available commands, or just start chatting!', timestamp: new Date().toISOString(), user: 'claudia', isChatResponse: true },
    ];
    addLines(bootLines);
  };

  const handleConfigChange = (newConfig: ConfigSettings) => {
    setConfig(newConfig);
    // Save config to localStorage for persistence
    localStorage.setItem('claudia-config', JSON.stringify(newConfig));
  };

  // Load config from localStorage on startup
  useEffect(() => {
    const savedConfig = localStorage.getItem('claudia-config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.warn('Failed to load saved config:', error);
      }
    }
    setConfigLoaded(true);
  }, []);

  // Listen for help modal events
  useEffect(() => {
    const handleShowHelpModal = (event: any) => {
      setHelpModalCommandName(event.detail?.commandName || null);
      setHelpModalOpen(true);
    };

    window.addEventListener('showHelpModal', handleShowHelpModal);
    return () => window.removeEventListener('showHelpModal', handleShowHelpModal);
  }, []);

  const handleInput = async (input: string) => {
    const userLine: TerminalLine = {
      id: `user-${Date.now()}`, type: 'input', content: input,
      timestamp: new Date().toISOString(), user: 'user'
    };
    addLines(userLine);

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
      addLines, 
      setLoading, 
      currentTheme, 
      setTheme,
      openPersonalityEditor: (p) => openPersonalityEditorModal(database, p),
      openConfigModal: () => setConfigModalOpen(true),
      commandRegistry,
      activeConversationId: activeConversationId,
      setActiveConversationId: (id, loadMsgs) => setActiveConversationAndLoadMessages(database, id, loadMsgs),
      resetConversationAndTerminal: (db) => resetConversationAndTerminal(db as any), // Pass new action
    };

    try {
      setLoading(true);
      const result = await commandRegistry.execute(input.trim(), context);
      
      // If the command returns lines (e.g., /help), add them.
      // The /clear command will manage its lines via the store action, so it won't return lines here.
      if (result.lines && result.lines.length > 0) addLines(result.lines);

      // Handle commands that might want to clear the terminal or change session fundamentally.
      // The /clear command now handles its own state reset via the store action and returns shouldContinue: false.
      // This block is now only for other commands like /conversation-clearhist that might use clearTerminalForNewSession.
      if (result.shouldContinue === false) {
        const commandName = input.trim().toLowerCase().split(' ')[0];
        if (commandName === '/conversation-clearhist') {
          // clearTerminalForNewSession only clears lines and shows boot messages,
          // it does not affect conversation state.
          await clearTerminalForNewSession(); 
        }
        // Other commands that return shouldContinue: false (like /clear)
        // are expected to manage their own UI/state reset.
      }
    } catch (error) {
      console.error('Input handling error:', error);
      const errorLine: TerminalLine = {
        id: `error-${Date.now()}`, type: 'error',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(), user: 'claudia'
      };
      addLines(errorLine);
      if (activeConversationId) {
        await database.addMessage({
          conversationId: activeConversationId, role: 'assistant',
          content: `System Error: ${errorLine.content}`, timestamp: errorLine.timestamp
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App" style={{ position: 'relative', minHeight: '100vh', paddingBottom: '50px' }}>
      {showBootSequence && (
        <BootSequence
          config={config}
          onComplete={handleBootSequenceComplete}
          onSkip={handleBootSequenceSkip}
        />
      )}
      
      {!showBootSequence && (
        <>
          {themeObject.overlayClassName && (
            <div className={`shader-overlay ${themeObject.overlayClassName}`}></div>
          )}
          <TerminalDisplay
            theme={themeObject} lines={lines} onInput={handleInput}
            prompt=">" isLoading={isLoading} commandRegistry={commandRegistry}
            config={config}
          />
          <AvatarDisplay state={avatarState} className="claudia-avatar" />
          <StatusBar
            theme={themeObject} currentTheme={currentTheme}
            llmManager={llmManager} imageManager={imageManager} storage={database}
            onThemeClick={handleThemeStatusClick}
            onPersonalityClick={() => openPersonalityEditorModal(database)}
            onImageProviderClick={() => setImageModalOpen(true)}
          />
        </>
      )}

      {personalityModalOpen && (
        <PersonalityModal
          isOpen={personalityModalOpen} onClose={closePersonalityModal}
          onSave={(p) => savePersonalityInModal(database, p)}
          onDelete={(id) => deletePersonalityInModal(database, id)}
          editingPersonality={editingPersonalityInModal}
          allPersonalities={allPersonalitiesInModal}
          activePersonalityId={activePersonalityIdInModal}
          theme={themeObject}
        />
      )}

      <ConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        config={config}
        onConfigChange={handleConfigChange}
      />

      <HelpModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        commandRegistry={commandRegistry}
        commandName={helpModalCommandName}
        theme={themeObject}
      />

      <ImageGenerationModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        imageManager={imageManager}
        avatarController={avatarController}
        theme={themeObject}
      />
    </div>
  );
}

export default App;
