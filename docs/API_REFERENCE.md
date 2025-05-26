# API Reference

Complete API reference for the Claudia AI terminal companion application.

## Table of Contents

1. [Provider APIs](#provider-apis)
2. [Terminal APIs](#terminal-apis)
3. [Avatar APIs](#avatar-apis)
4. [Storage APIs](#storage-apis)
5. [Type Definitions](#type-definitions)
6. [Examples](#examples)

## Provider APIs

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

### Database

#### `ClaudiaDatabase`

SQLite database interface.

```typescript
class ClaudiaDatabase {
  constructor(dbPath?: string);
  
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

### Avatar Types

#### `AvatarExpression`

```typescript
type AvatarExpression = 
  | 'neutral' | 'happy' | 'curious' | 'focused' | 'thinking'
  | 'surprised' | 'confused' | 'excited' | 'confident' 
  | 'mischievous' | 'sleepy' | 'shocked';
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