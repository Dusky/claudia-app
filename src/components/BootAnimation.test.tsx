import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BootAnimation } from './BootAnimation';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the useBootInterrupt hook
vi.mock('../hooks/useBootInterrupt', () => ({
  useBootInterrupt: vi.fn(({ onSkip, enabled }) => {
    // Simulate immediate skip capability
    React.useEffect(() => {
      if (enabled) {
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
            onSkip();
          }
        };
        
        const handlePointerDown = () => onSkip();
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('pointerdown', handlePointerDown);
        
        return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('pointerdown', handlePointerDown);
        };
      }
    }, [onSkip, enabled]);
    
    return { handleSkip: onSkip };
  })
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock HTMLCanvasElement and context
const mockCanvasContext = {
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  getContext: vi.fn(),
};

HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext as any);

// Mock audio
class MockAudio {
  volume = 1;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();
  currentTime = 0;
  duration = NaN;
}
global.Audio = MockAudio as any;

// Mock Image
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  
  constructor() {
    // Simulate immediate load success
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}
global.Image = MockImage as any;

// Mock providers and dependencies
const mockLLMManager = {
  autoInitialize: vi.fn().mockResolvedValue(undefined),
};

const mockImageManager = {
  initializeDefaultProvider: vi.fn().mockResolvedValue(undefined),
};

const mockAvatarController = {
  // Mock methods if needed
};

const mockDatabase = {
  getActivePersonality: vi.fn().mockResolvedValue({
    id: 'default',
    name: 'Claudia',
    description: 'Default AI personality'
  }),
  savePersonality: vi.fn().mockResolvedValue(undefined),
  setActivePersonality: vi.fn().mockResolvedValue(undefined),
  getConversations: vi.fn().mockResolvedValue([
    { id: '1', title: 'Test Conversation 1' },
    { id: '2', title: 'Test Conversation 2' }
  ]),
};

