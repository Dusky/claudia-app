# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev          # Start Vite dev server on localhost:5173
npm run build        # TypeScript compilation + Vite build  
npm run lint         # ESLint code linting
npm run preview      # Preview production build

# No test command configured yet
```

## Architecture Overview

This is a React TypeScript application for an AI terminal companion called "Claudia" with avatar support, advanced command system, and multiple provider integrations.

### Core Systems

**Command System**: Full `/command` syntax with extensible command registry
- `src/commands/registry.ts` - Command registration and execution engine
- `src/commands/builtin/` - Built-in commands (help, theme, avatar, AI integration)
- Supports `/help`, `/theme`, `/avatar`, `/imagine`, `/ask`, `/clear`
- Non-command input automatically goes to AI for natural conversation
- Easy to add new commands by implementing `Command` interface

**AI Integration**: Full LLM provider integration with conversation flow
- `src/providers/llm/manager.ts` - Multi-provider AI system (Anthropic, Google, Local)
- `src/commands/builtin/ai.ts` - AI conversation handling
- Any non-command input goes directly to AI with Claudia personality
- Supports avatar commands in AI responses: `[AVATAR:expression=happy,action=wave]`

**Avatar System**: AI-controlled avatar with dynamic image generation
- `src/avatar/AvatarController.ts` - Parses `[AVATAR:...]` commands from AI responses
- `src/commands/builtin/avatar.ts` - Manual avatar control commands
- Automatic image generation based on expression, pose, action states
- LocalStorage-based caching for generated images (browser-compatible)
- Commands: `[AVATAR:position=center,expression=happy,action=wave]`

**Enhanced Terminal Interface**: Multi-theme terminal with advanced styling
- `src/terminal/TerminalDisplay.tsx` - Advanced terminal with data attributes for styling
- `src/terminal/themes.ts` - 4 era-based themes with unique effects
- `src/App.css` - Enhanced styling with animated backgrounds, shader effects, glow
- Theme-specific backgrounds and visual effects
- Responsive design and accessibility features

**Storage Layer**: Browser-compatible persistence
- `src/storage/mockDatabase.ts` - LocalStorage-based database for browser compatibility
- Conversation history, settings, avatar cache
- Graceful fallback from Node.js SQLite to browser storage

### Command System Usage

**Built-in Commands:**
- `/help` - Show available commands
- `/theme <name>` - Switch themes (mainframe70s, pc80s, bbs90s, modern)
- `/themes` - List available themes  
- `/clear` - Clear terminal
- `/avatar <action>` - Control avatar (show, hide, expression, position, etc.)
- `/imagine <prompt>` - Generate custom avatar image
- `/ask <question>` - Direct AI question (optional, since any non-command goes to AI)

**Adding New Commands:**
1. Create command in `src/commands/builtin/`
2. Implement `Command` interface with `execute()` method
3. Register in `src/commands/index.ts`
4. Commands have access to LLM, image providers, avatar controller via `CommandContext`

### Current Implementation Status

- ✅ Full command system with `/command` syntax
- ✅ AI integration with natural conversation flow
- ✅ Avatar system with AI-controlled commands
- ✅ Enhanced styling with backgrounds and shader effects
- ✅ Browser-compatible storage system
- ✅ Multi-provider LLM support (Anthropic, Google, Local)
- ✅ Image generation integration (Replicate, Google AI)
- ✅ Multi-theme terminal interface

### Environment Variables Required

```bash
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
VITE_REPLICATE_API_TOKEN=r8_...
VITE_GOOGLE_API_KEY=...        # Optional - for Google LLM provider
VITE_GOOGLE_IMAGE_API_KEY=...  # Optional - for Google Image provider (separate from LLM)
VITE_DEBUG_MODE=true           # Optional
```

### Key Integration Points

**Message Flow:**
1. User input → check if starts with `/`
2. If command: execute via command registry
3. If not command: send to AI with Claudia personality
4. AI responses parsed for `[AVATAR:...]` commands
5. Avatar commands executed automatically
6. Terminal displays all output with enhanced styling

**Adding AI-Powered Commands:**
Set `requiresAI: true` in command definition to ensure AI provider is available.
Access via `context.llmManager.getActiveProvider()`.

**Adding Image Generation Commands:**
Set `requiresImageGen: true` in command definition to ensure image provider is available.
Access via `context.imageManager.getActiveProvider()`.

The system is now fully functional with AI conversation, avatar control, advanced commands, and enhanced visual styling.