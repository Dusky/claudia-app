# Replicate Provider Documentation

## Overview

The enhanced Replicate provider offers a robust, extensible integration with Replicate's image generation API. It supports both official and non-official models, includes comprehensive error handling, and provides extensive logging for debugging.

## Features

### ✅ **Current Implementation**
- **Official Models API**: Optimized for popular models like FLUX, SDXL
- **Traditional Predictions API**: Support for custom models with version IDs
- **Comprehensive Model Support**: 8+ pre-configured popular models
- **Dynamic Model Loading**: Automatically fetches model information
- **Enhanced Error Handling**: Detailed error messages and logging
- **Connection Testing**: Built-in API connectivity validation
- **Extensible Architecture**: Easy to add new providers

### 🔧 **Configuration Options**

```typescript
interface ReplicateProviderConfig {
  apiKey?: string;                    // Your Replicate API token
  baseURL?: string;                   // API base URL (default: https://api.replicate.com)
  model?: string;                     // Model to use (default: black-forest-labs/flux-schnell)
  useOfficialModels?: boolean;        // Use official API (default: true)
  version?: string;                   // Version ID for non-official models
  timeout?: number;                   // Request timeout in milliseconds
  defaultParameters?: {               // Default generation parameters
    width?: number;                   // Image width (default: 1024)
    height?: number;                  // Image height (default: 1024)
    num_inference_steps?: number;     // Generation steps (default: 4)
    guidance_scale?: number;          // Guidance scale (default: 0.0)
  };
}
```

## Supported Models

### **Pre-configured Models**
- `black-forest-labs/flux-schnell` ⭐ (Default - fastest)
- `black-forest-labs/flux-dev` (Higher quality)
- `stability-ai/stable-diffusion-3` (SD3)
- `stability-ai/sdxl` (SDXL base)
- `bytedance/sdxl-lightning-4step` (Fast SDXL)
- `prompthero/openjourney` (Midjourney-style)
- `runwayml/stable-diffusion-v1-5` (Classic SD)
- `stability-ai/stable-diffusion-xl-base-1.0` (SDXL official)

### **Dynamic Model Loading**
The provider automatically loads model information for better integration.

## Usage Examples

### **Basic Image Generation**
```typescript
import { ReplicateProvider } from './providers/image/replicate';

const provider = new ReplicateProvider();
await provider.initialize({
  apiKey: 'r8_your-api-key',
  model: 'black-forest-labs/flux-schnell'
});

const response = await provider.generateImage({
  prompt: 'A cyberpunk anime girl with neon lighting',
  width: 1024,
  height: 1024
});

console.log('Generated image:', response.imageUrl);
```

### **Using Through Image Generation Modal**
1. Click the 📷 icon in the status bar
2. Select "Replicate" as the provider
3. Choose your model and parameters
4. Generate images with enhanced prompts

### **Command-Line Usage**
```bash
# Generate with current avatar settings
/imagine a confident programmer working late

# Use avatar commands with enhanced prompts
/avatar expression thinking
```

## API Integration Details

### **Official Models Endpoint**
```
POST https://api.replicate.com/v1/models/{owner}/{name}/predictions
```
- **Benefits**: Faster, no version management needed
- **Best for**: Popular models like FLUX, SDXL
- **Used by default**: Yes

### **Traditional Predictions Endpoint**
```
POST https://api.replicate.com/v1/predictions
```
- **Benefits**: Access to any model version
- **Requires**: Version ID
- **Best for**: Custom or specific model versions

## Extensibility

### **Adding New Providers**

The system is designed for easy extension. Use the provided template:

```typescript
// Copy src/providers/image/templateProvider.ts
export class NewProvider implements ImageProvider {
  name = 'New Provider';
  id = 'newprovider';
  
  async initialize(config?: ImageProviderConfig): Promise<void> {
    // Initialize your provider
  }
  
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    // Implement generation logic
  }
}

// Register in ImageProviderManager
imageManager.registerProvider(new NewProvider());
```

