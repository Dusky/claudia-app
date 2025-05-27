# API Reference

Complete API reference for the Claudia AI terminal companion application.

## Table of Contents

1. [Provider APIs](#provider-apis)
2. [Command System APIs](#command-system-apis)
3. [Terminal APIs](#terminal-apis)
4. [Avatar APIs](#avatar-apis)
5. [Storage APIs](#storage-apis)
6. [MCP APIs](#mcp-apis)
7. [Type Definitions](#type-definitions)
8. [Examples](#examples)

## Provider APIs

### Provider Manager

The Claudia application includes centralized provider management for different services.

```typescript
class ProviderManager {
  initializeLLMProviders(): Promise<void>;
  initializeImageProviders(): Promise<void>;
  getActiveLLMProvider(): LLMProvider | null;
  getActiveImageProvider(): ImageProvider | null;
  switchProvider(type: 'llm' | 'image', providerId: string): Promise<void>;
}
```

## Command System APIs

Claudia features an extensive command system with 30+ built-in commands.

### Command Registry

#### `CommandRegistry`

Manages command registration and execution.

```typescript
interface CommandRegistry {
  register(command: Command): void;
  unregister(commandName: string): void;
  execute(commandName: string, args: string[], context: CommandContext): Promise<CommandResult>;
  getCommands(): Command[];
  getCommand(name: string): Command | undefined;
}
```

### Command Interface

#### `Command`

Base interface for all commands.

```typescript
interface Command {
  name: string;
  description: string;
  usage?: string;
  aliases?: string[];
  requiresAI?: boolean;
  requiresImageGen?: boolean;
  execute(args: string[], context: CommandContext): Promise<CommandResult>;
}
```

### Built-in Commands

#### Core Commands
- `/help` - Show available commands
- `/clear` - Clear terminal history
- `/themes` - List terminal themes
- `/theme <name>` - Switch terminal theme

#### AI & Conversation
- `/ask <question>` - Direct AI question
- `/retry` - Retry last AI response
- `/continue` - Continue conversation
- `/undo` - Undo last action
- `/context` - Show conversation context

#### Conversation Management
- `/conversation` - Conversation operations
- `/conversations list` - List all conversations
- `/conversations new` - Create new conversation
- `/conversations load <id>` - Load conversation
- `/conversations delete <id>` - Delete conversation
- `/conversations rename <id> <name>` - Rename conversation

#### Avatar Control
- `/avatar show|hide` - Toggle avatar visibility
- `/avatar expression <expr>` - Set avatar expression
- `/imagine <prompt>` - Generate custom avatar image

#### System & Configuration
- `/providers` - List provider status
- `/config` - Open configuration modal
- `/debug` - Debug information
- `/tools` - List available MCP tools
- `/mcp` - MCP server management
- `/crt` - CRT terminal effects control

#### Personality System
- `/personality gui` - Open personality editor
- `/personality list` - List personalities
- `/personality create <name>` - Create personality
- `/personality set <name>` - Set active personality
- `/personality current` - Show current personality

### Command Context

```typescript
interface CommandContext {
  llmManager: LLMProviderManager;
  imageManager: ImageProviderManager;
  mcpManager: MCPManager;
  avatarController: AvatarController;
  database: ClaudiaDatabase;
  appStore: AppStore;
  addTerminalLine: (line: TerminalLine) => void;
  clearTerminal: () => void;
}
```

### Command Results

```typescript
interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  shouldClearInput?: boolean;
}
```

### LLM Provider Interface

#### `LLMProvider`

Base interface for all LLM providers.

```typescript
interface LLMProvider {
  name: string;
  id: string;
  initialize(config: LLMProviderConfig): Promise<void>;
  generateResponse(messages: LLMMessage[], options?: LLMGenerationOptions): Promise<LLMResponse>;
  isConfigured(): boolean;
}
```

**Properties:**
- `name` - Human-readable provider name
- `id` - Unique provider identifier

**Methods:**

##### `initialize(config: LLMProviderConfig): Promise<void>`

Initialize the provider with configuration.

**Parameters:**
- `config` - Provider-specific configuration object

**Throws:** Error if initialization fails

##### `generateResponse(messages, options?): Promise<LLMResponse>`

Generate AI response for given conversation.

**Parameters:**
- `messages: LLMMessage[]` - Conversation history
- `options?: LLMGenerationOptions` - Generation parameters

**Returns:** Promise resolving to LLM response

##### `isConfigured(): boolean`

Check if provider is properly configured.

**Returns:** Boolean indicating configuration status

### LLM Provider Manager

#### `LLMProviderManager`

Manages multiple LLM providers and routing.

```typescript
class LLMProviderManager {
  constructor();
  registerProvider(provider: LLMProvider): void;
  initializeProvider(providerId: string, config: LLMProviderConfig): Promise<void>;
  getProvider(providerId?: string): LLMProvider | null;
  getActiveProvider(): LLMProvider | null;
  getAvailableProviders(): Array<{id: string, name: string, configured: boolean}>;
  setActiveProvider(providerId: string): void;
}
```

**Methods:**

##### `registerProvider(provider: LLMProvider): void`

Register a new LLM provider.

##### `initializeProvider(providerId, config): Promise<void>`

Initialize and activate a specific provider.

##### `getProvider(providerId?): LLMProvider | null`

Get provider by ID or active provider.

##### `getAvailableProviders(): Array<ProviderInfo>`

Get list of all registered providers with status.

##### `setActiveProvider(providerId: string): void`

Set the active provider for new requests.

### Image Provider Interface

#### `ImageProvider`

Base interface for image generation providers.

```typescript
interface ImageProvider {
  name: string;
  id: string;
  initialize(config: ImageProviderConfig): Promise<void>;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
  isConfigured(): boolean;
  getSupportedModels?(): string[];
}
```

**Methods:**

##### `generateImage(request): Promise<ImageGenerationResponse>`

Generate image from text prompt.

##### `getSupportedModels?(): string[]`

Get list of supported models (optional).

### Specific Provider APIs

#### `AnthropicProvider`

Anthropic Claude provider implementation.

```typescript
class AnthropicProvider implements LLMProvider {
  name = 'Anthropic Claude';
  id = 'anthropic';
  
  async initialize(config?: {
    apiKey?: string;
    model?: string;
    baseURL?: string;
  }): Promise<void>;
}
```

**Configuration:**
- `apiKey?: string` - Anthropic API key (defaults to `VITE_ANTHROPIC_API_KEY`)
- `model?: string` - Model name (default: 'claude-3-sonnet-20240229')
- `baseURL?: string` - API base URL (default: 'https://api.anthropic.com')

#### `GoogleProvider`

Google Gemini provider implementation.

```typescript
class GoogleProvider implements LLMProvider {
  name = 'Google Gemini';
  id = 'google';
  
  async initialize(config: {
    apiKey: string;
    model?: string;
    baseURL?: string;
  }): Promise<void>;
}
```

#### `LocalProvider`

Local LLM provider (Ollama/OpenAI-compatible).

```typescript
class LocalProvider implements LLMProvider {
  name = 'Local LLM';
  id = 'local';
  
  async initialize(config: {
    baseURL: string;
    model: string;
    apiFormat?: 'ollama' | 'openai-compatible';
    apiKey?: string;
  }): Promise<void>;
}
```

#### `ReplicateProvider`

Replicate image generation provider.

```typescript
class ReplicateProvider implements ImageProvider {
  name = 'Replicate';
  id = 'replicate';
  
  async initialize(config: {
    apiKey: string;
    model?: string;
    baseURL?: string;
    defaultParameters?: Record<string, any>;
  }): Promise<void>;
  
  getSupportedModels(): string[];
}
```

## Terminal APIs

### Terminal Display Component

#### `TerminalDisplay`

React component for terminal interface.

```typescript
interface TerminalDisplayProps {
  theme: TerminalTheme;
  lines: TerminalLine[];
  onInput?: (input: string) => void;
  prompt?: string;
  isLoading?: boolean;
}

const TerminalDisplay: React.FC<TerminalDisplayProps>;
```

**Props:**
- `theme: TerminalTheme` - Terminal theme configuration
- `lines: TerminalLine[]` - Array of terminal lines to display
- `onInput?: (input: string) => void` - Input handler callback
- `prompt?: string` - Command prompt string (default: '>')
- `isLoading?: boolean` - Show loading indicator

### Theme System

#### `getTheme(themeId: string): TerminalTheme`

Get theme by ID.

#### `getAllThemes(): TerminalTheme[]`

Get all available themes.

## MCP APIs

### MCP Manager

#### `MCPManager`

Manages Model Context Protocol tools and execution.

```typescript
class MCPManager {
  constructor();
  
  // Tool management
  registerTool(tool: MCPTool): void;
  getAvailableTools(): Promise<MCPTool[]>;
  getTool(toolId: string): MCPTool | null;
  
  // Execution
  executeTool(toolId: string, params: any): Promise<MCPToolResult>;
  validateToolParams(toolId: string, params: any): Promise<boolean>;
  
  // Permissions
  setPermission(toolId: string, action: string, granted: boolean): void;
  checkPermission(toolId: string, action: string): boolean;
  
  // Audit and monitoring
  getAuditLog(filters?: MCPAuditFilter): Promise<MCPAuditLog[]>;
  getResourceUsage(toolId?: string): MCPResourceUsage;
}
```

### MCP Tool Interface

```typescript
interface MCPTool {
  id: string;
  name: string;
  description: string;
  version?: string;
  author?: string;
  
  execute(params: any): Promise<MCPToolResult>;
  validate?(params: any): Promise<boolean>;
  getSchema?(): any; // JSON Schema for parameters
}
```

### Built-in MCP Tools

#### Available Tools
- `mcp_fetch` - HTTP request capabilities
- `mcp_filesystem` - File system operations
- `mcp_memory` - Persistent memory management
- `mcp_time` - Date and time utilities
- `mcp_sqlite` - Database operations
- `mcp_tts` - Text-to-speech synthesis

## Avatar APIs

### Avatar Controller

#### `AvatarController`

Controls avatar state and behavior.

```typescript
class AvatarController {
  constructor(
    imageProvider: ImageProviderManager,
    database: ClaudiaDatabase,
    onStateChange?: (state: AvatarState) => void
  );
  
  parseAvatarCommands(text: string): {cleanText: string, commands: AvatarCommand[]};
  executeCommands(commands: AvatarCommand[]): Promise<void>;
  getState(): AvatarState;
  setState(newState: Partial<AvatarState>): void;
  show(): Promise<void>;
  hide(): Promise<void>;
}
```

**Methods:**

##### `parseAvatarCommands(text): {cleanText, commands}`

Parse `[AVATAR:...]` commands from text.

##### `executeCommands(commands): Promise<void>`

Execute array of avatar commands.

##### `getState(): AvatarState`

Get current avatar state.

##### `setState(newState): void`

Update avatar state.

### Avatar Panel Component

#### `AvatarPanel`

React component for displaying avatar in dedicated panel.

```typescript
interface AvatarPanelProps {
  state: AvatarState;
  theme: TerminalTheme;
}

const AvatarPanel: React.FC<AvatarPanelProps>;
```

## Storage APIs

### MockDatabase Implementation

Claudia uses a browser-compatible LocalStorage-based database system.

```typescript
class MockDatabase implements DatabaseInterface {
  // Conversations
  createConversation(conversation: ConversationData): string;
  getConversation(id: string): Conversation | null;
  getAllConversations(): Conversation[];
  updateConversation(id: string, updates: Partial<Conversation>): void;
  deleteConversation(id: string): void;
  
  // Messages
  addMessage(message: MessageData): number;
  getMessages(conversationId: string): ConversationMessage[];
  
  // Settings with type safety
  setSetting(key: string, value: any, type?: SettingType): void;
  getSetting(key: string): any;
  getAllSettings(): Record<string, any>;
  
  // Avatar cache with TTL
  cacheAvatarImage(hash: string, url: string, params: any): void;
  getCachedAvatar(hash: string): CachedAvatarImage | null;
  cleanupOldAvatarCache(maxAge?: number): number;
  
  // Personalities
  createPersonality(personality: PersonalityData): string;
  getPersonality(id: string): Personality | null;
  getAllPersonalities(): Personality[];
  updatePersonality(id: string, updates: Partial<Personality>): void;
  deletePersonality(id: string): void;
}
```

### Database

#### `ClaudiaDatabase`

Browser-compatible LocalStorage database interface.

```typescript
class ClaudiaDatabase {
  constructor(); // No path needed for browser storage
  
  // Conversation methods
  createConversation(conversation: Omit<Conversation, 'id'>): string;
  getConversation(id: string): Conversation | null;
  getAllConversations(): Conversation[];
  updateConversation(id: string, updates: Partial<Conversation>): void;
  deleteConversation(id: string): void;
  
  // Message methods
  addMessage(message: Omit<ConversationMessage, 'id'>): number;
  getMessages(conversationId: string): ConversationMessage[];
  
  // Memory methods
  addMemory(memory: Omit<MemoryEntry, 'id'>): number;
  searchMemory(type?: string, limit?: number): MemoryEntry[];
  
  // Settings methods
  setSetting(key: string, value: any, type?: 'string'|'number'|'boolean'|'json'): void;
  getSetting(key: string): any;
  getAllSettings(): Record<string, any>;
  
  // Avatar cache methods
  cacheAvatarImage(promptHash: string, imageUrl: string, parameters: Record<string, any>): void;
  getCachedAvatar(promptHash: string): any;
  cleanupOldAvatarCache(maxAge?: number): number;
  
  close(): void;
}
```

**Conversation Methods:**

##### `createConversation(conversation): string`

Create new conversation.

##### `getConversation(id): Conversation | null`

Get conversation by ID.

##### `getAllConversations(): Conversation[]`

Get all conversations ordered by last update.

**Message Methods:**

##### `addMessage(message): number`

Add message to conversation.

##### `getMessages(conversationId): ConversationMessage[]`

Get all messages for conversation.

**Settings Methods:**

##### `setSetting(key, value, type?): void`

Set application setting.

##### `getSetting(key): any`

Get application setting.

**Avatar Cache Methods:**

##### `cacheAvatarImage(promptHash, imageUrl, parameters): void`

Cache generated avatar image.

##### `getCachedAvatar(promptHash): any`

Get cached avatar image.

## Type Definitions

### Core Types

#### `LLMMessage`

```typescript
interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

#### `LLMResponse`

```typescript
interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}
```

#### `LLMGenerationOptions`

```typescript
interface LLMGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
}
```

### Image Types

#### `ImageGenerationRequest`

```typescript
interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
  style?: string;
}
```

#### `ImageGenerationResponse`

```typescript
interface ImageGenerationResponse {
  imageUrl: string;
  seed?: number;
  parameters?: Record<string, any>;
  metadata?: {
    prompt: string;
    model: string;
    provider: string;
    generatedAt: string;
  };
}
```

### Terminal Types

#### `TerminalLine`

```typescript
interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error';
  content: string;
  timestamp: string;
  user?: 'user' | 'claudia';
}
```

#### `TerminalTheme`

```typescript
interface TerminalTheme {
  id: string;
  name: string;
  era: string;
  colors: {
    background: string;
    foreground: string;
    cursor: string;
    selection: string;
    accent: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
  };
  font: {
    family: string;
    size: string;
    weight: string;
    lineHeight: string;
  };
  effects: {
    scanlines: boolean;
    glow: boolean;
    flicker: boolean;
    crt: boolean;
    noise: boolean;
  };
}
```

### Storage Types

#### `Conversation`

```typescript
interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  personalityId?: string;
}
```

#### `ConversationMessage`

```typescript
interface ConversationMessage {
  id?: number;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    tokensUsed?: number;
    provider?: string;
    model?: string;
  };
}
```

#### `AppSetting`

```typescript
interface AppSetting {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  updatedAt: string;
}
```

#### `CachedAvatarImage`

```typescript
interface CachedAvatarImage {
  hash: string;
  url: string;
  parameters: Record<string, any>;
  createdAt: string;
  accessCount: number;
  lastAccessed: string;
}
```

#### `Personality`

```typescript
interface Personality {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  traits: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}
```

### MCP Types

#### `MCPToolResult`

```typescript
interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime: number;
    resourceUsage: MCPResourceUsage;
    toolVersion?: string;
  };
}
```

#### `MCPPermission`

```typescript
interface MCPPermission {
  toolId: string;
  action: string;
  resource?: string;
  granted: boolean;
  grantedAt: string;
  expiresAt?: string;
  grantedBy: string;
}
```

#### `MCPAuditLog`

```typescript
interface MCPAuditLog {
  id: string;
  timestamp: string;
  toolId: string;
  action: string;
  parameters: any;
  result: MCPToolResult;
  userId?: string;
  sessionId: string;
  ipAddress?: string;
}
```

### Command Types

#### `Command`

```typescript
interface Command {
  name: string;
  description: string;
  usage?: string;
  aliases?: string[];
  category?: 'core' | 'ai' | 'avatar' | 'system' | 'mcp';
  requiresAI?: boolean;
  requiresImageGen?: boolean;
  requiresMCP?: boolean;
  execute(args: string[], context: CommandContext): Promise<CommandResult>;
}
```

### Avatar Types

#### `AvatarExpression`

```typescript
type AvatarExpression = 
  | 'neutral' | 'happy' | 'curious' | 'focused' | 'thinking'
  | 'surprised' | 'confused' | 'excited' | 'confident' 
  | 'mischievous' | 'sleepy' | 'shocked' | 'determined'
  | 'playful' | 'serious' | 'worried' | 'content';
