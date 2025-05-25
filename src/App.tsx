import { useState, useEffect, useMemo } from 'react';
import { TerminalDisplay, type TerminalLine } from './terminal/TerminalDisplay';
import { AvatarDisplay } from './avatar/AvatarDisplay';
import { PersonalityModal } from './components/PersonalityModal';
import { StatusBar } from './components/StatusBar';
import { getTheme } from './terminal/themes';
import { config } from './config/env';
import { LLMProviderManager } from './providers/llm/manager';
import { ImageProviderManager } from './providers/image/manager';
import { AvatarController } from './avatar/AvatarController';
import { ClaudiaDatabase } from './storage';
import { createCommandRegistry, handleAIMessage, type CommandContext } from './commands';
import { DEFAULT_PERSONALITY, type Personality } from './types/personality';
import type { AvatarState } from './avatar/types';
import './App.css';

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
  const [editingPersonality, setEditingPersonality] = useState<Personality | null>(null);

  // Initialize providers and systems
  const llmManager = useMemo(() => new LLMProviderManager(), []);
  const imageManager = useMemo(() => new ImageProviderManager(), []);
  const database = useMemo(() => new ClaudiaDatabase(), []);
  const avatarController = useMemo(() => 
    new AvatarController(imageManager, database, setAvatarState), 
    [imageManager, database]
  );
  const commandRegistry = useMemo(() => createCommandRegistry(), []);

  const theme = getTheme(currentTheme);

  // Initialize system on mount
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        // Database is automatically initialized in constructor
        
        // Initialize default personality if it doesn't exist
        const existingDefault = database.getPersonality('default');
        if (!existingDefault) {
          database.savePersonality(DEFAULT_PERSONALITY);
          database.setActivePersonality('default');
        }
        
        // Try to initialize image provider if configured
        try {
          const replicateProvider = imageManager.getProvider('replicate');
          if (replicateProvider && replicateProvider.isConfigured()) {
            await imageManager.initializeProvider('replicate', {});
          }
        } catch (error) {
          console.warn('Image provider initialization failed:', error);
        }
        
        // Add initialization messages
        const initLines: TerminalLine[] = [
          {
            id: '1',
            type: 'system',
            content: '🤖 CLAUDIA AI TERMINAL COMPANION v2.0.0',
            timestamp: new Date().toISOString()
          },
          {
            id: '2',
            type: 'system',
            content: 'Initializing AI providers and avatar system...',
            timestamp: new Date().toISOString()
          },
          {
            id: '3',
            type: 'system',
            content: '✅ System initialized successfully!',
            timestamp: new Date().toISOString()
          },
          {
            id: '4',
            type: 'output',
            content: 'Hey there! I\'m Claudia, your AI companion! 🌟',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          },
          {
            id: '5',
            type: 'output',
            content: 'Use /commands starting with / or just talk to me naturally!',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          },
          {
            id: '6',
            type: 'output',
            content: 'Type /help to see what I can do, or just say hello! 😊',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }
        ];
        
        setLines(initLines);
        
        // Show avatar with a friendly greeting
        if (imageManager.getActiveProvider()) {
          await avatarController.executeCommands([{
            show: true,
            expression: 'happy',
            position: 'beside-text',
            action: 'wave'
          }]);
        }
        
      } catch (error) {
        console.error('System initialization error:', error);
        
        const errorLine: TerminalLine = {
          id: '3',
          type: 'error',
          content: `⚠️ Initialization warning: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        };
        
        const continueLines: TerminalLine[] = [
          errorLine,
          {
            id: '4',
            type: 'output',
            content: 'Hi! I\'m Claudia. Some features may be limited without API keys.',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          },
          {
            id: '5',
            type: 'output',
            content: 'Type /help to see available commands!',
            timestamp: new Date().toISOString(),
            user: 'claudia'
          }
        ];
        
        setLines(prev => [...prev, ...continueLines]);
      }
    };

    initializeSystem();
  }, [llmManager, imageManager, database, avatarController]);

  const addLines = (newLines: TerminalLine[]) => {
    setLines(prev => [...prev, newLines].flat());
  };

  // Personality modal handlers
  const openPersonalityEditor = (personality?: Personality | null) => {
    setEditingPersonality(personality || null);
    setPersonalityModalOpen(true);
  };

  const closePersonalityModal = () => {
    setPersonalityModalOpen(false);
    setEditingPersonality(null);
  };

  const savePersonality = (personality: Personality) => {
    database.savePersonality(personality);
    
    // Add success message
    const successLine: TerminalLine = {
      id: `personality-saved-${Date.now()}`,
      type: 'output',
      content: `🎭 Personality "${personality.name}" saved successfully!`,
      timestamp: new Date().toISOString(),
      user: 'claudia'
    };
    
    setLines(prev => [...prev, successLine]);
  };

  const handleInput = async (input: string) => {
    // Add user input to lines
    const userLine: TerminalLine = {
      id: `input-${Date.now()}`,
      type: 'input',
      content: input,
      timestamp: new Date().toISOString(),
      user: 'user'
    };

    setLines(prev => [...prev, userLine]);

    // Create command context
    const context: CommandContext = {
      llmManager,
      imageManager,
      avatarController,
      storage: database,
      addLines,
      setLoading: setIsLoading,
      currentTheme,
      setTheme: setCurrentTheme,
      openPersonalityEditor
    };

    try {
      setIsLoading(true);

      // Check if it's a command or AI message
      if (input.trim().startsWith('/')) {
        // Handle command
        const result = await commandRegistry.execute(input.trim(), context);
        
        if (result.lines && result.lines.length > 0) {
          setLines(prev => [...prev, ...result.lines!]);
        }
        
        // Handle special metadata actions
        if (result.metadata?.action === 'open_personality_editor') {
          const personalityId = result.metadata.personalityId as string;
          const personality = personalityId ? database.getPersonality(personalityId) : null;
          openPersonalityEditor(personality);
        }
        
        // Handle special cases
        if (result.shouldContinue === false && input.trim().toLowerCase().startsWith('/clear')) {
          // Clear command - reset lines to just the welcome message
          setLines([
            {
              id: `clear-${Date.now()}`,
              type: 'system',
              content: '🤖 CLAUDIA AI TERMINAL COMPANION v2.0.0',
              timestamp: new Date().toISOString()
            }
          ]);
        }
      } else {
        // Handle AI message
        const result = await handleAIMessage(input.trim(), context);
        
        if (result.lines && result.lines.length > 0) {
          setLines(prev => [...prev, ...result.lines!]);
        }
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
      
      setLines(prev => [...prev, errorLine]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App" style={{ position: 'relative', minHeight: '100vh', paddingBottom: '50px' }}>
      <TerminalDisplay
        theme={theme}
        lines={lines}
        onInput={handleInput}
        prompt=">"
        isLoading={isLoading}
        commandRegistry={commandRegistry} // Pass commandRegistry here
      />
      
      {/* Avatar Display */}
      <AvatarDisplay 
        state={avatarState} 
        className="claudia-avatar"
      />

      {/* Status Bar */}
      <StatusBar
        theme={theme}
        currentTheme={currentTheme}
        llmManager={llmManager}
        imageManager={imageManager}
        storage={database}
      />

      {/* Personality Modal */}
      <PersonalityModal
        isOpen={personalityModalOpen}
        onClose={closePersonalityModal}
        onSave={savePersonality}
        editingPersonality={editingPersonality}
      />
    </div>
  );
}

export default App;
