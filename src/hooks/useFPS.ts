import { useState, useEffect, useRef, useCallback } from 'react';

interface FPSData {
  fps: number;
  isSupported: boolean;
  isEnabled: boolean;
}

export const useFPS = (enabled = true) => {
  const [fpsData, setFPSData] = useState<FPSData>({
    fps: 0,
    isSupported: false,
    isEnabled: enabled
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animationIdRef = useRef<number | null>(null);

  const updateFPS = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;

    // Calculate FPS every second
    if (now - lastTimeRef.current >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
      
      setFPSData(prev => ({
        ...prev,
        fps: fps,
        isSupported: true
      }));

      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    if (fpsData.isEnabled && enabled) {
      animationIdRef.current = requestAnimationFrame(updateFPS);
    }
  }, [fpsData.isEnabled, enabled]);

  useEffect(() => {
    // Check if requestAnimationFrame is supported
    const isSupported = typeof requestAnimationFrame !== 'undefined';
    
    setFPSData(prev => ({
      ...prev,
      isSupported,
      isEnabled: enabled && isSupported
    }));

    if (enabled && isSupported) {
      animationIdRef.current = requestAnimationFrame(updateFPS);
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [enabled, updateFPS]);

  const toggleFPS = useCallback(() => {
    setFPSData(prev => {
      const newEnabled = !prev.isEnabled;
      
      if (newEnabled && prev.isSupported) {
        frameCountRef.current = 0;
        lastTimeRef.current = performance.now();
        animationIdRef.current = requestAnimationFrame(updateFPS);
      } else if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      
      return {
        ...prev,
        isEnabled: newEnabled
      };
    });
  }, [updateFPS]);

  return {
    ...fpsData,
    toggleFPS
  };
};