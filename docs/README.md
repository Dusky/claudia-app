# Claudia Framework Documentation

This documentation covers the architecture, usage, and extension of the Claudia AI terminal companion framework.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Core Systems](#core-systems)
5. [Provider System](#provider-system)
6. [Avatar System](#avatar-system)
7. [Terminal & Themes](#terminal--themes)
8. [Storage System](#storage-system)
9. [Configuration](#configuration)
10. [Extending the Framework](#extending-the-framework)
11. [API Reference](#api-reference)

## Additional Documentation

- **[Commands Reference](./COMMANDS_REFERENCE.md)** - Complete guide to all 30+ built-in commands
- **[CRT Canvas Terminal](./CRT_CANVAS_TERMINAL.md)** - Advanced CRT terminal effects and configuration
- **[MCP Integration](./MCP_INTEGRATION.md)** - Model Context Protocol tools and development
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Setup Guide](./SETUP.md)** - Installation and configuration
- **[Environment Configuration](./ENVIRONMENT.md)** - Environment variables and settings
- **[Replicate Provider](./REPLICATE_PROVIDER.md)** - Image generation provider documentation

## Overview

Claudia is a framework for building AI terminal companions with visual avatars and customizable interfaces. The system provides modular components for AI integration, image generation, persistent storage, and themed terminal displays.

### Key Features

- Multi-provider LLM support (Anthropic, Google, Local)
- Model Context Protocol (MCP) integration
- Advanced CRT Canvas Terminal with realistic effects
- Four retro terminal themes with visual effects
- Dynamic avatar system with AI control
- Browser-compatible LocalStorage persistence
- Extensible command system with 30+ built-in commands
- React TypeScript implementation with Vite

## Architecture

```
claudia-app/
├── src/
│   ├── providers/           # API provider integrations
│   │   ├── llm/            # LLM providers (Anthropic, Google, Local)
│   │   ├── image/          # Image generation providers
│   │   └── mcp/            # Model Context Protocol integration
│   ├── commands/           # Extensible command system
│   │   ├── builtin/        # Built-in commands (30+)
│   │   └── core/           # Command registry and types
│   ├── terminal/           # Terminal interface and CRT effects
│   │   ├── canvas/         # Advanced CRT Canvas Terminal
│   │   └── themes.ts       # Four era-based themes
│   ├── avatar/             # Avatar controller and display
│   ├── storage/            # Browser storage (LocalStorage-based)
│   ├── components/         # React UI components
│   ├── hooks/              # React hooks for app functionality
│   ├── store/              # Zustand state management
│   └── utils/              # Utility functions
├── docs/                   # Documentation
└── package.json
```

### Design Principles

1. **Modularity** - Independent, replaceable systems
2. **Extensibility** - Easy addition of providers and features
3. **Type Safety** - Full TypeScript coverage
4. **Performance** - Cached operations and efficient rendering
5. **Immersion** - Authentic terminal aesthetics

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Modern browser with ES2020+ support

### Installation

```bash
# Clone and install
git clone <repo-url>
cd claudia-app
npm install

# Configure environment
cp .env.example .env
# Add API keys to .env file

# Start development
npm run dev
```

The application runs at `http://localhost:5173/`

### Essential Commands

```bash
# Core Commands
/help                    # Show available commands
/clear                   # Clear terminal history
/themes                  # List all available themes
/theme <name>           # Switch terminal theme

# AI & Conversation
/ask <question>         # Direct AI question
/retry                  # Retry last AI response
/continue               # Continue conversation
/personality gui        # Open personality editor

# Avatar Control
/avatar show            # Show avatar
/avatar hide            # Hide avatar
/imagine <prompt>       # Generate custom avatar image

# System & Configuration
/providers              # List provider status
/config                 # Open configuration
/tools                  # List available MCP tools
/mcp                    # MCP server management
/crt                    # CRT terminal effects
```

## Core Systems

### Provider System

Extensible integration with AI services through common interfaces:

```typescript
interface LLMProvider {
  name: string;
  id: string;
  initialize(config: LLMProviderConfig): Promise<void>;
  generateResponse(messages: LLMMessage[]): Promise<LLMResponse>;
  isConfigured(): boolean;
}

interface ImageProvider {
  name: string;
  id: string;
  initialize(config: ImageProviderConfig): Promise<void>;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
  isConfigured(): boolean;
}
```

### Terminal System

Authentic retro computing experience with:

- Period-accurate theming
- Visual effects (scanlines, CRT curvature, glow)
- Real-time command processing
- Persistent conversation history

### Avatar System

Dynamic visual companion with:

- AI control through embedded commands
- Expression and pose system
- Image generation and caching
- Smooth animations

### Storage System

Browser-compatible LocalStorage persistence for:

- Conversation history and management
- User settings and preferences
- Avatar image cache with cleanup
- Personality profiles
- MCP tool configurations
- Theme and display settings

## Provider System

### LLM Providers

#### Anthropic Claude

```typescript
const anthropic = new AnthropicProvider();
await anthropic.initialize({
  apiKey: 'your-api-key',
  model: 'claude-3-sonnet-20240229'
});
```

#### Google Gemini

```typescript
const google = new GoogleProvider();
await google.initialize({
  apiKey: 'your-api-key',
  model: 'gemini-pro'
});
```

#### Local LLM

```typescript
const local = new LocalProvider();
await local.initialize({
  baseURL: 'http://localhost:11434',
  model: 'llama2',
  apiFormat: 'ollama'
});
```

### Image Providers

#### Replicate

```typescript
const replicate = new ReplicateProvider();
await replicate.initialize({
  apiKey: 'your-replicate-token',
  model: 'black-forest-labs/flux-schnell'
});
```

### Provider Management

```typescript
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

AI can control the avatar through embedded commands:

```typescript
// Basic positioning and expression
[AVATAR:expression=happy,action=wave]

// Complex sequences
[AVATAR:expression=thinking,action=type,pose=sitting]

// Visibility control
[AVATAR:hide=true]
[AVATAR:show=true,expression=excited]

// Effects
[AVATAR:expression=curious,pulse=true,scale=1.2]
```

### Avatar Parameters

#### Expressions
- `neutral`, `happy`, `curious`, `focused`, `thinking`
- `surprised`, `confused`, `excited`, `confident`
- `mischievous`, `sleepy`, `shocked`

#### Actions
- `idle`, `type`, `search`, `read`, `wave`
- `nod`, `shrug`, `point`, `think`, `work`

#### Poses
- `standing`, `sitting`, `leaning`
- `crossed-arms`, `hands-on-hips`, `casual`

### Avatar Controller Usage

```typescript
const avatarController = new AvatarController(
  imageManager,
  database,
  (state) => updateAvatarDisplay(state)
);

// Parse AI response for commands
const { cleanText, commands } = avatarController.parseAvatarCommands(
  "Hello! [AVATAR:expression=happy] How can I help?"
);

// Execute commands
await avatarController.executeCommands(commands);
```

## Terminal & Themes

### Theme System

Each theme provides complete visual styling:

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
  };
  font: {
    family: string;
    size: string;
    weight: string;
  };
  effects: {
    scanlines: boolean;
    glow: boolean;
    flicker: boolean;
    crt: boolean;
  };
}
```

### Available Themes

#### 70s Mainframe (`mainframe70s`)
- Colors: Green on black
- Font: IBM Plex Mono
- Effects: Scanlines, glow, CRT curvature

#### 80s Personal Computer (`pc80s`)
- Colors: White on blue
- Font: Perfect DOS VGA 437
- Effects: CRT curvature

#### 90s BBS (`bbs90s`)
- Colors: Full color palette
- Font: MS-DOS Terminal
- Effects: Scanlines, glow, flicker, noise

#### Modern Terminal (`modern`)
- Colors: Modern dark theme
- Font: JetBrains Mono
- Effects: Clean, no retro effects

### Theme Usage

```typescript
import { getTheme, getAllThemes } from './terminal';

// Get specific theme
const theme = getTheme('mainframe70s');

// List all themes
const themes = getAllThemes();

// Use in component
<TerminalDisplay theme={theme} lines={lines} />
```

## Database & Storage

### Storage Schema

LocalStorage collections:

- **conversations** - Chat sessions with metadata
- **messages** - Individual messages with roles
- **settings** - Application configuration
- **avatar_cache** - Cached avatar images with TTL
- **personalities** - AI personality profiles
- **mcp_tools** - MCP tool configurations

### Database Usage

```typescript
import { ClaudiaDatabase } from './storage';

const db = new ClaudiaDatabase(); // Browser-compatible, no file path needed

// Conversation management
const convId = db.createConversation({
  title: 'New Chat',
  createdAt: new Date().toISOString()
});

// Message storage
db.addMessage({
  conversationId: convId,
  role: 'user',
  content: 'Hello Claudia!',
  timestamp: new Date().toISOString()
});

// Settings
db.setSetting('theme', 'mainframe70s');
const theme = db.getSetting('theme');

// Avatar caching with TTL
db.cacheAvatarImage(hash, imageUrl, parameters);
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

#### Required for Full Functionality

```env
# Anthropic Claude
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-key

# Replicate for avatar generation
VITE_REPLICATE_API_TOKEN=r8_your-token
```

#### Optional Configuration

```env
# Alternative providers
VITE_GOOGLE_API_KEY=your-google-key
VITE_OPENAI_API_KEY=your-openai-key

# Application settings
VITE_DEFAULT_THEME=mainframe70s
VITE_DEFAULT_LLM_PROVIDER=anthropic
VITE_DEBUG_MODE=true

# Local LLM
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_LOCAL_LLM_MODEL=llama2
```

## Extending the Framework

### Adding New LLM Providers

1. **Create Provider Class**:

```typescript
export class CustomLLMProvider implements LLMProvider {
  name = 'Custom LLM';
  id = 'custom';
  
  async initialize(config: any): Promise<void> {
    // Initialize provider
  }
  
  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    // Implement API call
    return { content: response };
  }
  
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
```

2. **Register Provider**:

```typescript
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
  },
  // Additional properties
};
```

2. **Add to Registry**:

```typescript
// In themes.ts
export const themes = {
  // existing themes
  mytheme: myTheme
};
```

### Adding Avatar Features

1. **Extend Types**:

```typescript
export type AvatarExpression = 
  | 'existing expressions'
  | 'my-new-expression';
```

2. **Update Controller**:

```typescript
private getExpressionDescription(expression: string): string {
  const descriptions = {
    'my-new-expression': 'description for AI prompt'
  };
}
```

## API Reference

### LLM Provider Interface

```typescript
interface LLMProvider {
  name: string;
  id: string;
  initialize(config: LLMProviderConfig): Promise<void>;
  generateResponse(messages: LLMMessage[], options?: LLMGenerationOptions): Promise<LLMResponse>;
  isConfigured(): boolean;
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
}

interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
}

interface ImageGenerationResponse {
  imageUrl: string;
  seed?: number;
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
  expression?: AvatarExpression;
  action?: AvatarAction;
  pose?: AvatarPose;
  hide?: boolean;
  show?: boolean;
  scale?: number;
  duration?: number;
}

interface AvatarState {
  visible: boolean;
  expression: AvatarExpression;
  pose: AvatarPose;
  action: AvatarAction;
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
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface MemoryEntry {
  id?: number;
  content: string;
  type: 'conversation' | 'avatar' | 'system';
  timestamp: string;
}
```

## Documentation Structure

This documentation is organized into several focused guides:

### Getting Started
- **[Setup Guide](./SETUP.md)** - Complete installation and setup process
- **[Environment Configuration](./ENVIRONMENT.md)** - API keys and configuration
- **[Commands Reference](./COMMANDS_REFERENCE.md)** - All available commands

### Advanced Features
- **[CRT Canvas Terminal](./CRT_CANVAS_TERMINAL.md)** - Advanced terminal effects
- **[MCP Integration](./MCP_INTEGRATION.md)** - External tool integration
- **[Replicate Provider](./REPLICATE_PROVIDER.md)** - Image generation

### Development
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- Main README (this file) - Architecture and core concepts

This documentation provides comprehensive coverage of the Claudia framework. For implementation details, refer to the source code and inline comments.