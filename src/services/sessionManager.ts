// Session Management System for ClaudiaOS Phase 5
// Comprehensive session persistence, state management, and system integration

interface SessionState {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  currentDirectory: string;
  environmentVariables: Record<string, string>;
  aliases: Record<string, string>;
  commandHistory: string[];
  openTabs: TabState[];
  systemState: SystemState;
  userPreferences: UserPreferences;
  activePersonality: string | null;
  themeSettings: ThemeSettings;
  windowLayout: WindowLayout;
}

interface TabState {
  id: string;
  title: string;
  type: 'terminal' | 'file' | 'system' | 'help';
  content: any;
  active: boolean;
  directory: string;
  history: string[];
}

interface SystemState {
  processes: ProcessState[];
  services: ServiceState[];
  mounts: MountPoint[];
  networkConnections: NetworkConnection[];
  systemResources: ResourceUsage;
}

interface ProcessState {
  pid: number;
  name: string;
  status: 'running' | 'sleeping' | 'stopped';
  startTime: Date;
  cpu: number;
  memory: number;
  user: string;
}

interface ServiceState {
  name: string;
  status: 'active' | 'inactive' | 'failed';
  enabled: boolean;
  description: string;
}

interface MountPoint {
  device: string;
  mountpoint: string;
  filesystem: string;
  options: string[];
}

interface NetworkConnection {
  protocol: string;
  localAddress: string;
  remoteAddress: string;
  state: string;
  pid: number;
}

interface ResourceUsage {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    cached: number;
    buffers: number;
  };
  disk: {
    used: number;
    total: number;
    available: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
}

interface UserPreferences {
  theme: string;
  fontSize: number;
  fontFamily: string;
  terminalOpacity: number;
  animationsEnabled: boolean;
  soundEnabled: boolean;
  autoSave: boolean;
  smartSuggestions: boolean;
  contextAwareHelp: boolean;
  workflowLearning: boolean;
  privacyMode: boolean;
  developerMode: boolean;
  accessibility: AccessibilitySettings;
  shortcuts: Record<string, string>;
  startup: StartupSettings;
}

interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  screenReader: boolean;
  keyboardNavigation: boolean;
  reduceMotion: boolean;
}

interface StartupSettings {
  restoreSession: boolean;
  defaultDirectory: string;
  autoRunCommands: string[];
  loadPersonality: string | null;
  showWelcomeMessage: boolean;
}

interface ThemeSettings {
  current: string;
  custom: Record<string, any>;
  effects: {
    crt: boolean;
    glow: boolean;
    scanlines: boolean;
    bloom: boolean;
  };
}

interface WindowLayout {
  terminalSize: { width: number; height: number };
  panelSizes: Record<string, number>;
  splitLayout: 'single' | 'horizontal' | 'vertical' | 'grid';
  activePanel: string;
}

export class SessionManager {
  private currentSession: SessionState | null = null;
  private autoSaveInterval: number | null = null;
  private sessionStorageKey = 'claudiaos-session';
  private persistentStorageKey = 'claudiaos-persistent';
  
  constructor() {
    this.initializeSession();
    this.setupAutoSave();
    this.setupEventListeners();
  }
  
  // Initialize or restore session
  async initializeSession(): Promise<void> {
    const restored = await this.restoreSession();
    
    if (!restored) {
      this.currentSession = this.createNewSession();
    }
    
    // Update last activity
    this.updateActivity();
    
    // Start system monitoring
    this.startSystemMonitoring();
  }
  
  // Create a new session
  private createNewSession(): SessionState {
    const sessionId = this.generateSessionId();
    const now = new Date();
    
    return {
      sessionId,
      startTime: now,
      lastActivity: now,
      currentDirectory: '/home/claudia',
      environmentVariables: this.getDefaultEnvironment(),
      aliases: this.getDefaultAliases(),
      commandHistory: [],
      openTabs: [this.createDefaultTab()],
      systemState: this.initializeSystemState(),
      userPreferences: this.getDefaultPreferences(),
      activePersonality: null,
      themeSettings: this.getDefaultThemeSettings(),
      windowLayout: this.getDefaultWindowLayout()
    };
  }
  