```

#### `AvatarAction`

```typescript
type AvatarAction = 
  | 'idle' | 'type' | 'search' | 'read' | 'wave'
  | 'nod' | 'shrug' | 'point' | 'think' | 'work';
```

#### `AvatarCommand`

```typescript
interface AvatarCommand {
  expression?: AvatarExpression;
  action?: AvatarAction;
  pose?: AvatarPose;
  hide?: boolean;
  show?: boolean;
  fade?: boolean;
  pulse?: boolean;
  scale?: number;
  duration?: number;
}
```

#### `AvatarState`

```typescript
interface AvatarState {
  visible: boolean;
  expression: AvatarExpression;
  pose: AvatarPose;
  action: AvatarAction;
  scale: number;
  opacity: number;
  imageUrl?: string;
  isAnimating: boolean;
  isGenerating: boolean;
  hasError: boolean;
  lastUpdate: string;
}
```

### Database Types

#### `Conversation`

```typescript
interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
```

#### `ConversationMessage`

```typescript
interface ConversationMessage {
  id?: number;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}
```

#### `MemoryEntry`

```typescript
interface MemoryEntry {
  id?: number;
  content: string;
  type: 'conversation' | 'avatar' | 'system';
  timestamp: string;
}
```

## Examples

### Command System Usage

```typescript
import { createCommandRegistry } from './commands';
import { CommandContext } from './commands/types';

