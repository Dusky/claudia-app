import React, { useState, useEffect } from 'react';
import { TerminalDisplay, TerminalLine } from './terminal/TerminalDisplay';
import { getTheme, getAllThemes } from './terminal/themes';
import { config } from './config/env';
import './App.css';

function App() {
  const [currentTheme, setCurrentTheme] = useState(config.defaultTheme);
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: '1',
      type: 'system',
      content: 'CLAUDIA AI TERMINAL COMPANION v1.0.0',
      timestamp: new Date().toISOString()
    },
    {
      id: '2',
      type: 'system',
      content: 'Initializing Claudia...',
      timestamp: new Date().toISOString()
    },
    {
      id: '3',
      type: 'output',
      content: 'Hello! I\'m Claudia, your AI terminal companion. Type "help" to see available commands.',
      timestamp: new Date().toISOString(),
      user: 'claudia'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const theme = getTheme(currentTheme);

  const handleInput = (input: string) => {
    // Add user input to lines
    const userLine: TerminalLine = {
      id: `input-${Date.now()}`,
      type: 'input',
      content: input,
      timestamp: new Date().toISOString(),
      user: 'user'
    };

    setLines(prev => [...prev, userLine]);
    setIsLoading(true);

    // Handle basic commands
    setTimeout(() => {
      let response = '';
      
      switch (input.toLowerCase().trim()) {
        case 'help':
          response = `Available commands:
- help: Show this help message
- theme [name]: Change terminal theme (${getAllThemes().map(t => t.id).join(', ')})
- clear: Clear the terminal
- claudia: Talk to Claudia
- exit: Exit the terminal`;
          break;
          
        case 'clear':
          setLines([]);
          setIsLoading(false);
          return;
          
        case 'exit':
          response = 'Goodbye! Thanks for using Claudia.';
          break;
          
        default:
          if (input.startsWith('theme ')) {
            const themeName = input.slice(6).trim();
            const availableThemes = getAllThemes();
            const foundTheme = availableThemes.find(t => t.id === themeName);
            
            if (foundTheme) {
              setCurrentTheme(themeName);
              response = `Theme changed to: ${foundTheme.name} (${foundTheme.era})`;
            } else {
              response = `Unknown theme: ${themeName}. Available themes: ${availableThemes.map(t => t.id).join(', ')}`;
            }
          } else {
            response = `Hello! You said: "${input}". This is a basic demo. The full AI integration is coming soon! Try "help" for available commands.`;
          }
      }

      const responseLines: TerminalLine[] = response.split('\n').map((line, index) => ({
        id: `response-${Date.now()}-${index}`,
        type: 'output' as const,
        content: line,
        timestamp: new Date().toISOString(),
        user: 'claudia' as const
      }));

      setLines(prev => [...prev, ...responseLines]);
      setIsLoading(false);
    }, 1000); // Simulate thinking time
  };

  return (
    <div className="App">
      <TerminalDisplay
        theme={theme}
        lines={lines}
        onInput={handleInput}
        prompt=">"
        isLoading={isLoading}
      />
    </div>
  );
}

export default App;