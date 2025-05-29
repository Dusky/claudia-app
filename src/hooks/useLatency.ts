import { useState, useEffect, useCallback } from 'react';

interface LatencyData {
  llm: number | null;
  image: number | null;
  lastUpdated: number;
}

export const useLatency = () => {
  const [latency, setLatency] = useState<LatencyData>({
    llm: null,
    image: null,
    lastUpdated: Date.now()
  });

  const updateLLMLatency = useCallback((latencyMs: number) => {
    setLatency(prev => ({
      ...prev,
      llm: latencyMs,
      lastUpdated: Date.now()
    }));
  }, []);

  const updateImageLatency = useCallback((latencyMs: number) => {
    setLatency(prev => ({
      ...prev,
      image: latencyMs,
      lastUpdated: Date.now()
    }));
  }, []);

  // Clear stale latency data after 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setLatency(prev => ({
        ...prev,
        llm: (prev.llm && now - prev.lastUpdated > 300000) ? null : prev.llm,
        image: (prev.image && now - prev.lastUpdated > 300000) ? null : prev.image
      }));
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return {
    latency,
    updateLLMLatency,
    updateImageLatency
  };
};