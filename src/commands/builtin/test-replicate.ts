import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

export const testReplicateCommand: Command = {
  name: 'test-replicate',
  description: 'Test Replicate API connection and functionality',
  usage: '/test-replicate',
  aliases: ['test-api'],
  
  async execute(_args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();

    lines.push({
      id: `test-replicate-start-${timestamp}`,
      type: 'system',
      content: '🧪 **Testing Replicate API Connection...**',
      timestamp,
      user: 'claudia'
    });

    try {
      context.setLoading(true);

      const provider = context.imageManager.getActiveProvider();
      if (!provider) {
        lines.push({
          id: `test-replicate-no-provider-${timestamp}`,
          type: 'error',
          content: '❌ No active image provider found',
          timestamp,
          user: 'claudia'
        });
        return { success: false, lines };
      }

      if (provider.id !== 'replicate') {
        lines.push({
          id: `test-replicate-wrong-provider-${timestamp}`,
          type: 'error',
          content: `❌ Active provider is ${provider.name}, not Replicate`,
          timestamp,
          user: 'claudia'
        });
        return { success: false, lines };
      }

      lines.push({
        id: `test-replicate-provider-found-${timestamp}`,
        type: 'output',
        content: '✅ Replicate provider found and active',
        timestamp,
        user: 'claudia'
      });

      // Test configuration
      const isConfigured = provider.isConfigured();
      lines.push({
        id: `test-replicate-config-${timestamp}`,
        type: 'output',
        content: `✅ Provider configured: ${isConfigured ? 'Yes' : 'No'}`,
        timestamp,
        user: 'claudia'
      });

      if (!isConfigured) {
        lines.push({
          id: `test-replicate-not-configured-${timestamp}`,
          type: 'error',
          content: '❌ Provider not configured - check API key',
          timestamp,
          user: 'claudia'
        });
        return { success: false, lines };
      }

      // Test connection if the provider has a testConnection method
      if (typeof provider.testConnection === 'function') {
        lines.push({
          id: `test-replicate-testing-connection-${timestamp}`,
          type: 'output',
          content: '🔄 Testing API connection...',
          timestamp,
          user: 'claudia'
        });

        try {
          const connectionResult = await provider.testConnection();
          lines.push({
            id: `test-replicate-connection-result-${timestamp}`,
            type: 'output',
            content: `✅ Connection test: ${connectionResult ? 'Successful' : 'Failed'}`,
            timestamp,
            user: 'claudia'
          });

          if (!connectionResult) {
            lines.push({
              id: `test-replicate-connection-failed-${timestamp}`,
              type: 'error',
              content: '❌ API connection failed - check network and API key',
              timestamp,
              user: 'claudia'
            });
            return { success: false, lines };
          }
        } catch (connectionError) {
          lines.push({
            id: `test-replicate-connection-error-${timestamp}`,
            type: 'error',
            content: `❌ Connection test error: ${connectionError instanceof Error ? connectionError.message : 'Unknown error'}`,
            timestamp,
            user: 'claudia'
          });
          return { success: false, lines };
        }
      }

      // Test supported models
      const supportedModels = provider.getSupportedModels?.() || [];
      lines.push({
        id: `test-replicate-models-${timestamp}`,
        type: 'output',
        content: `✅ Supported models: ${supportedModels.length} available`,
        timestamp,
        user: 'claudia'
      });

      if (supportedModels.length > 0) {
        lines.push({
          id: `test-replicate-models-list-${timestamp}`,
          type: 'output',
          content: `   Default: ${supportedModels[0]}`,
          timestamp,
          user: 'claudia'
        });
      }

      lines.push({
        id: `test-replicate-success-${timestamp}`,
        type: 'system',
        content: '🎉 **All tests passed! Replicate is ready for image generation.**',
        timestamp,
        user: 'claudia'
      });

      lines.push({
        id: `test-replicate-next-steps-${timestamp}`,
        type: 'output',
        content: '💡 Try: `/imagine Claudia in a cozy setting` to test image generation',
        timestamp,
        user: 'claudia'
      });

      return { success: true, lines };

    } catch (error) {
      lines.push({
        id: `test-replicate-error-${timestamp}`,
        type: 'error',
        content: `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp,
        user: 'claudia'
      });
      return { success: false, lines };
    } finally {
      context.setLoading(false);
    }
  }
};