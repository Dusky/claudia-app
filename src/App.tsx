import { useMemo, useEffect, useState, useRef, Suspense, lazy } from 'react'; 
import { TerminalDisplay, type TerminalLine } from './terminal/TerminalDisplay';
import { ErrorBoundary } from './components/ErrorBoundary';
// Lazy load heavy components  
const TerminalAvatarPanel = lazy(() => import('./components/TerminalAvatarPanel').then(module => ({ default: module.TerminalAvatarPanel })));
const ImageGenerationModal = lazy(() => import('./components/ImageGenerationModal').then(module => ({ default: module.ImageGenerationModal })));
const PersonalityModal = lazy(() => import('./components/PersonalityModal').then(module => ({ default: module.PersonalityModal })));
const AIOptionsModal = lazy(() => import('./components/AIOptionsModal'));
const AppSettingsModal = lazy(() => import('./components/AppSettingsModal').then(module => ({ default: module.AppSettingsModal })));
const MCPPermissionsModal = lazy(() => import('./components/MCPPermissionsModal').then(module => ({ default: module.MCPPermissionsModal })));

// Keep lightweight components as regular imports
import { ConfigModal } from './components/ConfigModal';
import type { ConfigSettings } from './store/appStore';
import { HelpModal } from './components/HelpModal';
import { BootAnimation } from './components/BootAnimation';
import { StatusBar } from './components/StatusBar/StatusBar';
import { TopBar } from './components/TopBar';
import { CRTShaderWrapper } from './components/CRTShader';
import { getTheme, type TerminalTheme } from './terminal/themes';
import { LLMProviderManager } from './providers/llm/manager';
import { ImageProviderManager } from './providers/image/manager';
import { MCPProviderManager } from './providers/mcp/manager';
import { AvatarController } from './avatar/AvatarController';
import { ClaudiaDatabase } from './storage';
import { createCommandRegistry, type CommandContext } from './commands';
import { useAppStore } from './store/appStore';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useEventListeners } from './hooks/useEventListeners';
// import { useCRTGradient } from './hooks/useCRTGradient'; 
import { ImageStorageManager } from './utils/imageStorage'; // Import ImageStorageManager
import { InputValidator } from './utils/inputValidation'; // Import input validation
import { initializeSecurity } from './utils/csp'; // Import security initialization
import { MemoryManager } from './utils/memoryManager'; // Import memory management
import './App.css';
import './styles/overlays.css';

// Loading component for lazy loaded components
const ComponentLoader: React.FC<{ type?: string }> = ({ type = "component" }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: type === 'modal' ? '200px' : '280px',
    color: '#FFED4A',
    fontSize: '0.9rem',
    opacity: 0.7
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '16px',
        height: '16px',
        border: '2px solid transparent',
        borderTop: '2px solid currentColor',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      Loading {type}...
    </div>
  </div>
);


