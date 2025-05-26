// Token counting utilities for cost tracking and context management

/**
 * Rough token estimation based on character count
 * This is an approximation - different models have different tokenization
 * Generally: 1 token ≈ 4 characters for English text
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  // More accurate estimation accounting for spaces and common patterns
  // Most tokenizers count spaces, punctuation, etc. differently
  const baseEstimate = Math.ceil(text.length / 4);
  
  // Adjust for common patterns
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  const punctuationCount = (text.match(/[.,!?;:()[\]{}'"]/g) || []).length;
  
  // Better estimate: average of character-based and word-based counting
  const wordBasedEstimate = wordCount + punctuationCount;
  
  return Math.max(1, Math.round((baseEstimate + wordBasedEstimate) / 2));
}

/**
 * Calculate total tokens for a conversation thread
 */
export function calculateConversationTokens(messages: Array<{ content: string; tokens?: number }>): number {
  return messages.reduce((total, message) => {
    // Use stored token count if available, otherwise estimate
    const tokens = message.tokens ?? estimateTokens(message.content);
    return total + tokens;
  }, 0);
}

/**
 * Format token count for display with cost estimation
 */
export function formatTokenCount(tokens: number, includeEstimate: boolean = true): string {
  if (tokens === 0) return '0 tokens';
  
  const formatted = tokens.toLocaleString();
  
  if (!includeEstimate || tokens < 1000) {
    return `${formatted} tokens`;
  }
  
  // Rough cost estimates (as of 2024, prices vary by model)
  const estimatedCostUSD = tokens / 1000000; // Very rough $1 per 1M tokens
  
  if (tokens >= 1000000) {
    return `${formatted} tokens (~$${estimatedCostUSD.toFixed(2)})`;
  } else if (tokens >= 100000) {
    return `${formatted} tokens (~$${(estimatedCostUSD * 100).toFixed(1)}¢)`;
  } else {
    return `${formatted} tokens`;
  }
}

/**
 * Get token usage statistics for a conversation
 */
export interface TokenStats {
  total: number;
  userTokens: number;
  assistantTokens: number;
  systemTokens: number;
  averagePerMessage: number;
  formattedTotal: string;
}

export function getTokenStats(messages: Array<{ content: string; role: string; tokens?: number }>): TokenStats {
  let total = 0;
  let userTokens = 0;
  let assistantTokens = 0;
  let systemTokens = 0;
  
  messages.forEach(message => {
    const tokens = message.tokens ?? estimateTokens(message.content);
    total += tokens;
    
    switch (message.role) {
      case 'user':
        userTokens += tokens;
        break;
      case 'assistant':
        assistantTokens += tokens;
        break;
      case 'system':
        systemTokens += tokens;
        break;
    }
  });
  
  return {
    total,
    userTokens,
    assistantTokens,
    systemTokens,
    averagePerMessage: messages.length > 0 ? Math.round(total / messages.length) : 0,
    formattedTotal: formatTokenCount(total)
  };
}