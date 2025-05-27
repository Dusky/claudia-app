// Token counting utilities for cost tracking and context management
import { getEncoding, type Tiktoken } from 'tiktoken';

// Cache encodings to avoid repeated initialization
let cl100kEncoding: Tiktoken | null = null;
let p50kEncoding: Tiktoken | null = null;

/**
 * Initialize tiktoken encodings lazily
 */
function getOrCreateEncoding(encodingName: 'cl100k_base' | 'p50k_base'): Tiktoken {
  try {
    if (encodingName === 'cl100k_base') {
      if (!cl100kEncoding) {
        cl100kEncoding = getEncoding('cl100k_base');
      }
      return cl100kEncoding;
    } else {
      if (!p50kEncoding) {
        p50kEncoding = getEncoding('p50k_base');
      }
      return p50kEncoding;
    }
  } catch (error) {
    console.warn('Failed to initialize tiktoken encoding:', error);
    throw error;
  }
}

/**
 * Count tokens accurately using tiktoken
 */
export function estimateTokens(text: string, model?: string): number {
  if (!text) return 0;
  
  try {
    // Determine encoding based on model
    const encodingName = getEncodingForModel(model);
    const encoding = getOrCreateEncoding(encodingName);
    
    const tokens = encoding.encode(text);
    return tokens.length;
  } catch (error) {
    console.warn('Tiktoken encoding failed, falling back to estimation:', error);
    // Fallback to character-based estimation
    return estimateTokensFallback(text);
  }
}

/**
 * Determine the appropriate encoding for a model
 */
function getEncodingForModel(model?: string): 'cl100k_base' | 'p50k_base' {
  if (!model) return 'cl100k_base'; // Default for GPT-4/Claude
  
  const modelLower = model.toLowerCase();
  
  // GPT-4, GPT-3.5-turbo, and Claude use cl100k_base
  if (modelLower.includes('gpt-4') || 
      modelLower.includes('gpt-3.5') || 
      modelLower.includes('claude')) {
    return 'cl100k_base';
  }
  
  // Older GPT-3 models use p50k_base
  if (modelLower.includes('gpt-3') || 
      modelLower.includes('davinci') || 
      modelLower.includes('curie') || 
      modelLower.includes('babbage') || 
      modelLower.includes('ada')) {
    return 'p50k_base';
  }
  
  // Default to cl100k_base for unknown models
  return 'cl100k_base';
}

/**
 * Fallback token estimation when tiktoken fails
 */
function estimateTokensFallback(text: string): number {
  // More accurate estimation accounting for spaces and common patterns
  // Most tokenizers count spaces, punctuation, etc. differently
  const baseEstimate = Math.ceil(text.length / 4);
  
  // Adjust for common patterns
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  const punctuationCount = (text.match(/[.,!?;:()[\]{}'"]]/g) || []).length;
  
  // Better estimate: average of character-based and word-based counting
  const wordBasedEstimate = wordCount + punctuationCount;
  
  return Math.max(1, Math.round((baseEstimate + wordBasedEstimate) / 2));
}

/**
 * Clean up tiktoken encodings
 */
export function cleanupTokenCounter(): void {
  try {
    if (cl100kEncoding) {
      cl100kEncoding.free();
      cl100kEncoding = null;
    }
    if (p50kEncoding) {
      p50kEncoding.free();
      p50kEncoding = null;
    }
  } catch (error) {
    console.warn('Error cleaning up tiktoken encodings:', error);
  }
}

/**
 * Calculate total tokens for a conversation thread
 */
export function calculateConversationTokens(
  messages: Array<{ content: string; tokens?: number; role?: string }>, 
  model?: string
): number {
  return messages.reduce((total, message) => {
    // Use stored token count if available, otherwise estimate
    const tokens = message.tokens ?? estimateTokens(message.content, model);
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

export function getTokenStats(
  messages: Array<{ content: string; role: string; tokens?: number }>, 
  model?: string
): TokenStats {
  let total = 0;
  let userTokens = 0;
  let assistantTokens = 0;
  let systemTokens = 0;
  
  messages.forEach(message => {
    const tokens = message.tokens ?? estimateTokens(message.content, model);
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