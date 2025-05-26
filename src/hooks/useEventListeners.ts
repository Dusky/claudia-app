import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export const useEventListeners = () => {
  const setHelpModalOpen = useAppStore(state => state.setHelpModalOpen);

  // Listen for help modal events
  useEffect(() => {
    const handleShowHelpModal = (event: Event) => {
      const customEvent = event as CustomEvent<{ commandName?: string }>;
      setHelpModalOpen(true, customEvent.detail?.commandName || null);
    };

    window.addEventListener('showHelpModal', handleShowHelpModal);
    return () => window.removeEventListener('showHelpModal', handleShowHelpModal);
  }, [setHelpModalOpen]);
};