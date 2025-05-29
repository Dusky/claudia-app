import { useState, useEffect } from 'react';
import type { StorageService } from '../storage/types';

interface TokenUsage {
  current: number;
  limit: number;
  percentage: number;
  isNearLimit: boolean;
}

const DEFAULT_LIMIT = 32000; // Default context window size

export const useTokenUsage = (
  storage: StorageService,
  activeConversationId: string | null
) => {
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    current: 0,
    limit: DEFAULT_LIMIT,
    percentage: 0,
    isNearLimit: false
  });

  useEffect(() => {
    const updateTokenUsage = async () => {
      if (!activeConversationId) {
        setTokenUsage({
          current: 0,
          limit: DEFAULT_LIMIT,
          percentage: 0,
          isNearLimit: false
        });
        return;
      }

      try {
        const conversation = await storage.getConversation(activeConversationId);
        const current = conversation?.totalTokens || 0;
        const limit = DEFAULT_LIMIT; // Could be made configurable per provider
        const percentage = (current / limit) * 100;
        const isNearLimit = percentage > 80;

        setTokenUsage({
          current,
          limit,
          percentage,
          isNearLimit
        });
      } catch (error) {
        console.warn('Failed to load token usage:', error);
      }
    };

    updateTokenUsage();

    // Update when conversation changes
    const interval = setInterval(updateTokenUsage, 5000);
    return () => clearInterval(interval);
  }, [storage, activeConversationId]);

  return tokenUsage;
};