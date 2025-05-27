/**
 * Canvas CRT Terminal Demo
 * Example usage of the complete CRT terminal system
 */

import { CRTCanvasTerminal } from '../index';

export function createCRTTerminalDemo(canvas: HTMLCanvasElement) {
  // Create terminal with full CRT effects
  const terminal = new CRTCanvasTerminal(canvas, {
    phosphorColor: '#00FF00',
    fontSize: 16,
    fontFamily: 'Monaco, "Courier New", monospace',
    
    // Enable all CRT effects
    curvature: true,
    curvatureAmount: 0.15,
    scanlines: true,
    scanlineOpacity: 0.1,
    flicker: true,
    flickerIntensity: 0.2,
    glowIntensity: 0.7,
    
    // Input settings
    typewriterSpeed: 25,
    cursorBlinkRate: 1.2
  });

  // Configure advanced effects
  const effects = terminal.getEffectsEngine();
  effects.configurePhosphor(0.02, 4); // Slower decay, larger glow
  effects.configureBloom(0.6, 1.8, 10); // Intense bloom
  effects.configureScreenBurn(3000, 0.2, 0.0002, 0.0003); // Persistent burn

  // Set up interactive input
  terminal.setInputEnabled(true);
  terminal.setPrompt('claudia@retro:~$ ');
  terminal.setCursorStyle('block');

  // Custom command handler
  terminal.setCommandHandler((command: string) => {
    const args = command.trim().split(/\s+/);
    const cmd = args[0].toLowerCase();

    switch (cmd) {
      case 'help':
        terminal.print('Available commands:');
        terminal.print('  help     - Show this help message');
        terminal.print('  clear    - Clear the screen');
        terminal.print('  demo     - Run demo sequence');
        terminal.print('  matrix   - Enter the Matrix');
        terminal.print('  burn     - Create screen burn effect');
        terminal.print('  effects  - Toggle visual effects');
        break;

      case 'clear':
        terminal.clear();
        break;

      case 'demo':
        runDemoSequence(terminal);
        break;

      case 'matrix':
        runMatrixEffect(terminal);
        break;

      case 'burn':
        createBurnDemo(terminal);
        break;

      case 'effects':
        toggleEffects(terminal);
        break;

      case 'exit':
        terminal.print('Goodbye!');
        terminal.setInputEnabled(false);
        break;

      default:
        if (command.trim()) {
          terminal.print(`Command not found: ${command}`);
          terminal.print('Type "help" for available commands.');
        }
        break;
    }
  });

  // Initial welcome sequence
  setTimeout(() => {
    terminal.typewrite('CLAUDIA RETRO TERMINAL v2.0', 35, () => {
      setTimeout(() => {
        terminal.typewrite('System initialized successfully.', 30, () => {
          setTimeout(() => {
            terminal.print('Type "help" for available commands.');
            terminal.print('Type "demo" for a demonstration.');
          }, 500);
        });
      }, 300);
    });
  }, 1000);

  return terminal;
}

function runDemoSequence(terminal: CRTCanvasTerminal) {
  terminal.setInputEnabled(false);
  
  const messages = [
    'Initializing retro computing environment...',
    'Loading CRT display drivers...',
    'Calibrating phosphor persistence...',
    'Adjusting scan line frequency...',
    'Enabling screen curvature simulation...',
    'Starting bloom effect renderer...',
    'Demo sequence complete!'
  ];

  let messageIndex = 0;
  
  const typeNextMessage = () => {
    if (messageIndex < messages.length) {
      const speed = 20 + Math.random() * 15; // Variable speed
      terminal.typewrite(messages[messageIndex], speed, () => {
        messageIndex++;
        setTimeout(typeNextMessage, 200 + Math.random() * 300);
      });
    } else {
      setTimeout(() => {
        terminal.print('Demo complete. Returning to interactive mode...');
        terminal.setInputEnabled(true);
      }, 1000);
    }
  };
  
  typeNextMessage();
}

function runMatrixEffect(terminal: CRTCanvasTerminal) {
  terminal.setInputEnabled(false);
  
  // Change to green on black for Matrix effect
  terminal.setConfig({
    phosphorColor: '#00FF41',
    backgroundColor: '#000000',
    glowIntensity: 0.9,
    flickerIntensity: 0.1
  });

  const matrixChars = '0123456789ABCDEFアイウエオカキクケコサシスセソタチツテトナニヌネノ';
  const lines = [];
  
  // Generate matrix-style output
  for (let i = 0; i < 20; i++) {
    let line = '';
    for (let j = 0; j < 60; j++) {
      line += matrixChars[Math.floor(Math.random() * matrixChars.length)];
    }
    lines.push(line);
  }
  
  // Display matrix lines with typewriter effect
  let lineIndex = 0;
  const displayNextLine = () => {
    if (lineIndex < lines.length) {
      terminal.typewrite(lines[lineIndex], 100, () => {
        lineIndex++;
        setTimeout(displayNextLine, 50);
      });
    } else {
      setTimeout(() => {
        // Reset colors
        terminal.setConfig({
          phosphorColor: '#00FF00',
          backgroundColor: '#000000',
          glowIntensity: 0.7,
          flickerIntensity: 0.2
        });
        
        terminal.clear();
        terminal.typewrite('Welcome back to reality.', 25, () => {
          terminal.setInputEnabled(true);
        });
      }, 2000);
    }
  };
  
  terminal.clear();
  terminal.typewrite('Entering the Matrix...', 30, () => {
    setTimeout(displayNextLine, 500);
  });
}

function createBurnDemo(terminal: CRTCanvasTerminal) {
  const screenBurn = terminal.getEffectsEngine().getScreenBurn();
  
  // Create demo burn patterns
  screenBurn.createDemoBurn('SYSTEM STATUS:', 0, 0, 0.15);
  screenBurn.createDemoBurn('ONLINE', 50, 0, 0.12);
  screenBurn.createDemoBurn('ERROR LOG:', 0, 2, 0.1);
  screenBurn.createDemoBurn('[WARNING]', 10, 5, 0.08);
  
  terminal.print('Screen burn-in effects added!');
  terminal.print('These will persist and fade slowly over time.');
}

function toggleEffects(terminal: CRTCanvasTerminal) {
  const currentConfig = terminal.getConfig();
  const effectsOn = currentConfig.curvature || currentConfig.scanlines || currentConfig.flicker;
  
  if (effectsOn) {
    // Turn off effects
    terminal.setConfig({
      curvature: false,
      scanlines: false,
      flicker: false,
      glowIntensity: 0.3
    });
    terminal.print('Visual effects disabled.');
  } else {
    // Turn on effects
    terminal.setConfig({
      curvature: true,
      curvatureAmount: 0.15,
      scanlines: true,
      scanlineOpacity: 0.1,
      flicker: true,
      flickerIntensity: 0.2,
      glowIntensity: 0.7
    });
    terminal.print('Visual effects enabled.');
  }
}

// Export for easy integration
export { runDemoSequence, runMatrixEffect, createBurnDemo, toggleEffects };