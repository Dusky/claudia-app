import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

export const providersCommand: Command = {
  name: 'providers',
  description: 'Manage AI and image generation providers',
  usage: '/providers [list|set|status] [provider] [type]',
  aliases: ['provider', 'api'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    
    if (args.length === 0 || args[0] === 'status') {
      // Show current provider status
      lines.push({
        id: `providers-${Date.now()}-1`,
        type: 'output',
        content: '🔧 PROVIDER STATUS:',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `providers-${Date.now()}-2`,
        type: 'output',
        content: '',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      // LLM Providers
      const llmProviders = context.llmManager.getAvailableProviders();
      const activeLLM = context.llmManager.getActiveProvider();
      
      lines.push({
        id: `providers-${Date.now()}-3`,
        type: 'output',
        content: '🤖 AI Providers:',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      llmProviders.forEach((provider, index) => {
        const isActive = activeLLM?.id === provider.id;
        const status = provider.configured ? '✅' : '❌';
        const activeIndicator = isActive ? ' (active)' : '';
        
        lines.push({
          id: `providers-${Date.now()}-llm-${index}`,
          type: 'output',
          content: `  ${status} ${provider.id.padEnd(12)} - ${provider.name}${activeIndicator}`,
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
      });
      
      lines.push({
        id: `providers-${Date.now()}-space1`,
        type: 'output',
        content: '',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      // Image Providers
      const imageProviders = context.imageManager.getAvailableProviders();
      const activeImage = context.imageManager.getActiveProvider();
      
      lines.push({
        id: `providers-${Date.now()}-4`,
        type: 'output',
        content: '🎨 Image Providers:',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      imageProviders.forEach((provider, index) => {
        const isActive = activeImage?.id === provider.id;
        const status = provider.configured ? '✅' : '❌';
        const activeIndicator = isActive ? ' (active)' : '';
        
        lines.push({
          id: `providers-${Date.now()}-img-${index}`,
          type: 'output',
          content: `  ${status} ${provider.id.padEnd(12)} - ${provider.name}${activeIndicator}`,
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
      });
      
      lines.push({
        id: `providers-${Date.now()}-space2`,
        type: 'output',
        content: '',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `providers-${Date.now()}-help`,
        type: 'output',
        content: 'Use /providers set <provider> <type> to change active provider',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `providers-${Date.now()}-help2`,
        type: 'output',
        content: 'Example: /providers set anthropic ai',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      return { success: true, lines };
    }
    
    if (args[0] === 'list') {
      // List all available providers
      lines.push({
        id: `providers-${Date.now()}-1`,
        type: 'output',
        content: '📋 AVAILABLE PROVIDERS:',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `providers-${Date.now()}-2`,
        type: 'output',
        content: '',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `providers-${Date.now()}-3`,
        type: 'output',
        content: 'AI Providers:',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      const llmProviders = context.llmManager.getAvailableProviders();
      llmProviders.forEach((provider, index) => {
        lines.push({
          id: `providers-${Date.now()}-llm-${index}`,
          type: 'output',
          content: `  • ${provider.id} - ${provider.name}`,
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
      });
      
      lines.push({
        id: `providers-${Date.now()}-space`,
        type: 'output',
        content: '',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      lines.push({
        id: `providers-${Date.now()}-4`,
        type: 'output',
        content: 'Image Providers:',
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      
      const imageProviders = context.imageManager.getAvailableProviders();
      imageProviders.forEach((provider, index) => {
        lines.push({
          id: `providers-${Date.now()}-img-${index}`,
          type: 'output',
          content: `  • ${provider.id} - ${provider.name}`,
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
      });
      
      return { success: true, lines };
    }
    
    if (args[0] === 'set') {
      if (args.length < 3) {
        lines.push({
          id: `providers-${Date.now()}`,
          type: 'error',
          content: '❌ Usage: /providers set <provider> <type>',
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
        
        lines.push({
          id: `providers-${Date.now()}-2`,
          type: 'output',
          content: 'Types: ai, image',
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
        
        lines.push({
          id: `providers-${Date.now()}-3`,
          type: 'output',
          content: 'Example: /providers set anthropic ai',
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
        
        return { success: false, lines };
      }
      
      const providerId = args[1].toLowerCase();
      const providerType = args[2].toLowerCase();
      
      try {
        if (providerType === 'ai' || providerType === 'llm') {
          // Set AI provider
          const provider = context.llmManager.getProvider(providerId);
          if (!provider) {
            lines.push({
              id: `providers-${Date.now()}`,
              type: 'error',
              content: `❌ AI provider '${providerId}' not found.`,
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
            return { success: false, lines };
          }
          
          if (!provider.isConfigured()) {
            lines.push({
              id: `providers-${Date.now()}`,
              type: 'error',
              content: `❌ AI provider '${providerId}' is not configured (missing API key).`,
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
            return { success: false, lines };
          }
          
          context.llmManager.setActiveProvider(providerId);
          
          lines.push({
            id: `providers-${Date.now()}`,
            type: 'output',
            content: `✅ Active AI provider set to: ${provider.name}`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
          
        } else if (providerType === 'image' || providerType === 'img') {
          // Set image provider
          const provider = context.imageManager.getProvider(providerId);
          if (!provider) {
            lines.push({
              id: `providers-${Date.now()}`,
              type: 'error',
              content: `❌ Image provider '${providerId}' not found.`,
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
            return { success: false, lines };
          }
          
          if (!provider.isConfigured()) {
            lines.push({
              id: `providers-${Date.now()}`,
              type: 'error',
              content: `❌ Image provider '${providerId}' is not configured (missing API key).`,
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
            return { success: false, lines };
          }
          
          context.imageManager.setActiveProvider(providerId);
          
          lines.push({
            id: `providers-${Date.now()}`,
            type: 'output',
            content: `✅ Active image provider set to: ${provider.name}`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
          
        } else {
          lines.push({
            id: `providers-${Date.now()}`,
            type: 'error',
            content: `❌ Unknown provider type: ${providerType}. Use 'ai' or 'image'.`,
            timestamp: new Date().toISOString(),
            user: 'claudia'
          });
          return { success: false, lines };
        }
        
        return { success: true, lines };
        
      } catch (error) {
        lines.push({
          id: `providers-${Date.now()}`,
          type: 'error',
          content: `❌ Error setting provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
        
        return { success: false, lines };
      }
    }
    
    // Unknown subcommand
    lines.push({
      id: `providers-${Date.now()}`,
      type: 'error',
      content: `❌ Unknown command: ${args[0]}. Use 'list', 'set', or 'status'.`,
      timestamp: new Date().toISOString(),
      user: 'claudia'
    });
    
    return { success: false, lines };
  }
};
