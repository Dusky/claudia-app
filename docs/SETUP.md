# Setup Guide

This guide covers installation and configuration of the Claudia AI terminal companion application.

## Prerequisites

### System Requirements

- Node.js 18.0 or higher (LTS recommended)
- npm 8.0 or higher
- Operating System: Windows 10+, macOS 10.15+, or Linux
- Memory: 4GB RAM minimum, 8GB recommended
- Storage: 2GB free space for dependencies and cache

### Development Tools

- VS Code with TypeScript and React extensions
- Git for version control
- Chrome or Firefox with developer tools

### API Access

For full functionality, you'll need API keys for:

- Anthropic Claude (for LLM functionality)
- Google AI (alternative LLM provider)
- Replicate (for avatar image generation)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd claudia-app
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- React 18 with TypeScript
- Vite build system
- Zustand for state management
- Canvas-based terminal with WebGL effects
- Model Context Protocol (MCP) integration
- Comprehensive command system

### 3. Verify Installation

```bash
npm run dev
```

You should see:
```
VITE v6.3.5  ready in XXXms
➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

Open `http://localhost:5173/` to access the terminal interface.

## Configuration

### Environment Variables

Copy the example configuration:

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```bash
# .env - Add your actual API keys
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
VITE_REPLICATE_API_TOKEN=r8_your-token-here

# Optional: Enable debug mode
VITE_DEBUG_MODE=true
```

See the [Environment Configuration Guide](./ENVIRONMENT.md) for all available options.

### Security Note

Environment files are automatically gitignored. The `.gitignore` includes:
```gitignore
.env
.env.local
.env.*.local
```

## Provider Setup

### Anthropic Claude

1. Get API Key:
   - Visit [Anthropic Console](https://console.anthropic.com/)
   - Create account and get API key
   - Add to `.env` as `VITE_ANTHROPIC_API_KEY`

2. Test Configuration:
   ```typescript
   import { AnthropicProvider } from './src/providers';
   
   const provider = new AnthropicProvider();
   await provider.initialize();
   console.log('Configured:', provider.isConfigured());
   ```

### Google Gemini

1. Get API Key:
   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Create project and get API key
   - Add to `.env` as `VITE_GOOGLE_API_KEY`

2. Test Configuration:
   ```typescript
   import { GoogleProvider } from './src/providers';
   
   const provider = new GoogleProvider();
   await provider.initialize();
   ```

### Replicate (Image Generation)

1. Get API Token:
   - Visit [Replicate](https://replicate.com/)
   - Create account and get API token
   - Add to `.env` as `VITE_REPLICATE_API_TOKEN`

2. Test Configuration:
   ```typescript
   import { ReplicateProvider } from './src/providers';
   
   const provider = new ReplicateProvider();
   await provider.initialize();
   ```

### Local LLM (Ollama)

1. Install Ollama:
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows - Download from ollama.ai
   ```

2. Start Ollama:
   ```bash
   ollama serve
   ```

3. Pull a Model:
   ```bash
   ollama pull llama2
   ```

4. Configure in App:
   
   Add to `.env`:
   ```env
   VITE_DEFAULT_LLM_PROVIDER=local
   VITE_OLLAMA_BASE_URL=http://localhost:11434
   VITE_LOCAL_LLM_MODEL=llama2
   ```

## Development Workflow

### Development Server

Start the development server:
```bash
npm run dev
```

Features:
- Hot Module Replacement - Changes appear instantly
- TypeScript checking - Real-time error detection
- Source maps - Easy debugging

### File Structure

```
src/
├── providers/           # API providers
├── terminal/           # Terminal UI
├── avatar/             # Avatar system
├── storage/            # Database layer
├── components/         # React components
├── utils/              # Utilities
└── App.tsx             # Main app
```

### Development Commands

```bash
# Start development server
npm run dev

# Type checking and build
npm run build

# Lint code
npm run lint
```

### Code Style

The project uses:
- TypeScript with strict type checking
- ESLint for code linting
- Prettier for code formatting

Configure VS Code:
```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Testing

### Manual Testing

1. Terminal Interface:
   ```bash
   # Test theme switching
   /theme mainframe70s
   /theme pc80s
   /theme bbs90s
   /theme modern
   
   # Test commands
   /help
   /clear
   ```

2. Provider Testing:
   - Check console for provider initialization
   - Test API connectivity
   - Verify error handling

3. Storage Testing:
   - Check LocalStorage persistence
   - Verify data structure
   - Test conversation history
   - Test settings persistence

## Building for Production

### Web Build

```bash
npm run build
```

This creates:
- Optimized JavaScript bundles
- CSS files with vendor prefixes
- Static assets in `dist/`

## Deployment

### Static Hosting

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `dist/` folder to your hosting provider

### Server Deployment

```bash
npm run build
npm install -g serve
serve -s dist
```

### Environment Variables in Production

Use build-time environment variables:
```bash
VITE_ANTHROPIC_API_KEY=prod_key npm run build
```

## Troubleshooting

### Common Issues

#### Node.js Version Mismatch

Error: `engine "node" is incompatible`
Solution: 
```bash
nvm use 18  # or update Node.js
npm install
```

#### LocalStorage Issues

Error: `Failed to store data in LocalStorage`
Solution:
- Check browser storage quota
- Clear browser data if needed
- Verify localStorage is enabled
- Check for private/incognito mode restrictions

#### API Key Not Working

Error: `401 Unauthorized`
Solution:
- Verify API key format
- Check `.env` file exists and is not in `.gitignore`
- Restart development server after adding keys

#### Port Already in Use

Error: `Port 5173 is already in use`
Solution:
```bash
# Kill process on port
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

#### TypeScript Errors

Solution:
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npm install

# Check TypeScript version
npx tsc --version
```

### Performance Issues

#### Slow Development Server

Solutions:
- Clear node_modules and reinstall
- Disable browser extensions
- Check system resources

#### Large Bundle Size

Solutions:
- Use dynamic imports for heavy dependencies
- Enable tree shaking
- Analyze bundle with build tools

#### Memory Issues

Solutions:
- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`
- Clean database cache regularly
- Optimize image cache settings

### Debug Mode

Enable detailed logging by setting `VITE_DEBUG_MODE=true` in your `.env` file.

### Getting Help

1. Check this documentation and API reference
2. Search GitHub issues and discussions
3. Check browser console logs
4. Inspect network requests in browser dev tools
5. Examine SQLite database file with DB Browser

### Development Tips

1. Use TypeScript strictly - Enable strict mode
2. Test providers early - Verify API access
3. Monitor console - Watch for errors and warnings
4. Use React DevTools - Inspect component state
5. Export/import settings - Use browser data export
6. Monitor LocalStorage usage - Check browser dev tools
7. Clear cache when needed - Use browser tools or /clear command

This setup guide covers the essential steps for getting started with the Claudia application. For advanced configuration, refer to the main documentation.