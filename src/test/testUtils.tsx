/**
 * Testing utilities and helpers for Claudia App
 */

import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import type { TerminalTheme } from '../terminal/themes';
import type { LLMProviderManager } from '../providers/llm/manager';
import type { ImageProviderManager } from '../providers/image/manager';
import type { MCPProviderManager } from '../providers/mcp/manager';
import type { AvatarController } from '../avatar/AvatarController';
import type { StorageService } from '../storage/types';
import type { Personality } from '../types/personality';
import type { TerminalLine } from '../terminal/TerminalDisplay';

// Mock implementations for common dependencies
export const createMockTheme = (overrides: Partial<TerminalTheme> = {}): TerminalTheme => ({
  id: 'test-theme',
  name: 'Test Theme',
  era: 'test',
  colors: {
    background: '#000000',
    foreground: '#FFFFFF',
    accent: '#00FFFF',
    error: '#FF0000',
    cursor: '#FFFFFF',
    selection: '#333333',
    secondary: '#666666',
    success: '#00FF00',
    warning: '#FFFF00',
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
    borderWidth: '1px',
    indent: '12px',
    textGap: '8px',
    groupMargin: '16px',
    lineMarginTight: '4px',
    lineMarginNormal: '8px',
  },
  effects: {
    scanlines: false,
    glow: false,
    flicker: false,
    crt: false,
    noise: false,
  },
  styles: {
    textShadow: {
      subtle: '0 0 2px rgba(0, 255, 0, 0.1)',
      normal: '0 0 4px rgba(0, 255, 0, 0.3)',
      intense: '0 0 8px rgba(0, 255, 0, 0.5)',
    },
    borderRadius: '4px',
    opacity: {
      muted: 0.6,
      header: 0.8,
    },
  },
  content: {
    codeBlock: {
      background: 'rgba(0, 255, 0, 0.08)',
      color: 'rgba(0, 255, 0, 0.9)',
      border: '1px solid rgba(0, 255, 0, 0.2)',
      textShadow: '0 0 2px rgba(0, 255, 0, 0.3)',
      borderRadius: '3px',
      padding: '3px 6px',
    },
    link: {
      color: '#66ccff',
      textDecoration: 'underline',
    },
    emphasis: {
      opacity: 0.8,
    },
    colors: {
      red: '#ff6b6b',
      green: '#51cf66',
      blue: '#74c0fc',
      yellow: '#ffd43b',
      cyan: '#66d9ef',
      magenta: '#ff79c6',
      orange: '#ff9f43',
      purple: '#b197fc',
      gray: '#868e96',
    },
    spacing: {
      paragraphMargin: '16px',
    },
  },
  ...overrides
});

export const createMockPersonality = (overrides: Partial<Personality> = {}): Personality => ({
  id: 'test-personality',
  name: 'Test Personality',
  description: 'A test personality',
  system_prompt: 'You are a helpful test assistant',
  isDefault: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  usage_count: 0,
  allowImageGeneration: true,
  preferredClothingStyle: 'casual',
  typicalEnvironmentKeywords: 'indoor, cozy',
  artStyleModifiers: 'soft lighting',
  baseCharacterIdentity: 'friendly assistant',
  styleKeywords: 'warm, approachable',
  qualityKeywords: 'high quality, detailed',
  ...overrides
});

export const createMockLLMManager = (overrides: Partial<LLMProviderManager> = {}): LLMProviderManager => ({
  getActiveProvider: vi.fn(() => ({
    id: 'test-llm',
    name: 'Test LLM',
    isConfigured: () => true,
    initialize: vi.fn(),
    generateResponse: vi.fn(),
    generateStreamingResponse: vi.fn(),
    generateText: vi.fn(),
    listModels: vi.fn()
  })),
  getAvailableProviders: vi.fn(() => [
    { id: 'test-llm', name: 'Test LLM', configured: true }
  ]),
  setActiveProvider: vi.fn(),
  initializeProviders: vi.fn(),
  isProviderConfigured: vi.fn(() => true),
  ...overrides
} as unknown as LLMProviderManager);

