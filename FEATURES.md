# Features Documentation

This document provides a comprehensive overview of all features and capabilities available in the Claudia application.

## Core Interface

### Terminal Interface
- **Multi-theme terminal display** with authentic retro computing aesthetics
- **Command-line interface** supporting slash commands and natural language input
- **Persistent conversation history** stored locally with browser compatibility
- **Real-time input processing** with command validation and syntax highlighting
- **Responsive design** adapting to various screen sizes and orientations

### Command System
- **Extensible command registry** supporting 30+ built-in commands
- **Context-aware command execution** with access to all application services
- **Command auto-completion** and help system
- **Error handling and validation** for all command inputs
- **Command history** with navigation using arrow keys

## AI Integration

### Multi-Provider Support
- **Anthropic Claude** integration for primary AI conversations
- **Google Gemini** support as alternative LLM provider
- **Local LLM** compatibility with Ollama and OpenAI-compatible servers
- **Provider switching** during runtime without application restart
- **Automatic fallback** handling when providers are unavailable

### Conversation Management
- **Persistent conversation storage** with unique conversation IDs
- **Conversation switching** between multiple active sessions
- **Message history** with full conversation context
- **Token tracking** for usage monitoring and optimization
- **Conversation metadata** including titles, timestamps, and participant information

## Avatar System

### Interactive Avatar
- **AI-controlled avatar** responding to conversation context
- **Dynamic expressions** including happy, sad, confused, surprised, and neutral
- **Pose variations** supporting standing, sitting, leaning, and action poses
- **Position control** with center, left, and right placement options
- **Real-time avatar updates** based on AI response commands

### Image Generation
- **Replicate API integration** for high-quality avatar image generation
- **Google AI image generation** as alternative provider
- **Custom prompt composition** combining expressions, poses, and actions
- **Image caching system** for performance optimization and offline use
- **Automatic image cleanup** to manage storage space

### Avatar Commands
- **Embedded AI commands** parsed from AI responses automatically
- **Manual avatar control** through dedicated slash commands
- **Avatar state persistence** maintaining current expression and pose
- **Image URL management** with local storage and retrieval
- **Avatar visibility control** with show/hide functionality

## Theme System

### Retro Terminal Themes
- **Mainframe 70s**: Green phosphor display with authentic CRT scanlines
- **PC 80s**: Blue IBM-style interface with period-appropriate colors
- **BBS 90s**: Colorful ANSI-style bulletin board system aesthetics
- **Modern**: Clean contemporary design with modern UI elements

### Visual Effects
- **CRT shader effects** simulating authentic cathode-ray tube displays
- **Scanline overlays** with configurable intensity and movement
- **Theme transition animations** for smooth visual switching
- **Custom CSS properties** for theme-specific styling
- **Background animations** including matrix effects and geometric patterns

## Storage and Persistence

### Data Management
- **SQLite database** for robust data storage with better-sqlite3
- **Browser localStorage fallback** ensuring compatibility across environments
- **Conversation persistence** with full message history
- **Settings synchronization** across application restarts
- **Avatar image caching** with automatic cleanup and size management

### Database Schema
- **Conversations table** with metadata, timestamps, and token tracking
- **Messages table** with role-based storage and conversation linking
- **Memory/RAG table** for context-aware conversation enhancement
- **Settings table** with type-safe configuration storage
- **Avatar cache table** with prompt hashing and image management
- **Personalities table** for custom AI personality profiles
- **Image metadata table** for comprehensive image tracking

## Configuration and Settings

### Environment Configuration
- **API key management** for all integrated services
- **Provider configuration** with custom endpoints and models
- **Theme preferences** with persistent selection
- **Debug mode** for development and troubleshooting
- **Feature flags** for experimental functionality

### User Preferences
- **Theme selection** with immediate application
- **Avatar preferences** including default expressions and positions
- **Conversation settings** including message limits and auto-save
- **Provider preferences** with primary and fallback configurations
- **UI customization** including terminal size and color adjustments

## Advanced Features

### Model Context Protocol (MCP)
- **MCP client implementation** for extended AI capabilities
- **Built-in MCP tools** including filesystem, memory, time, and TTS
- **Custom MCP provider** registration and management
- **Tool execution framework** with secure command processing
- **MCP transport layer** with WebSocket and HTTP support

