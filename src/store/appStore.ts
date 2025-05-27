import { create } from 'zustand';
import { type TerminalLine } from '../terminal/TerminalDisplay';
import type { AvatarState } from '../avatar/types';
import type { Personality } from '../types/personality';
import { config as globalAppConfig } from '../config/env'; // Renamed to avoid conflict with state 'config'
import { type ClaudiaDatabase } from '../storage';
import { type StorageService } from '../storage/types';
import { DEFAULT_PERSONALITY } from '../types/personality';
import { SettingsManager } from '../services/settingsManager';

// ConfigSettings type - will be imported from components
export interface ConfigSettings {
  // Boot Sequence
  enhancedBoot: boolean;
  bootSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  glitchIntensity: 'off' | 'subtle' | 'medium' | 'heavy';
  asciiLogo: boolean;
  strangeMessages: boolean;
  
  // Visual Effects
  screenFlicker: boolean;
  flickerIntensity: number;
  scanLines: 'off' | 'subtle' | 'heavy';
  terminalBreathing: boolean;
  visualArtifacts: boolean;
  progressiveClarity: boolean;
  
  // Atmosphere
  crtGlow: boolean;
  backgroundAnimation: boolean; // This was for terminal breathing, might be repurposed or removed if app background has animation
  colorShifts: boolean;
  staticOverlay: boolean;
  screenCurvature: boolean; // Added for screen curvature effect
  enableAppBackground: boolean; // Toggle for the entire app background
  appBackgroundOverride?: string; // User-defined CSS background string
  enableCRTEffect?: boolean; // New setting for the full-screen CRT shader
  useMetaPromptingForImages: boolean; // Enable AI-powered image prompting
  
  // Performance
  reducedAnimations: boolean;
  highContrast: boolean;
}

export const defaultConfig: ConfigSettings = {
  // Boot Sequence
  enhancedBoot: true,
  bootSpeed: 'normal',
  glitchIntensity: 'subtle',
  asciiLogo: true,
  strangeMessages: true,
  
  // Visual Effects
  screenFlicker: true,
  flickerIntensity: 0.3,
  scanLines: 'subtle',
  terminalBreathing: true,
  visualArtifacts: true,
  progressiveClarity: true,
  
  // Atmosphere
  crtGlow: true,
  backgroundAnimation: true, // Keeping for now, relates to terminal breathing
  colorShifts: true,
  staticOverlay: false,
  screenCurvature: false, // Default to false, themes or user can enable
  enableAppBackground: true, // App background enabled by default
  appBackgroundOverride: undefined, // No override by default
  enableCRTEffect: true, // Enable CRT Shader by default, can be set to false if it was causing issues
  useMetaPromptingForImages: false, // Default to false for now
  
  // Performance
  reducedAnimations: false,
  highContrast: false,
};

const LAST_ACTIVE_CONVERSATION_ID_KEY = 'lastActiveConversationId';

export interface AppState {
  // Core application state
  currentTheme: string;
  isThemeTransitioning: boolean;
  lines: TerminalLine[];
  isLoading: boolean;
  avatarState: AvatarState;
  activeConversationId: string | null;
  
  // Application configuration
  config: ConfigSettings;
  configLoaded: boolean;
  
  // Modal states
  personalityModalOpen: boolean;
  configModalOpen: boolean;
  helpModalOpen: boolean;
  helpModalCommandName: string | null;
  imageModalOpen: boolean;
  aiOptionsModalOpen: boolean;
  appSettingsModalOpen: boolean;
  mcpPermissionsModalOpen: boolean;
  showBootSequence: boolean;
  
  // Personality modal state
  editingPersonalityInModal: Personality | null;
  allPersonalitiesInModal: Personality[];
  activePersonalityIdInModal: string | null;
  
  // Initialization state
  isInitialized: boolean;
  
  // Core actions
  setTheme: (theme: string) => void;
  addLines: (newLines: TerminalLine | TerminalLine[]) => void;
  setLines: (lines: TerminalLine[]) => void;
  setLoading: (loading: boolean) => void;
  setAvatarState: (partialState: Partial<AvatarState> | ((prevState: AvatarState) => Partial<AvatarState>)) => void;
  saveAvatarState: () => void;
  restoreAvatarState: () => Promise<void>;
  
  // Config actions
  setConfig: (config: ConfigSettings) => void;
  loadConfig: () => void;
  
  // Settings manager
  settingsManager: SettingsManager | null;
  initializeSettingsManager: (storage: StorageService) => void;
  
