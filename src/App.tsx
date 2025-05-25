import { useState, useEffect, useMemo } from 'react';
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

  // Personality modal state
  const [personalityModalOpen, setPersonalityModalOpen] = useState(false);
  const [editingPersonalityInModal, setEditingPersonalityInModal] = useState<Personality | null>(null);
  const [allPersonalitiesInModal, setAllPersonalitiesInModal] = useState<Personality[]>([]);
  const [activePersonalityIdInModal, setActivePersonalityIdInModal] = useState<string | null>(null);

  // Active Conversation State
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);


  // Initialize providers and systems
  const llmManager = useMemo(() => new LLMProviderManager(), []);
  const imageManager = useMemo(() => new ImageProviderManager(), []);
  const database = useMemo(() => new ClaudiaDatabase(), []);
  const avatarController = useMemo(() => 
    new AvatarController(imageManager, database, setAvatarState), 
    [imageManager, database]
  );
  const commandRegistry = useMemo(() => createCommandRegistry(), []);

  const themeObject: TerminalTheme = getTheme(currentTheme); 

  // Initialize system on mount
  useEffect(() => {
    const initializeSystem = async () => {
      let initialLines: TerminalLine[] = [];
      try {        
        const activeP = await database.getActivePersonality();
        if (!activeP) {
            const existingDefault = await database.getPersonality('default');
            if (!existingDefault) {
              await database.savePersonality(DEFAULT_PERSONALITY);
            }
            await database.setActivePersonality('default');
        }

        let currentConvId = await database.getSetting<string>(LAST_ACTIVE_CONVERSATION_ID_KEY);
        let conversationRestored = false;
        if (currentConvId) {
          const conv = await database.getConversation(currentConvId);
          if (conv) {
            setActiveConversationId(conv.id);
            const history = await database.getMessages(conv.id, config.conversationHistoryLength + 20); // Load a bit more for UI scrollback
            initialLines = history.map(m => ({
                id: `hist-${m.id}-${m.timestamp}`, 
                type: m.role === 'user' ? 'input' : 'output',
                content: m.content,
                timestamp: m.timestamp,
                user: m.role === 'user' ? 'user' : 'claudia'
            } as TerminalLine));
            conversationRestored = true;
          } else {
            currentConvId = null; 
          }
        }
        
        if (!currentConvId) {
          const newConv = await database.createConversation({ title: `Chat Session - ${new Date().toLocaleString()}` });
          setActiveConversationId(newConv.id);
          await database.setSetting(LAST_ACTIVE_CONVERSATION_ID_KEY, newConv.id);
        }
        
        try {
          const imageProvider = imageManager.getProvider(config.defaultImageProvider);
          if (imageProvider && imageProvider.isConfigured()) {
            await imageManager.initializeProvider(config.defaultImageProvider, {});
          }
        } catch (error) {
          console.warn('Image provider initialization failed:', error);
        }
        
        if (!conversationRestored || initialLines.length === 0) {
          const greetingLines: TerminalLine[] = [
            { id: 'init-1', type: 'system', content: '🤖 CLAUDIA AI TERMINAL COMPANION v2.0.0', timestamp: new Date().toISOString() },
            { id: 'init-2', type: 'system', content: 'Booting up AI core systems... Please wait.', timestamp: new Date().toISOString() },
            { id: 'init-3', type: 'system', content: '✅ System Online. All modules loaded.', timestamp: new Date().toISOString() },
            { id: 'init-4', type: 'output', content: 'Hey there! I\'m Claudia, your AI companion! 🌟 Ready to assist!', timestamp: new Date().toISOString(), user: 'claudia' },
            { id: 'init-5', type: 'output', content: 'Type /help to see available commands, or just start chatting!', timestamp: new Date().toISOString(), user: 'claudia' }
          ];
          initialLines = [...initialLines, ...greetingLines];
        }
        setLines(initialLines);
        
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
  }, [llmManager, imageManager, database, avatarController]);

  const addLinesToDisplay = (newLines: TerminalLine[]) => {
    setLines(prev => [...prev, ...newLines].flat());
  };

  const openPersonalityEditor = async (personalityToEdit?: Personality | null | undefined) => {
    const allPs = await database.getAllPersonalities();
    const activeP = await database.getActivePersonality();
    
    setAllPersonalitiesInModal(allPs);
    setActivePersonalityIdInModal(activeP ? activeP.id : null);

    if (personalityToEdit === undefined) { 
      setEditingPersonalityInModal(activeP || null); 
    } else { 
      setEditingPersonalityInModal(personalityToEdit);
    }
    setPersonalityModalOpen(true);
  };

  const closePersonalityModal = () => {
    setPersonalityModalOpen(false);
    setEditingPersonalityInModal(null); 
  };

  const savePersonality = async (personality: Personality) => {
    const isUpdating = !!(await database.getPersonality(personality.id));
    await database.savePersonality(personality);

    if (personality.isDefault) { 
        await database.setActivePersonality(personality.id);
    }
    
    const successLine: TerminalLine = {
      id: `personality-saved-${Date.now()}`,
      type: 'output',
      content: `🎭 Personality "${personality.name}" ${isUpdating ? 'updated' : 'created'} successfully!`,
      timestamp: new Date().toISOString(),
      user: 'claudia'
    };
    
    addLinesToDisplay([successLine]);
    // Note: This message is not saved to DB as it's a system feedback, not part of conversation.
    
    const allPs = await database.getAllPersonalities();
    const activeP = await database.getActivePersonality();
    setAllPersonalitiesInModal(allPs);
    setActivePersonalityIdInModal(activeP ? activeP.id : null);
    setEditingPersonalityInModal(personality); 
  };

  const deletePersonalityInModal = async (personalityId: string): Promise<void> => {
    const personalityToDelete = await database.getPersonality(personalityId);
    if (!personalityToDelete) {
      addLinesToDisplay([{ id: `del-err-${Date.now()}`, type: 'error', content: `Personality ${personalityId} not found.`, timestamp: new Date().toISOString(), user: 'claudia' }]);
      return;
    }
    if (personalityToDelete.isDefault) {
      addLinesToDisplay([{ id: `del-err-${Date.now()}`, type: 'error', content: `Cannot delete the default personality.`, timestamp: new Date().toISOString(), user: 'claudia' }]);
      return;
    }
    const activeP = await database.getActivePersonality();
    if (activeP && activeP.id === personalityId) {
      await database.setActivePersonality(DEFAULT_PERSONALITY.id); 
      addLinesToDisplay([{ id: `del-switch-${Date.now()}`, type: 'system', content: `Switched to default personality as active one was deleted.`, timestamp: new Date().toISOString(), user: 'claudia' }]);
    }

    await database.deletePersonality(personalityId);
    addLinesToDisplay([{ id: `del-succ-${Date.now()}`, type: 'output', content: `🗑️ Personality "${personalityToDelete.name}" deleted.`, timestamp: new Date().toISOString(), user: 'claudia' }]);
    
    const allPs = await database.getAllPersonalities();
    const newActiveP = await database.getActivePersonality();
    setAllPersonalitiesInModal(allPs);
    setActivePersonalityIdInModal(newActiveP ? newActiveP.id : null);
    setEditingPersonalityInModal(newActiveP || null); 
  };


  const handleInput = async (input: string) => {
    const userLine: TerminalLine = {
      id: `user-${Date.now()}`,
      type: 'input',
      content: input,
      timestamp: new Date().toISOString(),
      user: 'user'
    };
    addLinesToDisplay([userLine]);

    if (activeConversationId && !input.startsWith('/')) { // Save non-command user messages
      await database.addMessage({
        conversationId: activeConversationId,
        role: 'user',
        content: userLine.content,
        timestamp: userLine.timestamp,
      });
    } else if (activeConversationId && input.startsWith('/ask')) { // Save /ask command's question part as user message
        await database.addMessage({
            conversationId: activeConversationId,
            role: 'user',
            content: input.substring(input.indexOf(' ') + 1), // content of /ask
            timestamp: userLine.timestamp,
        });
    }


    const context: CommandContext = {
      llmManager,
      imageManager,
      avatarController,
      storage: database,
      addLines: addLinesToDisplay, 
      setLoading: setIsLoading,
      currentTheme,
      setTheme: setCurrentTheme,
      openPersonalityEditor,
      commandRegistry: commandRegistry,
      activeConversationId
    };

    try {
      setIsLoading(true);
      const result = await commandRegistry.execute(input.trim(), context);
        
      if (result.lines && result.lines.length > 0) {
        addLinesToDisplay(result.lines); // AI responses are saved by CommandRegistry/ai.ts
      }
      
      if (result.metadata?.action === 'open_personality_editor') {
        // Handled by command directly calling openPersonalityEditor
      }
      
      if (result.shouldContinue === false && input.trim().toLowerCase().startsWith('/clear')) {
        setLines([ 
          {
            id: `clear-${Date.now()}`,
            type: 'system',
            content: '🤖 CLAUDIA AI TERMINAL COMPANION v2.0.0',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Input handling error:', error);
      const errorLine: TerminalLine = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      };
      addLinesToDisplay([errorLine]);
      if (activeConversationId) { // Save error as an assistant message
          await database.addMessage({
              conversationId: activeConversationId,
              role: 'assistant',
              content: `System Error: ${errorLine.content}`,
              timestamp: errorLine.timestamp
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
        theme={themeObject}
        lines={lines}
        onInput={handleInput}
        prompt=">"
        isLoading={isLoading}
        commandRegistry={commandRegistry}
      />
      
      <AvatarDisplay 
        state={avatarState} 
        className="claudia-avatar"
      />

      <StatusBar
        theme={themeObject}
        currentTheme={currentTheme}
        llmManager={llmManager}
        imageManager={imageManager}
        storage={database}
      />

      {personalityModalOpen && ( 
        <PersonalityModal
          isOpen={personalityModalOpen}
          onClose={closePersonalityModal}
          onSave={savePersonality}
          onDelete={deletePersonalityInModal}
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
