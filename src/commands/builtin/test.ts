import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { estimateTokens, formatTokenCount } from '../../utils/tokenCounter';

export const testCommand: Command = {
  name: 'test',
  description: 'Test API provider connections and configurations, or token counting',
  usage: '/test [provider] [type] | /test tokens',
  aliases: ['check'],
  
  async execute(args: string[], context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();
    
    // Test token counting functionality
    if (args.length === 1 && args[0].toLowerCase() === 'tokens') {
      lines.push({
        id: `test-${timestamp}-tokens-header`, type: 'system',
        content: 'Token Counting Test Results:', timestamp, user: 'claudia'
      });
      lines.push({ id: `test-${timestamp}-tokens-space1`, type: 'output', content: '', timestamp, user: 'claudia' });
      
      // Test cases
      const testCases = [
        { name: 'Empty string', text: '' },
        { name: 'Simple greeting', text: 'Hello world' },
        { name: 'Medium text', text: 'This is a longer sentence with multiple words, punctuation, and various elements that should help test the token estimation algorithm.' },
        { name: 'Long paragraph', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.' }
      ];
      
      for (const testCase of testCases) {
        const tokens = estimateTokens(testCase.text);
        const formatted = formatTokenCount(tokens);
        const charCount = testCase.text.length;
        const wordCount = testCase.text.split(/\s+/).filter(w => w.length > 0).length;
        
        lines.push({
          id: `test-${timestamp}-token-${testCase.name.replace(/\s+/g, '-')}`, type: 'output',
          content: `${testCase.name}:`, timestamp, user: 'claudia'
        });
        lines.push({
          id: `test-${timestamp}-token-${testCase.name.replace(/\s+/g, '-')}-details`, type: 'output',
          content: `  Text: "${testCase.text.substring(0, 50)}${testCase.text.length > 50 ? '...' : ''}"`, timestamp, user: 'claudia'
        });
        lines.push({
          id: `test-${timestamp}-token-${testCase.name.replace(/\s+/g, '-')}-stats`, type: 'output',
          content: `  Characters: ${charCount} | Words: ${wordCount} | Estimated tokens: ${tokens}`, timestamp, user: 'claudia'
        });
        lines.push({
          id: `test-${timestamp}-token-${testCase.name.replace(/\s+/g, '-')}-formatted`, type: 'output',
          content: `  Formatted: ${formatted}`, timestamp, user: 'claudia'
        });
        lines.push({ id: `test-${timestamp}-token-${testCase.name.replace(/\s+/g, '-')}-space`, type: 'output', content: '', timestamp, user: 'claudia' });
      }
      
      // Test formatTokenCount with different ranges
      lines.push({
        id: `test-${timestamp}-format-header`, type: 'output',
        content: 'Format Testing (various token counts):', timestamp, user: 'claudia'
      });
      
      const formatTests = [0, 1, 50, 500, 5000, 50000, 500000, 5000000];
      for (const tokenCount of formatTests) {
        const formatted = formatTokenCount(tokenCount);
        lines.push({
          id: `test-${timestamp}-format-${tokenCount}`, type: 'output',
          content: `  ${tokenCount} tokens → ${formatted}`, timestamp, user: 'claudia'
        });
      }
      
      return { success: true, lines };
    }
    
    if (args.length === 0) {
      lines.push({
        id: `test-${timestamp}-1`, type: 'system',
        content: 'Test: TESTING ALL PROVIDERS:', timestamp, user: 'claudia' // Emoji removed
      });
      lines.push({ id: `test-${timestamp}-2`, type: 'output', content: '', timestamp, user: 'claudia' });
      
      const llmProviders = context.llmManager.getAvailableProviders();
      for (const provider of llmProviders) {
        if (provider.configured) {
          lines.push({
            id: `test-${timestamp}-ai-${provider.id}`, type: 'output',
            content: `Test: Testing ${provider.name}...`, timestamp, user: 'claudia'
          });
          try {
            const llmProvider = context.llmManager.getProvider(provider.id);
            if (llmProvider) {
              await llmProvider.generateResponse([
                { role: 'user', content: 'Hello! This is a test message. Please respond with "Test successful!"' }
              ], { maxTokens: 50 });
              lines.push({
                id: `test-${timestamp}-ai-${provider.id}-result`, type: 'output',
                content: `  Status: OK - ${provider.name} - Working correctly`, timestamp, user: 'claudia' // Emoji removed
              });
            }
          } catch (error) {
            lines.push({
              id: `test-${timestamp}-ai-${provider.id}-result`, type: 'error',
              content: `  Status: FAIL - ${provider.name} - ${error instanceof Error ? error.message : 'Unknown error'}`, timestamp, user: 'claudia' // Emoji removed
            });
          }
        } else {
          lines.push({
            id: `test-${timestamp}-ai-${provider.id}-skip`, type: 'output',
            content: `  Skipped: ${provider.name} - (not configured)`, timestamp, user: 'claudia' // Emoji removed
          });
        }
      }
      lines.push({ id: `test-${timestamp}-space`, type: 'output', content: '', timestamp, user: 'claudia' });
      
      const imageProviders = context.imageManager.getAvailableProviders();
      for (const provider of imageProviders) {
        if (provider.configured) {
          lines.push({
            id: `test-${timestamp}-img-${provider.id}`, type: 'output',
            content: `Test: Testing ${provider.name}...`, timestamp, user: 'claudia'
          });
          try {
            const imgProvider = context.imageManager.getProvider(provider.id);
            if (imgProvider) {
              lines.push({
                id: `test-${timestamp}-img-${provider.id}-result`, type: 'output',
                content: `  Status: OK - ${provider.name} - Configuration valid`, timestamp, user: 'claudia' // Emoji removed
              });
            }
          } catch (error) {
            lines.push({
              id: `test-${timestamp}-img-${provider.id}-result`, type: 'error',
              content: `  Status: FAIL - ${provider.name} - ${error instanceof Error ? error.message : 'Unknown error'}`, timestamp, user: 'claudia' // Emoji removed
            });
          }
        } else {
          lines.push({
            id: `test-${timestamp}-img-${provider.id}-skip`, type: 'output',
            content: `  Skipped: ${provider.name} - (not configured)`, timestamp, user: 'claudia' // Emoji removed
          });
        }
      }
      return { success: true, lines };
    }
    
    if (args.length >= 1) {
      const providerId = args[0].toLowerCase();
      const providerType = args[1]?.toLowerCase() || 'ai';
      
      if (providerType === 'ai' || providerType === 'llm') {
        const provider = context.llmManager.getProvider(providerId);
        if (!provider) {
          lines.push({
            id: `test-${timestamp}`, type: 'error',
            content: `Error: AI provider '${providerId}' not found.`, timestamp, user: 'claudia' // Emoji removed
          });
          return { success: false, lines };
        }
        if (!provider.isConfigured()) {
          lines.push({
            id: `test-${timestamp}`, type: 'error',
            content: `Error: AI provider '${providerId}' is not configured (missing API key).`, timestamp, user: 'claudia' // Emoji removed
          });
          return { success: false, lines };
        }
        lines.push({
          id: `test-${timestamp}-start`, type: 'output',
          content: `Test: Testing ${provider.name}...`, timestamp, user: 'claudia' // Emoji removed
        });
        try {
          context.setLoading(true);
          const response = await provider.generateResponse([
            { role: 'user', content: 'Hello! This is a test message. Please respond with "Test successful!" and nothing else.' }
          ], { maxTokens: 50 });
          lines.push({
            id: `test-${timestamp}-success`, type: 'output',
            content: `Status: OK - ${provider.name} test successful!`, timestamp, user: 'claudia' // Emoji removed
          });
          lines.push({
            id: `test-${timestamp}-response`, type: 'output',
            content: `Response: "${response.content.trim()}"`, timestamp, user: 'claudia'
          });
          if (response.usage) {
            lines.push({
              id: `test-${timestamp}-usage`, type: 'output',
              content: `Tokens used: ${response.usage.total_tokens || 'Unknown'}`, timestamp, user: 'claudia'
            });
          }
        } catch (error) {
          lines.push({
            id: `test-${timestamp}-error`, type: 'error',
            content: `Error: ${provider.name} test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, timestamp, user: 'claudia' // Emoji removed
          });
          return { success: false, lines };
        } finally {
          context.setLoading(false);
        }
      } else if (providerType === 'image' || providerType === 'img') {
        const provider = context.imageManager.getProvider(providerId);
        if (!provider) {
          lines.push({
            id: `test-${timestamp}`, type: 'error',
            content: `Error: Image provider '${providerId}' not found.`, timestamp, user: 'claudia' // Emoji removed
          });
          return { success: false, lines };
        }
        if (!provider.isConfigured()) {
          lines.push({
            id: `test-${timestamp}`, type: 'error',
            content: `Error: Image provider '${providerId}' is not configured (missing API key).`, timestamp, user: 'claudia' // Emoji removed
          });
          return { success: false, lines };
        }
        lines.push({
          id: `test-${timestamp}-success`, type: 'output',
          content: `Status: OK - ${provider.name} configuration is valid.`, timestamp, user: 'claudia' // Emoji removed
        });
        lines.push({
          id: `test-${timestamp}-note`, type: 'output',
          content: `Info: Use /imagine to test actual image generation.`, timestamp, user: 'claudia'
        });
      } else {
        lines.push({
          id: `test-${timestamp}`, type: 'error',
          content: `Error: Unknown provider type: ${providerType}. Use 'ai' or 'image'.`, timestamp, user: 'claudia' // Emoji removed
        });
        return { success: false, lines };
      }
    }
    return { success: true, lines };
  }
};