  // Session persistence
  async saveSession(): Promise<void> {
    if (!this.currentSession) return;
    
    this.currentSession.lastActivity = new Date();
    
    try {
      // Save to session storage (temporary)
      sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(this.currentSession));
      
      // Save critical data to persistent storage
      const persistentData = {
        userPreferences: this.currentSession.userPreferences,
        aliases: this.currentSession.aliases,
        environmentVariables: this.currentSession.environmentVariables,
        themeSettings: this.currentSession.themeSettings,
        windowLayout: this.currentSession.windowLayout
      };
      
      localStorage.setItem(this.persistentStorageKey, JSON.stringify(persistentData));
      
      console.log('📦 Session saved successfully');
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }
  
  async restoreSession(): Promise<boolean> {
    try {
      // Try to restore from session storage first
      const sessionData = sessionStorage.getItem(this.sessionStorageKey);
      
      if (sessionData) {
        const restored = JSON.parse(sessionData);
        
        // Convert date strings back to Date objects
        restored.startTime = new Date(restored.startTime);
        restored.lastActivity = new Date(restored.lastActivity);
        
        this.currentSession = restored;
        console.log('🔄 Session restored from session storage');
        return true;
      }
      
      // If no session storage, try to restore preferences from persistent storage
      const persistentData = localStorage.getItem(this.persistentStorageKey);
      
      if (persistentData) {
        const restored = JSON.parse(persistentData);
        
        // Create new session with restored preferences
        this.currentSession = this.createNewSession();
        Object.assign(this.currentSession, restored);
        
        console.log('🔄 Session preferences restored from persistent storage');
        return true;
      }
      
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
    
    return false;
  }
  
  // Session management commands
  async createSession(name?: string): Promise<string> {
    await this.saveSession(); // Save current session
    
    this.currentSession = this.createNewSession();
    if (name) {
      // Store named sessions in persistent storage
      const namedSessions = this.getNamedSessions();
      namedSessions[name] = { ...this.currentSession };
      localStorage.setItem('claudiaos-named-sessions', JSON.stringify(namedSessions));
    }
    
    return this.currentSession.sessionId;
  }
  
  async switchSession(nameOrId: string): Promise<boolean> {
    const namedSessions = this.getNamedSessions();
    
    if (namedSessions[nameOrId]) {
      await this.saveSession(); // Save current
      this.currentSession = { ...namedSessions[nameOrId] };
      this.currentSession.lastActivity = new Date();
      return true;
    }
    
    return false;
  }
  
  async deleteSession(name: string): Promise<boolean> {
    const namedSessions = this.getNamedSessions();
    
    if (namedSessions[name]) {
      delete namedSessions[name];
      localStorage.setItem('claudiaos-named-sessions', JSON.stringify(namedSessions));
      return true;
    }
    
    return false;
  }
  
  listSessions(): Record<string, any> {
    const namedSessions = this.getNamedSessions();
    const sessions: Record<string, any> = {};
    
    // Add current session
    if (this.currentSession) {
      sessions['current'] = {
        id: this.currentSession.sessionId,
        startTime: this.currentSession.startTime,
        lastActivity: this.currentSession.lastActivity,
        directory: this.currentSession.currentDirectory,
        tabs: this.currentSession.openTabs.length
      };
    }
    
    // Add named sessions
    Object.entries(namedSessions).forEach(([name, session]) => {
      sessions[name] = {
        id: session.sessionId,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        directory: session.currentDirectory,
        tabs: session.openTabs.length
      };
    });
    
    return sessions;
  }
  
  // State management
  updateCurrentDirectory(path: string): void {
    if (this.currentSession) {
      this.currentSession.currentDirectory = path;
      this.currentSession.environmentVariables.PWD = path;
      this.updateActivity();
    }
  }
  
  addToCommandHistory(command: string): void {
    if (this.currentSession) {
      this.currentSession.commandHistory.push(command);
      
      // Keep only last 1000 commands
      if (this.currentSession.commandHistory.length > 1000) {
        this.currentSession.commandHistory = this.currentSession.commandHistory.slice(-1000);
      }
      
      this.updateActivity();
    }
  }
  
  setEnvironmentVariable(name: string, value: string): void {
    if (this.currentSession) {
      this.currentSession.environmentVariables[name] = value;
      this.updateActivity();
    }
  }
  
  setAlias(name: string, command: string): void {
    if (this.currentSession) {
      this.currentSession.aliases[name] = command;
      this.updateActivity();
    }
  }
  
  updateUserPreferences(preferences: Partial<UserPreferences>): void {
    if (this.currentSession) {
      Object.assign(this.currentSession.userPreferences, preferences);
      this.updateActivity();
    }
  }
  
  updateThemeSettings(settings: Partial<ThemeSettings>): void {
    if (this.currentSession) {
      Object.assign(this.currentSession.themeSettings, settings);
      this.updateActivity();
    }
  }
  
  // Tab management
  createTab(type: TabState['type'], title: string, content?: any): string {
    if (!this.currentSession) return '';
    
    const tabId = this.generateId();
    const newTab: TabState = {
      id: tabId,
      title,
      type,
      content: content || {},
      active: false,
      directory: this.currentSession.currentDirectory,
      history: []
    };
    
    this.currentSession.openTabs.push(newTab);
    this.updateActivity();
    
    return tabId;
  }
  
  switchTab(tabId: string): boolean {
    if (!this.currentSession) return false;
    
    const tab = this.currentSession.openTabs.find(t => t.id === tabId);
    if (!tab) return false;
    
    // Deactivate all tabs
    this.currentSession.openTabs.forEach(t => t.active = false);
    
    // Activate selected tab
    tab.active = true;
    this.updateActivity();
    
    return true;
  }
  
  closeTab(tabId: string): boolean {
    if (!this.currentSession) return false;
    
    const index = this.currentSession.openTabs.findIndex(t => t.id === tabId);
    if (index === -1) return false;
    
    this.currentSession.openTabs.splice(index, 1);
    
    // If we closed the active tab, activate another one
    if (!this.currentSession.openTabs.some(t => t.active) && this.currentSession.openTabs.length > 0) {
      this.currentSession.openTabs[0].active = true;
    }
    
    this.updateActivity();
    return true;
  }
  
  // System monitoring
  private startSystemMonitoring(): void {
    setInterval(() => {
      this.updateSystemResources();
    }, 30000); // Update every 30 seconds (reduced frequency)
  }
  
  private updateSystemResources(): void {
    if (!this.currentSession) return;
    
    // Simulate realistic system resource updates
    const resources = this.currentSession.systemState.systemResources;
    
    // CPU usage with some variability
    resources.cpu.usage = Math.max(0, Math.min(100, 
      resources.cpu.usage + (Math.random() - 0.5) * 10
    ));
    
    // Memory usage with gradual changes
    const memoryChange = (Math.random() - 0.5) * 100;
    resources.memory.used = Math.max(1000, Math.min(resources.memory.total * 0.9, 
      resources.memory.used + memoryChange
    ));
    
    // Network activity
    resources.network.bytesIn += Math.floor(Math.random() * 1024 * 1024);
    resources.network.bytesOut += Math.floor(Math.random() * 512 * 1024);
  }
  
  // Getters
  getCurrentSession(): SessionState | null {
    return this.currentSession;
  }
  
  getSessionId(): string {
    return this.currentSession?.sessionId || '';
  }
  
  getUserPreferences(): UserPreferences | null {
    return this.currentSession?.userPreferences || null;
  }
  
  getSystemState(): SystemState | null {
    return this.currentSession?.systemState || null;
  }
  
  // Private helper methods
  private updateActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivity = new Date();
    }
  }
  
  private setupAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    // Auto-save every 2 minutes (reduced frequency)
    this.autoSaveInterval = window.setInterval(() => {
      this.saveSession();
    }, 120000);
  }
  
  private setupEventListeners(): void {
    // Save session before page unload
    window.addEventListener('beforeunload', () => {
      this.saveSession();
    });
    
    // Save session when tab becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveSession();
      }
    });
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
  
  private getNamedSessions(): Record<string, SessionState> {
    try {
      const stored = localStorage.getItem('claudiaos-named-sessions');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }
  
  private getDefaultEnvironment(): Record<string, string> {
    return {
      PATH: '/system/bin:/system/core:/usr/bin:/bin:/home/claudia/.local/bin',
      HOME: '/home/claudia',
      USER: 'claudia',
      SHELL: '/system/shell/claudia-shell',
      TERM: 'claudia-256color',
      LANG: 'en_US.UTF-8',
      PWD: '/home/claudia',
      CLAUDIA_VERSION: '2.1.7',
      CLAUDIA_BUILD: '20240115-1000',
      CLAUDIA_THEME: 'mainframe70s',
      CLAUDIA_DEBUG: 'false'
    };
  }
  
  private getDefaultAliases(): Record<string, string> {
    return {
      'll': 'ls -l',
      'la': 'ls -la',
      'cls': 'clear',
      'dir': 'ls',
      'md': 'mkdir',
      'rd': 'rmdir',
      'psa': 'ps aux',
      'mem': 'free -h'
    };
  }
  
  private createDefaultTab(): TabState {
    return {
      id: this.generateId(),
      title: 'Terminal',
      type: 'terminal',
      content: {},
      active: true,
      directory: '/home/claudia',
      history: []
    };
  }
  
  private initializeSystemState(): SystemState {
    return {
      processes: [],
      services: [
        { name: 'claudia-core', status: 'active', enabled: true, description: 'Core personality system' },
        { name: 'ai-engine', status: 'active', enabled: true, description: 'AI processing engine' },
        { name: 'avatar-service', status: 'active', enabled: true, description: 'Avatar generation service' },
        { name: 'theme-manager', status: 'active', enabled: true, description: 'Theme management service' }
      ],
      mounts: [
        { device: '/dev/claudia-root', mountpoint: '/', filesystem: 'claudiafs', options: ['rw', 'relatime'] },
        { device: '/dev/claudia-home', mountpoint: '/home', filesystem: 'claudiafs', options: ['rw', 'relatime'] },
        { device: 'tmpfs', mountpoint: '/tmp', filesystem: 'tmpfs', options: ['rw', 'nosuid', 'nodev'] }
      ],
      networkConnections: [],
      systemResources: {
        cpu: { usage: 25, loadAverage: [0.5, 0.6, 0.7] },
        memory: { used: 6500, total: 16384, cached: 1200, buffers: 150 },
        disk: { used: 180000, total: 512000, available: 332000 },
        network: { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 }
      }
    };
  }
  
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'mainframe70s',
      fontSize: 14,
      fontFamily: 'monospace',
      terminalOpacity: 0.95,
      animationsEnabled: true,
      soundEnabled: false,
      autoSave: true,
      smartSuggestions: true,
      contextAwareHelp: true,
      workflowLearning: true,
      privacyMode: false,
      developerMode: false,
      accessibility: {
        highContrast: false,
        fontSize: 'medium',
        screenReader: false,
        keyboardNavigation: true,
        reduceMotion: false
      },
      shortcuts: {},
      startup: {
        restoreSession: true,
        defaultDirectory: '/home/claudia',
        autoRunCommands: [],
        loadPersonality: null,
        showWelcomeMessage: true
      }
    };
  }
  
  private getDefaultThemeSettings(): ThemeSettings {
    return {
      current: 'mainframe70s',
      custom: {},
      effects: {
        crt: true,
        glow: true,
        scanlines: true,
        bloom: false
      }
    };
  }
  
  private getDefaultWindowLayout(): WindowLayout {
    return {
      terminalSize: { width: 80, height: 24 },
      panelSizes: { terminal: 100, sidebar: 0 },
      splitLayout: 'single',
      activePanel: 'terminal'
    };
  }
  
  // Cleanup
  destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    this.saveSession();
  }
}

// Global instance
export const sessionManager = new SessionManager();