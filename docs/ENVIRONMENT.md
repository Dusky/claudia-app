# Environment Configuration Guide

This guide covers how to configure Claudia using environment variables for API keys, provider settings, and application preferences.

## Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Add your API keys:**
   ```bash
   # Edit .env file
   VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key
   VITE_REPLICATE_API_TOKEN=r8_your-actual-token
   ```

3. **Start the application:**
   ```bash
   npm run dev
   ```

## Environment Variables Reference

### API Keys

#### Required for Full Functionality

```env
# Anthropic Claude (recommended)
VITE_ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx

# Replicate (for avatar generation)
VITE_REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxx
```

#### Optional Providers

```env
# Google Gemini (alternative LLM)
VITE_GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxx

# OpenAI (for OpenAI-compatible local servers)
VITE_OPENAI_API_KEY=sk-your-key-here
```

### Provider Configuration

```env
# Default providers to use
VITE_DEFAULT_LLM_PROVIDER=anthropic     # anthropic, google, local
VITE_DEFAULT_IMAGE_PROVIDER=replicate   # replicate

# Local LLM settings (for Ollama, etc.)
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_LOCAL_LLM_MODEL=llama2
```

### Application Settings

```env
# Default terminal theme
VITE_DEFAULT_THEME=mainframe70s         # mainframe70s, pc80s, bbs90s, modern

# Database location
VITE_DATABASE_PATH=./claudia.db
```

### Performance Settings

```env
# Avatar cache settings
VITE_AVATAR_CACHE_SIZE=100              # Number of cached images
VITE_AVATAR_CACHE_TTL=604800            # 7 days in seconds

# Request timeouts (milliseconds)
VITE_LLM_TIMEOUT=30000                  # 30 seconds
VITE_IMAGE_TIMEOUT=120000               # 2 minutes
```

### Development Settings

```env
# Enable debug logging
VITE_DEBUG_MODE=true

# Use mock responses (development without API keys)
VITE_MOCK_APIS=false

# Show detailed error messages
VITE_DETAILED_ERRORS=true
```

## Configuration Priority

The configuration system uses this priority order:

1. **Runtime config** - Passed directly to provider initialization
2. **Environment variables** - From `.env` file
3. **Default values** - Built-in fallbacks

```typescript
// Example: Provider will use env var if no config passed
await provider.initialize(); // Uses VITE_ANTHROPIC_API_KEY

// Override with runtime config
await provider.initialize({ apiKey: 'different-key' });
```

## Security Best Practices

### 1. Environment File Security

```bash
# ✅ DO: Keep .env files local and private
echo ".env" >> .gitignore

# ❌ DON'T: Commit .env files to version control
git add .env  # ⚠️ NEVER DO THIS
```

### 2. API Key Management

```env
# ✅ DO: Use descriptive comments
# Anthropic Claude API Key - Production Account
VITE_ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx

# ❌ DON'T: Use production keys in development
VITE_ANTHROPIC_API_KEY=sk-ant-prod-NEVER-USE-IN-DEV
```

### 3. Environment Separation

```bash
# Different files for different environments
.env                    # Development (gitignored)
.env.example           # Template (committed)
.env.production        # Production (server only)
.env.local             # Local overrides (gitignored)
```

## Getting API Keys

### Anthropic Claude

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create account or sign in
3. Navigate to "API Keys"
4. Create new key
5. Copy key to `.env`:
   ```env
   VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   ```

### Replicate

1. Visit [Replicate](https://replicate.com/)
2. Create account or sign in
3. Go to [API Tokens](https://replicate.com/account/api-tokens)
4. Create new token
5. Copy token to `.env`:
   ```env
   VITE_REPLICATE_API_TOKEN=r8_your-token-here
   ```

### Google Gemini

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create project if needed
3. Generate API key
4. Copy key to `.env`:
   ```env
   VITE_GOOGLE_API_KEY=AIzaSy-your-key-here
   ```

## Development Modes

### 1. Full Development (with API keys)

```env
VITE_DEBUG_MODE=true
VITE_ANTHROPIC_API_KEY=sk-ant-api03-dev-key
VITE_REPLICATE_API_TOKEN=r8_dev-token
VITE_MOCK_APIS=false
```

### 2. Mock Development (without API keys)

```env
VITE_DEBUG_MODE=true
VITE_MOCK_APIS=true
# No API keys needed - uses mock responses
```

### 3. Local LLM Only

```env
VITE_DEFAULT_LLM_PROVIDER=local
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_LOCAL_LLM_MODEL=llama2
VITE_MOCK_APIS=true  # For image generation
```

## Configuration Validation

The app validates configuration on startup:

```typescript
// Automatic validation
✅ API key format validation
✅ Provider availability checks  
✅ Timeout value validation
✅ Theme name validation
```

**Debug output example:**
```
🔧 Claudia Configuration
Default LLM Provider: anthropic
Default Image Provider: replicate
Default Theme: mainframe70s

🔑 API Key Status
Anthropic: ✅ Configured
Google: ❌ Missing
Replicate: ✅ Configured

🛠️ Development Settings
Debug Mode: ✅ Enabled
Mock APIs: ❌ Disabled
```

## Troubleshooting

### Common Issues

#### 1. API Key Not Working

```bash
# Check if key is loaded
VITE_DEBUG_MODE=true npm run dev
# Look for "API Key Status" in console
```

#### 2. Environment Variables Not Loading

```bash
# Ensure file is named exactly ".env"
ls -la .env

# Check file contents
cat .env

# Restart dev server after changes
npm run dev
```

#### 3. VITE_ Prefix Required

```env
# ❌ Wrong - Vite won't load this
ANTHROPIC_API_KEY=sk-ant-api03-key

# ✅ Correct - Must start with VITE_
VITE_ANTHROPIC_API_KEY=sk-ant-api03-key
```

#### 4. Mock Mode for Development

```env
# Work without API keys
VITE_MOCK_APIS=true
VITE_DEBUG_MODE=true
```

### Testing Configuration

```bash
# Enable debug mode to see config status
VITE_DEBUG_MODE=true npm run dev

# Check browser console for:
# - Configuration validation
# - API key status
# - Provider initialization
```

## Advanced Configuration

### Custom Provider URLs

```env
# Use different API endpoints
VITE_OLLAMA_BASE_URL=http://my-server:11434
VITE_REPLICATE_BASE_URL=https://api.replicate.com
```

### Performance Tuning

```env
# Faster responses (lower quality)
VITE_LLM_TIMEOUT=10000
VITE_IMAGE_TIMEOUT=60000

# Better quality (slower)
VITE_LLM_TIMEOUT=60000
VITE_IMAGE_TIMEOUT=300000
```

### Database Configuration

```env
# Custom database location
VITE_DATABASE_PATH=/path/to/custom/claudia.db

# Relative to project root
VITE_DATABASE_PATH=./data/conversations.db
```

---

This environment configuration system provides flexible, secure, and developer-friendly configuration management for the Claudia framework.