### Image Management
- **Comprehensive image metadata** storage and retrieval
- **Image search and filtering** by tags, provider, and generation date
- **Favorite image marking** for quick access to preferred generations
- **Batch image operations** for efficient management
- **Image export functionality** with metadata preservation

### Performance Optimization
- **Lazy component loading** for improved initial load times
- **Virtual scrolling** for terminal history with large message counts
- **Image compression** and optimization for storage efficiency
- **Debounced input processing** to prevent excessive API calls
- **Memory management** with automatic cleanup of unused resources

## Built-in Commands

### System Commands
- `/help` - Display comprehensive command help
- `/clear` - Clear terminal history
- `/theme <name>` - Switch visual themes
- `/themes` - List available themes
- `/config` - Open configuration modal
- `/debug` - Toggle debug mode and display system information

### AI and Conversation Commands
- `/ask <question>` - Direct AI question with immediate response
- `/conversation-new` - Create new conversation session
- `/conversation-load <id>` - Switch to specific conversation
- `/conversation-list` - Display all available conversations
- `/conversation-delete <id>` - Remove conversation and all messages
- `/conversation-rename <id> <title>` - Update conversation title

### Avatar Commands
- `/avatar show` - Display avatar in current state
- `/avatar hide` - Hide avatar from view
- `/avatar <expression>` - Set avatar expression (happy, sad, confused, etc.)
- `/avatar position <location>` - Set avatar position (center, left, right)
- `/imagine <prompt>` - Generate custom avatar image with description

### Provider Management Commands
- `/providers` - List all available AI providers
- `/provider <name>` - Switch active AI provider
- `/provider-config <name>` - Configure specific provider settings
- `/mcp-tools` - Display available MCP tools
- `/test-replicate` - Test Replicate API connection and functionality

### Personality System Commands
- `/personality` - Open personality management interface
- `/personality-list` - Display all available personalities
- `/personality-set <id>` - Activate specific personality profile
- `/personality-create` - Create new personality profile

### Development and Testing Commands
- `/test` - Run application self-tests
- `/options` - Open AI provider options
- `/shortcuts` - Display keyboard shortcuts
- `/tools` - List all available development tools
- `/crt` - Toggle CRT visual effects

## Technical Capabilities

### Frontend Architecture
- **React 19** with latest features and optimizations
- **TypeScript 5.8** with strict type checking
- **Vite 6.3** build system with hot module replacement
- **Zustand state management** for predictable state updates
- **CSS Modules** with theme-based architecture

### API Integration
- **RESTful API consumption** with proper error handling
- **WebSocket support** for real-time communication
- **Streaming response handling** for large AI outputs
- **Rate limiting compliance** with provider requirements
- **Retry logic** for network failures and timeouts

### Security Features
- **API key protection** with environment variable isolation
- **Input sanitization** preventing injection attacks
- **CORS handling** for cross-origin requests
- **Secure storage** of sensitive configuration data
- **Provider authentication** with token validation

## Browser Compatibility

### Supported Browsers
- **Chrome/Chromium** 88+ with full feature support
- **Firefox** 85+ with complete functionality
- **Safari** 14+ with webkit compatibility
- **Edge** 88+ with Chromium engine support

### Mobile Support
- **Responsive design** adapting to mobile viewports
- **Touch interface** optimization for mobile interactions
- **Progressive Web App** capabilities for installation
- **Offline functionality** with cached data access

## Accessibility

### Keyboard Navigation
- **Full keyboard support** for all interface elements
- **Tab navigation** with logical focus order
- **Keyboard shortcuts** for common operations
- **Command history** navigation with arrow keys

### Screen Reader Support
- **ARIA labels** for all interactive elements
- **Semantic HTML** structure for proper navigation
- **Screen reader announcements** for dynamic content updates
- **High contrast** theme options for visual accessibility

## Development Features

### Testing Infrastructure
- **Vitest** test runner with comprehensive coverage
- **React Testing Library** for component testing
- **Mock implementations** for all external services
- **Integration tests** for critical user flows

### Development Tools
- **Hot module replacement** for rapid development
- **TypeScript compilation** with error reporting
- **ESLint integration** with automatic code formatting
- **Debug logging** with configurable verbosity levels

### Extensibility
- **Plugin architecture** for custom functionality
- **Provider interface** for new AI service integration
- **Command interface** for custom command development
- **Theme system** supporting custom visual designs