### **Provider Registration Process**
1. Create provider class implementing `ImageProvider` interface
2. Add to `ImageProviderManager` constructor
3. Update environment configuration if needed
4. Add to UI provider selection

## Advanced Features

### **Connection Testing**
```typescript
const isConnected = await provider.testConnection();
console.log('Replicate API status:', isConnected ? 'Connected' : 'Failed');
```

### **Model Search**
```typescript
const models = await provider.searchModels('stable diffusion');
console.log('Found models:', models.map(m => m.name));
```

### **Prediction History**
```typescript
const predictions = await provider.listPredictions(10);
console.log('Recent predictions:', predictions.length);
```

### **Dynamic Model Switching**
```typescript
provider.switchModel('stability-ai/sdxl', true); // Use official API
provider.setModelVersion('specific-version-id'); // Use version-based API
```

## Error Handling

### **Common Error Types**
- **Configuration Errors**: Missing API key, invalid model
- **API Errors**: Rate limits, invalid requests, server errors
- **Generation Errors**: Model failures, timeout, invalid parameters

### **Error Debugging**
- Enable debug mode: `VITE_DEBUG_MODE=true`
- Check browser console for detailed logs
- Monitor network requests in DevTools

## Performance Optimization

### **Caching Strategy**
- Avatar images cached by prompt hash
- Model information cached on load
- Configurable cache size and TTL

### **Timeout Configuration**
- Default: 120 seconds for image generation
- Configurable via `VITE_IMAGE_TIMEOUT`
- Automatic retry on timeout (future enhancement)

### **Rate Limiting**
- Replicate: 600 predictions/minute
- Built-in request queuing (future enhancement)
- Automatic backoff on rate limits

## Security Considerations

### **API Key Management**
- Store in environment variables
- Never commit keys to version control
- Rotate keys regularly
- Use read-only keys when possible

### **Image URL Handling**
- Replicate URLs expire after 1 hour
- Download and cache images for long-term storage
- Validate image content before display

## Troubleshooting

### **Common Issues**

1. **"Provider not configured"**
   - Check `VITE_REPLICATE_API_TOKEN` in `.env`
   - Verify API key format: `r8_...`

2. **"Model not found"**
   - Verify model name format: `owner/model-name`
   - Check model exists and is public

3. **"Generation timeout"**
   - Increase `VITE_IMAGE_TIMEOUT`
   - Try a faster model (flux-schnell)

4. **"Rate limit exceeded"**
   - Wait and retry
   - Consider upgrading Replicate plan

### **Debug Commands**
```bash
# Test API connection
node test-replicate.js

# Check provider status
/providers

# Test image generation
/imagine test prompt
```

## Future Enhancements

### **Planned Features**
- [ ] Batch image generation
- [ ] Image-to-image generation
- [ ] ControlNet support
- [ ] Custom model training integration
- [ ] Automatic model recommendation
- [ ] Usage analytics and cost tracking

### **Provider Extensibility Roadmap**
- [ ] OpenAI DALL-E provider
- [ ] Stability AI Direct API
- [ ] Local Stable Diffusion provider
- [ ] HuggingFace Inference API
- [ ] Custom API provider template

## API Reference

### **Environment Variables**
```bash
VITE_REPLICATE_API_TOKEN=r8_your-key-here  # Required
VITE_DEFAULT_IMAGE_PROVIDER=replicate      # Default provider
VITE_IMAGE_TIMEOUT=120000                  # Timeout in ms
VITE_DEBUG_MODE=true                       # Enable debug logs
```

### **Configuration Keys**
- All configuration is stored in `src/config/env.ts`
- Runtime configuration via Image Generation Modal
- Persistent settings in localStorage

---

## Quick Start

1. **Get API Key**: Visit [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
2. **Add to Environment**: Set `VITE_REPLICATE_API_TOKEN` in `.env`
3. **Test Connection**: Run `node test-replicate.js`
4. **Generate Images**: Click 📷 in status bar or use `/imagine` command

Your Replicate provider is now ready for advanced image generation! 🎨