export const createMockImageManager = (overrides: Partial<ImageProviderManager> = {}): ImageProviderManager => ({
  getActiveProvider: vi.fn(() => ({
    id: 'test-image',
    name: 'Test Image',
    isConfigured: () => true,
    initialize: vi.fn(),
    generateImage: vi.fn(),
    testConnection: vi.fn(),
    getSupportedModels: vi.fn(() => [])
  })),
  getAvailableProviders: vi.fn(() => [
    { id: 'test-image', name: 'Test Image', configured: true }
  ]),
  setActiveProvider: vi.fn(),
  initializeProviders: vi.fn(),
  isProviderConfigured: vi.fn(() => true),
  ...overrides
} as unknown as ImageProviderManager);

export const createMockMCPManager = (overrides: Partial<MCPProviderManager> = {}): MCPProviderManager => ({
  getActiveProvider: vi.fn(() => null),
  getAvailableProviders: vi.fn(() => []),
  setActiveProvider: vi.fn(),
  initializeProviders: vi.fn(),
  isProviderConfigured: vi.fn(() => false),
  ...overrides
} as unknown as MCPProviderManager);

export const createMockAvatarController = (overrides: Partial<AvatarController> = {}): AvatarController => ({
  executeCommands: vi.fn(),
  getCurrentState: vi.fn(() => ({
    show: true,
    position: 'right',
    expression: 'neutral',
    pose: 'standing',
    action: 'none'
  })),
  getStateDisplay: vi.fn(() => 'Avatar: visible, neutral expression'),
  ...overrides
} as unknown as AvatarController);

export const createMockStorageService = (overrides: Partial<StorageService> = {}): StorageService => ({
  // Personality methods
  getActivePersonality: vi.fn(async () => createMockPersonality()),
  savePersonality: vi.fn(),
  deletePersonality: vi.fn(),
  getAllPersonalities: vi.fn(async () => [createMockPersonality()]),
  
  // Conversation methods
  saveConversation: vi.fn(),
  getConversation: vi.fn(),
  getAllConversations: vi.fn(async () => []),
  deleteConversation: vi.fn(),
  
  // Settings methods
  getSetting: vi.fn(),
  setSetting: vi.fn(),
  deleteSetting: vi.fn(),
  
  // Image metadata methods
  saveImageMetadata: vi.fn(),
  getImageMetadata: vi.fn(),
  getAllImageMetadata: vi.fn(async () => []),
  countAllImageMetadata: vi.fn(async () => 0),
  updateImageMetadata: vi.fn(),
  deleteImageMetadata: vi.fn(),
  searchImageMetadata: vi.fn(),
  
  // Database methods
  close: vi.fn(),
  isHealthy: vi.fn(async () => true),
  
  ...overrides
} as unknown as StorageService);

export const createMockTerminalLine = (overrides: Partial<TerminalLine> = {}): TerminalLine => ({
  id: `test-line-${Date.now()}`,
  type: 'output',
  content: 'Test content',
  timestamp: new Date().toISOString(),
  user: 'claudia',
  ...overrides
});

// Test data generators
export const generateTestLines = (count: number): TerminalLine[] => {
  return Array.from({ length: count }, (_, i) => 
    createMockTerminalLine({
      id: `test-line-${i}`,
      content: `Test line ${i + 1}`,
      type: i % 3 === 0 ? 'input' : 'output',
      user: i % 3 === 0 ? 'user' : 'claudia'
    })
  );
};

