import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export const useEventListeners = () => {
  const setHelpModalOpen = useAppStore(state => state.setHelpModalOpen);
  const setAppSettingsModalOpen = useAppStore(state => state.setAppSettingsModalOpen);
  const setConfigModalOpen = useAppStore(state => state.setConfigModalOpen);
  const openPersonalityEditorModal = useAppStore(state => state.openPersonalityEditorModal);

  // Listen for help modal events
  useEffect(() => {
    const handleShowHelpModal = (event: Event) => {
      const customEvent = event as CustomEvent<{ commandName?: string }>;
      setHelpModalOpen(true, customEvent.detail?.commandName || null);
    };

    const handleOpenAppSettings = () => {
      setAppSettingsModalOpen(true);
    };

    const handleOpenConfig = () => {
      setConfigModalOpen(true);
    };

    const handleOpenPersonalityModal = async () => {
      // We need to get the database from somewhere - this is a limitation
      // For now, we'll just open without the database parameter
      try {
        // Try to get the database from the global scope or use localStorage fallback
        const { ClaudiaDatabase } = await import('../storage');
        const database = new ClaudiaDatabase();
        await openPersonalityEditorModal(database);
      } catch (error) {
        console.error('Failed to open personality modal:', error);
        // Fallback - just open the modal without full functionality
        openPersonalityEditorModal(null as any);
      }
    };

    window.addEventListener('showHelpModal', handleShowHelpModal);
    window.addEventListener('openAppSettings', handleOpenAppSettings);
    window.addEventListener('openConfig', handleOpenConfig);
    window.addEventListener('openPersonalityModal', handleOpenPersonalityModal);
    
    return () => {
      window.removeEventListener('showHelpModal', handleShowHelpModal);
      window.removeEventListener('openAppSettings', handleOpenAppSettings);
      window.removeEventListener('openConfig', handleOpenConfig);
      window.removeEventListener('openPersonalityModal', handleOpenPersonalityModal);
    };
  }, [setHelpModalOpen, setAppSettingsModalOpen, setConfigModalOpen, openPersonalityEditorModal]);
};