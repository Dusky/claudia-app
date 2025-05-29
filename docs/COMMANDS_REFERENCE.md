# Commands Reference

## Overview

Claudia features an extensive command system with 30+ built-in commands organized into logical categories. All commands use the `/command` syntax and provide consistent help and error handling.

## Command Categories

### Core Commands

#### `/help [command]`
Show available commands or detailed help for a specific command.

```bash
/help                    # List all commands
/help theme             # Show help for theme command
```

#### `/clear`
Clear the terminal history and start fresh.

```bash
/clear                  # Clear terminal
```

#### `/themes`
List all available terminal themes with descriptions.

```bash
/themes                 # Show theme list
```

#### `/theme <name>`
Switch to a specific terminal theme.

```bash
/theme mainframe70s     # Switch to 70s green terminal
/theme pc80s           # Switch to 80s blue terminal
/theme bbs90s          # Switch to 90s BBS theme
/theme modern          # Switch to modern theme
```

### AI & Conversation Commands

#### `/ask <question>`
Send a direct question to the AI assistant.

```bash
/ask What is TypeScript?
/ask How do I use React hooks?
```

#### `/retry`
Retry the last AI response with the same input.

```bash
/retry                  # Regenerate last response
```

#### `/continue`
Continue or expand the last AI response.

```bash
/continue               # Ask AI to continue
```

#### `/undo`
Undo the last action or remove the last message.

```bash
/undo                   # Undo last action
```

#### `/context`
Show the current conversation context and token usage.

```bash
/context                # Display context info
```

### Conversation Management

#### `/conversation`
General conversation operations.

```bash
/conversation           # Show current conversation info
```

#### `/conversations <action>`
Manage multiple conversations.

```bash
/conversations list              # List all conversations
/conversations new [title]       # Create new conversation
/conversations load <id>         # Load specific conversation
/conversations delete <id>       # Delete conversation
/conversations rename <id> <name> # Rename conversation
/conversations clear             # Clear current conversation
```

#### `/manage-conversations`
Open the conversation management interface.

```bash
/manage-conversations   # Open conversation manager
```

### Avatar Commands

#### `/avatar <action> [parameters]`
Control the AI avatar display and behavior.

```bash
# Visibility
/avatar show           # Show avatar
/avatar hide           # Hide avatar

# Expressions
/avatar expression happy      # Set expression
/avatar expression thinking   # Set thinking expression
/avatar expression curious    # Set curious expression

# Positions
/avatar position center       # Center avatar
/avatar position left         # Position left
/avatar position right        # Position right

# Actions
/avatar action wave          # Wave action
/avatar action type          # Typing action
/avatar action think         # Thinking action

# Combined parameters
/avatar expression=happy action=wave position=center
```

#### `/imagine <prompt>`
Generate a custom avatar image with a specific prompt.

```bash
/imagine a confident programmer working late at night
/imagine a friendly AI assistant with a warm smile
```

### System & Configuration

#### `/config`
Open the application configuration modal.

```bash
/config                 # Open settings
```

#### `/providers`
Show the status of all available providers (LLM, Image, MCP).

```bash
/providers              # List provider status
```

#### `/debug [action]`
Display debug information and system status.

```bash
/debug                  # Show debug info
/debug clear           # Clear debug data
```

#### `/test [provider]`
Test provider connections and functionality.

```bash
/test                   # Test all providers
/test replicate        # Test Replicate specifically
```

### Personality System

#### `/personality <action>`
Manage AI personality profiles.

```bash
/personality list              # List all personalities
/personality current           # Show current personality
/personality set <name>        # Set active personality
/personality create <name>     # Create new personality
/personality edit <name>       # Edit personality
/personality delete <name>     # Delete personality
/personality view <name>       # View personality details
```

#### `/personality gui`
Open the personality editor interface.

```bash
/personality gui        # Open personality editor
```

### MCP (Model Context Protocol) Commands

#### `/mcp <action>`
Manage MCP tools and servers.

```bash
/mcp list              # List available tools
/mcp info <tool>       # Show tool information
/mcp enable <tool>     # Enable MCP tool
/mcp disable <tool>    # Disable MCP tool
/mcp permissions       # Manage tool permissions
/mcp stats            # Show usage statistics
```

#### `/tools`
List all available MCP tools with descriptions.

```bash
/tools                 # Show MCP tools
```

### CRT Terminal Commands

#### `/crt <action>`
Control CRT terminal effects and settings.

```bash
# Toggle effects
/crt toggle            # Toggle CRT mode
/crt scanlines on      # Enable scanlines
/crt glow off          # Disable phosphor glow
/crt curvature toggle  # Toggle screen curvature

# Performance
/crt performance high      # High quality mode
/crt performance balanced  # Balanced mode
/crt performance low       # Performance mode

# Debug and info
/crt debug on         # Show debug info
/crt fps show         # Show FPS counter
/crt webgl info       # WebGL capabilities
/crt reset           # Reset to defaults
```

### Image Generation

