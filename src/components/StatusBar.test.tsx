import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StatusBar } from './StatusBar';
import type { TerminalTheme } from '../terminal/themes';
import type { LLMProviderManager } from '../providers/llm/manager';
import type { ImageProviderManager } from '../providers/image/manager';
import type { StorageService } from '../storage/types';
import type { Personality } from '../types/personality';
// Import styles if you need to reference specific class names, though data-attributes are preferred
// import styles from './StatusBar.module.css';


// Mock dependencies
const mockLLMManager = {
  getActiveProvider: vi.fn(() => ({ id: 'mock-llm', name: 'Mock LLM', isConfigured: () => true })),
  getAvailableProviders: vi.fn(() => [{ id: 'mock-llm', name: 'Mock LLM', configured: true }]),
} as unknown as LLMProviderManager;

const mockImageManager = {
  getActiveProvider: vi.fn(() => ({ id: 'mock-img', name: 'Mock Image', isConfigured: () => true })),
  getAvailableProviders: vi.fn(() => [{ id: 'mock-img', name: 'Mock Image', configured: true }]),
} as unknown as ImageProviderManager;

const mockStorageService = {
  getActivePersonality: vi.fn(async () => ({ id: 'default', name: 'Default Persona', description: 'Default', traits: {}, background: {}, behavior: {}, constraints: {} } as Personality)),
} as unknown as StorageService;

const mockTheme: TerminalTheme = {
  id: 'test-theme',
  name: 'Test Theme',
  colors: {
    background: '#000000',
    foreground: '#FFFFFF',
    accent: '#00FFFF',
    error: '#FF0000',
    cursor: '#FFFFFF',
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
  effects: {},
};

describe('StatusBar Component', () => {
  it('renders theme name, personality, providers, and time', async () => {
    render(
      <StatusBar
        theme={mockTheme}
        currentTheme="test-theme"
        llmManager={mockLLMManager}
        imageManager={mockImageManager}
        storage={mockStorageService}
        onThemeClick={vi.fn()}
        onPersonalityClick={vi.fn()}
      />
    );

    // Check for theme name
    expect(await screen.findByText('Test Theme')).toBeInTheDocument();

    // Check for personality name (mocked to resolve to 'Default Persona')
    expect(await screen.findByText('Default Persona')).toBeInTheDocument();

    // Check for LLM provider ID (use findBy to ensure useEffect updates are processed)
    expect(await screen.findByText('mock-llm')).toBeInTheDocument();
    // Check for Image provider ID
    expect(await screen.findByText('mock-img')).toBeInTheDocument();

    // Check for time
    expect(await screen.findByText(/^\d{2}:\d{2}$/)).toBeInTheDocument();
  });

  it('shows provider status correctly (configured)', async () => {
    render(
      <StatusBar
        theme={mockTheme}
        currentTheme="test-theme"
        llmManager={mockLLMManager} 
        imageManager={mockImageManager} 
        storage={mockStorageService}
      />
    );
    
    // LLM provider
    const llmStatusElement = await screen.findByText('mock-llm');
    // Assert on data-status attribute
    expect(llmStatusElement).toHaveAttribute('data-status', 'configured');
    // Optionally, you can still check the class name if it's part of your visual regression or specific styling needs
    // expect(llmStatusElement.className).toContain(styles.configured); // If styles.configured is imported
    expect(llmStatusElement).toHaveAttribute('title', 'LLM: Mock LLM - Ready');

    // Image provider
    const imageStatusElement = await screen.findByText('mock-img');
    expect(imageStatusElement).toHaveAttribute('data-status', 'configured');
    expect(imageStatusElement).toHaveAttribute('title', 'Image: Mock Image - Ready');
  });

  it('shows provider status correctly (not configured)', async () => {
    const notConfiguredLLMManager = {
      getActiveProvider: vi.fn(() => ({ id: 'unconf-llm', name: 'Unconf LLM', isConfigured: () => false })),
    } as unknown as LLMProviderManager;
    const notConfiguredImageManager = {
      getActiveProvider: vi.fn(() => ({ id: 'unconf-img', name: 'Unconf Image', isConfigured: () => false })),
    } as unknown as ImageProviderManager;

    render(
      <StatusBar
        theme={mockTheme}
        currentTheme="test-theme"
        llmManager={notConfiguredLLMManager}
        imageManager={notConfiguredImageManager}
        storage={mockStorageService}
      />
    );

    // LLM provider
    const llmStatusElement = await screen.findByText('unconf-llm');
    expect(llmStatusElement).toHaveAttribute('data-status', 'not-configured');
    expect(llmStatusElement).toHaveAttribute('title', 'LLM: Unconf LLM - Needs API Key');
    
    // Image provider
    const imageStatusElement = await screen.findByText('unconf-img');
    expect(imageStatusElement).toHaveAttribute('data-status', 'not-configured');
    expect(imageStatusElement).toHaveAttribute('title', 'Image: Unconf Image - Needs API Key');
  });
});