  // Modal actions
  setConfigModalOpen: (open: boolean) => void;
  setHelpModalOpen: (open: boolean, commandName?: string | null) => void;
  setImageModalOpen: (open: boolean) => void;
  setAiOptionsModalOpen: (open: boolean) => void;
  setAppSettingsModalOpen: (open: boolean) => void;
  setMcpPermissionsModalOpen: (open: boolean) => void;
  setShowBootSequence: (show: boolean) => void;
  
  // Initialization actions
  setIsInitialized: (initialized: boolean) => void;
  
  openPersonalityEditorModal: (db: ClaudiaDatabase, personalityToEdit?: Personality | null) => Promise<void>;
  closePersonalityModal: () => void;
  savePersonalityInModal: (db: ClaudiaDatabase, personality: Personality) => Promise<void>;
  deletePersonalityInModal: (db: ClaudiaDatabase, personalityId: string) => Promise<void>;
  
  // Combined action for setting active conversation and loading messages
  setActiveConversationAndLoadMessages: (db: StorageService, id: string | null, loadMessages?: boolean) => Promise<void>;
  
  loadConversationMessages: (db: StorageService, id: string) => Promise<void>; // Kept if direct loading is needed
  initializeActiveConversation: (db: ClaudiaDatabase) => Promise<{ activeConvId: string | null, playBootAnimation: boolean }>;
  clearTerminalForNewSession: () => Promise<void>;
  resetConversationAndTerminal: (db: StorageService) => Promise<void>; // New action
}

