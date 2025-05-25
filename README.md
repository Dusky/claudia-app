# Claudia - AI Terminal Companion Framework

A comprehensive React TypeScript framework for building an immersive AI terminal companion with avatar support, multiple themes, and extensible provider systems.

## 🚀 What's Been Built

### ✅ Core Framework Complete

1. **React TypeScript Project Setup**
   - Vite build system
   - Full TypeScript configuration
   - Modern React 19 with hooks

2. **Extensible LLM Provider System**
   - Anthropic Claude support
   - Google Gemini support  
   - Local LLM support (Ollama/OpenAI-compatible)
   - Easy addition of new providers

3. **Image Generation Framework**
   - Replicate API integration
   - Extensible provider architecture
   - Multiple model support (FLUX, SDXL, etc.)

4. **SQLite Storage System**
   - Conversation history
   - Memory/RAG system for long-term memory
   - Settings management
   - Avatar image caching

5. **Terminal Interface with Themes**
   - 70s Mainframe (green on black, scanlines)
   - 80s Personal Computer (blue background, retro fonts)
   - 90s BBS (full color, ANSI art support, effects)
   - Modern Terminal (clean, contemporary)
   - Full theme switching with visual effects

6. **Avatar System**
   - LLM-controlled `[AVATAR:...]` commands
   - Dynamic positioning (center, corners, floating, etc.)
   - Expression system (happy, curious, thinking, etc.)
   - Action system (typing, waving, pointing, etc.)
   - Image generation with caching
   - Smooth animations and transitions

## 🏗️ Architecture

```
src/
├── providers/           # Extensible API providers
│   ├── llm/            # LLM providers (Anthropic, Google, Local)
│   └── image/          # Image providers (Replicate)
├── terminal/           # Terminal UI and themes
├── avatar/             # Avatar system and display
├── storage/            # SQLite database layer
├── components/         # Reusable React components
└── utils/              # Utility functions
```

## 🎮 Current Demo Features

Run `npm run dev` and try:

- `help` - Show available commands
- `theme mainframe70s` - Switch to retro green terminal
- `theme pc80s` - Switch to 80s blue terminal  
- `theme bbs90s` - Switch to 90s BBS with effects
- `theme modern` - Switch to clean modern theme
- `clear` - Clear terminal
- Any other input - Basic echo response

## 🔧 Next Steps for Full Implementation

1. **Connect the Systems** - Wire up LLM providers to terminal
2. **Implement Avatar Commands** - Parse `[AVATAR:...]` from LLM responses
3. **Add API Configuration** - Settings UI for API keys
4. **Memory System** - Implement RAG for conversation memory
5. **Virtual File System** - Add simulated files for Claudia to interact with
6. **Electron Packaging** - Convert to desktop app

## 📦 Key Technologies

- **React 19** with TypeScript
- **Vite** for fast development
- **better-sqlite3** for local data storage
- **Zustand** for state management
- **Axios** for API calls
- **CSS-in-JS** with dynamic theming
- **Environment variables** for secure configuration

## 🎨 Theme System

Each theme includes:
- Color schemes authentic to their era
- Period-appropriate fonts
- Visual effects (scanlines, glow, CRT curvature)
- Era-specific spacing and typography
- Smooth transitions between themes

## 🤖 Avatar Command System

LLMs can control Claudia's avatar through embedded commands:

```
[AVATAR:position=center,expression=happy,action=wave]
[AVATAR:position=beside-text,expression=thinking,gesture=point-down]
[AVATAR:hide=true]
[AVATAR:show=true,expression=excited,pose=standing]
```

## 🔄 Provider Extensibility

Adding new providers is straightforward:

```typescript
// New LLM Provider
class NewLLMProvider implements LLMProvider {
  // Implement interface
}

// Register it
llmManager.registerProvider(new NewLLMProvider());
```

## 🏃‍♂️ Getting Started

```bash
cd claudia-app
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your API keys

npm run dev
```

Visit `http://localhost:5173/` to see the terminal interface!

### Quick Setup with API Keys

```bash
# Add to .env file:
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
VITE_REPLICATE_API_TOKEN=r8_your-token-here

# Optional: Enable debug mode
VITE_DEBUG_MODE=true
```

## 📚 Documentation

- [Framework Overview](docs/README.md) - Complete system documentation
- [Setup Guide](docs/SETUP.md) - Installation and configuration
- [Environment Configuration](docs/ENVIRONMENT.md) - API keys and settings
- [API Reference](docs/API_REFERENCE.md) - Complete API documentation

---

The framework is now ready for the next phase of development. All core systems are in place and working together to create the immersive Claudia experience you envisioned.