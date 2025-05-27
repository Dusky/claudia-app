/**
 * Input Handler
 * Manages keyboard input, key mapping, and terminal interaction
 */

import type { CRTConfig } from '../types/interfaces';

export interface InputState {
  currentLine: string;
  cursorPosition: number;
  historyIndex: number;
  isComposing: boolean; // For IME input
}

export interface KeyMapping {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: string | ((inputState: InputState, handler: InputHandler) => void);
}

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private inputState: InputState;
  private commandHistory: string[] = [];
  private maxHistorySize: number = 100;
  private keyMappings: Map<string, KeyMapping> = new Map();
  private isEnabled: boolean = true;
  
  // Callbacks
  private onCommand?: (command: string) => void;
  private onInput?: (currentLine: string, cursorPos: number) => void;
  private onSpecialKey?: (key: string, modifiers: { ctrl: boolean; alt: boolean; shift: boolean }) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.inputState = {
      currentLine: '',
      cursorPosition: 0,
      historyIndex: -1,
      isComposing: false
    };

    this.setupDefaultKeyMappings();
    this.attachEventListeners();
  }

  /**
   * Setup default key mappings for common terminal operations
   */
  private setupDefaultKeyMappings(): void {
    // Navigation keys
    this.addKeyMapping('ArrowLeft', (state) => {
      state.cursorPosition = Math.max(0, state.cursorPosition - 1);
    });

    this.addKeyMapping('ArrowRight', (state) => {
      state.cursorPosition = Math.min(state.currentLine.length, state.cursorPosition + 1);
    });

    this.addKeyMapping('Home', (state) => {
      state.cursorPosition = 0;
    });

    this.addKeyMapping('End', (state) => {
      state.cursorPosition = state.currentLine.length;
    });

    // History navigation
    this.addKeyMapping('ArrowUp', (state, handler) => {
      handler.navigateHistory(-1);
    });

    this.addKeyMapping('ArrowDown', (state, handler) => {
      handler.navigateHistory(1);
    });

    // Text editing
    this.addKeyMapping('Backspace', (state) => {
      if (state.cursorPosition > 0) {
        state.currentLine = 
          state.currentLine.slice(0, state.cursorPosition - 1) +
          state.currentLine.slice(state.cursorPosition);
        state.cursorPosition--;
      }
    });

    this.addKeyMapping('Delete', (state) => {
      if (state.cursorPosition < state.currentLine.length) {
        state.currentLine = 
          state.currentLine.slice(0, state.cursorPosition) +
          state.currentLine.slice(state.cursorPosition + 1);
      }
    });

    // Command execution
    this.addKeyMapping('Enter', (state, handler) => {
      handler.executeCommand();
    });

    // Ctrl+C - Interrupt
    this.addKeyMapping('KeyC', (state, handler) => {
      handler.interrupt();
    }, { ctrlKey: true });

    // Ctrl+L - Clear screen
    this.addKeyMapping('KeyL', (state, handler) => {
      if (handler.onSpecialKey) {
        handler.onSpecialKey('clear', { ctrl: true, alt: false, shift: false });
      }
    }, { ctrlKey: true });

    // Ctrl+A - Beginning of line
    this.addKeyMapping('KeyA', (state) => {
      state.cursorPosition = 0;
    }, { ctrlKey: true });

    // Ctrl+E - End of line
    this.addKeyMapping('KeyE', (state) => {
      state.cursorPosition = state.currentLine.length;
    }, { ctrlKey: true });

    // Ctrl+U - Clear line
    this.addKeyMapping('KeyU', (state) => {
      state.currentLine = '';
      state.cursorPosition = 0;
    }, { ctrlKey: true });

    // Ctrl+K - Kill to end of line
    this.addKeyMapping('KeyK', (state) => {
      state.currentLine = state.currentLine.slice(0, state.cursorPosition);
    }, { ctrlKey: true });

    // Ctrl+W - Delete word
    this.addKeyMapping('KeyW', (state) => {
      const beforeCursor = state.currentLine.slice(0, state.cursorPosition);
      const words = beforeCursor.split(/\s+/);
      words.pop(); // Remove last word
      const newLine = words.join(' ');
      const afterCursor = state.currentLine.slice(state.cursorPosition);
      
      state.currentLine = newLine + afterCursor;
      state.cursorPosition = newLine.length;
    }, { ctrlKey: true });
  }

  /**
   * Attach event listeners to canvas
   */
  private attachEventListeners(): void {
    // Make canvas focusable
    this.canvas.tabIndex = 0;
    
    // Keyboard events
    this.canvas.addEventListener('keydown', this.handleKeyDown);
    this.canvas.addEventListener('keypress', this.handleKeyPress);
    
    // Composition events for IME
    this.canvas.addEventListener('compositionstart', this.handleCompositionStart);
    this.canvas.addEventListener('compositionend', this.handleCompositionEnd);
    
    // Focus events
    this.canvas.addEventListener('focus', this.handleFocus);
    this.canvas.addEventListener('blur', this.handleBlur);
    
    // Click to focus
    this.canvas.addEventListener('click', () => {
      this.canvas.focus();
    });
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isEnabled || this.inputState.isComposing) return;

    const keyId = this.getKeyId(event);
    const mapping = this.keyMappings.get(keyId);

    if (mapping) {
      event.preventDefault();
      
      if (typeof mapping.action === 'function') {
        mapping.action(this.inputState, this);
      }
      
      this.notifyInputChange();
      return;
    }

    // Handle printable characters
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      this.insertCharacter(event.key);
    }
  };

  /**
   * Handle keypress events (fallback for some browsers)
   */
  private handleKeyPress = (event: KeyboardEvent): void => {
    if (!this.isEnabled || this.inputState.isComposing) return;
    
    // Keypress is mainly for fallback, keydown handles most cases
    if (event.charCode && !event.ctrlKey && !event.altKey) {
      const char = String.fromCharCode(event.charCode);
      if (char.length === 1) {
        event.preventDefault();
        this.insertCharacter(char);
      }
    }
  };

  /**
   * Handle composition start (IME)
   */
  private handleCompositionStart = (): void => {
    this.inputState.isComposing = true;
  };

  /**
   * Handle composition end (IME)
   */
  private handleCompositionEnd = (event: CompositionEvent): void => {
    this.inputState.isComposing = false;
    
    if (event.data) {
      this.insertText(event.data);
    }
  };

  /**
   * Handle focus events
   */
  private handleFocus = (): void => {
    // Terminal gained focus
  };

  /**
   * Handle blur events  
   */
  private handleBlur = (): void => {
    // Terminal lost focus
  };

  /**
   * Insert character at cursor position
   */
  private insertCharacter(char: string): void {
    const beforeCursor = this.inputState.currentLine.slice(0, this.inputState.cursorPosition);
    const afterCursor = this.inputState.currentLine.slice(this.inputState.cursorPosition);
    
    this.inputState.currentLine = beforeCursor + char + afterCursor;
    this.inputState.cursorPosition++;
    
    this.notifyInputChange();
  }

  /**
   * Insert text at cursor position
   */
  private insertText(text: string): void {
    const beforeCursor = this.inputState.currentLine.slice(0, this.inputState.cursorPosition);
    const afterCursor = this.inputState.currentLine.slice(this.inputState.cursorPosition);
    
    this.inputState.currentLine = beforeCursor + text + afterCursor;
    this.inputState.cursorPosition += text.length;
    
    this.notifyInputChange();
  }

  /**
   * Generate key ID for mapping lookup
   */
  private getKeyId(event: KeyboardEvent): string {
    let keyId = event.code || event.key;
    
    if (event.ctrlKey) keyId += '+Ctrl';
    if (event.altKey) keyId += '+Alt';
    if (event.shiftKey) keyId += '+Shift';
    
    return keyId;
  }

  /**
   * Add custom key mapping
   */
  addKeyMapping(
    key: string, 
    action: string | ((inputState: InputState, handler: InputHandler) => void),
    modifiers?: { ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean }
  ): void {
    let keyId = key;
    
    if (modifiers?.ctrlKey) keyId += '+Ctrl';
    if (modifiers?.altKey) keyId += '+Alt';
    if (modifiers?.shiftKey) keyId += '+Shift';
    
    this.keyMappings.set(keyId, {
      key,
      ctrlKey: modifiers?.ctrlKey,
      altKey: modifiers?.altKey,
      shiftKey: modifiers?.shiftKey,
      action
    });
  }

  /**
   * Navigate command history
   */
  private navigateHistory(direction: number): void {
    if (this.commandHistory.length === 0) return;
    
    this.inputState.historyIndex += direction;
    this.inputState.historyIndex = Math.max(-1, 
      Math.min(this.commandHistory.length - 1, this.inputState.historyIndex));
    
    if (this.inputState.historyIndex >= 0) {
      this.inputState.currentLine = this.commandHistory[this.inputState.historyIndex];
      this.inputState.cursorPosition = this.inputState.currentLine.length;
    } else {
      this.inputState.currentLine = '';
      this.inputState.cursorPosition = 0;
    }
    
    this.notifyInputChange();
  }

  /**
   * Execute current command
   */
  private executeCommand(): void {
    const command = this.inputState.currentLine.trim();
    
    if (command) {
      // Add to history
      this.commandHistory.push(command);
      
      // Limit history size
      if (this.commandHistory.length > this.maxHistorySize) {
        this.commandHistory.shift();
      }
      
      // Execute command
      if (this.onCommand) {
        this.onCommand(command);
      }
    }
    
    // Reset input state
    this.inputState.currentLine = '';
    this.inputState.cursorPosition = 0;
    this.inputState.historyIndex = -1;
    
    this.notifyInputChange();
  }

  /**
   * Interrupt current operation (Ctrl+C)
   */
  private interrupt(): void {
    this.inputState.currentLine = '';
    this.inputState.cursorPosition = 0;
    this.inputState.historyIndex = -1;
    
    if (this.onSpecialKey) {
      this.onSpecialKey('interrupt', { ctrl: true, alt: false, shift: false });
    }
    
    this.notifyInputChange();
  }

  /**
   * Notify input change
   */
  private notifyInputChange(): void {
    if (this.onInput) {
      this.onInput(this.inputState.currentLine, this.inputState.cursorPosition);
    }
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: {
    onCommand?: (command: string) => void;
    onInput?: (currentLine: string, cursorPos: number) => void;
    onSpecialKey?: (key: string, modifiers: { ctrl: boolean; alt: boolean; shift: boolean }) => void;
  }): void {
    this.onCommand = callbacks.onCommand;
    this.onInput = callbacks.onInput;
    this.onSpecialKey = callbacks.onSpecialKey;
  }

  /**
   * Get current input state
   */
  getInputState(): InputState {
    return { ...this.inputState };
  }

  /**
   * Set current line programmatically
   */
  setCurrentLine(line: string, cursorPos?: number): void {
    this.inputState.currentLine = line;
    this.inputState.cursorPosition = cursorPos ?? line.length;
    this.notifyInputChange();
  }

  /**
   * Enable/disable input handling
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Focus the input
   */
  focus(): void {
    this.canvas.focus();
  }

  /**
   * Get command history
   */
  getCommandHistory(): string[] {
    return [...this.commandHistory];
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.commandHistory = [];
    this.inputState.historyIndex = -1;
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    this.canvas.removeEventListener('keydown', this.handleKeyDown);
    this.canvas.removeEventListener('keypress', this.handleKeyPress);
    this.canvas.removeEventListener('compositionstart', this.handleCompositionStart);
    this.canvas.removeEventListener('compositionend', this.handleCompositionEnd);
    this.canvas.removeEventListener('focus', this.handleFocus);
    this.canvas.removeEventListener('blur', this.handleBlur);
  }
}