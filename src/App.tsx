import { useState, useEffect, useMemo, useRef } from 'react'; 
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
import type { AvatarState } from './avatar/types';
import './App.css';
import './styles/overlays.css'; 

const LAST_ACTIVE_CONVERSATION_ID_KEY = 'lastActiveConversationId';

const addLineWithDelay = (
  setLinesFunc: React.Dispatch<React.SetStateAction<TerminalLine[]>>,
  line: TerminalLine,
  delay: number
): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(() => {
      setLinesFunc(prev => [...prev, line]);
      resolve();
    }, delay);
  });
};


function App() {
  const [currentTheme, setCurrentTheme] = useState(config.defaultTheme);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>({
    visible: false,
    position: 'center',
    expression: 'neutral',
    pose: 'standing',
    action: 'idle',
    scale: 1.0,
    opacity: 1.0,
    isAnimating: false,
    lastUpdate: new Date().toISOString()
  });

  const [personalityModalOpen, setPersonalityModalOpen] = useState(false);
  const [editingPersonalityInModal, setEditingPersonalityInModal] = useState<Personality | null>(null);
  const [allPersonalitiesInModal, setAllPersonalitiesInModal] = useState<Personality[]>([]);
  const [activePersonalityIdInModal, setActivePersonalityIdInModal] = useState<string | null>(null);

  const [activeConversationId, _setActiveConversationId] = useState<string | null>(null);
  const activeConversationIdRef = useRef(activeConversationId); // Ref to hold current activeConversationId for async operations

  const effectRan = useRef(false); 

  const llmManager = useMemo(() => new LLMProviderManager(), []);
  const imageManager = useMemo(() => new ImageProviderManager(), []);
  const database = useMemo(() => new ClaudiaDatabase(), []);
  const avatarController = useMemo(() => 
    new AvatarController(imageManager, database, setAvatarState), 
    [imageManager, database]
  );
  const commandRegistry = useMemo(() => createCommandRegistry(), []);

  const themeObject: TerminalTheme = getTheme(currentTheme); 

  const setActiveConversationAndPersist = async (id: string | null, loadMessages = true) => {
    _setActiveConversationId(id);
    activeConversationIdRef.current = id; // Keep ref in sync
    if (id) {
      await database.setSetting(LAST_ACTIVE_CONVERSATION_ID_KEY, id);
      if (loadMessages) {
        const history = await database.getMessages(id, config.conversationHistoryLength + 20);
        const newLines = history.map(m => ({
          id: `hist-${m.id}-${m.timestamp}`, type: m.role === 'user' ? 'input' : 'output',
          content: m.content, timestamp: m.timestamp,
          user: m.role === 'user' ? 'user' : 'claudia'
        } as TerminalLine));
        setLines(newLines); // Replace current lines with the loaded conversation
      }
    } else {
      await database.setSetting(LAST_ACTIVE_CONVERSATION_ID_KEY, null); // Clear if no active convo
      if (loadMessages) setLines([]); // Clear lines if no active convo
    }
  };


  useEffect(() => {
    if (effectRan.current === true && process.env.NODE_ENV === 'development') {
      return;
    }

    const initializeSystem = async () => {
      let conversationRestored = false;
      try {        
        const activeP = await database.getActivePersonality();
        if (!activeP) {
            const existingDefault = await database.getPersonality('default');
            if (!existingDefault) {
              await database.savePersonality(DEFAULT_PERSONALITY);
            }
            await database.setActivePersonality('default');
        }

        let currentConvIdSetting = await database.getSetting<string>(LAST_ACTIVE_CONVERSATION_ID_KEY);
        if (currentConvIdSetting) {
          const conv = await database.getConversation(currentConvIdSetting);
          if (conv) {
            await setActiveConversationAndPersist(conv.id, true);
            conversationRestored = true;
          } else {
            currentConvIdSetting = null; 
          }
        }
        
        if (!currentConvIdSetting) {
          const newConv = await database.createConversation({ title: `Chat Session - ${new Date().toLocaleString()}` });
          await setActiveConversationAndPersist(newConv.id, true); // Will also set lines to empty
        }
        
        try {
          const imageProvider = imageManager.getProvider(config.defaultImageProvider);
          if (imageProvider && imageProvider.isConfigured()) {
            await imageManager.initializeProvider(config.defaultImageProvider, {});
          }
        } catch (error) {
          console.warn('Image provider initialization failed:', error);
        }
        
        // Only run boot sequence if lines are currently empty (i.e., new session or empty restored convo)
        if (lines.length === 0 && !conversationRestored) { // Check lines.length after potential load
          await addLineWithDelay(setLines, { id: 'boot-1', type: 'system', content: 'INITIALIZING CLAUDIA OS...', timestamp: new Date().toISOString() }, 500);
          await addLineWithDelay(setLines, { id: 'boot-2', type: 'system', content: 'BOOT SEQUENCE v2.0.0', timestamp: new Date().toISOString() }, 500);
          await addLineWithDelay(setLines, { id: 'boot-3', type: 'system', content: 'MEMORY CHECK................PASS', timestamp: new Date().toISOString() }, 700);
          await addLineWithDelay(setLines, { id: 'boot-4', type: 'system', content: 'AI CORE LINK ESTABLISHED....ACTIVE', timestamp: new Date().toISOString() }, 800);
          await addLineWithDelay(setLines, { id: 'boot-5', type: 'system', content: 'AVATAR MODULE..............ONLINE', timestamp: new Date().toISOString() }, 600);
          await addLineWithDelay(setLines, { id: 'boot-6', type: 'system', content: 'PERSONALITY MATRIX.........LOADED', timestamp: new Date().toISOString() }, 700);
          await addLineWithDelay(setLines, { id: 'boot-7', type: 'system', content: 'SYSTEM ONLINE. ALL MODULES LOADED.', timestamp: new Date().toISOString() }, 500);
          await addLineWithDelay(setLines, { id: 'boot-8', type: 'output', content: 'Hey there! I\'m Claudia, your AI companion! 🌟 Ready to assist!', timestamp: new Date().toISOString(), user: 'claudia' }, 1000);
          await addLineWithDelay(setLines, { id: 'boot-9', type: 'output', content: 'Type /help to see available commands, or just start chatting!', timestamp: new Date().toISOString(), user: 'claudia' }, 500);
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
          content: `⚠️ System Warning: ${error instanceof Error ? error.message : 'Unknown error during initialization.'}`,
          timestamp: new Date().toISOString()
        };
        setLines(prev => [...prev, errorLine]);
      }
    };

    initializeSystem();

    return () => {
      effectRan.current = true;
    };
  }, [llmManager, imageManager, database, avatarController]);

  const addLinesToDisplay = (newLines: TerminalLine[]) => {
    setLines(prev => [...prev, ...newLines].flat());
  };

  const openPersonalityEditor = async (personalityToEdit?: Personality | null | undefined) => {
    const allPs = await database.getAllPersonalities();
    const activeP = await database.getActivePersonality();
    setAllPersonalitiesInModal(allPs);
    setActivePersonalityIdInModal(activeP ? activeP.id : null);
    setEditingPersonalityInModal(personalityToEdit === undefined ? (activeP || null) : personalityToEdit);
    setPersonalityModalOpen(true);
  };

  const closePersonalityModal = () => {
    setPersonalityModalOpen(false);
    setEditingPersonalityInModal(null); 
  };

  const savePersonality = async (personality: Personality) => {
    const isUpdating = !!(await database.getPersonality(personality.id));
    await database.savePersonality(personality);
    if (personality.isDefault) await database.setActivePersonality(personality.id);
    addLinesToDisplay([{
      id: `personality-saved-${Date.now()}`, type: 'output',
      content: `🎭 Personality "${personality.name}" ${isUpdating ? 'updated' : 'created'} successfully!`,
      timestamp: new Date().toISOString(), user: 'claudia'
    }]);
    const allPs = await database.getAllPersonalities();
    const activeP = await database.getActivePersonality();
    setAllPersonalitiesInModal(allPs);
    setActivePersonalityIdInModal(activeP ? activeP.id : null);
    setEditingPersonalityInModal(personality); 
  };

  const deletePersonalityInModal = async (personalityId: string): Promise<void> => {
    const pToDelete = await database.getPersonality(personalityId);
    if (!pToDelete) {
      addLinesToDisplay([{ id: `del-err-${Date.now()}`, type: 'error', content: `Personality ${personalityId} not found.`, timestamp: new Date().toISOString(), user: 'claudia' }]);
      return;
    }
    if (pToDelete.isDefault) {
      addLinesToDisplay([{ id: `del-err-${Date.now()}`, type: 'error', content: `Cannot delete the default personality.`, timestamp: new Date().toISOString(), user: 'claudia' }]);
      return;
    }
    const activeP = await database.getActivePersonality();
    if (activeP && activeP.id === personalityId) {
      await database.setActivePersonality(DEFAULT_PERSONALITY.id); 
      addLinesToDisplay([{ id: `del-switch-${Date.now()}`, type: 'system', content: `Switched to default personality as active one was deleted.`, timestamp: new Date().toISOString(), user: 'claudia' }]);
    }
    await database.deletePersonality(personalityId);
    addLinesToDisplay([{ id: `del-succ-${Date.now()}`, type: 'output', content: `🗑️ Personality "${pToDelete.name}" deleted.`, timestamp: new Date().toISOString(), user: 'claudia' }]);
    const allPs = await database.getAllPersonalities();
    const newActiveP = await database.getActivePersonality();
    setAllPersonalitiesInModal(allPs);
    setActivePersonalityIdInModal(newActiveP ? newActiveP.id : null);
    setEditingPersonalityInModal(newActiveP || null); 
  };

  const handleThemeStatusClick = () => handleInput("/themes");

  const handleInput = async (input: string) => {
    const userLine: TerminalLine = {
      id: `user-${Date.now()}`, type: 'input', content: input,
      timestamp: new Date().toISOString(), user: 'user'
    };
    addLinesToDisplay([userLine]);

    const currentActiveConvId = activeConversationIdRef.current; // Use ref for current value

    if (currentActiveConvId && !input.startsWith('/')) { 
      await database.addMessage({
        conversationId: currentActiveConvId, role: 'user',
        content: userLine.content, timestamp: userLine.timestamp,
      });
    } else if (currentActiveConvId && input.startsWith('/ask')) { 
        await database.addMessage({
            conversationId: currentActiveConvId, role: 'user',
            content: input.substring(input.indexOf(' ') + 1), 
            timestamp: userLine.timestamp,
        });
    }

    const context: CommandContext = {
      llmManager, imageManager, avatarController, storage: database,
      addLines: addLinesToDisplay, setLoading: setIsLoading, currentTheme,
      setTheme: setCurrentTheme, openPersonalityEditor, commandRegistry,
      activeConversationId: currentActiveConvId, 
      setActiveConversationId: setActiveConversationAndPersist,
    };

    try {
      setIsLoading(true);
      const result = await commandRegistry.execute(input.trim(), context);
      if (result.lines && result.lines.length > 0) addLinesToDisplay(result.lines); 
      
      if (result.shouldContinue === false && input.trim().toLowerCase().startsWith('/clear') || (input.trim().toLowerCase().startsWith('/conversation') && (input.includes('new') || input.includes('load') || input.includes('clearhist')))) {
        // For /clear, /conv new, /conv load, /conv clearhist, the lines are already set by setActiveConversationAndPersist or special handling
        if (input.trim().toLowerCase().startsWith('/clear')) {
            setLines([ 
              { id: `clear-${Date.now()}`, type: 'system', content: 'INITIALIZING CLAUDIA OS...', timestamp: new Date().toISOString()}
            ]);
            await addLineWithDelay(setLines, { id: 'boot-re1', type: 'system', content: 'SYSTEM ONLINE. ALL MODULES LOADED.', timestamp: new Date().toISOString() }, 300);
            await addLineWithDelay(setLines, { id: 'boot-re2', type: 'output', content: 'Ready for new commands!', timestamp: new Date().toISOString(), user: 'claudia' }, 300);
        }
      }
    } catch (error) {
      console.error('Input handling error:', error);
      const errorLine: TerminalLine = {
        id: `error-${Date.now()}`, type: 'error',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(), user: 'claudia'
      };
      addLinesToDisplay([errorLine]);
      if (currentActiveConvId) { 
          await database.addMessage({
              conversationId: currentActiveConvId, role: 'assistant',
              content: `System Error: ${errorLine.content}`, timestamp: errorLine.timestamp
          });
      }
    } finally {
      setIsLoading(false);
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
        onPersonalityClick={() => openPersonalityEditor()}
      />
      {personalityModalOpen && ( 
        <PersonalityModal
          isOpen={personalityModalOpen} onClose={closePersonalityModal}
          onSave={savePersonality} onDelete={deletePersonalityInModal}
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
