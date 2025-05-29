import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { estimateTokens, calculateConversationTokens, getTokenStats, cleanupTokenCounter } from '../utils/tokenCounter';

describe('TokenCounter with tiktoken', () => {
  afterEach(() => {
    // Clean up tiktoken encodings after each test
    cleanupTokenCounter();
  });

  describe('estimateTokens', () => {
    it('should return 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should return accurate token count for simple text', () => {
      const text = 'Hello world';
      const tokens = estimateTokens(text);
      
      // Should be more accurate than character-based estimation
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length); // Should be fewer tokens than characters
    });

    it('should handle different models correctly', () => {
      const text = 'This is a test message for token counting';
      
      const gpt4Tokens = estimateTokens(text, 'gpt-4');
      const claudeTokens = estimateTokens(text, 'claude-3-sonnet');
      const gpt3Tokens = estimateTokens(text, 'davinci');
      
      // All should return reasonable token counts
      expect(gpt4Tokens).toBeGreaterThan(0);
      expect(claudeTokens).toBeGreaterThan(0);
      expect(gpt3Tokens).toBeGreaterThan(0);
      
      // GPT-4 and Claude should use same encoding (cl100k_base)
      expect(gpt4Tokens).toBe(claudeTokens);
    });

    it('should fall back to estimation if tiktoken fails', () => {
      // Test with undefined model to force fallback
      const text = 'Test fallback behavior';
      const tokens = estimateTokens(text);
      
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should handle special characters and unicode', () => {
      const unicodeText = 'Hello 世界 🌍 emoji test';
      const tokens = estimateTokens(unicodeText);
      
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should handle very long text', () => {
      const longText = 'Lorem ipsum '.repeat(1000);
      const tokens = estimateTokens(longText);
      
      expect(tokens).toBeGreaterThan(1000);
      expect(tokens).toBeLessThan(longText.length);
    });
  });

  describe('calculateConversationTokens', () => {
    it('should sum tokens from multiple messages', () => {
      const messages = [
        { content: 'Hello', tokens: 1 },
        { content: 'World', tokens: 1 },
        { content: 'How are you?', tokens: 4 }
      ];
      
      const total = calculateConversationTokens(messages);
      expect(total).toBe(6);
    });

    it('should estimate tokens when not provided', () => {
      const messages = [
        { content: 'Hello world' },
        { content: 'This is a test message' }
      ];
      
      const total = calculateConversationTokens(messages);
      expect(total).toBeGreaterThan(0);
      expect(typeof total).toBe('number');
    });

    it('should handle mixed messages with and without token counts', () => {
      const messages = [
        { content: 'Hello', tokens: 1 },
        { content: 'World without token count' },
        { content: 'Goodbye', tokens: 1 }
      ];
      
      const total = calculateConversationTokens(messages);
      expect(total).toBeGreaterThan(2); // At least the provided tokens plus estimated
    });
  });

  describe('getTokenStats', () => {
    it('should categorize tokens by role', () => {
      const messages = [
        { content: 'System prompt', role: 'system', tokens: 2 },
        { content: 'User message', role: 'user', tokens: 2 },
        { content: 'Assistant response', role: 'assistant', tokens: 2 }
      ];
      
      const stats = getTokenStats(messages);
      
      expect(stats.total).toBe(6);
      expect(stats.systemTokens).toBe(2);
      expect(stats.userTokens).toBe(2);
      expect(stats.assistantTokens).toBe(2);
      expect(stats.averagePerMessage).toBe(2);
      expect(typeof stats.formattedTotal).toBe('string');
    });

    it('should estimate tokens when not provided', () => {
      const messages = [
        { content: 'Hello', role: 'user' },
        { content: 'Hi there!', role: 'assistant' }
      ];
      
      const stats = getTokenStats(messages);
      
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.userTokens).toBeGreaterThan(0);
      expect(stats.assistantTokens).toBeGreaterThan(0);
      expect(stats.systemTokens).toBe(0);
    });

    it('should handle empty message array', () => {
      const stats = getTokenStats([]);
      
      expect(stats.total).toBe(0);
      expect(stats.userTokens).toBe(0);
      expect(stats.assistantTokens).toBe(0);
      expect(stats.systemTokens).toBe(0);
      expect(stats.averagePerMessage).toBe(0);
    });

    it('should use model parameter for accurate estimation', () => {
      const messages = [
        { content: 'Test message for model-specific counting', role: 'user' }
      ];
      
      const gpt4Stats = getTokenStats(messages, 'gpt-4');
      const claudeStats = getTokenStats(messages, 'claude-3-sonnet');
      
      // Should get same result for same encoding
      expect(gpt4Stats.total).toBe(claudeStats.total);
      expect(gpt4Stats.userTokens).toBe(claudeStats.userTokens);
    });
  });

  describe('performance', () => {
    it('should handle token counting within reasonable time', () => {
      const start = performance.now();
      
      // Count tokens for moderately sized text
      const text = 'This is a test message that simulates a typical user input. '.repeat(10);
      estimateTokens(text);
      
      const duration = performance.now() - start;
      
      // Should complete within 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle large conversation efficiently', () => {
      const start = performance.now();
      
      // Simulate large conversation
      const messages = Array.from({ length: 100 }, (_, i) => ({
        content: `Message ${i}: This is a simulated conversation message with moderate length.`,
        role: i % 2 === 0 ? 'user' : 'assistant'
      }));
      
      calculateConversationTokens(messages);
      
      const duration = performance.now() - start;
      
      // Should complete within 500ms for 100 messages
      expect(duration).toBeLessThan(500);
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined gracefully', () => {
      expect(estimateTokens(null as any)).toBe(0);
      expect(estimateTokens(undefined as any)).toBe(0);
    });

    it('should handle extremely long single messages', () => {
      const extremelyLongText = 'A'.repeat(100000);
      const tokens = estimateTokens(extremelyLongText);
      
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
      expect(isFinite(tokens)).toBe(true);
    });

    it('should handle messages with only whitespace', () => {
      const whitespaceText = '   \n\t   \n  ';
      const tokens = estimateTokens(whitespaceText);
      
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should handle special markdown and code content', () => {
      const codeText = '```javascript\nfunction test() {\n  return "hello";\n}\n```';
      const tokens = estimateTokens(codeText);
      
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });
  });
});