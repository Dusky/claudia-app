import { useState, useEffect } from 'react';

interface ErrorState {
  hasError: boolean;
  errorCount: number;
  lastError: string | null;
  lastErrorTime: number | null;
}

export const useErrorIndicator = () => {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    errorCount: 0,
    lastError: null,
    lastErrorTime: null
  });

  useEffect(() => {
    // Listen for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || String(event.reason);
      
      setErrorState(prev => ({
        hasError: true,
        errorCount: prev.errorCount + 1,
        lastError: errorMessage,
        lastErrorTime: Date.now()
      }));

      // Auto-clear error indicator after 5 seconds
      setTimeout(() => {
        setErrorState(prev => ({
          ...prev,
          hasError: false
        }));
      }, 5000);
    };

    // Listen for window errors
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || 'Unknown error';
      
      setErrorState(prev => ({
        hasError: true,
        errorCount: prev.errorCount + 1,
        lastError: errorMessage,
        lastErrorTime: Date.now()
      }));

      // Auto-clear error indicator after 5 seconds
      setTimeout(() => {
        setErrorState(prev => ({
          ...prev,
          hasError: false
        }));
      }, 5000);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  const clearError = () => {
    setErrorState(prev => ({
      ...prev,
      hasError: false
    }));
  };

  return {
    ...errorState,
    clearError
  };
};