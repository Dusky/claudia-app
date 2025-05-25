import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

export const testCommand: Command = {
  name: 'test',
  description: 'Test API provider connections and configurations',
  usage: '/test [provider] [type]',
  aliases: ['check'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    
    if (args.length === 0) {
      // Test all configured providers
      lines.push({
        id: `test-${Date.now()}-1`,
        type: 'output',
        content: '🧪 TESTING ALL PROVIDERS:',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `test-${Date.now()}-2`,
        type: 'output',
        content: '',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      // Test AI providers
      const llmProviders = context.llmManager.getAvailableProviders();
      for (const provider of llmProviders) {
        if (provider.configured) {
          lines.push({
            id: `test-${Date.now()}-ai-${provider.id}`,
            type: 'output',
            content: `Testing ${provider.name}...`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
          
          try {
            const llmProvider = context.llmManager.getProvider(provider.id);
            if (llmProvider) {
              await llmProvider.generateResponse([
                { role: 'user', content: 'Hello! This is a test message. Please respond with "Test successful!"' }
              ], { maxTokens: 50 });
              
              lines.push({
                id: `test-${Date.now()}-ai-${provider.id}-result`,
                type: 'output',
                content: `  ✅ ${provider.name} - Working correctly`,
                timestamp: new Date().toISOString(),
                user: 'claudia'
              });
            }
          } catch (error) {
            lines.push({
              id: `test-${Date.now()}-ai-${provider.id}-result`,
              type: 'error',
              content: `  ❌ ${provider.name} - ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
          }
        } else {
          lines.push({
            id: `test-${Date.now()}-ai-${provider.id}-skip`,
            type: 'output',
            content: `  ⏭️ ${provider.name} - Skipped (not configured)`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
        }
      }
      
      lines.push({
        id: `test-${Date.now()}-space`,
        type: 'output',
        content: '',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      // Test image providers
      const imageProviders = context.imageManager.getAvailableProviders();
      for (const provider of imageProviders) {
        if (provider.configured) {
          lines.push({
            id: `test-${Date.now()}-img-${provider.id}`,
            type: 'output',
            content: `Testing ${provider.name}...`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
          
          try {
            const imgProvider = context.imageManager.getProvider(provider.id);
            if (imgProvider) {
              // Note: We won't actually generate an image in the test, just check if the provider is accessible
              lines.push({
                id: `test-${Date.now()}-img-${provider.id}-result`,
                type: 'output',
                content: `  ✅ ${provider.name} - Configuration valid`,
                timestamp: new Date().toISOString(),
                user: 'claudia'
              });
            }
          } catch (error) {
            lines.push({
              id: `test-${Date.now()}-img-${provider.id}-result`,
              type: 'error',
              content: `  ❌ ${provider.name} - ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
          }
        } else {
          lines.push({
            id: `test-${Date.now()}-img-${provider.id}-skip`,
            type: 'output',
            content: `  ⏭️ ${provider.name} - Skipped (not configured)`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
        }
      }
      
      return { success: true, lines };
    }
    
    // Test specific provider
    if (args.length >= 1) {
      const providerId = args[0].toLowerCase();
      const providerType = args[1]?.toLowerCase() || 'ai';
      
      if (providerType === 'ai' || providerType === 'llm') {
        const provider = context.llmManager.getProvider(providerId);
        if (!provider) {
          lines.push({
            id: `test-${Date.now()}`,
            type: 'error',
            content: `❌ AI provider '${providerId}' not found.`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
          return { success: false, lines };
        }
        
        if (!provider.isConfigured()) {
          lines.push({
            id: `test-${Date.now()}`,
            type: 'error',
            content: `❌ AI provider '${providerId}' is not configured (missing API key).`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
          return { success: false, lines };
        }
        
        lines.push({
          id: `test-${Date.now()}-start`,
          type: 'output',
          content: `🧪 Testing ${provider.name}...`,
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
        
        try {
          context.setLoading(true);
          
          const response = await provider.generateResponse([
            { role: 'user', content: 'Hello! This is a test message. Please respond with "Test successful!" and nothing else.' }
          ], { maxTokens: 50 });
          
          lines.push({
            id: `test-${Date.now()}-success`,
            type: 'output',
            content: `✅ ${provider.name} test successful!`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
          
          lines.push({
            id: `test-${Date.now()}-response`,
            type: 'output',
            content: `Response: "${response.content.trim()}"`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
          
          if (response.usage) {
            lines.push({
              id: `test-${Date.now()}-usage`,
              type: 'output',
              content: `Tokens used: ${response.usage.total_tokens || 'Unknown'}`,
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
          }
          
        } catch (error) {
          lines.push({
            id: `test-${Date.now()}-error`,
            type: 'error',
            content: `❌ ${provider.name} test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
          return { success: false, lines };
        } finally {
          context.setLoading(false);
        }
      } else if (providerType === 'image' || providerType === 'img') {
        const provider = context.imageManager.getProvider(providerId);
        if (!provider) {
          lines.push({
            id: `test-${Date.now()}`,
            type: 'error',
            content: `❌ Image provider '${providerId}' not found.`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
          return { success: false, lines };
        }
        
        if (!provider.isConfigured()) {
          lines.push({
            id: `test-${Date.now()}`,
            type: 'error',
            content: `❌ Image provider '${providerId}' is not configured (missing API key).`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
          return { success: false, lines };
        }
        
        lines.push({
          id: `test-${Date.now()}-success`,
          type: 'output',
          content: `✅ ${provider.name} configuration is valid.`,
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
        
        lines.push({
          id: `test-${Date.now()}-note`,
          type: 'output',
          content: `Note: Use /imagine to test actual image generation.`,
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
      } else {
        lines.push({
          id: `test-${Date.now()}`,
          type: 'error',
          content: `❌ Unknown provider type: ${providerType}. Use 'ai' or 'image'.`,
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
        return { success: false, lines };
      }
    }
    
    return { success: true, lines };
  }
};