function App() {
  const [shouldSkipBoot, setShouldSkipBoot] = useState(false);
  const [forceShowBoot, setForceShowBoot] = useState(false);
  const bootCheckDone = useRef(false);

  // Check skipBoot logic and Shift key detection on mount
  useEffect(() => {
    if (bootCheckDone.current) return;
    bootCheckDone.current = true;

    // Check if user is holding Shift key
    const checkShiftKey = (event: KeyboardEvent) => {
      if (event.shiftKey && (event.key === 'Shift' || event.type === 'keydown')) {
        setForceShowBoot(true);
        // Remove listener after detecting Shift
        window.removeEventListener('keydown', checkShiftKey);
        return;
      }
    };

    // Listen for Shift key briefly
    window.addEventListener('keydown', checkShiftKey);
    
    // Check localStorage for skipBoot flag
    const checkSkipBoot = () => {
      try {
        const claudiaData = JSON.parse(localStorage.getItem('claudia') || '{}');
        const shouldSkip = claudiaData.skipBoot === 'true';
        setShouldSkipBoot(shouldSkip);
      } catch (error) {
        console.warn('Failed to read skipBoot flag:', error);
        setShouldSkipBoot(false);
      }
    };

    // Small delay to allow Shift key detection
    const timer = setTimeout(() => {
      window.removeEventListener('keydown', checkShiftKey);
      checkSkipBoot();
    }, 200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', checkShiftKey);
    };
  }, []);

  // Initialize security measures and memory management on app startup
  useEffect(() => {
    initializeSecurity();
    
    // Configure memory manager for app
    const memoryManager = MemoryManager.getInstance();
    memoryManager.configure({
      maxAge: 10 * 60 * 1000, // 10 minutes for app-level resources
      maxConcurrentUrls: 100   // Allow more URLs for full app
    });
    
    return () => {
      // Cleanup memory manager on app unmount
      memoryManager.destroy();
    };
  }, []);

  // Zustand store selectors for state
  const currentTheme = useAppStore(state => state.currentTheme);
  const isThemeTransitioning = useAppStore(state => state.isThemeTransitioning);
  const lines = useAppStore(state => state.lines);
  const isLoading = useAppStore(state => state.isLoading);
  const avatarState = useAppStore(state => state.avatarState);
  const activeConversationId = useAppStore(state => state.activeConversationId);
  
  // Configuration state
  const config = useAppStore(state => state.config);
  
  // Modal states
  const personalityModalOpen = useAppStore(state => state.personalityModalOpen);
  const configModalOpen = useAppStore(state => state.configModalOpen);
  const helpModalOpen = useAppStore(state => state.helpModalOpen);
  const helpModalCommandName = useAppStore(state => state.helpModalCommandName);
  const imageModalOpen = useAppStore(state => state.imageModalOpen);
  const aiOptionsModalOpen = useAppStore(state => state.aiOptionsModalOpen);
  const appSettingsModalOpen = useAppStore(state => state.appSettingsModalOpen);
  const mcpPermissionsModalOpen = useAppStore(state => state.mcpPermissionsModalOpen);
  const showBootSequence = useAppStore(state => state.showBootSequence);
  
  // Personality modal state
  const editingPersonalityInModal = useAppStore(state => state.editingPersonalityInModal);
  const allPersonalitiesInModal = useAppStore(state => state.allPersonalitiesInModal);
  const activePersonalityIdInModal = useAppStore(state => state.activePersonalityIdInModal);
  

  // Core actions
  const setTheme = useAppStore(state => state.setTheme);
  const addLines = useAppStore(state => state.addLines);
  const setLines = useAppStore(state => state.setLines);
  const setLoading = useAppStore(state => state.setLoading);
  const setAvatarState = useAppStore(state => state.setAvatarState);
  // Config actions
  const setConfig = useAppStore(state => state.setConfig);
  
  // Modal actions
  const setConfigModalOpen = useAppStore(state => state.setConfigModalOpen);
  const setHelpModalOpen = useAppStore(state => state.setHelpModalOpen);
  const setImageModalOpen = useAppStore(state => state.setImageModalOpen);
  const setAiOptionsModalOpen = useAppStore(state => state.setAiOptionsModalOpen);
  const setAppSettingsModalOpen = useAppStore(state => state.setAppSettingsModalOpen);
  const setMcpPermissionsModalOpen = useAppStore(state => state.setMcpPermissionsModalOpen);
  const setShowBootSequence = useAppStore(state => state.setShowBootSequence);
  
  // Personality actions
  const openPersonalityEditorModal = useAppStore(state => state.openPersonalityEditorModal);
  const closePersonalityModal = useAppStore(state => state.closePersonalityModal);
  const savePersonalityInModal = useAppStore(state => state.savePersonalityInModal);
  const deletePersonalityInModal = useAppStore(state => state.deletePersonalityInModal);
  
  // Conversation actions
  const setActiveConversationAndLoadMessages = useAppStore(state => state.setActiveConversationAndLoadMessages);
  const clearTerminalForNewSession = useAppStore(state => state.clearTerminalForNewSession);
  const resetConversationAndTerminal = useAppStore(state => state.resetConversationAndTerminal);

  const llmManager = useMemo(() => new LLMProviderManager(), []);
  const imageManager = useMemo(() => new ImageProviderManager(), []);
  const mcpManager = useMemo(() => new MCPProviderManager(), []);
  const database = useMemo(() => new ClaudiaDatabase(), []);
  const imageStorageManager = useMemo(() => new ImageStorageManager(), []);
  
  const avatarController = useMemo(() =>
    new AvatarController(imageManager, llmManager, database, imageStorageManager, setAvatarState), // Pass imageStorageManager
    [imageManager, llmManager, database, imageStorageManager, setAvatarState] 
  );
  const commandRegistry = useMemo(() => createCommandRegistry(), []);
  
  // Custom hooks for complex logic
  useAppInitialization({
    llmManager,
    imageManager,
    mcpManager,
    database,
    avatarController
  });
  
  useEventListeners();

  // useCRTGradient(currentTheme, config.enableCRTEffect !== false); 

  const themeObject: TerminalTheme = getTheme(currentTheme);
  
  // Centralized effect control logic
  const shouldUseWebGLEffects = useMemo(() => {
    // Check if WebGL effects are enabled in config
    const configEnabled = config.enableCRTEffect !== false;
    
    // Check if theme supports CRT shader effects
    const themeSupportsWebGL = themeObject.effects.crt && !!themeObject.effects.crtShader;
    
    return configEnabled && themeSupportsWebGL;
  }, [config.enableCRTEffect, themeObject.effects.crt, themeObject.effects.crtShader]);
  
  // CSS overlays are used when:
  // 1. WebGL is disabled, OR
  // 2. Theme has overlay effects defined
  const shouldUseCSSOverlays = useMemo(() => {
    return !shouldUseWebGLEffects && !!themeObject.overlayClassName;
  }, [shouldUseWebGLEffects, themeObject.overlayClassName]);
  
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

  useEffect(() => {
    console.log("App.tsx: imageModalOpen state changed to:", imageModalOpen);
  }, [imageModalOpen]);


  const handleThemeChange = (themeId: string) => {
    handleInput(`/theme ${themeId}`);
  };

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
      if (conversationId === activeConversationId) {
        addLines({
          id: `delete-error-${Date.now()}`,
          type: 'error',
          content: '❌ Cannot delete the active conversation. Please switch to another conversation first.',
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
        return;
      }
      await database.deleteConversation(conversationId);
      addLines({
        id: `delete-${Date.now()}`,
        type: 'system',
        content: '✅ Conversation deleted successfully.',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      addLines({
        id: `delete-error-${Date.now()}`,
        type: 'error',
        content: '❌ Failed to delete conversation. Please try again.',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
    }
  };

  const handleConversationRename = async (conversationId: string, newTitle: string) => {
    try {
      await database.updateConversation(conversationId, { title: newTitle });
      addLines({
        id: `rename-${Date.now()}`,
        type: 'system',
        content: `✅ Conversation renamed to "${newTitle}".`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
    } catch (error) {
      console.error('Failed to rename conversation:', error);
      addLines({
        id: `rename-error-${Date.now()}`,
        type: 'error',
        content: '❌ Failed to rename conversation. Please try again.',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
    }
  };

  const handleBootSequenceComplete = async () => {
    setShowBootSequence(false);
    const bootLines: TerminalLine[] = [
      { id: 'boot-8', type: 'output', content: 'ClaudiaOS initialization complete. System ready for user interaction.', timestamp: new Date().toISOString(), user: 'claudia', isChatResponse: true },
      { id: 'boot-9', type: 'output', content: 'Type /help for system documentation, or begin natural language interaction.', timestamp: new Date().toISOString(), user: 'claudia', isChatResponse: true },
    ];
    for (const line of bootLines) {
      await addLineWithDelay(addLines, line, 500);
    }
    if (imageManager.getActiveProvider() && avatarController) {
      const currentState = avatarController.getState();
      if (!currentState.imageUrl) {
        console.log('🎬 ClaudiaOS boot complete - initializing visual interface subsystem');
        await avatarController.executeCommands([{
          show: true, expression: 'happy', action: 'wave', pose: 'standing'
        }]);
      } else {
        console.log('🎬 Boot sequence complete - showing existing avatar without generating new image');
        await avatarController.executeCommands([{
          show: true
        }]);
      }
    }
  };

  const handleBootSequenceSkip = () => {
    setShowBootSequence(false);
    const bootLines: TerminalLine[] = [
      { id: 'boot-8', type: 'output', content: 'ClaudiaOS initialization complete. System ready for user interaction.', timestamp: new Date().toISOString(), user: 'claudia', isChatResponse: true },
      { id: 'boot-9', type: 'output', content: 'Type /help for system documentation, or begin natural language interaction.', timestamp: new Date().toISOString(), user: 'claudia', isChatResponse: true },
    ];
    addLines(bootLines);
  };

  const handleConfigChange = (newConfig: ConfigSettings) => {
    setConfig(newConfig);
    localStorage.setItem('claudia-config', JSON.stringify(newConfig));
  };


  const handleInput = async (input: string) => {
    // Validate and sanitize user input to prevent XSS attacks
    const validationResult = InputValidator.validatePrompt(input);
    
    if (!validationResult.isValid) {
      const errorLine: TerminalLine = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `Input validation failed: ${validationResult.errors.join(', ')}`,
        timestamp: new Date().toISOString(),
user: 'claudia' // Use claudia instead of system for type compatibility
      };
      addLines(errorLine);
      return;
    }
    
    // Show warnings if any
    if (validationResult.warnings.length > 0) {
      console.warn('Input validation warnings:', validationResult.warnings);
    }
    
    // Use sanitized input
    const sanitizedInput = validationResult.sanitizedValue;
    
    const userLine: TerminalLine = {
      id: `user-${Date.now()}`, 
      type: 'input', 
      content: sanitizedInput,
      timestamp: new Date().toISOString(), 
      user: 'user'
    };
    addLines(userLine);

    const updateStreamingLine = (lineId: string, content: string) => {
      setLines(lines.map((line: TerminalLine) => 
        line.id === lineId 
          ? { ...line, content } 
          : line
      ));
    };

    const showModal = (modalType: string, data?: unknown) => {
      switch (modalType) {
        case 'mcp-permissions':
          setMcpPermissionsModalOpen(true);
          break;
        case 'config':
          setConfigModalOpen(true);
          break;
        case 'help':
          setHelpModalOpen(true, (data as { commandName?: string })?.commandName);
          break;
        case 'image':
          setImageModalOpen(true);
          break;
        case 'ai-options':
          setAiOptionsModalOpen(true);
          break;
        case 'app-settings':
          setAppSettingsModalOpen(true);
          break;
        default:
          console.warn(`Unknown modal type: ${modalType}`);
      }
    };

    const context: CommandContext = {
      llmManager, imageManager, mcpManager, avatarController, storage: database,
      imageStorageManager, // Add imageStorageManager to context
      addLines, 
      setLoading,
      updateStreamingLine,
      currentTheme, 
      setTheme,
      openPersonalityEditor: (p) => openPersonalityEditorModal(database, p),
      openConfigModal: () => setConfigModalOpen(true),
      showModal,
      commandRegistry,
      activeConversationId: activeConversationId,
      setActiveConversationId: (id, loadMsgs) => setActiveConversationAndLoadMessages(database, id, loadMsgs),
      resetConversationAndTerminal: (db) => resetConversationAndTerminal(db), 
    };

    try {
      setLoading(true);
      const result = await commandRegistry.execute(sanitizedInput.trim(), context);
      
      if (result.lines && result.lines.length > 0) addLines(result.lines);

      if (result.success && sanitizedInput.trim().startsWith('/')) {
        const cmdName = sanitizedInput.trim().split(' ')[0];
        const silentCommands = ['/clear', '/conversation-new', '/conversation-load'];
        if (!silentCommands.includes(cmdName)) {
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

      if (result.shouldContinue === false) {
        const commandName = sanitizedInput.trim().toLowerCase().split(' ')[0];
        if (commandName === '/conversation-clearhist') {
          await clearTerminalForNewSession(); 
        }
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
    <ErrorBoundary>
      <CRTShaderWrapper enabled={shouldUseWebGLEffects} themeObject={themeObject}>
        <div className="App">
          {showBootSequence && (!shouldSkipBoot || forceShowBoot) && (
            <BootAnimation
              onComplete={handleBootSequenceComplete}
              onSkip={handleBootSequenceSkip}
              theme={themeObject}
              llmManager={llmManager}
              imageManager={imageManager}
              avatarController={avatarController}
              database={database}
            />
          )}
          
          {/* Handle automatic skip for boot sequence */}
          {showBootSequence && shouldSkipBoot && !forceShowBoot && (
            <div style={{ display: 'none' }}>
              {/* Immediately call skip handler when skipBoot is true and not forcing boot */}
              {(() => {
                setTimeout(handleBootSequenceSkip, 0);
                return null;
              })()}
            </div>
          )}
          
          {/* Theme Transition Overlay */}
          <div className={`theme-transition ${isThemeTransitioning ? 'active' : ''}`}></div>
          
          {!showBootSequence && (
            <>
              {shouldUseCSSOverlays && (
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
                <Suspense fallback={<ComponentLoader type="avatar" />}>
                  <TerminalAvatarPanel state={avatarState} theme={themeObject} />
                </Suspense>
              </div>
              <StatusBar
                theme={themeObject} currentTheme={currentTheme}
                llmManager={llmManager} imageManager={imageManager} storage={database}
                activeConversationId={activeConversationId}
                onThemeChange={handleThemeChange}
                onPersonalityClick={() => openPersonalityEditorModal(database)}
                onImageProviderClick={() => {
                  console.log("App.tsx: onImageProviderClick in StatusBar triggered. Attempting to open ImageGenerationModal.");
                  setImageModalOpen(true);
                }}
                onAIOptionsClick={() => setAiOptionsModalOpen(true)}
                onAppSettingsClick={() => setAppSettingsModalOpen(true)}
              />
            </>
          )}
        </div>
      </CRTShaderWrapper>

      <Suspense fallback={<ComponentLoader type="modal" />}>
        <PersonalityModal
          isOpen={personalityModalOpen} onClose={closePersonalityModal}
          onSave={(p) => savePersonalityInModal(database, p)}
          onDelete={(id) => deletePersonalityInModal(database, id)}
          editingPersonality={editingPersonalityInModal}
          allPersonalities={allPersonalitiesInModal}
          activePersonalityId={activePersonalityIdInModal}
          theme={themeObject}
        />
      </Suspense>

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

      <Suspense fallback={<ComponentLoader type="modal" />}>
        <ImageGenerationModal
          isOpen={imageModalOpen}
          onClose={() => {
            console.log("App.tsx: Closing ImageGenerationModal.");
            setImageModalOpen(false);
          }}
          imageManager={imageManager}
          avatarController={avatarController}
          storage={database} // Pass database for potential settings persistence
          theme={themeObject}
        />
      </Suspense>

      <Suspense fallback={<ComponentLoader type="modal" />}>
        <AIOptionsModal
          isOpen={aiOptionsModalOpen}
          onClose={() => setAiOptionsModalOpen(false)}
          storage={database}
          llmManager={llmManager}
        />
      </Suspense>

      <Suspense fallback={<ComponentLoader type="modal" />}>
        <AppSettingsModal
          isOpen={appSettingsModalOpen}
          onClose={() => setAppSettingsModalOpen(false)}
          storage={database}
          theme={themeObject}
        />
      </Suspense>

      <Suspense fallback={<ComponentLoader type="modal" />}>
        <MCPPermissionsModal
          isOpen={mcpPermissionsModalOpen}
          onClose={() => setMcpPermissionsModalOpen(false)}
          mcpManager={mcpManager}
          onPermissionsChange={(permissions) => {
            // Handle permissions changes - store them in database or localStorage
            console.log('MCP permissions updated:', permissions);
            setMcpPermissionsModalOpen(false);
          }}
        />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
