// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock performance.memory for memory leak tests
Object.defineProperty(performance, 'memory', {
  writable: true,
  value: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  },
  writable: true
});

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Only show errors/warnings that are not expected test errors
console.error = (...args: any[]) => {
  if (args[0]?.includes?.('Warning:') || args[0]?.includes?.('Error:')) {
    return; // Suppress React warnings in tests
  }
  originalConsoleError(...args);
};

console.warn = (...args: any[]) => {
  if (args[0]?.includes?.('Warning:')) {
    return; // Suppress React warnings in tests
  }
  originalConsoleWarn(...args);
};

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  document.body.innerHTML = '';
});

// Global test utilities
global.testUtils = {
  flushPromises: () => new Promise(resolve => setTimeout(resolve, 0)),
  waitForNextTick: () => new Promise(resolve => process.nextTick(resolve)),
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

// Extend expect with custom matchers
expect.extend({
  toBeSecure(received: string) {
    const dangerous = [
      '<script',
      'javascript:',
      'onerror=',
      'onload=',
      'eval(',
      'Function(',
      'setTimeout(',
      'setInterval('
    ];
    
    const foundDangerous = dangerous.find(pattern => 
      received.toLowerCase().includes(pattern.toLowerCase())
    );
    
    return {
      message: () => foundDangerous 
        ? `Expected content to be secure, but found: ${foundDangerous}`
        : 'Expected content to be insecure',
      pass: !foundDangerous
    };
  }
});

// Type declarations for global utilities
declare global {
  var testUtils: {
    flushPromises: () => Promise<void>;
    waitForNextTick: () => Promise<void>;
    sleep: (ms: number) => Promise<void>;
  };
  
  namespace jest {
    interface Matchers<R> {
      toBeSecure(): R;
    }
  }
}
