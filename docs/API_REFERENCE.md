# API Reference

Complete API reference for the Claudia AI Terminal Companion framework.

## Table of Contents

1. [Provider APIs](#provider-apis)
2. [Terminal APIs](#terminal-apis)
3. [Avatar APIs](#avatar-apis)
4. [Storage APIs](#storage-apis)
5. [Utility APIs](#utility-apis)
6. [Type Definitions](#type-definitions)
7. [Examples](#examples)

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

**Parameters:**
- `provider` - Provider instance implementing LLMProvider interface

##### `initializeProvider(providerId, config): Promise<void>`

Initialize and activate a specific provider.

**Parameters:**
- `providerId: string` - Provider ID to initialize
- `config: LLMProviderConfig` - Provider configuration

##### `getProvider(providerId?): LLMProvider | null`

Get provider by ID or active provider.

**Parameters:**
- `providerId?: string` - Optional provider ID (defaults to active)

**Returns:** Provider instance or null

##### `getAvailableProviders(): Array<ProviderInfo>`

Get list of all registered providers with status.

**Returns:** Array of provider information objects

##### `setActiveProvider(providerId: string): void`

Set the active provider for new requests.

**Parameters:**
- `providerId: string` - Provider ID to activate

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

**Parameters:**
- `request: ImageGenerationRequest` - Image generation parameters

**Returns:** Promise resolving to generated image information

##### `getSupportedModels?(): string[]`

Get list of supported models (optional).

**Returns:** Array of model identifiers

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

**Environment Variables:**
- `VITE_ANTHROPIC_API_KEY` - API key from environment

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

**Configuration:**
- `apiKey: string` - Google AI API key (required)
- `model?: string` - Model name (default: 'gemini-pro')
- `baseURL?: string` - API base URL

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

**Configuration:**
- `baseURL: string` - Local server URL (required)
- `model: string` - Model name (required)
- `apiFormat?: string` - API format (default: 'ollama')
- `apiKey?: string` - API key if required

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

**Configuration:**
- `apiKey: string` - Replicate API token (required)
- `model?: string` - Default model (default: 'black-forest-labs/flux-schnell')
- `defaultParameters?: object` - Default generation parameters

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

**Parameters:**
- `themeId: string` - Theme identifier

**Returns:** TerminalTheme object

#### `getAllThemes(): TerminalTheme[]`

Get all available themes.

**Returns:** Array of all theme objects

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

**Constructor Parameters:**
- `imageProvider: ImageProviderManager` - Image generation manager
- `database: ClaudiaDatabase` - Database instance
- `onStateChange?: function` - State change callback

**Methods:**

##### `parseAvatarCommands(text): {cleanText, commands}`

Parse `[AVATAR:...]` commands from text.

**Parameters:**
- `text: string` - Text potentially containing avatar commands

**Returns:** Object with cleaned text and parsed commands

##### `executeCommands(commands): Promise<void>`

Execute array of avatar commands.

**Parameters:**
- `commands: AvatarCommand[]` - Commands to execute

##### `getState(): AvatarState`

Get current avatar state.

**Returns:** Current avatar state object

##### `setState(newState): void`

Update avatar state.

**Parameters:**
- `newState: Partial<AvatarState>` - State updates to apply

### Avatar Display Component

#### `AvatarDisplay`

React component for displaying avatar.

```typescript
interface AvatarDisplayProps {
  state: AvatarState;
  className?: string;
}

const AvatarDisplay: React.FC<AvatarDisplayProps>;
```

**Props:**
- `state: AvatarState` - Current avatar state
- `className?: string` - Additional CSS classes

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

**Constructor Parameters:**
- `dbPath?: string` - Database file path (default: './claudia.db')

**Conversation Methods:**

##### `createConversation(conversation): string`

Create new conversation.

**Parameters:**
- `conversation: Omit<Conversation, 'id'>` - Conversation data without ID

**Returns:** Generated conversation ID

##### `getConversation(id): Conversation | null`

Get conversation by ID.

**Parameters:**
- `id: string` - Conversation ID

**Returns:** Conversation object or null if not found

##### `getAllConversations(): Conversation[]`

Get all conversations ordered by last update.

**Returns:** Array of conversation objects

**Message Methods:**

##### `addMessage(message): number`

Add message to conversation.

**Parameters:**
- `message: Omit<ConversationMessage, 'id'>` - Message data without ID

**Returns:** Generated message ID

##### `getMessages(conversationId): ConversationMessage[]`

Get all messages for conversation.

**Parameters:**
- `conversationId: string` - Conversation ID

**Returns:** Array of messages ordered by timestamp

**Settings Methods:**

##### `setSetting(key, value, type?): void`

Set application setting.

**Parameters:**
- `key: string` - Setting key
- `value: any` - Setting value
- `type?: string` - Value type (auto-detected if not provided)

##### `getSetting(key): any`

Get application setting.

**Parameters:**
- `key: string` - Setting key

**Returns:** Setting value or null if not found

**Avatar Cache Methods:**

##### `cacheAvatarImage(promptHash, imageUrl, parameters): void`

Cache generated avatar image.

**Parameters:**
- `promptHash: string` - Unique hash for generation parameters
- `imageUrl: string` - Generated image URL
- `parameters: Record<string, any>` - Generation parameters

##### `getCachedAvatar(promptHash): any`

Get cached avatar image.

**Parameters:**
- `promptHash: string` - Parameter hash

**Returns:** Cached avatar data or null

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

#### `LLMProviderConfig`

```typescript
interface LLMProviderConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  [key: string]: any;
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
  [key: string]: any;
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
  spacing: {
    padding: string;
    lineSpacing: string;
    characterSpacing: string;
  };
}
```

### Avatar Types

#### `AvatarPosition`

```typescript
type AvatarPosition = 
  | 'center' 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right'
  | 'beside-text'
  | 'overlay-left'
  | 'overlay-right'
  | 'floating'
  | 'peeking';
```

#### `AvatarExpression`

```typescript
type AvatarExpression = 
  | 'neutral'
  | 'happy'
  | 'curious'
  | 'focused'
  | 'thinking'
  | 'surprised'
  | 'confused'
  | 'excited'
  | 'confident'
  | 'mischievous'
  | 'sleepy'
  | 'shocked';
```

#### `AvatarAction`

```typescript
type AvatarAction = 
  | 'idle'
  | 'type'
  | 'search'
  | 'read'
  | 'wave'
  | 'nod'
  | 'shrug'
  | 'point'
  | 'think'
  | 'work';
```

#### `AvatarCommand`

```typescript
interface AvatarCommand {
  position?: AvatarPosition;
  expression?: AvatarExpression;
  action?: AvatarAction;
  gesture?: AvatarGesture;
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
  position: AvatarPosition;
  expression: AvatarExpression;
  pose: AvatarPose;
  action: AvatarAction;
  gesture?: AvatarGesture;
  scale: number;
  opacity: number;
  imageUrl?: string;
  isAnimating: boolean;
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
  metadata?: string;
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
  metadata?: string;
}
```

#### `MemoryEntry`

```typescript
interface MemoryEntry {
  id?: number;
  content: string;
  embedding?: string;
  type: 'conversation' | 'avatar' | 'system' | 'user_preference';
  timestamp: string;
  metadata?: string;
}
```

## Examples

### Basic LLM Usage

```typescript
import { LLMProviderManager } from './providers';

// Setup - providers auto-register and initialize from environment
const manager = new LLMProviderManager();
// Automatically initializes default provider if VITE_ANTHROPIC_API_KEY is set

// Generate response
const messages = [
  { role: 'user', content: 'Hello!' }
];

const response = await manager.getActiveProvider()?.generateResponse(messages);
console.log(response?.content);

// Or manually initialize with custom config
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
const text = "Hello! [AVATAR:position=center,expression=happy] How are you?";
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

---

This API reference provides complete documentation for all public interfaces in the Claudia framework. For implementation details, refer to the source code and inline comments.