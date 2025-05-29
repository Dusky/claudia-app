# Claudia

An AI terminal companion application built with React and TypeScript, featuring customizable retro terminal themes, interactive avatar system, and support for multiple AI providers.

## Overview

Claudia is a sophisticated terminal-style interface that combines the nostalgia of retro computing with modern AI capabilities. Users can interact with various AI providers through a command-line interface, customize their experience with authentic terminal themes from different computing eras, and engage with an AI-controlled avatar companion.

## Features

- **Multi-Provider AI Integration**: Support for Anthropic Claude, Google Gemini, and local LLM providers
- **Interactive Avatar System**: AI-controlled companion with dynamic expressions, poses, and image generation
- **Retro Terminal Themes**: Authentic themes from mainframe (70s), PC (80s), BBS (90s), and modern eras
- **Extensible Command System**: 30+ built-in commands with support for custom extensions
- **Persistent Storage**: Conversation history, settings, and avatar cache with browser-compatible storage
- **Advanced UI**: Lazy-loaded components, theme transitions, and CRT-style visual effects

## Installation

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Dusky/claudia-app.git
   cd claudia-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the project root:
   ```env
   # Required for AI functionality
   VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   VITE_REPLICATE_API_TOKEN=r8_your-token-here
   
   # Optional providers
   VITE_GOOGLE_API_KEY=your-google-api-key
   VITE_GOOGLE_IMAGE_API_KEY=your-google-image-key
   
   # Local LLM configuration (optional)
   VITE_OLLAMA_BASE_URL=http://localhost:11434
   VITE_LOCAL_LLM_MODEL=llama2
   
   # Application settings (optional)
   VITE_DEFAULT_THEME=mainframe70s
   VITE_DEBUG_MODE=false
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

## Usage

### Basic Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/help` | Display available commands | `/help` |
| `/theme <name>` | Switch terminal theme | `/theme pc80s` |
| `/themes` | List available themes | `/themes` |
| `/clear` | Clear terminal history | `/clear` |
| `/avatar <action>` | Control avatar display | `/avatar show` |
| `/imagine <prompt>` | Generate custom avatar image | `/imagine happy waving` |
| `/ask <question>` | Direct AI question | `/ask explain quantum computing` |

### Natural Conversation

Any input that doesn't start with `/` is sent directly to the active AI provider for natural conversation. The AI can control the avatar through special commands embedded in responses.

### Theme System

Choose from four authentic terminal themes:
- **mainframe70s**: Green phosphor display with scanlines
- **pc80s**: Blue IBM PC-style interface
- **bbs90s**: Colorful ANSI-style bulletin board system
- **modern**: Clean contemporary design

### Avatar Interaction

The avatar responds to AI commands automatically embedded in chat responses:
```
[AVATAR:expression=happy,action=wave,position=center]
```

### Status Bar Indicators & Color Codes

The status bar provides real-time system monitoring with the following indicators:

| Indicator | Description | Status Colors |
|-----------|-------------|---------------|
| **Theme** ⌘ | Current terminal theme | Click to switch themes |
| **Personality** 👤 | Active AI personality | Click to edit personality |
| **LLM** 💬 | Language model provider + latency | 🟢 Ready / 🔴 Needs API Key |
| **Image** 📷 | Image generation provider | 🟢 Ready / 🔴 Needs API Key |
| **Plugins** 🔌 | MCP plugin system health | 🟢 All healthy / 🟡 Some issues / 🔴 Problems |
| **Network** 🌐 | Online/offline status | 🟢 Online / 🔴 Offline |
| **FPS** 🎮 | Frame rate monitor | 🟢 ≥60fps / 🟡 30-59fps / 🔴 <30fps |
| **Tokens** 🧮 | Session token usage vs limits | 🟡 Near limit (>80%) |
| **Errors** ⚠️ | Unhandled error indicator | 🔴 Flashes on error |
| **Time** 🕐 | Current UTC time | HH:MM UTC format |

**Keyboard Shortcuts:**
- `Ctrl+B` - Toggle between compact and full status bar modes
- Responsive design automatically switches to compact mode on screens <600px

