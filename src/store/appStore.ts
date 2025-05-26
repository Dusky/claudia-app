import { create } from 'zustand';
import { type TerminalLine } from '../terminal/TerminalDisplay';
import type { AvatarState } from '../avatar/types';
import type { Personality } from '../types/personality';
import { config } from '../config/env';
import { type ClaudiaDatabase } from '../storage';
import { DEFAULT_PERSONALITY } from '../types/personality';

const LAST_ACTIVE_CONVERSATION_ID_KEY = 'lastActiveConversationId';

export interface AppState {
  currentTheme: string;
  lines: TerminalLine[];
  isLoading: boolean;
  avatarState: AvatarState;
  personalityModalOpen: boolean;
  editingPersonalityInModal: Personality | null;
  allPersonalitiesInModal: Personality[];
  activePersonalityIdInModal: string | null;
  activeConversationId: string | null;
  
  // Actions
  setTheme: (theme: string) => void;
  addLines: (newLines: TerminalLine | TerminalLine[]) => void;
  setLines: (lines: TerminalLine[]) => void;
  setLoading: (loading: boolean) => void;
  setAvatarState: (partialState: Partial<AvatarState> | ((prevState: AvatarState) => Partial<AvatarState>)) => void;
  saveAvatarState: () => void;
  restoreAvatarState: () => Promise<void>;
  
  openPersonalityEditorModal: (db: ClaudiaDatabase, personalityToEdit?: Personality | null) => Promise<void>;
  closePersonalityModal: () => void;
  savePersonalityInModal: (db: ClaudiaDatabase, personality: Personality) => Promise<void>;
  deletePersonalityInModal: (db: ClaudiaDatabase, personalityId: string) => Promise<void>;
  
  // Combined action for setting active conversation and loading messages
  setActiveConversationAndLoadMessages: (db: ClaudiaDatabase, id: string | null, loadMessages?: boolean) => Promise<void>;
  
  loadConversationMessages: (db: ClaudiaDatabase, id: string) => Promise<void>; // Kept if direct loading is needed
  initializeActiveConversation: (db: ClaudiaDatabase) => Promise<{ activeConvId: string | null, playBootAnimation: boolean }>;
  clearTerminalForNewSession: () => Promise<void>;
  resetConversationAndTerminal: (db: ClaudiaDatabase) => Promise<void>; // New action
}

export const useAppStore = create<AppState>((set, get) => ({
  currentTheme: config.defaultTheme,
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
  personalityModalOpen: false,
  editingPersonalityInModal: null,
  allPersonalitiesInModal: [],
  activePersonalityIdInModal: null,
  activeConversationId: null,

  setTheme: (theme) => set({ currentTheme: theme }),
  addLines: (newLines) => {
    const linesToAdd = Array.isArray(newLines) ? newLines : [newLines];
    set(state => ({ lines: [...state.lines, ...linesToAdd].flat() }));
  },
  setLines: (lines) => set({ lines }),
  setLoading: (loading) => set({ isLoading: loading }),
  setAvatarState: (partialState) => {
    const newState = typeof partialState === 'function' 
      ? (state: AppState) => {
          const newAvatarState = { ...state.avatarState, ...partialState(state.avatarState) };
          // Save to localStorage for persistence
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
          // Save to localStorage for persistence
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
      editingPersonalityInModal: personality, // Keep the saved personality in view
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
      // Ensure DEFAULT_PERSONALITY exists before setting it active
      let defaultP = await db.getPersonality(DEFAULT_PERSONALITY.id);
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
      editingPersonalityInModal: newActiveP || null, // Show the new active personality or null
    });
  },
  
  setActiveConversationAndLoadMessages: async (db, id, loadMessages = true) => {
    set({ activeConversationId: id });
    if (id) {
      await db.setSetting(LAST_ACTIVE_CONVERSATION_ID_KEY, id);
      if (loadMessages) {
        await get().loadConversationMessages(db, id);
      }
    } else {
      await db.setSetting(LAST_ACTIVE_CONVERSATION_ID_KEY, null);
      if (loadMessages) set({ lines: [] }); // Clear lines if no active conversation
    }
  },

  loadConversationMessages: async (db, id) => {
    const history = await db.getMessages(id, config.conversationHistoryLength + 20);
    const newLines = history.map(m => ({
      id: `hist-${m.id}-${m.timestamp}`, type: m.role === 'user' ? 'input' : 'output',
      content: m.content, timestamp: m.timestamp,
      user: m.role === 'user' ? 'user' : 'claudia'
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
                playBootAnimation = true; // Existing conversation is empty, treat as fresh start
            }
            // If messages.length > 0, playBootAnimation remains false, normal load
        } else {
            // lastActiveId exists, but conversation doesn't (e.g., deleted) -> new session
            playBootAnimation = true;
            activeConvIdToUse = null; // Ensure we don't try to use the invalid ID
        }
    } else {
        // No lastActiveId, so it's a completely fresh session
        playBootAnimation = true;
    }

    if (playBootAnimation) {
        // If we're playing boot animation, we want a "clean slate".
        // If activeConvIdToUse was from an existing (but empty) conversation, we can reuse its ID.
        // Otherwise (no valid last active ID, or it pointed to a deleted convo), create a new one.
        if (!activeConvIdToUse) { 
            const newConv = await db.createConversation({ title: `Chat Session - ${new Date().toLocaleString()}` });
            activeConvIdToUse = newConv.id;
        }
        // Explicitly clear lines in the store *before* App.tsx starts adding boot animation lines.
        // App.tsx also calls setLines([]), but this ensures the store state is definitely clean for the boot sequence.
        set({ lines: [] }); 
    }
    
    // Set the determined active conversation ID in the store and persist it.
    // Crucially, do NOT load messages here; App.tsx will handle that based on playBootAnimation.
    await get().setActiveConversationAndLoadMessages(db, activeConvIdToUse, false); 

    return { activeConvId: activeConvIdToUse, playBootAnimation };
  },
  
  clearTerminalForNewSession: async () => {
    // This function is now mostly for specific commands like /conversation-clearhist
    // that only want to clear lines and show boot messages without resetting the conversation.
    // The /clear command uses resetConversationAndTerminal for a full reset.
    set({ lines: [
      { id: `clear-${Date.now()}`, type: 'system', content: 'INITIALIZING CLAUDIA OS...', timestamp: new Date().toISOString()}
    ]});
    setTimeout(() => get().addLines({ id: 'boot-re1', type: 'system', content: 'SYSTEM ONLINE. ALL MODULES LOADED.', timestamp: new Date().toISOString() }), 300);
    setTimeout(() => get().addLines({ id: 'boot-re2', type: 'output', content: 'Ready for new commands!', timestamp: new Date().toISOString(), user: 'claudia', isChatResponse: true }), 600);
  },

  resetConversationAndTerminal: async (db: ClaudiaDatabase) => {
    const newConv = await db.createConversation({ title: `Chat Session - ${new Date().toLocaleString()}` });
    // Set new conversation active, but don't load messages (it's new and empty)
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
        isChatResponse: true // To get the "claudia>" prefix
      }
    ];
    set({ lines: initialLines });
  },

}));

// Helper to use outside of React components if needed
export const getAppStoreState = useAppStore.getState;
export const setAppStoreState = useAppStore.setState;
