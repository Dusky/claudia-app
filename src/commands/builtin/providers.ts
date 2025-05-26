import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { ReplicateProvider } from '../../providers/image/replicate';

export const providersCommand: Command = {
  name: 'providers',
  description: 'Show status of all providers',
  usage: '/providers',
  aliases: ['provider-status'],
  
  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    // Header
    lines.push({
      id: `providers-header-${timestamp}`,
      type: 'system',
      content: '**=== PROVIDER STATUS ===**',
      timestamp,
      user: 'claudia'
    });

    lines.push({
      id: `providers-spacer1-${timestamp}`,
      type: 'output',
      content: '',
      timestamp,
      user: 'claudia'
    });

    // Image Providers
    lines.push({
      id: `providers-image-header-${timestamp}`,
      type: 'output',
      content: '**Image Providers:**',
      timestamp,
      user: 'claudia'
    });

    const activeImage = context.imageManager.getActiveProvider();
    lines.push({
      id: `providers-image-active-${timestamp}`,
      type: 'output',
      content: `  Active: ${activeImage ? activeImage.name : 'None'}`,
      timestamp,
      user: 'claudia'
    });

    const availableImages = context.imageManager.getAvailableProviders();
    availableImages.forEach(provider => {
      const status = provider.configured ? '<span class="color-green">✅ Configured</span>' : '<span class="color-red">❌ Not Configured</span>';
      const models = provider.models ? ` (${provider.models.length} models)` : '';
      lines.push({
        id: `providers-image-${provider.id}-${timestamp}`,
        type: 'output',
        content: `    ${provider.name} (${provider.id}): ${status}${models}`,
        timestamp,
        user: 'claudia'
      });
    });

    lines.push({
      id: `providers-spacer3-${timestamp}`,
      type: 'output',
      content: '',
      timestamp,
      user: 'claudia'
    });

    // Environment info
    lines.push({
      id: `providers-env-header-${timestamp}`,
      type: 'output',
      content: '**Environment:**',
      timestamp,
      user: 'claudia'
    });

    // Check for environment variables (without exposing values)
    const hasReplicateKey = !!import.meta.env.VITE_REPLICATE_API_TOKEN;

    lines.push({
      id: `providers-env-replicate-${timestamp}`,
      type: 'output',
      content: `  VITE_REPLICATE_API_TOKEN: ${hasReplicateKey ? '<span class="color-green">Set</span>' : '<span class="color-red">Not Set</span>'}`,
      timestamp,
      user: 'claudia'
    });

    lines.push({
      id: `providers-spacer4-${timestamp}`,
      type: 'output',
      content: '',
      timestamp,
      user: 'claudia'
    });

    // Tips
    lines.push({
      id: `providers-tips-${timestamp}`,
      type: 'system',
      content: '<span class="color-yellow">💡 Tip:</span> If providers show as "Not Configured", check your `.env` file and restart the dev server.',
      timestamp,
      user: 'claudia'
    });

    return { success: true, lines };
  }
};

export const testReplicateCommand: Command = {
  name: 'test-replicate',
  description: 'Test Replicate API connection and configuration',
  usage: '/test-replicate',
  aliases: ['test-rep', 'debug-replicate'],
  
  async execute(_args: string[], _context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    lines.push({
      id: `test-replicate-header-${timestamp}`,
      type: 'system',
      content: '**=== REPLICATE API TEST ===**',
      timestamp,
      user: 'claudia'
    });

    // Check environment
    const apiToken = import.meta.env.VITE_REPLICATE_API_TOKEN;
    lines.push({
      id: `test-replicate-env-${timestamp}`,
      type: 'output',
      content: `API Token: ${apiToken ? '<span class="color-green">✅ Present (length: ' + apiToken.length + ')</span>' : '<span class="color-red">❌ Missing</span>'}`,
      timestamp,
      user: 'claudia'
    });

    if (!apiToken) {
      lines.push({
        id: `test-replicate-error-${timestamp}`,
        type: 'error',
        content: 'Cannot test API - no token found. Check your .env file.',
        timestamp,
        user: 'claudia'
      });
      return { success: false, lines };
    }

    // Test provider creation
    try {
      lines.push({
        id: `test-replicate-creating-${timestamp}`,
        type: 'output',
        content: 'Creating Replicate provider...',
        timestamp,
        user: 'claudia'
      });

      const provider = new ReplicateProvider();
      const config = {
        apiKey: apiToken,
        baseURL: 'https://api.replicate.com',
        model: 'black-forest-labs/flux-schnell'
      };
      
      await provider.initialize(config);
      
      lines.push({
        id: `test-replicate-configured-${timestamp}`,
        type: 'output',
        content: '<span class="color-green">✅ Provider configured successfully</span>',
        timestamp,
        user: 'claudia'
      });

      // Test simple API call
      lines.push({
        id: `test-replicate-testing-${timestamp}`,
        type: 'output',
        content: 'Testing API connection...',
        timestamp,
        user: 'claudia'
      });

      if (provider.testConnection) {
        await provider.testConnection();
      } else {
        throw new Error('Test connection method not available for this provider');
      }
      
      lines.push({
        id: `test-replicate-success-${timestamp}`,
        type: 'output',
        content: `<span class="color-green">✅ API connection test successful</span>`,
        timestamp,
        user: 'claudia'
      });

    } catch (error) {
      lines.push({
        id: `test-replicate-failed-${timestamp}`,
        type: 'error',
        content: `<span class="color-red">❌ API test failed</span>`,
        timestamp,
        user: 'claudia'
      });

      if (error instanceof Error) {
        lines.push({
          id: `test-replicate-error-details-${timestamp}`,
          type: 'error',
          content: `Error: ${error.message}`,
          timestamp,
          user: 'claudia'
        });

        // Add debug info for network errors
        if (error.message.includes('Network Error') || error.message.includes('fetch')) {
          lines.push({
            id: `test-replicate-network-debug-${timestamp}`,
            type: 'output',
            content: '<span class="color-yellow">💡 Network Error Debug:</span>',
            timestamp,
            user: 'claudia'
          });
          
          lines.push({
            id: `test-replicate-network-tips-${timestamp}`,
            type: 'output',
            content: '- Check internet connection\n- Verify API token is valid\n- Check for firewall/proxy issues\n- Try refreshing the page',
            timestamp,
            user: 'claudia'
          });
        }
      }
    }

    return { success: true, lines };
  }
};