// Mock window.matchMedia for reduced motion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? false : false, // Default to false
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('BootAnimation', () => {
  const defaultProps = {
    onComplete: vi.fn(),
    onSkip: vi.fn(),
    llmManager: mockLLMManager,
    imageManager: mockImageManager,
    avatarController: mockAvatarController,
    database: mockDatabase,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('{}');
    
    // Reset all async tasks to resolve quickly for testing
    mockLLMManager.autoInitialize.mockResolvedValue(undefined);
    mockImageManager.initializeDefaultProvider.mockResolvedValue(undefined);
    mockDatabase.getActivePersonality.mockResolvedValue({
      id: 'default',
      name: 'Claudia'
    });
    mockDatabase.getConversations.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders initial boot stage text', async () => {
    render(<BootAnimation {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/INITIATING CLAUDIA.EXE/)).toBeInTheDocument();
    });
  });

  it('progresses through all boot stages', async () => {
    render(<BootAnimation {...defaultProps} />);
    
    // Wait for stages to appear
    await waitFor(() => {
      expect(screen.getByText(/INITIATING CLAUDIA.EXE/)).toBeInTheDocument();
    }, { timeout: 1000 });

    // Should eventually show personality loading stage
    await waitFor(() => {
      expect(screen.getByText(/Loading personality kernel/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('displays spinners for active tasks', async () => {
    render(<BootAnimation {...defaultProps} />);
    
    await waitFor(() => {
      const bootText = screen.getByText(/Loading personality kernel/);
      expect(bootText.textContent).toMatch(/[∙✔]/); // Should contain spinner
    }, { timeout: 2000 });
  });

  it('calls onSkip when Escape key is pressed', async () => {
    const onSkip = vi.fn();
    render(<BootAnimation {...defaultProps} onSkip={onSkip} />);
    
    // Simulate Escape key press
    fireEvent.keyDown(window, { key: 'Escape' });
    
    await waitFor(() => {
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onSkip when Enter key is pressed', async () => {
    const onSkip = vi.fn();
    render(<BootAnimation {...defaultProps} onSkip={onSkip} />);
    
    fireEvent.keyDown(window, { key: 'Enter' });
    
    await waitFor(() => {
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onSkip when Space key is pressed', async () => {
    const onSkip = vi.fn();
    render(<BootAnimation {...defaultProps} onSkip={onSkip} />);
    
    fireEvent.keyDown(window, { key: ' ' });
    
    await waitFor(() => {
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onSkip on pointer down', async () => {
    const onSkip = vi.fn();
    render(<BootAnimation {...defaultProps} onSkip={onSkip} />);
    
    fireEvent.pointerDown(window);
    
    await waitFor(() => {
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });

  it('auto-skips for users with reduced motion preference', async () => {
    // Mock reduced motion preference
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? true : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const onSkip = vi.fn();
    render(<BootAnimation {...defaultProps} onSkip={onSkip} />);
    
    await waitFor(() => {
      expect(onSkip).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('completes all tasks and calls onComplete', async () => {
    // Make all async tasks resolve immediately
    const fastProps = {
      ...defaultProps,
      onComplete: vi.fn(),
    };
    
    render(<BootAnimation {...fastProps} />);
    
    // Wait for completion
    await waitFor(() => {
      expect(fastProps.onComplete).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  it('handles task failures gracefully', async () => {
    // Make one task fail
    const failingDatabase = {
      ...mockDatabase,
      getActivePersonality: vi.fn().mockRejectedValue(new Error('Database error')),
    };
    
    const props = {
      ...defaultProps,
      database: failingDatabase,
    };
    
    render(<BootAnimation {...props} />);
    
    // Should still continue despite the error
    await waitFor(() => {
      expect(screen.getByText(/Loading personality kernel/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('plays boot chime during logs stage', async () => {
    const audioPlaySpy = vi.spyOn(MockAudio.prototype, 'play');
    
    render(<BootAnimation {...defaultProps} />);
    
    // Wait for audio to be triggered
    await waitFor(() => {
      expect(audioPlaySpy).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('shows neutral avatar during empathy stage', async () => {
    render(<BootAnimation {...defaultProps} />);
    
    // Wait for canvas to be created and avatar to show
    await waitFor(() => {
      const canvas = document.querySelector('canvas.neutral-avatar');
      expect(canvas).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('sets skipBoot localStorage flag on completion', async () => {
    const onComplete = vi.fn();
    render(<BootAnimation {...defaultProps} onComplete={onComplete} />);
    
    // Wait for completion
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    }, { timeout: 5000 });
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'claudia',
      expect.stringContaining('"skipBoot":"true"')
    );
  });

  it('respects minimum display time', async () => {
    const onComplete = vi.fn();
    const startTime = Date.now();
    
    render(<BootAnimation {...defaultProps} onComplete={onComplete} />);
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    }, { timeout: 5000 });
    
    const elapsed = Date.now() - startTime;
    // Should take at least close to the minimum time (allowing for test timing variance)
    expect(elapsed).toBeGreaterThan(1000); // At least 1 second
  });

  it('displays skip hint text', () => {
    render(<BootAnimation {...defaultProps} />);
    
    expect(screen.getByText(/Press ⎋, ⏎, SPACE, or tap anywhere to skip/)).toBeInTheDocument();
  });

  it('applies fade out effect when skipping', async () => {
    const onSkip = vi.fn();
    render(<BootAnimation {...defaultProps} onSkip={onSkip} />);
    
    // Trigger skip
    fireEvent.keyDown(window, { key: 'Escape' });
    
    await waitFor(() => {
      const bootSequence = document.querySelector('.boot-sequence');
      expect(bootSequence).toHaveClass('fade-out');
    });
  });
});

describe('BootAnimation task execution', () => {
  const defaultProps = {
    onComplete: vi.fn(),
    onSkip: vi.fn(),
    llmManager: mockLLMManager,
    imageManager: mockImageManager,
    avatarController: mockAvatarController,
    database: mockDatabase,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes personality loading task', async () => {
    render(<BootAnimation {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockDatabase.getActivePersonality).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('executes provider initialization task', async () => {
    render(<BootAnimation {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockLLMManager.autoInitialize).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('executes history hydration task', async () => {
    render(<BootAnimation {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockDatabase.getConversations).toHaveBeenCalledWith(20);
    }, { timeout: 1000 });
  });
});