// Setup command registry
const registry = createCommandRegistry();

// Execute command
const context: CommandContext = {
  llmManager,
  imageManager,
  mcpManager,
  avatarController,
  database,
  appStore,
  addTerminalLine: (line) => console.log(line),
  clearTerminal: () => console.clear()
};

const result = await registry.execute('help', [], context);
console.log(result.message);

// Register custom command
const customCommand: Command = {
  name: 'custom',
  description: 'A custom command',
  async execute(args, context) {
    return { success: true, message: 'Custom command executed!' };
  }
};

registry.register(customCommand);
```

### Basic LLM Usage

```typescript
import { LLMProviderManager } from './providers';

// Setup
const manager = new LLMProviderManager();

// Generate response
const messages = [
  { role: 'user', content: 'Hello!' }
];

const response = await manager.getActiveProvider()?.generateResponse(messages);
console.log(response?.content);

// Manual initialization
await manager.initializeProvider('anthropic', {
  apiKey: 'custom-key',
  model: 'claude-3-opus-20240229'
});
```

### MCP Tool Usage

```typescript
import { MCPManager } from './providers/mcp';

// Setup MCP manager
const mcpManager = new MCPManager();

// Execute tool
const result = await mcpManager.executeTool('mcp_fetch', {
  url: 'https://api.example.com/data',
  method: 'GET'
});

