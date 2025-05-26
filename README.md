# Claudia

An AI terminal companion built with React and TypeScript, featuring customizable retro themes, avatar interactions, and multiple LLM provider support.

## Features

- **Retro Terminal Interface** - Four authentic terminal themes from different computing eras
- **AI Conversation** - Support for Anthropic Claude, Google Gemini, and local LLMs
- **Interactive Avatar** - AI-controlled companion with expressions, poses, and image generation
- **Persistent Storage** - SQLite database for conversations, settings, and cache
- **Extensible Architecture** - Plugin system for adding new providers and themes

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   VITE_ANTHROPIC_API_KEY=your_key_here
   VITE_REPLICATE_API_TOKEN=your_token_here
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/theme <name>` | Switch terminal theme |
| `/clear` | Clear terminal history |
| `/avatar <action>` | Control avatar display |
| `/ask <question>` | Ask AI directly |

## Available Themes

- **mainframe70s** - Green on black with scanlines
- **pc80s** - Blue retro PC interface  
- **bbs90s** - Colorful ANSI-style terminal
- **modern** - Clean contemporary design

## API Providers

### LLM Providers
- **Anthropic Claude** - Primary AI provider
- **Google Gemini** - Alternative LLM option
- **Local LLM** - Ollama/OpenAI-compatible servers

### Image Generation
- **Replicate** - Avatar image generation

## Project Structure

```
src/
├── avatar/          # Avatar system and controls
├── commands/        # Command registry and built-ins
├── components/      # React UI components
├── providers/       # LLM and image provider integrations
├── storage/         # SQLite database layer
├── terminal/        # Terminal display and themes
└── types/           # TypeScript definitions
```

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## Configuration

Environment variables are loaded from `.env`:

```env
# Required for AI functionality
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
VITE_REPLICATE_API_TOKEN=r8_...

# Optional providers
VITE_GOOGLE_API_KEY=AIzaSy...

# Local LLM setup
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_LOCAL_LLM_MODEL=llama2

# Application settings
VITE_DEFAULT_THEME=mainframe70s
VITE_DEBUG_MODE=true
```

## Documentation

- [Setup Guide](docs/SETUP.md) - Detailed installation and configuration
- [Environment Configuration](docs/ENVIRONMENT.md) - API keys and settings
- [API Reference](docs/API_REFERENCE.md) - Complete API documentation

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Zustand (state management)
- SQLite (better-sqlite3)
- CSS Modules

## License

MIT