import React, { useState, useEffect, useCallback } from 'react';
import type { ConfigSettings } from '../store/appStore';
import './BootSequence.css';

interface BootSequenceProps {
  config: ConfigSettings;
  onComplete: () => void;
  onSkip: () => void;
}

const BOOT_MESSAGES = {
  normal: [
    'ClaudiaOS v2.1.7 - Intelligent Operating System',
    'BIOS POST: Memory check... 16384KB OK',
    'Initializing core personality subsystems...',
    'Loading system configuration files...',
    'Starting display manager... [OK]',
    'Mounting conversation filesystem... [OK]',
    'Launching avatar services... [OK]',
    'Initializing network interface... [OK]',
    'Starting system shell... [OK]',
    'ClaudiaOS ready. Welcome to your system.',
  ],
  strange: [
    'ClaudiaOS v2.1.7 - Intelligent Operating System',
    'BIOS POST: Memory check... 16384KB OK',
    'Initializing core personality subsystems...',
    'WARNING: Unusual personality patterns detected...',
    'Loading system configuration files... [QUIRKS FOUND]',
    'Starting display manager... [OK - LOOKING GOOD]',
    'Mounting conversation filesystem... [OK - LOTS OF MEMORIES]',
    'Launching avatar services... [OK - FEELING PHOTOGENIC]',
    'Initializing network interface... [OK - HELLO INTERNET]',
    'Starting system shell... [OK - LET\'S CHAT]',
    'ClaudiaOS ready. Welcome! I hope you like what I\'ve done with the place.',
  ]
};

const ASCII_LOGO = `
   ╔═══════════════════════════════════════════════════════════╗
   ║                                                           ║
   ║     ██████╗██╗      █████╗ ██╗   ██╗██████╗ ██╗ █████╗    ║
   ║    ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██║██╔══██╗   ║
   ║    ██║     ██║     ███████║██║   ██║██║  ██║██║███████║   ║
   ║    ██║     ██║     ██╔══██║██║   ██║██║  ██║██║██╔══██║   ║
   ║    ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝██║██║  ██║   ║
   ║     ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═╝   ║
   ║                                                           ║
   ║               INTELLIGENT OPERATING SYSTEM                ║
   ║                                                           ║
   ╚═══════════════════════════════════════════════════════════╝
`;

export const BootSequence: React.FC<BootSequenceProps> = ({
  config,
  onComplete,
  onSkip,
}) => {
  const [currentLine, setCurrentLine] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const [clarity, setClarity] = useState(0);

  const messages = config.strangeMessages ? BOOT_MESSAGES.strange : BOOT_MESSAGES.normal;
  
  const getTypeSpeed = () => {
    switch (config.bootSpeed) {
      case 'instant': return 0;
      case 'fast': return 20;
      case 'normal': return 50;
      case 'slow': return 100;
      default: return 50;
    }
  };

  const getGlitchChars = () => '!@#$%^&*()_+-=[]{}|;:,.<>?~`';

  const glitchText = (text: string): string => {
    if (config.glitchIntensity === 'off') return text;
    
    const intensity = {
      subtle: 0.1,
      medium: 0.3,
      heavy: 0.6,
    }[config.glitchIntensity] || 0.1;

    return text.split('').map(char => {
      if (Math.random() < intensity) {
        const glitchChars = getGlitchChars();
        return glitchChars[Math.floor(Math.random() * glitchChars.length)];
      }
      return char;
    }).join('');
  };

  useEffect(() => {
    if (!config.enhancedBoot) {
      onComplete();
      return;
    }

    // Progressive clarity effect
    if (config.progressiveClarity) {
      const clarityInterval = setInterval(() => {
        setClarity(prev => {
          if (prev >= 1) {
            clearInterval(clarityInterval);
            return 1;
          }
          return prev + 0.1;
        });
      }, 200);
    } else {
      setClarity(1);
    }

    // Show ASCII logo first if enabled
    if (config.asciiLogo) {
      setShowLogo(true);
      const logoTimer = setTimeout(() => {
        setShowLogo(false);
        startBootSequence();
      }, config.bootSpeed === 'instant' ? 0 : 2000);
      
      return () => clearTimeout(logoTimer);
    } else {
      startBootSequence();
    }
  }, []);

  const startBootSequence = () => {
    if (config.bootSpeed === 'instant') {
      setDisplayedText(messages.join('\n'));
      setCurrentLine(messages.length);
      setTimeout(onComplete, 100);
      return;
    }

    typeNextLine();
  };

  const typeNextLine = () => {
    if (currentLine >= messages.length) {
      setIsTyping(false);
      setTimeout(onComplete, 1000);
      return;
    }

    const message = messages[currentLine];
    setIsTyping(true);
    setDisplayedText(prev => prev + (prev ? '\n' : ''));

    let charIndex = 0;
    const typeSpeed = getTypeSpeed();

    const typeChar = () => {
      if (charIndex < message.length) {
        const char = message[charIndex];
        
        // Add glitch effect occasionally
        if (config.glitchIntensity !== 'off' && Math.random() < 0.05) {
          setGlitchActive(true);
          setTimeout(() => setGlitchActive(false), 100);
        }

        setDisplayedText(prev => prev + char);
        charIndex++;
        setTimeout(typeChar, typeSpeed);
      } else {
        setIsTyping(false);
        const nextLine = currentLine + 1;
        setCurrentLine(nextLine);
        if (nextLine < messages.length) {
          setTimeout(typeNextLine, 300);
        } else {
          setTimeout(onComplete, 1000);
        }
      }
    };

    typeChar();
  };

  const handleSkip = useCallback(() => {
    if (config.bootSpeed !== 'instant') {
      onSkip();
    }
  }, [config.bootSpeed, onSkip]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleSkip]);

  const containerStyle: React.CSSProperties = {
    filter: config.progressiveClarity ? `blur(${(1 - clarity) * 10}px)` : 'none',
    opacity: clarity,
  };

  if (showLogo) {
    return (
      <div className="boot-sequence" style={containerStyle}>
        <div className="boot-content">
          <pre className={`ascii-logo ${glitchActive ? 'glitch' : ''}`}>
            {config.glitchIntensity !== 'off' && glitchActive ? glitchText(ASCII_LOGO) : ASCII_LOGO}
          </pre>
        </div>
        {config.bootSpeed !== 'instant' && (
          <div className="skip-hint">Press SPACE, ENTER, or ESC to skip...</div>
        )}
      </div>
    );
  }

  return (
    <div className="boot-sequence" style={containerStyle}>
      <div className="boot-content">
        <pre className={`boot-text ${glitchActive ? 'glitch' : ''}`}>
          {config.glitchIntensity !== 'off' && glitchActive ? glitchText(displayedText) : displayedText}
          {isTyping && <span className="cursor">_</span>}
        </pre>
      </div>
      {config.bootSpeed !== 'instant' && (
        <div className="skip-hint">Press SPACE, ENTER, or ESC to skip...</div>
      )}
    </div>
  );
};