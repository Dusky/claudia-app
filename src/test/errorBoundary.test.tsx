import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';

// Mock the app store
vi.mock('../store/appStore', () => ({
  useAppStore: {
    getState: vi.fn(() => ({
      addOutput: vi.fn(),
      clearOutput: vi.fn()
    }))
  }
}));

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error for ErrorBoundary');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Clear console.error calls before each test
    vi.clearAllMocks();
    // Mock console methods to avoid cluttering test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('🚨 SYSTEM ERROR')).toBeInTheDocument();
    expect(screen.getByText(/Test error for ErrorBoundary/)).toBeInTheDocument();
  });

  it('should display error name and message', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error:')).toBeInTheDocument();
    expect(screen.getByText('Message:')).toBeInTheDocument();
    expect(screen.getByText(/Test error for ErrorBoundary/)).toBeInTheDocument();
  });

  it('should show stack trace in expandable section', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const stackTraceButton = screen.getByText('Stack Trace (click to expand)');
    expect(stackTraceButton).toBeInTheDocument();
  });

  it('should show component stack in expandable section', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const componentStackButton = screen.getByText('Component Stack (click to expand)');
    expect(componentStackButton).toBeInTheDocument();
  });

  it('should provide recovery action buttons', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('🔄 Retry')).toBeInTheDocument();
    expect(screen.getByText('🗑️ Clear Terminal')).toBeInTheDocument();
    expect(screen.getByText('🔄 Reload Page')).toBeInTheDocument();
  });

  it('should apply retro-CRT styling', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const errorContainer = screen.getByText('🚨 SYSTEM ERROR').closest('div');
    expect(errorContainer).toHaveStyle({
      backgroundColor: '#000000',
      color: '#ff0000',
      fontFamily: expect.stringContaining('Monaco')
    });
  });

  it('should log error to console with structured format', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalled();
    expect(console.group).toHaveBeenCalledWith('🚨 Application Error Caught by ErrorBoundary');
  });

  it('should handle errors without stack traces gracefully', () => {
    const ErrorWithoutStack: React.FC = () => {
      const error = new Error('Error without stack');
      error.stack = undefined;
      throw error;
    };

    render(
      <ErrorBoundary>
        <ErrorWithoutStack />
      </ErrorBoundary>
    );

    expect(screen.getByText('🚨 SYSTEM ERROR')).toBeInTheDocument();
    expect(screen.getByText(/Error without stack/)).toBeInTheDocument();
  });

  it('should display fallback UI with correct accessibility attributes', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const errorContainer = screen.getByText('🚨 SYSTEM ERROR').closest('[style]');
    expect(errorContainer).toHaveStyle({
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      zIndex: '9999'
    });
  });

  it('should provide helpful recovery instructions', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/This error was also logged to the CRT terminal/)).toBeInTheDocument();
    expect(screen.getByText(/Check DevTools Console for additional debugging information/)).toBeInTheDocument();
  });

  it('should handle button interactions without throwing', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText('🔄 Retry');
    const clearButton = screen.getByText('🗑️ Clear Terminal');
    
    expect(() => {
      retryButton.click();
    }).not.toThrow();
    
    expect(() => {
      clearButton.click();
    }).not.toThrow();
  });

  it('should format error for terminal display correctly', () => {
    const { useAppStore } = require('../store/appStore');
    const mockAddOutput = vi.fn();
    
    useAppStore.getState.mockReturnValue({
      addOutput: mockAddOutput,
      clearOutput: vi.fn()
    });

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(mockAddOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('APPLICATION ERROR'),
        type: 'error'
      })
    );
  });

  it('should maintain error boundary state correctly', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();

    // Should catch error when child starts throwing
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('🚨 SYSTEM ERROR')).toBeInTheDocument();
  });
});