// Security test helpers
export const XSS_TEST_VECTORS = [
  '<script>alert("xss")</script>',
  'javascript:alert("xss")',
  '<img src="x" onerror="alert(\'xss\')">',
  '<iframe src="javascript:alert(\'xss\')"></iframe>',
  '<svg onload="alert(\'xss\')">',
  'data:text/html,<script>alert("xss")</script>',
  '<style>@import "javascript:alert(\'xss\')"</style>',
  '<link rel="stylesheet" href="javascript:alert(\'xss\')">',
  '"><script>alert("xss")</script>',
  '\'/><script>alert("xss")</script>',
  '<body onload="alert(\'xss\')">',
  '<marquee onstart="alert(\'xss\')">',
  '<input type="image" src="x" onerror="alert(\'xss\')">',
  '<object data="javascript:alert(\'xss\')">',
  '<embed src="javascript:alert(\'xss\')">',
  '<form action="javascript:alert(\'xss\')">',
  '<meta http-equiv="refresh" content="0;url=javascript:alert(\'xss\')">',
  '<base href="javascript:alert(\'xss\')//">',
  '\\u003cscript\\u003ealert("xss")\\u003c/script\\u003e',
  'eval("alert(\\"xss\\")")',
  'setTimeout("alert(\\"xss\\")", 0)',
  'setInterval("alert(\\"xss\\")", 1000)',
  'Function("alert(\\"xss\\")")()',
  '<textarea><<script>alert("xss")</script></textarea>'
];

export const SQL_INJECTION_TEST_VECTORS = [
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "' OR 1=1 --",
  "' UNION SELECT * FROM users --",
  "'; EXEC xp_cmdshell('dir'); --",
  "' OR EXISTS(SELECT * FROM users) --",
  "1' AND (SELECT COUNT(*) FROM users) > 0 --",
  "' OR SLEEP(5) --",
  "' OR pg_sleep(5) --",
  "'; WAITFOR DELAY '00:00:05' --",
  "' OR BENCHMARK(1000000,MD5(1)) --",
  "' AND ASCII(SUBSTRING((SELECT password FROM users LIMIT 1),1,1)) > 64 --",
  "' OR '1'='1' /*",
  "'; INSERT INTO users VALUES ('hacker', 'password'); --",
  "' OR (SELECT COUNT(*) FROM information_schema.tables) > 0 --"
];

// Error boundary for testing
export class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Test Error Boundary caught error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error-boundary">Error: {this.state.error?.message}</div>;
    }

    return this.props.children;
  }
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: TerminalTheme;
  withErrorBoundary?: boolean;
  onError?: (error: Error) => void;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { theme = createMockTheme(), withErrorBoundary = false, onError, ...renderOptions } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const content = withErrorBoundary ? (
      <TestErrorBoundary onError={onError}>
        {children}
      </TestErrorBoundary>
    ) : children;

    return <div data-testid="test-wrapper">{content}</div>;
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    theme
  };
};

// Async test utilities
export const waitForLoadingToFinish = async () => {
  const { findByTestId } = await import('@testing-library/react');
  try {
    await findByTestId('loading', {}, { timeout: 100 });
    await waitForElementToBeRemoved(() => findByTestId('loading'));
  } catch {
    // No loading indicator found, continue
  }
};

const waitForElementToBeRemoved = async (getElement: () => Promise<HTMLElement>) => {
  let element;
  try {
    element = await getElement();
  } catch {
    return; // Element not found, already removed
  }
  
  return new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      try {
        getElement();
      } catch {
        observer.disconnect();
        resolve();
      }
    });
    
    if (element.parentNode) {
      observer.observe(element.parentNode, { childList: true, subtree: true });
    }
    
    // Fallback timeout
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 5000);
  });
};

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => Promise<void> | void): Promise<number> => {
  const start = performance.now();
  await renderFn();
  const end = performance.now();
  return end - start;
};

// Memory leak detection
export const detectMemoryLeaks = () => {
  const initialHeap = (performance as any).memory?.usedJSHeapSize || 0;
  
  return {
    check: () => {
      const currentHeap = (performance as any).memory?.usedJSHeapSize || 0;
      const increase = currentHeap - initialHeap;
      return {
        initialHeap,
        currentHeap,
        increase,
        hasLeak: increase > 10 * 1024 * 1024 // 10MB threshold
      };
    }
  };
};