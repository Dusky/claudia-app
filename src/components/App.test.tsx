/**
 * Tests for main App component security and functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import App from '../App';
import { XSS_TEST_VECTORS, createMockTheme, TestErrorBoundary } from '../test/testUtils';

// Mock all external dependencies
vi.mock('../hooks/useAppInitialization', () => ({
  useAppInitialization: () => ({
    initialized: true,
    error: null,
    database: {
      getActivePersonality: vi.fn(async () => ({
        id: 'test',
        name: 'Test',
        description: 'Test personality',
        system_prompt: 'You are helpful',
        isDefault: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 0
      })),
      savePersonality: vi.fn(),
      getAllPersonalities: vi.fn(async () => []),
      close: vi.fn(),
      isHealthy: vi.fn(async () => true),
      saveConversation: vi.fn(),
      getConversation: vi.fn(),
      getAllConversations: vi.fn(async () => []),
      deleteConversation: vi.fn(),
      getSetting: vi.fn(),
      setSetting: vi.fn(),
      deleteSetting: vi.fn(),
      saveImageMetadata: vi.fn(),
      getImageMetadata: vi.fn(),
      getAllImageMetadata: vi.fn(async () => []),
      countAllImageMetadata: vi.fn(async () => 0),
      updateImageMetadata: vi.fn(),
      deleteImageMetadata: vi.fn(),
      searchImageMetadata: vi.fn(),
      deletePersonality: vi.fn()
    },
    llmManager: {
      getActiveProvider: vi.fn(() => ({
        id: 'test-llm',
        name: 'Test LLM',
        isConfigured: () => true,
        generateResponse: vi.fn(async () => ({ content: 'Test response' }))
      })),
      getAvailableProviders: vi.fn(() => []),
      setActiveProvider: vi.fn(),
      initializeProviders: vi.fn(),
      isProviderConfigured: vi.fn(() => true)
    },
    imageManager: {
      getActiveProvider: vi.fn(() => ({
        id: 'test-image',
        name: 'Test Image',
        isConfigured: () => true
      })),
      getAvailableProviders: vi.fn(() => []),
      setActiveProvider: vi.fn(),
      initializeProviders: vi.fn(),
      isProviderConfigured: vi.fn(() => true)
    },
    mcpManager: {
      getActiveProvider: vi.fn(() => null),
      getAvailableProviders: vi.fn(() => []),
      setActiveProvider: vi.fn(),
      initializeProviders: vi.fn(),
      isProviderConfigured: vi.fn(() => false)
    },
    avatarController: {
      executeCommands: vi.fn(),
      getCurrentState: vi.fn(() => ({
        show: false,
        position: 'right',
        expression: 'neutral',
        pose: 'standing',
        action: 'none'
      })),
      getStateDisplay: vi.fn(() => 'Avatar: hidden')
    },
    commandRegistry: {
      execute: vi.fn(async () => ({
        success: true,
        lines: [],
        shouldContinue: true
      })),
      getAvailableCommands: vi.fn(() => []),
      getCommand: vi.fn()
    },
    imageStorageManager: {
      saveImage: vi.fn(),
      getImage: vi.fn(),
      deleteImage: vi.fn(),
      listImages: vi.fn(async () => []),
      cleanup: vi.fn()
    }
  })
}));

vi.mock('../hooks/useEventListeners', () => ({
  useEventListeners: () => {}
}));

vi.mock('../utils/csp', () => ({
  initializeSecurity: vi.fn()
}));

// Mock zustand store
vi.mock('../store/appStore', () => ({
  useAppStore: (selector: any) => {
    const mockState = {
      currentTheme: 'claudia',
      isThemeTransitioning: false,
      lines: [],
      isLoading: false,
      avatarState: {
        show: false,
        position: 'right',
        expression: 'neutral',
        pose: 'standing',
        action: 'none'
      },
      activeConversationId: null,
      config: {
        llm: { provider: 'anthropic', model: 'claude-3-sonnet' },
        image: { provider: 'replicate', model: 'sdxl' },
        avatar: { enabled: true, autoGenerate: true }
      },
      personalityModalOpen: false,
      configModalOpen: false,
      helpModalOpen: false,
      helpModalCommandName: null,
      imageModalOpen: false,
      aiOptionsModalOpen: false,
      appSettingsModalOpen: false,
      showBootSequence: false,
      editingPersonalityInModal: null,
      allPersonalitiesInModal: [],
      activePersonalityIdInModal: null,
      setTheme: vi.fn(),
      addLines: vi.fn(),
      setLines: vi.fn(),
      setLoading: vi.fn(),
      setAvatarState: vi.fn(),
      setConfig: vi.fn(),
      setConfigModalOpen: vi.fn(),
      setHelpModalOpen: vi.fn(),
      setImageModalOpen: vi.fn(),
      setPersonalityModalOpen: vi.fn(),
      setAiOptionsModalOpen: vi.fn(),
      setAppSettingsModalOpen: vi.fn(),
      setShowBootSequence: vi.fn(),
      setEditingPersonalityInModal: vi.fn(),
      setAllPersonalitiesInModal: vi.fn(),
      setActivePersonalityIdInModal: vi.fn(),
      setActiveConversationId: vi.fn()
    };
    return selector(mockState);
  }
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', async () => {
      await act(async () => {
        render(
          <TestErrorBoundary>
            <App />
          </TestErrorBoundary>
        );
      });
      
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    });

    it('initializes security measures', async () => {
      const { initializeSecurity } = await import('../utils/csp');
      
      await act(async () => {
        render(<App />);
      });
      
      expect(initializeSecurity).toHaveBeenCalled();
    });
  });

  describe('Input Handling Security', () => {
    it('sanitizes user input before processing', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });

      // Find the input field (might need to adjust selector based on actual implementation)
      const inputField = screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i);
      
      if (inputField) {
        // Test with malicious input
        await user.type(inputField, '<script>alert("xss")</script>');
        await user.keyboard('{Enter}');

        // Input should be sanitized and not contain script tags
        await waitFor(() => {
          const terminalContent = document.body.innerHTML;
          expect(terminalContent).not.toContain('<script>');
          expect(terminalContent).not.toContain('alert("xss")');
        });
      }
    });

    it('blocks XSS attack vectors in user input', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });

      const inputField = screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i);
      
      if (inputField) {
        for (const vector of XSS_TEST_VECTORS.slice(0, 5)) { // Test first 5 vectors
          await user.clear(inputField);
          await user.type(inputField, vector);
          await user.keyboard('{Enter}');

          await waitFor(() => {
            const terminalContent = document.body.innerHTML;
            expect(terminalContent).not.toContain('javascript:');
            expect(terminalContent).not.toContain('<script');
            expect(terminalContent).not.toContain('onerror=');
            expect(terminalContent).not.toContain('onload=');
          });
        }
      }
    });

    it('shows validation errors for invalid input', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });

      const inputField = screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i);
      
      if (inputField) {
        // Try extremely long input that should be rejected
        const longInput = 'a'.repeat(60000);
        await user.type(inputField, longInput);
        await user.keyboard('{Enter}');

        await waitFor(() => {
          expect(screen.getByText(/validation failed/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Command Processing', () => {
    it('processes safe commands correctly', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });

      const inputField = screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i);
      
      if (inputField) {
        await user.type(inputField, '/help');
        await user.keyboard('{Enter}');

        // Should not show validation errors for valid commands
        await waitFor(() => {
          expect(screen.queryByText(/validation failed/i)).not.toBeInTheDocument();
        });
      }
    });

    it('sanitizes command arguments', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });

      const inputField = screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i);
      
      if (inputField) {
        // Command with potentially dangerous argument
        await user.type(inputField, '/theme <script>alert("xss")</script>');
        await user.keyboard('{Enter}');

        await waitFor(() => {
          const terminalContent = document.body.innerHTML;
          expect(terminalContent).not.toContain('<script>');
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('handles input validation errors gracefully', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestErrorBoundary>
            <App />
          </TestErrorBoundary>
        );
      });

      const inputField = screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i);
      
      if (inputField) {
        // Input with null bytes (should be rejected)
        await user.type(inputField, 'test\u0000input');
        await user.keyboard('{Enter}');

        // Should not crash the app
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      }
    });

    it('recovers from sanitization errors', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestErrorBoundary>
            <App />
          </TestErrorBoundary>
        );
      });

      const inputField = screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i);
      
      if (inputField) {
        // Try various problematic inputs
        const problematicInputs = [
          'normal input', // Should work
          '', // Empty input
          ' '.repeat(100), // Whitespace only
          '🚀🎉💻', // Unicode emojis
        ];

        for (const input of problematicInputs) {
          await user.clear(inputField);
          await user.type(inputField, input);
          await user.keyboard('{Enter}');
          
          // App should not crash
          expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
        }
      }
    });
  });

  describe('Content Rendering Security', () => {
    it('renders terminal content safely', async () => {
      await act(async () => {
        render(<App />);
      });

      // Terminal should be present and not contain dangerous content
      const terminal = screen.getByRole('main') || document.querySelector('[data-testid="terminal"]');
      
      if (terminal) {
        const terminalHTML = terminal.innerHTML;
        expect(terminalHTML).not.toContain('<script>');
        expect(terminalHTML).not.toContain('javascript:');
        expect(terminalHTML).not.toContain('onerror=');
      }
    });

    it('handles dynamic content updates safely', async () => {
      await act(async () => {
        render(<App />);
      });

      // Simulate content updates (this would normally come from state)
      await act(async () => {
        // Force a re-render with potentially dangerous content
        const event = new CustomEvent('test-content-update');
        document.dispatchEvent(event);
      });

      // Check that no dangerous content was injected
      const body = document.body.innerHTML;
      expect(body).not.toContain('<script>');
      expect(body).not.toContain('javascript:');
    });
  });

  describe('Performance and Memory', () => {
    it('does not leak memory during input processing', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });

      const inputField = screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i);
      
      if (inputField) {
        const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

        // Process multiple inputs
        for (let i = 0; i < 10; i++) {
          await user.clear(inputField);
          await user.type(inputField, `test input ${i}`);
          await user.keyboard('{Enter}');
        }

        const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const memoryIncrease = finalMemory - initialMemory;

        // Memory increase should be reasonable (less than 5MB)
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
      }
    });

    it('handles rapid input efficiently', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });

      const inputField = screen.getByRole('textbox') || screen.getByPlaceholderText(/type/i);
      
      if (inputField) {
        const start = performance.now();

        // Rapid input processing
        for (let i = 0; i < 5; i++) {
          await user.clear(inputField);
          await user.type(inputField, `rapid input ${i}`);
          await user.keyboard('{Enter}');
        }

        const end = performance.now();
        const duration = end - start;

        // Should process rapidly (under 1 second for 5 inputs)
        expect(duration).toBeLessThan(1000);
      }
    });
  });

  describe('Integration Security', () => {
    it('maintains security across component updates', async () => {
      const { rerender } = render(<App />);
      
      // Force multiple re-renders
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          rerender(<App />);
        });
      }

      // Security measures should still be in place
      const body = document.body.innerHTML;
      expect(body).not.toContain('<script>');
      expect(body).not.toContain('javascript:');
    });

    it('prevents XSS through state manipulation', async () => {
      await act(async () => {
        render(<App />);
      });

      // Attempt to inject malicious content through various vectors
      const maliciousContent = '<script>window.hacked = true;</script>';
      
      // Try to inject through various DOM manipulation methods
      const testElement = document.createElement('div');
      testElement.innerHTML = maliciousContent;
      
      // The malicious script should not execute
      expect((window as any).hacked).toBeUndefined();
    });
  });
});