# Setup Guide for Claudia Framework

This guide walks you through setting up the Claudia AI Terminal Companion framework for development and production use.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Provider Setup](#provider-setup)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Building for Production](#building-for-production)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: Version 18.0 or higher (LTS recommended)
- **npm**: Version 8.0 or higher (comes with Node.js)
- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 2GB free space for dependencies and cache

### Development Tools (Recommended)

- **VS Code** with TypeScript and React extensions
- **Git** for version control
- **Chrome/Firefox** with dev tools for debugging

### API Access (Optional)

For full functionality, you'll need API keys for:

- **Anthropic Claude** - For LLM functionality
- **Google AI** - Alternative LLM provider
- **Replicate** - For avatar image generation

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

This will install all required dependencies including:
- React 19 and TypeScript
- Vite build system
- SQLite database (better-sqlite3)
- Axios for HTTP requests
- Zustand for state management

### 3. Verify Installation

```bash
npm run dev
```

If successful, you should see:
```
VITE v6.3.5  ready in XXXms
➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

Open `http://localhost:5173/` to see the terminal interface.

## Configuration

### Environment Variables

The framework includes comprehensive environment variable support for secure configuration:

```bash
# Copy the example configuration
cp .env.example .env

# Edit .env with your API keys
nano .env
```

#### Quick Setup

```bash
# .env - Add your actual API keys
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
VITE_REPLICATE_API_TOKEN=r8_your-token-here

# Optional: Enable debug mode
VITE_DEBUG_MODE=true
```

See the complete [Environment Configuration Guide](./ENVIRONMENT.md) for all available options.

### Security Note

✅ **Environment files are automatically gitignored**

The `.gitignore` already includes:
```gitignore
.env
.env.local
.env.*.local
```

### Configuration File

For advanced configuration, create `src/config/app.config.ts`:

```typescript
export const appConfig = {
  // LLM Provider Settings
  llm: {
    defaultProvider: 'anthropic',
    timeout: 30000,
    maxTokens: 1000,
    temperature: 0.7,
  },
  
  // Image Generation Settings
  image: {
    defaultProvider: 'replicate',
    timeout: 120000,
    defaultSize: { width: 512, height: 512 },
    cacheEnabled: true,
  },
  
  // Terminal Settings
  terminal: {
    defaultTheme: 'mainframe70s',
    maxHistory: 1000,
    typewriterSpeed: 50,
  },
  
  // Avatar Settings
  avatar: {
    animationDuration: 500,
    defaultPosition: 'center',
    cacheSize: 100,
  },
  
  // Database Settings
  database: {
    path: process.env.VITE_DATABASE_PATH || './claudia.db',
    backupInterval: 24 * 60 * 60 * 1000, // 24 hours
  }
};
```

## Provider Setup

### Anthropic Claude

1. **Get API Key**:
   - Visit [Anthropic Console](https://console.anthropic.com/)
   - Create account and get API key
   - Add to `.env` as `VITE_ANTHROPIC_API_KEY`

2. **Test Configuration**:
   ```typescript
   import { AnthropicProvider } from './src/providers';
   
   const provider = new AnthropicProvider();
   // Automatically uses VITE_ANTHROPIC_API_KEY from environment
   await provider.initialize();
   
   console.log('Configured:', provider.isConfigured());
   ```

### Google Gemini

1. **Get API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Create project and get API key
   - Add to `.env` as `VITE_GOOGLE_API_KEY`

2. **Test Configuration**:
   ```typescript
   import { GoogleProvider } from './src/providers';
   
   const provider = new GoogleProvider();
   // Automatically uses VITE_GOOGLE_API_KEY from environment
   await provider.initialize();
   ```

### Replicate (Image Generation)

1. **Get API Token**:
   - Visit [Replicate](https://replicate.com/)
   - Create account and get API token
   - Add to `.env` as `VITE_REPLICATE_API_TOKEN`

2. **Test Configuration**:
   ```typescript
   import { ReplicateProvider } from './src/providers';
   
   const provider = new ReplicateProvider();
   // Automatically uses VITE_REPLICATE_API_TOKEN from environment
   await provider.initialize();
   ```

### Local LLM (Ollama)

1. **Install Ollama**:
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows - Download from ollama.ai
   ```

2. **Start Ollama**:
   ```bash
   ollama serve
   ```

3. **Pull a Model**:
   ```bash
   ollama pull llama2
   ```

4. **Configure in App**:
   
   Add to `.env`:
   ```env
   VITE_DEFAULT_LLM_PROVIDER=local
   VITE_OLLAMA_BASE_URL=http://localhost:11434
   VITE_LOCAL_LLM_MODEL=llama2
   ```
   
   Or use programmatically:
   ```typescript
   import { LocalProvider } from './src/providers';
   
   const provider = new LocalProvider();
   // Uses environment variables automatically
   await provider.initialize();
   ```

## Development Workflow

### Development Server

Start the development server:
```bash
npm run dev
```

Features:
- **Hot Module Replacement** - Changes appear instantly
- **TypeScript checking** - Real-time error detection
- **Source maps** - Easy debugging

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

# Type checking
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

### Code Style

The project uses:
- **TypeScript** - Strict type checking
- **ESLint** - Code linting
- **Prettier** - Code formatting

Configure VS Code for best experience:
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

1. **Terminal Interface**:
   ```bash
   # Test theme switching
   theme mainframe70s
   theme pc80s
   theme bbs90s
   theme modern
   
   # Test commands
   help
   clear
   ```

2. **Provider Testing**:
   - Check console for provider initialization
   - Test API connectivity
   - Verify error handling

3. **Database Testing**:
   - Check SQLite file creation
   - Verify table structure
   - Test data persistence

### Automated Testing (Future)

Set up testing framework:
```bash
npm install --save-dev vitest @testing-library/react
```

Example test structure:
```typescript
// src/__tests__/providers/anthropic.test.ts
import { describe, it, expect } from 'vitest';
import { AnthropicProvider } from '../providers';

describe('AnthropicProvider', () => {
  it('should initialize correctly', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize({ apiKey: 'test-key' });
    expect(provider.isConfigured()).toBe(true);
  });
});
```

## Building for Production

### Web Build

```bash
npm run build
```

This creates:
- Optimized JavaScript bundles
- CSS files with vendor prefixes
- Static assets in `dist/`

### Electron App (Future)

Install Electron:
```bash
npm install --save-dev electron electron-builder
```

Add to `package.json`:
```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron": "electron .",
    "electron:build": "electron-builder"
  }
}
```

## Deployment

### Web Deployment

1. **Static Hosting** (Netlify, Vercel):
   ```bash
   npm run build
   # Upload dist/ folder
   ```

2. **Server Deployment**:
   ```bash
   npm run build
   npm install -g serve
   serve -s dist
   ```

### Desktop App Deployment

Using Electron Builder:
```bash
npm run electron:build
```

Outputs:
- Windows: `.exe` installer
- macOS: `.dmg` disk image
- Linux: `.AppImage` or `.deb`

### Environment Variables in Production

Use build-time environment variables:
```bash
# Build with production API keys
VITE_ANTHROPIC_API_KEY=prod_key npm run build
```

Or configure at runtime:
```typescript
// Use runtime configuration
const config = await fetch('/api/config').then(r => r.json());
```

## Troubleshooting

### Common Issues

#### 1. Node.js Version Mismatch

**Error**: `engine "node" is incompatible`
**Solution**: 
```bash
nvm use 18  # or update Node.js
npm install
```

#### 2. SQLite Build Issues

**Error**: `Error: Cannot find module 'better-sqlite3'`
**Solution**:
```bash
npm rebuild better-sqlite3
# or
npm install --build-from-source better-sqlite3
```

#### 3. API Key Not Working

**Error**: `401 Unauthorized`
**Solution**:
- Verify API key format
- Check `.env` file exists and is not in `.gitignore`
- Restart development server after adding keys

#### 4. Port Already in Use

**Error**: `Port 5173 is already in use`
**Solution**:
```bash
# Kill process on port
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