export const useAppStore = create<AppState>((set, get) => ({
  // Core application state
  currentTheme: globalAppConfig.defaultTheme, // Use renamed import
  isThemeTransitioning: false,
  lines: [],
  isLoading: false,
  avatarState: {
    visible: false,
    expression: 'neutral',
    pose: 'standing',
    action: 'idle',
    scale: 1.0,
    opacity: 1.0,
    isAnimating: false,
    isGenerating: false,
    hasError: false,
    lastUpdate: new Date().toISOString(),
  },
  activeConversationId: null,
  
  // Application configuration
  config: defaultConfig,
  configLoaded: false,
  
  // Settings manager
  settingsManager: null,
  
  // Modal states
  personalityModalOpen: false,
  configModalOpen: false,
  helpModalOpen: false,
  helpModalCommandName: null,
  imageModalOpen: false,
  aiOptionsModalOpen: false,
  appSettingsModalOpen: false,
  mcpPermissionsModalOpen: false,
  showBootSequence: false,
  
  // Personality modal state
  editingPersonalityInModal: null,
  allPersonalitiesInModal: [],
  activePersonalityIdInModal: null,
  
  // Initialization state
  isInitialized: false,

  // Core actions
  setTheme: (theme) => {
    set({ isThemeTransitioning: true });
    setTimeout(() => {
      set({ currentTheme: theme });
      setTimeout(() => {
        set({ isThemeTransitioning: false });
      }, 100);
    }, 150);
  },
  addLines: (newLines) => {
    const linesToAdd = Array.isArray(newLines) ? newLines : [newLines];
    set(state => ({ lines: [...state.lines, ...linesToAdd].flat() }));
  },
  setLines: (lines) => set({ lines }),
  setLoading: (loading) => set({ isLoading: loading }),
  
  // Config actions
  setConfig: async (newConfig) => { // Renamed parameter to avoid conflict
    const { settingsManager } = get();
    set({ config: newConfig });
    if (settingsManager) {
      await settingsManager.setAppConfig(newConfig);
    } else {
      // Fallback to localStorage if settings manager not initialized
      localStorage.setItem('claudia-config', JSON.stringify(newConfig));
    }
  },
  loadConfig: async () => {
    const { settingsManager } = get();
    try {
      let savedConfig = null;
      if (settingsManager) {
        savedConfig = await settingsManager.getAppConfig();
      } else {
        // Fallback to localStorage
        const saved = localStorage.getItem('claudia-config');
        savedConfig = saved ? JSON.parse(saved) : null;
      }
      
      if (savedConfig) {
        // Merge with defaultConfig to ensure all keys are present
        set({ config: { ...defaultConfig, ...savedConfig } });
      } else {
        set({ config: defaultConfig });
      }
    } catch (error) {
      console.warn('Failed to load saved config:', error);
      set({ config: defaultConfig }); // Fallback to default on error
    }
    set({ configLoaded: true });
  },
  
  // Settings manager
  initializeSettingsManager: (storage) => {
    const settingsManager = new SettingsManager(storage);
    set({ settingsManager });
    
    // Run migration on first initialization
    settingsManager.migrateOldSettings().catch(error => {
      console.warn('Settings migration failed:', error);
    });
  },
  
  // Modal actions
  setConfigModalOpen: (open) => set({ configModalOpen: open }),
  setHelpModalOpen: (open, commandName = null) => set({ 
    helpModalOpen: open, 
    helpModalCommandName: commandName 
  }),
  setImageModalOpen: (open) => set({ imageModalOpen: open }),
  setAiOptionsModalOpen: (open) => set({ aiOptionsModalOpen: open }),
  setAppSettingsModalOpen: (open) => set({ appSettingsModalOpen: open }),
  setMcpPermissionsModalOpen: (open) => set({ mcpPermissionsModalOpen: open }),
  setShowBootSequence: (show) => set({ showBootSequence: show }),
  
  // Initialization actions
  setIsInitialized: (initialized) => set({ isInitialized: initialized }),
  setAvatarState: (partialState) => {
    const newState = typeof partialState === 'function' 
      ? (state: AppState) => {
          const newAvatarState = { ...state.avatarState, ...partialState(state.avatarState) };
          localStorage.setItem('claudia-avatar-state', JSON.stringify({
            visible: newAvatarState.visible,
            expression: newAvatarState.expression,
            pose: newAvatarState.pose,
            action: newAvatarState.action,
            imageUrl: newAvatarState.imageUrl,
            lastUpdate: newAvatarState.lastUpdate
          }));
          return { avatarState: newAvatarState };
        }
      : (state: AppState) => {
          const newAvatarState = { ...state.avatarState, ...partialState };
          localStorage.setItem('claudia-avatar-state', JSON.stringify({
            visible: newAvatarState.visible,
            expression: newAvatarState.expression,
            pose: newAvatarState.pose,
            action: newAvatarState.action,
            imageUrl: newAvatarState.imageUrl,
            lastUpdate: newAvatarState.lastUpdate
          }));
          return { avatarState: newAvatarState };
        };
    set(newState);
  },
  
  saveAvatarState: () => {
    const state = get().avatarState;
    localStorage.setItem('claudia-avatar-state', JSON.stringify({
      visible: state.visible,
      expression: state.expression,
      pose: state.pose,
      action: state.action,
      imageUrl: state.imageUrl,
      lastUpdate: state.lastUpdate
    }));
  },
  
  restoreAvatarState: async () => {
    try {
      const saved = localStorage.getItem('claudia-avatar-state');
      if (saved) {
        const savedState = JSON.parse(saved);
        set(state => ({
          avatarState: {
            ...state.avatarState,
            visible: savedState.visible || false,
            expression: savedState.expression || 'neutral',
            pose: savedState.pose || 'standing',
            action: savedState.action || 'idle',
            imageUrl: savedState.imageUrl,
            lastUpdate: savedState.lastUpdate || new Date().toISOString()
          }
        }));
        console.log('✅ Avatar state restored from localStorage');
      }
    } catch (error) {
      console.warn('Failed to restore avatar state:', error);
    }
  },

  openPersonalityEditorModal: async (db, personalityToEdit) => {
    const allPs = await db.getAllPersonalities();
    const activeP = await db.getActivePersonality();
    set({
      allPersonalitiesInModal: allPs,
      activePersonalityIdInModal: activeP ? activeP.id : null,
      editingPersonalityInModal: personalityToEdit === undefined ? (activeP || null) : personalityToEdit,
      personalityModalOpen: true,
    });
  },
  closePersonalityModal: () => set({ personalityModalOpen: false, editingPersonalityInModal: null }),
  savePersonalityInModal: async (db, personality) => {
    const isUpdating = !!(await db.getPersonality(personality.id));
    await db.savePersonality(personality);
    if (personality.isDefault) await db.setActivePersonality(personality.id);
    
    get().addLines({
      id: `personality-saved-${Date.now()}`, type: 'output',
      content: `Personality: "${personality.name}" ${isUpdating ? 'updated' : 'created'} successfully!`,
      timestamp: new Date().toISOString(), user: 'claudia'
    });
    
    const allPs = await db.getAllPersonalities();
    const activeP = await db.getActivePersonality();
    set({
      allPersonalitiesInModal: allPs,
      activePersonalityIdInModal: activeP ? activeP.id : null,
      editingPersonalityInModal: personality, 
    });
  },
  deletePersonalityInModal: async (db, personalityId) => {
    const pToDelete = await db.getPersonality(personalityId);
    if (!pToDelete) {
      get().addLines({ id: `del-err-${Date.now()}`, type: 'error', content: `Error: Personality ${personalityId} not found.`, timestamp: new Date().toISOString(), user: 'claudia' });
      return;
    }
    if (pToDelete.isDefault) {
      get().addLines({ id: `del-err-${Date.now()}`, type: 'error', content: `Error: Cannot delete the default personality.`, timestamp: new Date().toISOString(), user: 'claudia' });
      return;
    }
    const activeP = await db.getActivePersonality();
    if (activeP && activeP.id === personalityId) {
      const defaultP = await db.getPersonality(DEFAULT_PERSONALITY.id);
      if (!defaultP) {
        await db.savePersonality(DEFAULT_PERSONALITY);
      }
      await db.setActivePersonality(DEFAULT_PERSONALITY.id);
      get().addLines({ id: `del-switch-${Date.now()}`, type: 'system', content: `System: Switched to default personality as active one was deleted.`, timestamp: new Date().toISOString(), user: 'claudia' });
    }
    await db.deletePersonality(personalityId);
    get().addLines({ id: `del-succ-${Date.now()}`, type: 'output', content: `Deleted: Personality "${pToDelete.name}" deleted.`, timestamp: new Date().toISOString(), user: 'claudia' });
    
    const allPs = await db.getAllPersonalities();
    const newActiveP = await db.getActivePersonality();
    set({
      allPersonalitiesInModal: allPs,
      activePersonalityIdInModal: newActiveP ? newActiveP.id : null,
      editingPersonalityInModal: newActiveP || null, 
    });
  },
  
  setActiveConversationAndLoadMessages: async (db: StorageService, id, loadMessages = true) => {
    set({ activeConversationId: id });
    if (id) {
      await db.setSetting(LAST_ACTIVE_CONVERSATION_ID_KEY, id);
      if (loadMessages) {
        await get().loadConversationMessages(db, id);
      }
    } else {
      await db.setSetting(LAST_ACTIVE_CONVERSATION_ID_KEY, null);
      if (loadMessages) set({ lines: [] }); 
    }
  },

  loadConversationMessages: async (db: StorageService, id) => {
    const history = await db.getMessages(id, globalAppConfig.conversationHistoryLength + 20); // Use renamed import
    const newLines = history.map(m => ({
      id: `hist-${m.id}-${m.timestamp}`, 
      type: m.role === 'user' ? 'input' : 'output',
      content: m.content, 
      timestamp: m.timestamp,
      user: m.role === 'user' ? 'user' : 'claudia',
      isChatResponse: m.role === 'assistant' ? true : undefined  // Mark AI messages for proper grouping
    } as TerminalLine));
    set({ lines: newLines });
  },

  initializeActiveConversation: async (db) => {
    let playBootAnimation = false;
    let activeConvIdToUse: string | null = null;

    const lastActiveId = await db.getSetting<string>(LAST_ACTIVE_CONVERSATION_ID_KEY);

    if (lastActiveId) {
        const conv = await db.getConversation(lastActiveId);
        if (conv) {
            activeConvIdToUse = conv.id;
            const messages = await db.getMessages(conv.id, 1);
            if (messages.length === 0) {
                playBootAnimation = true; 
            }
        } else {
            playBootAnimation = true;
            activeConvIdToUse = null; 
        }
    } else {
        playBootAnimation = true;
    }

    if (playBootAnimation) {
        if (!activeConvIdToUse) { 
            const newConv = await db.createConversation({ title: `Chat Session - ${new Date().toLocaleString()}` });
            activeConvIdToUse = newConv.id;
        }
        set({ lines: [] }); 
    }
    
    await get().setActiveConversationAndLoadMessages(db, activeConvIdToUse, true); 

    return { activeConvId: activeConvIdToUse, playBootAnimation };
  },
  
  clearTerminalForNewSession: async () => {
    set({ lines: [
      { id: `clear-${Date.now()}`, type: 'system', content: 'INITIALIZING CLAUDIA OS...', timestamp: new Date().toISOString()}
    ]});
    setTimeout(() => get().addLines({ id: 'boot-re1', type: 'system', content: 'SYSTEM ONLINE. ALL MODULES LOADED.', timestamp: new Date().toISOString() }), 300);
    setTimeout(() => get().addLines({ id: 'boot-re2', type: 'output', content: 'Ready for new commands!', timestamp: new Date().toISOString(), user: 'claudia', isChatResponse: true }), 600);
  },

  resetConversationAndTerminal: async (db: StorageService) => {
    const newConv = await db.createConversation({ title: `Chat Session - ${new Date().toLocaleString()}` });
    await get().setActiveConversationAndLoadMessages(db, newConv.id, false);

    const now = new Date().toISOString();
    const initialLines: TerminalLine[] = [
      { 
        id: `cleared-${now}`, 
        type: 'system', 
        content: 'Terminal cleared. New session started.', 
        timestamp: now 
      },
      { 
        id: `ready-${now}`, 
        type: 'output', 
        content: 'Ready for new commands!', 
        timestamp: now, 
        user: 'claudia',
        isChatResponse: true 
      }
    ];
    set({ lines: initialLines });
  },

}));

export const getAppStoreState = useAppStore.getState;
export const setAppStoreState = useAppStore.setState;
