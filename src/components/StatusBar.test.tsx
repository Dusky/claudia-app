import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StatusBar } from './StatusBar';
import type { TerminalTheme } from '../terminal/themes';
import type { LLMProviderManager } from '../providers/llm/manager';
import type { ImageProviderManager } from '../providers/image/manager';
import type { StorageService } from '../storage/types';
import type { Personality } from '../types/personality';

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

    // Check for LLM provider ID
    expect(screen.getByText('mock-llm')).toBeInTheDocument();
    // Check for Image provider ID
    expect(screen.getByText('mock-img')).toBeInTheDocument();

    // Check for time (format might vary, so check for presence of a time-like string)
    // This regex matches HH:MM format
    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument();
  });

  it('shows provider status correctly (configured)', async () => {
    render(
      <StatusBar
        theme={mockTheme}
        currentTheme="test-theme"
        llmManager={mockLLMManager} // Mock returns configured: true
        imageManager={mockImageManager} // Mock returns configured: true
        storage={mockStorageService}
      />
    );
    
    // LLM provider
    const llmStatusElement = screen.getByText('mock-llm');
    expect(llmStatusElement).toHaveClass('configured');
    expect(llmStatusElement).not.toHaveClass('notConfigured');
    expect(llmStatusElement).toHaveAttribute('title', 'LLM: Mock LLM - Ready');

    // Image provider
    const imageStatusElement = screen.getByText('mock-img');
    expect(imageStatusElement).toHaveClass('configured');
    expect(imageStatusElement).not.toHaveClass('notConfigured');
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
    const llmStatusElement = screen.getByText('unconf-llm');
    expect(llmStatusElement).toHaveClass('notConfigured');
    expect(llmStatusElement).not.toHaveClass('configured');
    expect(llmStatusElement).toHaveAttribute('title', 'LLM: Unconf LLM - Needs API Key');
    
    // Image provider
    const imageStatusElement = screen.getByText('unconf-img');
    expect(imageStatusElement).toHaveClass('notConfigured');
    expect(imageStatusElement).not.toHaveClass('configured');
    expect(imageStatusElement).toHaveAttribute('title', 'Image: Unconf Image - Needs API Key');
  });
});
