# Claudia Framework Documentation

Welcome to the Claudia AI Terminal Companion framework documentation. This guide covers everything you need to understand, extend, and build upon the framework.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Core Systems](#core-systems)
5. [Provider System](#provider-system)
6. [Avatar System](#avatar-system)
7. [Terminal & Themes](#terminal--themes)
8. [Database & Storage](#database--storage)
9. [Configuration](#configuration)
10. [Extending the Framework](#extending-the-framework)
11. [API Reference](#api-reference)

## Overview

Claudia is a comprehensive framework for building immersive AI terminal companions. The framework provides:

- **Extensible LLM Integration** - Support for multiple AI providers
- **Dynamic Avatar System** - AI-controlled visual companion
- **Authentic Terminal Themes** - Period-accurate terminal aesthetics
- **Persistent Memory** - SQLite-based conversation and memory storage
- **Cache-First Architecture** - Efficient image generation and storage

### Key Features

- 🤖 **Multi-Provider LLM Support** - Anthropic, Google, Local LLMs
- 🎨 **4 Retro Terminal Themes** - 70s, 80s, 90s, Modern
- 👤 **Dynamic Avatar System** - Expression, pose, and action control
- 💾 **SQLite Storage** - Conversations, memory, settings, cache
- 🔧 **Extensible Architecture** - Easy to add new providers and features
- ⚡ **React + TypeScript** - Modern, type-safe development

## Architecture

```
claudia-app/
├── src/
│   ├── providers/           # Extensible API providers
│   │   ├── llm/            # LLM providers (Anthropic, Google, Local)
│   │   │   ├── types.ts    # Common interfaces
│   │   │   ├── anthropic.ts
│   │   │   ├── google.ts
│   │   │   ├── local.ts
│   │   │   └── manager.ts  # Provider management
│   │   └── image/          # Image generation providers
│   │       ├── types.ts    # Common interfaces
│   │       ├── replicate.ts
│   │       └── manager.ts  # Provider management
│   ├── terminal/           # Terminal UI and themes
│   │   ├── TerminalDisplay.tsx
│   │   ├── themes.ts       # Theme definitions
│   │   └── index.ts
│   ├── avatar/             # Avatar system
│   │   ├── types.ts        # Avatar interfaces
│   │   ├── AvatarController.ts
│   │   ├── AvatarDisplay.tsx
│   │   └── index.ts
│   ├── storage/            # Database layer
│   │   ├── database.ts     # SQLite operations
│   │   └── index.ts
│   ├── components/         # Reusable components
│   ├── utils/              # Utility functions
│   └── App.tsx             # Main application
├── docs/                   # Documentation
└── package.json
```

### Design Principles

1. **Modularity** - Each system is independent and replaceable
2. **Extensibility** - Easy to add new providers, themes, features
3. **Type Safety** - Full TypeScript coverage with strict typing
4. **Performance** - Cache-first architecture, efficient rendering
5. **Immersion** - Authentic terminal aesthetics with modern functionality

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- Modern browser with ES2020+ support

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd claudia-app

# Install dependencies
npm install

# Set up environment configuration
cp .env.example .env
# Edit .env and add your API keys (see Configuration section)

# Start development server
npm run dev
```

The terminal interface will be available at `http://localhost:5173/`

### Basic Commands

Try these commands in the terminal:

```bash
help                    # Show available commands
theme mainframe70s      # Switch to 70s green terminal
theme pc80s            # Switch to 80s blue terminal
theme bbs90s           # Switch to 90s BBS with effects
theme modern           # Switch to modern terminal
clear                  # Clear terminal history
```

## Core Systems

### 1. Provider System

The provider system enables extensible integration with different AI services:

```typescript
// LLM Provider Interface
interface LLMProvider {
  name: string;
  id: string;
  initialize(config: LLMProviderConfig): Promise<void>;
  generateResponse(messages: LLMMessage[]): Promise<LLMResponse>;
  isConfigured(): boolean;
}

// Image Provider Interface  
interface ImageProvider {
  name: string;
  id: string;
  initialize(config: ImageProviderConfig): Promise<void>;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
  isConfigured(): boolean;
}
```

### 2. Terminal System

The terminal provides an authentic retro computing experience:

- **Authentic Theming** - Period-accurate colors, fonts, effects
- **Visual Effects** - Scanlines, CRT curvature, glow, flicker
- **Responsive Input** - Real-time command processing
- **History Management** - Persistent conversation history

### 3. Avatar System

The avatar system provides dynamic visual feedback:

- **LLM Control** - AI can control avatar through `[AVATAR:...]` commands
- **Expression System** - 12 different expressions
- **Positioning** - 9 different screen positions
- **Animation** - Smooth transitions and gesture animations
- **Caching** - Intelligent image caching for performance

### 4. Storage System

SQLite-based storage for all persistent data:

- **Conversations** - Full chat history with metadata
- **Memory** - Long-term memory for RAG implementation
- **Settings** - User preferences and configuration
- **Avatar Cache** - Generated avatar images with parameters

## Provider System

### LLM Providers

#### Anthropic Claude

```typescript
import { AnthropicProvider } from './providers';

const anthropic = new AnthropicProvider();
await anthropic.initialize({
  apiKey: 'your-api-key',
  model: 'claude-3-sonnet-20240229'
});
```

#### Google Gemini

```typescript
import { GoogleProvider } from './providers';

const google = new GoogleProvider();
await google.initialize({
  apiKey: 'your-api-key',
  model: 'gemini-pro'
});
```

#### Local LLM

```typescript
import { LocalProvider } from './providers';

const local = new LocalProvider();
await local.initialize({
  baseURL: 'http://localhost:11434',
  model: 'llama2',
  apiFormat: 'ollama' // or 'openai-compatible'
});
```

### Image Providers

#### Replicate

```typescript
import { ReplicateProvider } from './providers';

const replicate = new ReplicateProvider();
await replicate.initialize({
  apiKey: 'your-replicate-token',
  model: 'black-forest-labs/flux-schnell'
});
```

### Provider Management

```typescript
import { LLMProviderManager, ImageProviderManager } from './providers';

// LLM Provider Management
const llmManager = new LLMProviderManager();
await llmManager.initializeProvider('anthropic', { apiKey: 'key' });
llmManager.setActiveProvider('anthropic');

// Image Provider Management
const imageManager = new ImageProviderManager();
await imageManager.initializeProvider('replicate', { apiKey: 'key' });
```

## Avatar System

### Avatar Commands

LLMs can control Claudia's avatar through embedded commands in their responses:

```typescript
// Basic positioning and expression
[AVATAR:position=center,expression=happy]

// Complex animation sequence
[AVATAR:position=beside-text,expression=thinking,action=type,gesture=point-down]

// Visibility control
[AVATAR:hide=true]
[AVATAR:show=true,expression=excited]

// Advanced effects
[AVATAR:position=floating,expression=curious,pulse=true,scale=1.2]
```

### Avatar Parameters

#### Positions
- `center` - Center of screen, larger size
- `top-left`, `top-right`, `bottom-left`, `bottom-right` - Corner positions
- `beside-text` - Right side, next to terminal content
- `overlay-left`, `overlay-right` - Overlay positions
- `floating` - Center with floating animation
- `peeking` - Bottom edge, partially visible

#### Expressions
- `neutral`, `happy`, `curious`, `focused`, `thinking`
- `surprised`, `confused`, `excited`, `confident`
- `mischievous`, `sleepy`, `shocked`

#### Actions
- `idle`, `type`, `search`, `read`, `wave`
- `nod`, `shrug`, `point`, `think`, `work`

#### Gestures
- `point-down`, `point-up`, `point-left`, `point-right`
- `thumbs-up`, `wave`, `peace`, `ok`, `shrug`

### Avatar Controller Usage

```typescript
import { AvatarController } from './avatar';

const avatarController = new AvatarController(
  imageManager,
  database,
  (state) => updateAvatarDisplay(state)
);

// Parse LLM response for avatar commands
const { cleanText, commands } = avatarController.parseAvatarCommands(
  "Hello! [AVATAR:position=center,expression=happy] How can I help you today?"
);

// Execute the commands
await avatarController.executeCommands(commands);
```

## Terminal & Themes

### Theme System

Each theme provides a complete visual experience:

```typescript
interface TerminalTheme {
  id: string;
  name: string;
  era: string;
  colors: {
    background: string;
    foreground: string;
    cursor: string;
    accent: string;
    // ... more colors
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

### Available Themes

#### 70s Mainframe (`mainframe70s`)
- **Colors**: Green on black
- **Font**: IBM Plex Mono
- **Effects**: Scanlines, glow, CRT curvature
- **Feel**: Classic mainframe terminal

#### 80s Personal Computer (`pc80s`)
- **Colors**: White on blue
- **Font**: Perfect DOS VGA 437
- **Effects**: CRT curvature
- **Feel**: Home computer era

#### 90s BBS (`bbs90s`)
- **Colors**: Full color palette
- **Font**: MS-DOS Terminal
- **Effects**: Scanlines, glow, flicker, noise
- **Feel**: Bulletin board system

#### Modern Terminal (`modern`)
- **Colors**: Modern dark theme
- **Font**: JetBrains Mono
- **Effects**: Clean, no retro effects
- **Feel**: Contemporary terminal

### Theme Usage

```typescript
import { getTheme, getAllThemes } from './terminal';

// Get specific theme
const theme = getTheme('mainframe70s');

// List all available themes
const themes = getAllThemes();

// Use in component
<TerminalDisplay theme={theme} lines={lines} />
```

## Database & Storage

### Database Schema

The SQLite database includes these tables:

- **conversations** - Chat sessions with metadata
- **messages** - Individual messages with roles and content
- **memory** - Long-term memory entries for RAG
- **settings** - Application configuration
- **avatar_cache** - Cached avatar images with parameters

### Database Usage

```typescript
import { ClaudiaDatabase } from './storage';

const db = new ClaudiaDatabase('./claudia.db');

// Conversation management
const convId = db.createConversation({
  title: 'New Chat',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// Message storage
db.addMessage({
  conversationId: convId,
  role: 'user',
  content: 'Hello Claudia!',
  timestamp: new Date().toISOString()
});

// Settings management
db.setSetting('theme', 'mainframe70s');
const theme = db.getSetting('theme');

// Avatar caching
db.cacheAvatarImage(promptHash, imageUrl, parameters);
const cached = db.getCachedAvatar(promptHash);
```

## Configuration

### Environment Variables

Claudia uses environment variables for secure configuration. Copy the example file and add your API keys:

```bash
cp .env.example .env
```

#### Required for Full Functionality

```env
# Anthropic Claude (recommended LLM)
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Replicate (for avatar generation)
VITE_REPLICATE_API_TOKEN=r8_your-token-here
```

#### Optional Configuration

```env
# Alternative LLM providers
VITE_GOOGLE_API_KEY=AIzaSy-your-key-here
VITE_OPENAI_API_KEY=sk-your-key-here

# Application settings
VITE_DEFAULT_THEME=mainframe70s
VITE_DEFAULT_LLM_PROVIDER=anthropic
VITE_DEBUG_MODE=true

# Local LLM settings
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_LOCAL_LLM_MODEL=llama2
```

See [Environment Configuration Guide](./ENVIRONMENT.md) for complete documentation.

### Automatic Provider Configuration

Providers automatically initialize from environment variables:

```typescript
// No configuration needed - uses environment variables
const manager = new LLMProviderManager();
// Automatically initializes default provider if API key is present

// Or override with custom config
await manager.initializeProvider('anthropic', {
  apiKey: 'custom-key',
  model: 'claude-3-opus-20240229'
});
```

## Extending the Framework

### Adding New LLM Providers

1. **Create Provider Class**:

```typescript
import { LLMProvider, LLMMessage, LLMResponse } from './types';

export class CustomLLMProvider implements LLMProvider {
  name = 'Custom LLM';
  id = 'custom';
  
  async initialize(config: any): Promise<void> {
    // Initialize your provider
  }
  
  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    // Implement your API call
    return { content: response };
  }
  
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
```

2. **Register Provider**:

```typescript
import { LLMProviderManager } from './providers';

const manager = new LLMProviderManager();
manager.registerProvider(new CustomLLMProvider());
```

### Adding New Themes

1. **Define Theme**:

```typescript
const myTheme: TerminalTheme = {
  id: 'mytheme',
  name: 'My Theme',
  era: '2000s',
  colors: {
    background: '#000000',
    foreground: '#ffffff',
    // ... more colors
  },
  // ... rest of theme definition
};
```

2. **Add to Theme Registry**:

```typescript
// In themes.ts
export const themes = {
  // ... existing themes
  mytheme: myTheme
};
```

### Adding New Avatar Features

1. **Extend Avatar Types**:

```typescript
// Add new expression
export type AvatarExpression = 
  | 'existing expressions...'
  | 'my-new-expression';

// Add new action
export type AvatarAction = 
  | 'existing actions...'
  | 'my-new-action';
```

2. **Update Avatar Controller**:

```typescript
// Add description mappings
private getExpressionDescription(expression: string): string {
  const descriptions = {
    // ... existing descriptions
    'my-new-expression': 'description for prompt'
  };
  // ...
}
```

## API Reference

### LLM Provider Interface

```typescript
interface LLMProvider {
  name: string;                    // Human-readable name
  id: string;                      // Unique identifier
  initialize(config: LLMProviderConfig): Promise<void>;
  generateResponse(messages: LLMMessage[], options?: LLMGenerationOptions): Promise<LLMResponse>;
  isConfigured(): boolean;         // Check if properly configured
}

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}
```

### Image Provider Interface

```typescript
interface ImageProvider {
  name: string;
  id: string;
  initialize(config: ImageProviderConfig): Promise<void>;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
  isConfigured(): boolean;
  getSupportedModels?(): string[];
}

interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
}

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

### Avatar System Interface

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

### Database Interface

```typescript
interface ConversationMessage {
  id?: number;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata?: string;
}

interface MemoryEntry {
  id?: number;
  content: string;
  embedding?: string;
  type: 'conversation' | 'avatar' | 'system' | 'user_preference';
  timestamp: string;
  metadata?: string;
}
```

---

This documentation provides the foundation for understanding and extending the Claudia framework. For specific implementation details, refer to the source code and inline comments.