import type { Command, CommandContext } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { useAppStore } from '../../store/appStore';

export const crtCommand: Command = {
  name: 'crt',
  description: 'Toggle CRT shader effect on/off',
  usage: '/crt [on|off|toggle]',
  execute: async (args: string[], context: CommandContext) => {
    const { storage } = context;
    const lines: TerminalLine[] = [];
    
    try {
      // Get current CRT setting
      const currentSetting = await storage.getSetting<boolean>('enableCRTEffect', true);
      
      if (args.length === 0) {
        // Show current status
        const status = currentSetting ? 'enabled' : 'disabled';
        lines.push({
          id: `crt-status-${Date.now()}`,
          type: 'output',
          content: `CRT shader effect is currently ${status}`,
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
      } else {
        const action = args[0].toLowerCase();
        let newState: boolean;
        
        switch (action) {
          case 'on':
          case 'enable':
          case 'true':
            newState = true;
            break;
          case 'off':
          case 'disable':
          case 'false':
            newState = false;
            break;
          case 'toggle':
            newState = !currentSetting;
            break;
          default:
            lines.push({
              id: `crt-error-${Date.now()}`,
              type: 'error',
              content: 'Invalid argument. Use: /crt [on|off|toggle]',
              timestamp: new Date().toISOString(),
              user: 'claudia'
            });
            return { success: false, lines };
        }
        
        // Update setting
        await storage.setSetting('enableCRTEffect', newState, 'boolean');
        
        // Update the app store config immediately
        const { config, setConfig } = useAppStore.getState();
        const newConfig = { ...config, enableCRTEffect: newState };
        setConfig(newConfig);
        
        const status = newState ? 'enabled' : 'disabled';
        lines.push({
          id: `crt-toggle-${Date.now()}`,
          type: 'output',
          content: `CRT shader effect ${status}`,
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
        
        lines.push({
          id: `crt-effect-${Date.now()}`,
          type: 'system',
          content: 'CRT effect updated instantly!',
          timestamp: new Date().toISOString(),
          user: 'claudia'
        });
      }
      
      return { success: true, lines };
    } catch (error) {
      console.error('CRT command error:', error);
      lines.push({
        id: `crt-error-${Date.now()}`,
        type: 'error',
        content: `Failed to toggle CRT effect: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
      return { success: false, lines };
    }
  }
};