#### `/images [action]`
Manage generated images and open image generation interface.

```bash
/images                # Open image generation modal
/images history        # Show generation history
/images clear          # Clear image cache
```

### Shortcuts & Utilities

#### `/shortcuts`
Display keyboard shortcuts and quick commands.

```bash
/shortcuts             # Show available shortcuts
```

#### `/options`
Open the AI options and model selection interface.

```bash
/options               # Open AI options modal
```

## Command Syntax

### Basic Syntax
All commands start with `/` followed by the command name:
```bash
/command [arguments]
```

### Arguments
Commands can accept various argument types:

#### Positional Arguments
```bash
/theme mainframe70s     # 'mainframe70s' is a positional argument
```

#### Named Parameters
```bash
/avatar expression=happy action=wave    # Named parameters
```

#### Mixed Arguments
```bash
/conversations rename conv123 "My Chat"  # ID and quoted name
```

#### Flags
```bash
/debug --verbose       # Flag argument
```

### Quotes and Escaping
Use quotes for arguments containing spaces:
```bash
/imagine "a beautiful sunset over mountains"
/conversations rename id123 "My Important Chat"
```

## Command Aliases

Some commands have shorter aliases:

```bash
/h          → /help
/c          → /clear
/a          → /ask
/av         → /avatar
/img        → /imagine
/conv       → /conversation
/convs      → /conversations
/cfg        → /config
/p          → /personality
```

## Command Context

Commands have access to various system components:

- **LLM Manager**: AI provider management
- **Image Manager**: Image generation providers
- **MCP Manager**: Model Context Protocol tools
- **Avatar Controller**: Avatar state and behavior
- **Database**: Conversation and settings storage
- **App Store**: Application state management

## Error Handling

Commands provide consistent error handling:

```bash
# Invalid command
/nonexistent
→ Error: Command 'nonexistent' not found. Type /help for available commands.

# Missing arguments
/theme
→ Error: Theme name required. Usage: /theme <name>

# Invalid arguments
/theme invalidtheme
→ Error: Theme 'invalidtheme' not found. Available themes: mainframe70s, pc80s, bbs90s, modern
```

## Command Results

Commands return structured results:

```typescript
interface CommandResult {
  success: boolean;        // Whether command succeeded
  message?: string;        // Result or error message
  data?: any;             // Additional data
  shouldClearInput?: boolean; // Clear input after execution
}
```

## Adding Custom Commands

Commands can be extended through the command registry:

```typescript
import { Command, CommandContext, CommandResult } from './commands/types';

const customCommand: Command = {
  name: 'custom',
  description: 'A custom command example',
  usage: '/custom <argument>',
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    return {
      success: true,
      message: `Custom command executed with args: ${args.join(', ')}`
    };
  }
};

// Register the command
commandRegistry.register(customCommand);
```

## Command Categories in Detail

### AI-Enhanced Commands
Commands marked with `requiresAI: true` need an active LLM provider:
- `/ask`
- `/retry`
- `/continue`
- `/personality` (some actions)

### Image Generation Commands
Commands marked with `requiresImageGen: true` need an active image provider:
- `/imagine`
- `/images` (generation actions)

### MCP Commands
Commands marked with `requiresMCP: true` need MCP tools enabled:
- `/tools`
- `/mcp` (tool actions)

## Keyboard Shortcuts

### Global Shortcuts
- `Ctrl+L` / `Cmd+L`: Clear terminal (`/clear`)
- `Ctrl+K` / `Cmd+K`: Focus command input
- `Ctrl+/` / `Cmd+/`: Show help (`/help`)
- `Escape`: Cancel current operation

### Command Input Shortcuts
- `Tab`: Command auto-completion
- `Up/Down Arrow`: Command history navigation
- `Ctrl+R` / `Cmd+R`: Reverse search command history

## Best Practices

### Command Usage
1. **Use help**: Always check `/help <command>` for usage details
2. **Quote strings**: Use quotes for multi-word arguments
3. **Check status**: Use `/providers` to verify system status
4. **Save settings**: Configuration changes are automatically saved

### Performance
1. **Clear regularly**: Use `/clear` to manage memory usage
2. **Monitor resources**: Check `/debug` for performance info
3. **Optimize images**: Clear image cache with `/images clear`

### Troubleshooting
1. **Provider issues**: Check `/providers` for connection status
2. **Command errors**: Use `/help <command>` for correct syntax
3. **Debug mode**: Enable with `/debug` for detailed logging
4. **Reset settings**: Use individual command reset options

## Future Enhancements

### Planned Command Features
- [ ] Command macros and scripting
- [ ] Custom command aliases
- [ ] Command scheduling and automation
- [ ] Plugin system for third-party commands
- [ ] Command templates and snippets
- [ ] Advanced tab completion
- [ ] Command usage analytics

---

This comprehensive command system provides powerful functionality while maintaining simplicity and consistency. Each command is designed to be discoverable, helpful, and intuitive for both new and experienced users.