#### 5. TypeScript Errors

**Error**: Type checking failures
**Solution**:
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npm install

# Check TypeScript version
npx tsc --version
```

### Performance Issues

#### 1. Slow Development Server

**Solutions**:
- Clear node_modules and reinstall
- Disable browser extensions
- Check system resources

#### 2. Large Bundle Size

**Solutions**:
- Use dynamic imports for heavy dependencies
- Enable tree shaking
- Analyze bundle with `npm run build -- --analyze`

#### 3. Memory Issues

**Solutions**:
- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`
- Clean database cache regularly
- Optimize image cache settings

### Debug Mode

Enable detailed logging:
```typescript
// Add to app config
export const appConfig = {
  debug: process.env.NODE_ENV === 'development',
  logLevel: 'debug', // 'error', 'warn', 'info', 'debug'
};
```

### Getting Help

1. **Check Documentation** - This guide and API docs
2. **Search Issues** - GitHub issues and discussions
3. **Console Logs** - Browser dev tools
4. **Network Tab** - Check API requests
5. **Database** - Inspect SQLite file with DB Browser

### Development Tips

1. **Use TypeScript strictly** - Enable strict mode
2. **Test providers early** - Verify API access
3. **Monitor console** - Watch for errors and warnings
4. **Use React DevTools** - Inspect component state
5. **Database backups** - SQLite file can be copied

---

This setup guide should get you up and running with the Claudia framework. For advanced configuration and customization, refer to the main documentation.