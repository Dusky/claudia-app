import { useEffect, useMemo, useRef, useState } from 'react';
import { TerminalDisplay, type TerminalLine } from './terminal/TerminalDisplay';
import { AvatarPanel } from './components/AvatarPanel';
import { PersonalityModal } from './components/PersonalityModal';
import { ConfigModal, defaultConfig, type ConfigSettings } from './components/ConfigModal';
import { HelpModal } from './components/HelpModal';
import { ImageGenerationModal } from './components/ImageGenerationModal';
import { AIOptionsModal } from './components/AIOptionsModal';
import { AppSettingsModal } from './components/AppSettingsModal';
import { BootSequence } from './components/BootSequence';
import { StatusBar } from './components/StatusBar';
import { TopBar } from './components/TopBar';
import { getTheme, type TerminalTheme } from './terminal/themes';
import { config as envConfig, configManager } from './config/env';
import { LLMProviderManager } from './providers/llm/manager';
import { ImageProviderManager } from './providers/image/manager';
import { MCPProviderManager } from './providers/mcp/manager';
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
  const [aiOptionsModalOpen, setAiOptionsModalOpen] = useState(false);
  const [appSettingsModalOpen, setAppSettingsModalOpen] = useState(false);
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
  const setLines = useAppStore(state => state.setLines);
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
  const restoreAvatarState = useAppStore(state => state.restoreAvatarState);
  
  const effectRan = useRef(false);

  const llmManager = useMemo(() => new LLMProviderManager(), []);
  const imageManager = useMemo(() => new ImageProviderManager(), []);
  const mcpManager = useMemo(() => new MCPProviderManager(), []);
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

        // Restore avatar state from previous session
        await restoreAvatarState();

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

        try {
          // Initialize MCP provider with default configuration
          await mcpManager.initialize();
          console.log('✅ MCP provider initialized');
        } catch (error) {
          console.warn('⚠️ MCP provider initialization failed:', error);
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

        // Only initialize avatar if no saved state exists
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
  }, [isInitialized, configLoaded, config.enhancedBoot, llmManager, imageManager, mcpManager, database, avatarController, 
      initializeActiveConversation, addLines, loadConversationMessages, restoreAvatarState, avatarState.imageUrl]);


  const handleThemeStatusClick = () => handleInput("/themes");

  // TopBar conversation management handlers
  const handleConversationSwitch = async (conversationId: string) => {
    try {
      await setActiveConversationAndLoadMessages(database, conversationId, true);
    } catch (error) {
      console.error('Failed to switch conversation:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      await resetConversationAndTerminal(database);
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    }
  };

  const handleConversationDelete = async (conversationId: string) => {
    try {
      // Don't allow deleting the active conversation
      if (conversationId === activeConversationId) {
        alert('Cannot delete the active conversation. Please switch to another conversation first.');
        return;
      }
      
      await database.deleteConversation(conversationId);
      
      // Add feedback message
      addLines({
        id: `delete-${Date.now()}`,
        type: 'system',
        content: 'Conversation deleted successfully.',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  };

  const handleConversationRename = async (conversationId: string, newTitle: string) => {
    try {
      await database.updateConversation(conversationId, { title: newTitle });
      
      // Add feedback message
      addLines({
        id: `rename-${Date.now()}`,
        type: 'system',
        content: `Conversation renamed to "${newTitle}".`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
    } catch (error) {
      console.error('Failed to rename conversation:', error);
      alert('Failed to rename conversation. Please try again.');
    }
  };

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
    const handleShowHelpModal = (event: Event) => {
      const customEvent = event as CustomEvent<{ commandName?: string }>;
      setHelpModalCommandName(customEvent.detail?.commandName || null);
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

    // Function to update a specific line during streaming
    const updateStreamingLine = (lineId: string, content: string) => {
      setLines(lines.map((line: TerminalLine) => 
        line.id === lineId 
          ? { ...line, content } 
          : line
      ));
    };

    const context: CommandContext = {
      llmManager, imageManager, mcpManager, avatarController, storage: database,
      addLines, 
      setLoading,
      updateStreamingLine,
      currentTheme, 
      setTheme,
      openPersonalityEditor: (p) => openPersonalityEditorModal(database, p),
      openConfigModal: () => setConfigModalOpen(true),
      commandRegistry,
      activeConversationId: activeConversationId,
      setActiveConversationId: (id, loadMsgs) => setActiveConversationAndLoadMessages(database, id, loadMsgs),
      resetConversationAndTerminal: (db) => resetConversationAndTerminal(db), // Pass new action
    };

    try {
      setLoading(true);
      const result = await commandRegistry.execute(input.trim(), context);
      
      // If the command returns lines (e.g., /help), add them.
      // The /clear command will manage its lines via the store action, so it won't return lines here.
      if (result.lines && result.lines.length > 0) addLines(result.lines);

      // Add subtle success feedback for successful commands
      if (result.success && input.trim().startsWith('/')) {
        const cmdName = input.trim().split(' ')[0];
        const silentCommands = ['/clear', '/conversation-new', '/conversation-load'];
        if (!silentCommands.includes(cmdName)) {
          // Brief success indicator that fades
          setTimeout(() => {
            const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
            if (inputElement) {
              const successColor = currentTheme === 'mainframe70s' ? '#00ff00' : '#00FFFF';
              inputElement.style.transition = 'box-shadow 0.15s ease-in-out';
              inputElement.style.boxShadow = `0 0 4px ${successColor}60`;
              setTimeout(() => {
                inputElement.style.boxShadow = '';
              }, 400);
            }
          }, 50);
        }
      }

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
    <div className="App">
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
          <TopBar
            theme={themeObject}
            storage={database}
            activeConversationId={activeConversationId}
            onConversationSwitch={handleConversationSwitch}
            onNewConversation={handleNewConversation}
            onConversationDelete={handleConversationDelete}
            onConversationRename={handleConversationRename}
          />
          <div className="main-content">
            <TerminalDisplay
              theme={themeObject} lines={lines} onInput={handleInput}
              prompt=">" isLoading={isLoading} commandRegistry={commandRegistry}
              config={config}
            />
            <AvatarPanel state={avatarState} theme={themeObject} />
          </div>
          <StatusBar
            theme={themeObject} currentTheme={currentTheme}
            llmManager={llmManager} imageManager={imageManager} storage={database}
            onThemeClick={handleThemeStatusClick}
            onPersonalityClick={() => openPersonalityEditorModal(database)}
            onImageProviderClick={() => setImageModalOpen(true)}
            onAIOptionsClick={() => setAiOptionsModalOpen(true)}
            onAppSettingsClick={() => setAppSettingsModalOpen(true)}
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
        storage={database}
        theme={themeObject}
      />

      <AIOptionsModal
        isOpen={aiOptionsModalOpen}
        onClose={() => setAiOptionsModalOpen(false)}
        storage={database}
        llmManager={llmManager}
      />

      <AppSettingsModal
        isOpen={appSettingsModalOpen}
        onClose={() => setAppSettingsModalOpen(false)}
        storage={database}
        theme={themeObject}
      />
    </div>
  );
}

export default App;