if (result.success) {
  console.log('API response:', result.data);
} else {
  console.error('Tool execution failed:', result.error);
}

// Check permissions
const hasPermission = mcpManager.checkPermission('mcp_filesystem', 'read');
if (!hasPermission) {
  console.log('Permission required for filesystem access');
}
```

### Avatar Control

```typescript
import { AvatarController } from './avatar';

// Setup
const controller = new AvatarController(imageManager, database, updateUI);

// Parse and execute avatar commands
const text = "Hello! [AVATAR:expression=happy] How are you?";
const { cleanText, commands } = controller.parseAvatarCommands(text);

await controller.executeCommands(commands);
console.log(cleanText); // "Hello! How are you?"
```

### Database Operations

```typescript
import { ClaudiaDatabase } from './storage';

const db = new ClaudiaDatabase();

// Create conversation
const convId = db.createConversation({
  title: 'Chat with Claudia',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// Add messages
db.addMessage({
  conversationId: convId,
  role: 'user',
  content: 'Hello!',
  timestamp: new Date().toISOString()
});

// Get conversation history
const messages = db.getMessages(convId);
```

### Terminal Theme Usage

```typescript
import { TerminalDisplay, getTheme } from './terminal';

function MyTerminal() {
  const [currentTheme, setCurrentTheme] = useState('mainframe70s');
  const theme = getTheme(currentTheme);
  
  return (
    <TerminalDisplay
      theme={theme}
      lines={lines}
      onInput={handleInput}
      isLoading={isLoading}
    />
  );
}
```

This API reference provides complete documentation for all public interfaces in the Claudia application.