**Status Bar Modes:**
- **Full Mode**: Shows all indicators with labels
- **Compact Mode**: Essential indicators only, icons without labels

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start Vite dev server
npm run build        # TypeScript compilation + Vite build
npm run preview      # Preview production build

# Code Quality
npm run lint         # ESLint code linting
npm run typecheck    # TypeScript type checking

# Testing
npm run test         # Run test suite with Vitest
npm run test:ui      # Run tests with UI interface
```

### Project Structure

```
src/
├── avatar/           # Avatar system and image generation
├── commands/         # Extensible command registry
│   ├── builtin/      # Built-in commands
│   ├── core/         # Command execution engine
│   └── ai/           # AI integration handlers
├── components/       # React UI components
│   └── StatusBar/    # Status bar with indicators and monitoring
├── providers/        # Multi-provider architecture
│   ├── llm/          # LLM providers (Anthropic, Google, Local)
│   ├── image/        # Image generation providers
│   └── mcp/          # Model Context Protocol
├── storage/          # Data persistence layer
├── terminal/         # Terminal display and themes
├── store/            # Zustand state management
├── hooks/            # Custom React hooks (including monitoring hooks)
├── utils/            # Utility functions
└── types/            # TypeScript type definitions
```

### Adding New Commands

1. Create a command file in `src/commands/builtin/`
2. Implement the `Command` interface:
   ```typescript
   export const myCommand: Command = {
     name: 'mycommand',
     description: 'Description of the command',
     usage: '/mycommand <args>',
     async execute(args: string[], context: CommandContext) {
       // Command implementation
       return { success: true, lines: [] };
     }
   };
   ```
3. Register the command in `src/commands/index.ts`

### Adding New Providers

Implement the provider interface for LLM, Image, or MCP providers:

```typescript
export class MyLLMProvider implements LLMProvider {
  readonly id = 'my-provider';
  readonly name = 'My Provider';
  
  async initialize(config?: LLMProviderConfig): Promise<void> {
    // Provider initialization
  }
  
  async generateText(prompt: string, options?: any): Promise<string> {
    // Text generation implementation
  }
}
```

## Configuration

### Environment Variables

The application uses environment variables for configuration:

- **Required**: `VITE_ANTHROPIC_API_KEY` for Claude AI integration
- **Image Generation**: `VITE_REPLICATE_API_TOKEN` for avatar images
- **Optional**: Additional provider API keys for extended functionality

### Storage

- **Conversations**: Stored in browser localStorage with SQLite fallback
- **Settings**: Persistent user preferences and configuration
- **Avatar Cache**: Efficient image caching with automatic cleanup

## Architecture

### Core Principles

- **Provider-Based Architecture**: Pluggable providers for AI, image generation, and protocols
- **Command-Driven Interface**: Extensible command system with natural language fallback
- **Theme-Centric Design**: Visual themes that define the entire user experience
- **State-Driven UI**: Centralized state management with Zustand

### Key Technologies

- **Frontend**: React 19 with TypeScript 5.8
- **Build System**: Vite 6.3 with hot module replacement
- **State Management**: Zustand for predictable state updates
- **Styling**: CSS Modules with theme-based architecture
- **Storage**: Better-sqlite3 with localStorage fallback
- **Testing**: Vitest with React Testing Library

## Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following the existing code style
4. Add tests for new functionality
5. Run the full test suite: `npm run test`
6. Submit a pull request with a clear description

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Follow the configured linting rules
- **Testing**: Maintain or improve test coverage
- **Documentation**: Update documentation for new features

### Pull Request Guidelines

- Include a clear description of changes
- Reference any related issues
- Ensure all tests pass
- Follow the existing code style and conventions

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

For questions, issues, or feature requests:

- **Issues**: [GitHub Issues](https://github.com/Dusky/claudia-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Dusky/claudia-app/discussions)
- **Documentation**: Check the `docs/` directory for additional guides

## Acknowledgments

- Inspired by retro computing aesthetics and terminal interfaces
- Built with modern web technologies and AI integration
- Community contributions and feedback are greatly appreciated