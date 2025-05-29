import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StatusBar } from './StatusBar';
import type { TerminalTheme } from '../../terminal/themes';
import type { LLMProviderManager } from '../../providers/llm/manager';
import type { ImageProviderManager } from '../../providers/image/manager';
import type { StorageService } from '../../storage/types';
import type { Personality } from '../../types/personality';

// Mock the custom hooks
vi.mock('../../hooks/useLatency', () => ({
  useLatency: () => ({
    latency: { llm: 125, image: null, lastUpdated: Date.now() },
    updateLLMLatency: vi.fn(),
    updateImageLatency: vi.fn()
  })
}));

vi.mock('../../hooks/useFPS', () => ({
  useFPS: () => ({
    fps: 60,
    isSupported: true,
    isEnabled: true,
    toggleFPS: vi.fn()
  })
}));

vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    effectiveType: '4g',
    downlink: 10,
    rtt: 50
  })
}));

vi.mock('../../hooks/useTokenUsage', () => ({
  useTokenUsage: () => ({
    current: 2800,
    limit: 32000,
    percentage: 8.75,
    isNearLimit: false
  })
}));

vi.mock('../../hooks/useErrorIndicator', () => ({
  useErrorIndicator: () => ({
    hasError: false,
    errorCount: 0,
    lastError: null,
    lastErrorTime: null,
    clearError: vi.fn()
  })
}));

// Mock dependencies
const mockLLMManager = {
  getActiveProvider: vi.fn(() => ({ 
    id: 'anthropic', 
    name: 'Claude', 
    isConfigured: () => true 
  })),
} as unknown as LLMProviderManager;

const mockImageManager = {
  getActiveProvider: vi.fn(() => ({ 
    id: 'replicate', 
    name: 'Replicate', 
    isConfigured: () => true 
  })),
} as unknown as ImageProviderManager;

const mockStorageService = {
  getActivePersonality: vi.fn(async () => ({ 
    id: 'test', 
    name: 'Test Persona', 
    description: 'Test', 
    system_prompt: 'Test prompt',
    isDefault: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    usage_count: 5
  } as Personality)),
  getConversation: vi.fn(async () => ({ totalTokens: 2800 })),
} as unknown as StorageService;

const mockTheme: TerminalTheme = {
  id: 'modern',
  name: 'Modern',
  era: 'modern',
  colors: {
    background: '#1a1a1a',
    foreground: '#ffffff',
    accent: '#00d4aa',
    error: '#f44747',
    cursor: '#ffffff',
    selection: '#333333',
    secondary: '#666666',
    success: '#4ec9b0',
    warning: '#ffcc00',
  },
  font: {
    family: 'monospace',
    size: '16px',
    weight: 'normal',
    lineHeight: '1.5',
  },
  spacing: {
    padding: '10px',
    lineSpacing: '4px',
    characterSpacing: 'normal',
  },
  effects: {
    scanlines: false,
    glow: false,
    flicker: false,
    crt: false,
    noise: false,
  },
};

