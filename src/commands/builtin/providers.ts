import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';

export const providersCommand: Command = {
  name: 'providers',
  description: 'Manage AI and image generation providers',
  usage: '/providers [list|set|status] [provider] [type]',
  aliases: ['provider', 'api'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();
    
    if (args.length === 0 || args[0] === 'status') {
      lines.push({
        id: `providers-${timestamp}-1`,
        type: 'system',
        content: 'Provider Status:', // Emoji removed
        timestamp, user: 'claudia'
      });
      lines.push({ id: `providers-${timestamp}-2`, type: 'output', content: '', timestamp, user: 'claudia' });
      
      const llmProviders = context.llmManager.getAvailableProviders();
      const activeLLM = context.llmManager.getActiveProvider();
      lines.push({
        id: `providers-${timestamp}-3`, type: 'output',
        content: 'AI Providers:', timestamp, user: 'claudia' // Emoji removed
      });
      llmProviders.forEach((provider, index) => {
        const isActive = activeLLM?.id === provider.id;
        const status = provider.configured ? 'OK  ' : 'FAIL';
        const activeIndicator = isActive ? ' (active)' : '';
        const providerId = provider.id.padEnd(15);
        lines.push({
          id: `providers-${timestamp}-llm-${index}`, type: 'output',
          content: `  [${status}] ${providerId} ${provider.name}${activeIndicator}`,
          timestamp, user: 'claudia'
        });
      });
      lines.push({ id: `providers-${timestamp}-space1`, type: 'output', content: '', timestamp, user: 'claudia' });
      
      const imageProviders = context.imageManager.getAvailableProviders();
      const activeImage = context.imageManager.getActiveProvider();
      lines.push({
        id: `providers-${timestamp}-4`, type: 'output',
        content: 'Image Providers:', timestamp, user: 'claudia' // Emoji removed
      });
      imageProviders.forEach((provider, index) => {
        const isActive = activeImage?.id === provider.id;
        const status = provider.configured ? 'OK  ' : 'FAIL';
        const activeIndicator = isActive ? ' (active)' : '';
        const providerId = provider.id.padEnd(15);
        lines.push({
          id: `providers-${timestamp}-img-${index}`, type: 'output',
          content: `  [${status}] ${providerId} ${provider.name}${activeIndicator}`,
          timestamp, user: 'claudia'
        });
      });
      lines.push({ id: `providers-${timestamp}-space2`, type: 'output', content: '', timestamp, user: 'claudia' });
      lines.push({
        id: `providers-${timestamp}-help`, type: 'output',
        content: 'Info: Use /providers set <provider> <type> to change active provider',
        timestamp, user: 'claudia'
      });
      lines.push({
        id: `providers-${timestamp}-help2`, type: 'output',
        content: 'Info: Example: /providers set anthropic ai',
        timestamp, user: 'claudia'
      });
      return { success: true, lines };
    }
    
    if (args[0] === 'list') {
      lines.push({
        id: `providers-${timestamp}-1`, type: 'system',
        content: 'Available Providers:', timestamp, user: 'claudia' // Emoji removed
      });
      lines.push({ id: `providers-${timestamp}-2`, type: 'output', content: '', timestamp, user: 'claudia' });
      lines.push({
        id: `providers-${timestamp}-3`, type: 'output',
        content: 'AI Providers:', timestamp, user: 'claudia'
      });
      const llmProviders = context.llmManager.getAvailableProviders();
      llmProviders.forEach((provider, index) => {
        lines.push({
          id: `providers-${timestamp}-llm-${index}`, type: 'output',
          content: `  - ${provider.id} - ${provider.name}`, timestamp, user: 'claudia'
        });
      });
      lines.push({ id: `providers-${timestamp}-space`, type: 'output', content: '', timestamp, user: 'claudia' });
      lines.push({
        id: `providers-${timestamp}-4`, type: 'output',
        content: 'Image Providers:', timestamp, user: 'claudia'
      });
      const imageProviders = context.imageManager.getAvailableProviders();
      imageProviders.forEach((provider, index) => {
        lines.push({
          id: `providers-${timestamp}-img-${index}`, type: 'output',
          content: `  - ${provider.id} - ${provider.name}`, timestamp, user: 'claudia'
        });
      });
      return { success: true, lines };
    }
    
    if (args[0] === 'set') {
      if (args.length < 3) {
        lines.push({
          id: `providers-${timestamp}`, type: 'error',
          content: 'Error: Usage: /providers set <provider> <type>', timestamp, user: 'claudia' // Emoji removed
        });
        lines.push({
          id: `providers-${timestamp}-2`, type: 'output',
          content: 'Info: Types: ai, image', timestamp, user: 'claudia'
        });
        lines.push({
          id: `providers-${timestamp}-3`, type: 'output',
          content: 'Info: Example: /providers set anthropic ai', timestamp, user: 'claudia'
        });
        return { success: false, lines };
      }
      
      const providerId = args[1].toLowerCase();
      const providerType = args[2].toLowerCase();
      
      try {
        if (providerType === 'ai' || providerType === 'llm') {
          const provider = context.llmManager.getProvider(providerId);
          if (!provider) {
            lines.push({
              id: `providers-${timestamp}`, type: 'error',
              content: `Error: AI provider '${providerId}' not found.`, timestamp, user: 'claudia' // Emoji removed
            });
            return { success: false, lines };
          }
          if (!provider.isConfigured()) {
            lines.push({
              id: `providers-${timestamp}`, type: 'error',
              content: `Error: AI provider '${providerId}' is not configured (missing API key).`, timestamp, user: 'claudia' // Emoji removed
            });
            return { success: false, lines };
          }
          context.llmManager.setActiveProvider(providerId);
          lines.push({
            id: `providers-${timestamp}`, type: 'output',
            content: `Status: Active AI provider set to: ${provider.name}`, timestamp, user: 'claudia' // Emoji removed
          });
        } else if (providerType === 'image' || providerType === 'img') {
          const provider = context.imageManager.getProvider(providerId);
          if (!provider) {
            lines.push({
              id: `providers-${timestamp}`, type: 'error',
              content: `Error: Image provider '${providerId}' not found.`, timestamp, user: 'claudia' // Emoji removed
            });
            return { success: false, lines };
          }
          if (!provider.isConfigured()) {
            lines.push({
              id: `providers-${timestamp}`, type: 'error',
              content: `Error: Image provider '${providerId}' is not configured (missing API key).`, timestamp, user: 'claudia' // Emoji removed
            });
            return { success: false, lines };
          }
          context.imageManager.setActiveProvider(providerId);
          lines.push({
            id: `providers-${timestamp}`, type: 'output',
            content: `Status: Active image provider set to: ${provider.name}`, timestamp, user: 'claudia' // Emoji removed
          });
        } else {
          lines.push({
            id: `providers-${timestamp}`, type: 'error',
            content: `Error: Unknown provider type: ${providerType}. Use 'ai' or 'image'.`, timestamp, user: 'claudia' // Emoji removed
          });
          return { success: false, lines };
        }
        return { success: true, lines };
      } catch (error) {
        lines.push({
          id: `providers-${timestamp}`, type: 'error',
          content: `Error: Error setting provider: ${error instanceof Error ? error.message : 'Unknown error'}`, // Emoji removed
          timestamp, user: 'claudia'
        });
        return { success: false, lines };
      }
    }
    
    lines.push({
      id: `providers-${timestamp}`, type: 'error',
      content: `Error: Unknown command: ${args[0]}. Use 'list', 'set', or 'status'.`, // Emoji removed
      timestamp, user: 'claudia'
    });
    return { success: false, lines };
  }
};