describe('StatusBar Component', () => {
  const defaultProps = {
    theme: mockTheme,
    currentTheme: 'modern',
    llmManager: mockLLMManager,
    imageManager: mockImageManager,
    storage: mockStorageService,
    activeConversationId: 'test-conv-1',
    onThemeClick: vi.fn(),
    onPersonalityClick: vi.fn(),
    onImageProviderClick: vi.fn(),
    onAIOptionsClick: vi.fn(),
    onAppSettingsClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.innerWidth for responsive tests
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all status indicators in full mode', async () => {
    render(<StatusBar {...defaultProps} />);

    // Check theme indicator
    expect(await screen.findByText('Modern')).toBeInTheDocument();
    
    // Check personality indicator
    expect(await screen.findByText('Test Persona')).toBeInTheDocument();
    
    // Check LLM indicator with latency
    expect(await screen.findByText('anthropic 125ms')).toBeInTheDocument();
    
    // Check image provider
    expect(await screen.findByText('replicate')).toBeInTheDocument();
    
    // Check plugins indicator
    expect(await screen.findByText('3/3 ✓')).toBeInTheDocument();
    
    // Check network status
    expect(await screen.findByText('Online')).toBeInTheDocument();
    
    // Check FPS indicator
    expect(await screen.findByText('60')).toBeInTheDocument();
    
    // Check token usage
    expect(await screen.findByText(/2.8 K \/ 32 K/)).toBeInTheDocument();
    
    // Check UTC time (format: HH:MM UTC)
    expect(await screen.findByText(/\d{2}:\d{2} UTC/)).toBeInTheDocument();
  });

  it('handles provider status correctly', async () => {
    render(<StatusBar {...defaultProps} />);

    const llmIndicator = await screen.findByText('anthropic 125ms');
    expect(llmIndicator.closest('.indicator')).toHaveClass('status-success');

    const imageIndicator = await screen.findByText('replicate');
    expect(imageIndicator.closest('.indicator')).toHaveClass('status-success');
  });

  it('shows not configured status for unconfigured providers', async () => {
    const unconfiguredLLMManager = {
      getActiveProvider: vi.fn(() => ({ 
        id: 'unconfigured', 
        name: 'Unconfigured', 
        isConfigured: () => false 
      })),
    } as unknown as LLMProviderManager;

    render(<StatusBar {...defaultProps} llmManager={unconfiguredLLMManager} />);

    const llmIndicator = await screen.findByText('unconfigured');
    expect(llmIndicator.closest('.indicator')).toHaveClass('status-error');
  });

  it('calls click handlers when indicators are clicked', async () => {
    render(<StatusBar {...defaultProps} />);

    // Test theme click
    const themeIndicator = await screen.findByText('Modern');
    fireEvent.click(themeIndicator);
    expect(defaultProps.onThemeClick).toHaveBeenCalledTimes(1);

    // Test personality click
    const personalityIndicator = await screen.findByText('Test Persona');
    fireEvent.click(personalityIndicator);
    expect(defaultProps.onPersonalityClick).toHaveBeenCalledTimes(1);

    // Test LLM options click
    const llmIndicator = await screen.findByText('anthropic 125ms');
    fireEvent.click(llmIndicator);
    expect(defaultProps.onAIOptionsClick).toHaveBeenCalledTimes(1);

    // Test image provider click
    const imageIndicator = await screen.findByText('replicate');
    fireEvent.click(imageIndicator);
    expect(defaultProps.onImageProviderClick).toHaveBeenCalledTimes(1);

    // Test settings click
    const settingsIndicator = await screen.findByText('Settings');
    fireEvent.click(settingsIndicator);
    expect(defaultProps.onAppSettingsClick).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation', async () => {
    render(<StatusBar {...defaultProps} />);

    const themeIndicator = await screen.findByText('Modern');
    
    // Focus and press Enter
    themeIndicator.focus();
    fireEvent.keyDown(themeIndicator, { key: 'Enter' });
    expect(defaultProps.onThemeClick).toHaveBeenCalledTimes(1);

    // Press Space
    fireEvent.keyDown(themeIndicator, { key: ' ' });
    expect(defaultProps.onThemeClick).toHaveBeenCalledTimes(2);
  });

  it('has proper ARIA attributes', async () => {
    render(<StatusBar {...defaultProps} />);

    const statusBar = screen.getByRole('status');
    expect(statusBar).toHaveAttribute('aria-live', 'polite');
    expect(statusBar).toHaveAttribute('aria-label', 'Application status bar');

    // Check for button roles on clickable indicators
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Check for proper aria-label attributes
    const themeButton = screen.getByLabelText(/Current theme: Modern/);
    expect(themeButton).toBeInTheDocument();
  });

  it('switches to compact mode on narrow screens', async () => {
    // Mock narrow screen width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    render(<StatusBar {...defaultProps} />);

    await waitFor(() => {
      const statusBar = screen.getByRole('status');
      expect(statusBar).toHaveClass('mode-compact');
    });

    // In compact mode, plugins and network indicators should not be visible
    expect(screen.queryByText('3/3 ✓')).not.toBeInTheDocument();
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
  });

  it('responds to Ctrl+B keyboard shortcut', async () => {
    render(<StatusBar {...defaultProps} />);

    const statusBar = screen.getByRole('status');
    
    // Should start in full mode
    expect(statusBar).toHaveClass('mode-full');

    // Simulate Ctrl+B keypress
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });

    await waitFor(() => {
      expect(statusBar).toHaveClass('mode-compact');
    });

    // Press Ctrl+B again to switch back
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });

    await waitFor(() => {
      expect(statusBar).toHaveClass('mode-full');
    });
  });

  it('formats UTC time correctly', async () => {
    render(<StatusBar {...defaultProps} />);

    // Should show time in HH:MM UTC format
    const timeIndicator = await screen.findByText(/\d{2}:\d{2} UTC/);
    expect(timeIndicator).toBeInTheDocument();
    
    // Should match the pattern exactly
    expect(timeIndicator.textContent).toMatch(/^\d{2}:\d{2} UTC$/);
  });

  it('handles token usage warnings', async () => {
    // Mock high token usage
    vi.doMock('../../hooks/useTokenUsage', () => ({
      useTokenUsage: () => ({
        current: 28000,
        limit: 32000,
        percentage: 87.5,
        isNearLimit: true
      })
    }));

    render(<StatusBar {...defaultProps} />);

    const tokenIndicator = await screen.findByText(/28 K \/ 32 K/);
    expect(tokenIndicator.closest('.indicator')).toHaveClass('status-warning');
  });

  it('displays error indicator when there are errors', async () => {
    // Mock error state
    vi.doMock('../../hooks/useErrorIndicator', () => ({
      useErrorIndicator: () => ({
        hasError: true,
        errorCount: 1,
        lastError: 'Test error message',
        lastErrorTime: Date.now(),
        clearError: vi.fn()
      })
    }));

    render(<StatusBar {...defaultProps} />);

    await waitFor(() => {
      const errorIndicator = screen.getByText('Error');
      expect(errorIndicator).toBeInTheDocument();
      expect(errorIndicator.closest('.indicator')).toHaveClass('status-error');
    });
  });
});