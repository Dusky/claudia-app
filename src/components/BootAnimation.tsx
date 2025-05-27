import { useState, useEffect, useRef, useCallback } from 'react';
import { useBootInterrupt } from '../hooks/useBootInterrupt';
import './BootSequence.css';

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
   ║                   AI TERMINAL SYSTEM                      ║
   ║                                                           ║
   ╚═══════════════════════════════════════════════════════════╝
`;

interface BootStage {
  id: string;
  text: string;
  taskFn?: () => Promise<void>;
  completed: boolean;
}

interface BootAnimationProps {
  onComplete: () => void;
  onSkip: () => void;
  // Dependencies for the parallel tasks
  llmManager: { autoInitialize?: () => Promise<void> };
  imageManager: { initializeDefaultProvider?: () => Promise<void> };
  avatarController: unknown;
  database: {
    getActivePersonality?: () => Promise<unknown>;
    savePersonality?: (personality: unknown) => Promise<void>;
    setActivePersonality?: (id: string) => Promise<void>;
    getConversations?: (limit?: number) => Promise<unknown[]>;
  };
}

const TYPEWRITER_SPEED = 30; // ms per character - faster for cooler effect
const MIN_DISPLAY_TIME = 2000; // 2 seconds minimum
const FADE_DURATION = 500; // fade out duration
const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?~`';

export const BootAnimation: React.FC<BootAnimationProps> = ({
  onComplete,
  onSkip,
  llmManager,
  imageManager,
  avatarController,
  database
}) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bootStages, setBootStages] = useState<BootStage[]>([]);
  const [allTasksComplete, setAllTasksComplete] = useState(false);
  const [startTime] = useState(Date.now());
  const [fadeOut, setFadeOut] = useState(false);
  const [showNeutralAvatar, setShowNeutralAvatar] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [logoComplete, setLogoComplete] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const [scanlinePosition, setScanlinePosition] = useState(0);
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stageCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Handle logo display first
  useEffect(() => {
    if (showLogo) {
      const logoTimer = setTimeout(() => {
        setShowLogo(false);
        setLogoComplete(true);
      }, 2000); // Show logo for 2 seconds

      return () => clearTimeout(logoTimer);
    }
  }, [showLogo]);

  // Cool scanline effect and spinner animation
  useEffect(() => {
    if (!logoComplete) return;
    
    const scanlineInterval = setInterval(() => {
      setScanlinePosition(prev => (prev + 2) % 100);
    }, 50);
    
    const spinnerInterval = setInterval(() => {
      setSpinnerFrame(prev => (prev + 1) % 6);
    }, 200);

    return () => {
      clearInterval(scanlineInterval);
      clearInterval(spinnerInterval);
    };
  }, [logoComplete]);

  // Random glitch effect
  useEffect(() => {
    if (!logoComplete) return;
    
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.05) { // 5% chance every interval
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 100);
      }
    }, 200);

    return () => clearInterval(glitchInterval);
  }, [logoComplete]);

  // Initialize boot stages with their tasks
  useEffect(() => {
    if (!logoComplete) return; // Wait for logo to complete
    const loadPersonality = async () => {
      try {
        const activePersonality = await database.getActivePersonality();
        if (!activePersonality) {
          // Create default personality if none exists
          await database.savePersonality({
            id: 'default',
            name: 'Claudia',
            description: 'Default AI personality',
            systemPrompt: 'You are Claudia, a helpful AI assistant.',
            allowImageGeneration: true
          });
          await database.setActivePersonality('default');
        }
      } catch (error) {
        console.warn('Failed to load personality:', error);
      }
    };

    const preloadNeutralAvatar = async () => {
      try {
        // Preload the neutral.png asset
        const img = new Image();
        img.src = '/src/assets/neutral.png';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
      } catch (error) {
        console.warn('Failed to preload neutral avatar:', error);
      }
    };

    const initializeProviders = async () => {
      try {
        if (llmManager) {
          await llmManager.autoInitialize?.();
        }
        if (imageManager) {
          await imageManager.initializeDefaultProvider?.();
        }
      } catch (error) {
        console.warn('Failed to initialize providers:', error);
      }
    };

    const hydrateHistory = async () => {
      try {
        // Load last 20 conversation entries
        const conversations = await database.getConversations?.(20);
        if (conversations && conversations.length > 0) {
          // Just verify we can load history, don't actually display it yet
          console.log(`Loaded ${conversations.length} conversation entries`);
        }
      } catch (error) {
        console.warn('Failed to hydrate history:', error);
      }
    };

    const stages: BootStage[] = [
      {
        id: 'init',
        text: '--- INITIATING CLAUDIA.EXE',
        completed: false
      },
      {
        id: 'personality',
        text: '• Loading personality kernel …',
        taskFn: loadPersonality,
        completed: false
      },
      {
        id: 'empathy',
        text: '• Calibrating affective models …',
        taskFn: preloadNeutralAvatar,
        completed: false
      },
      {
        id: 'uplink',
        text: '• Negotiating LLM uplink …',
        taskFn: initializeProviders,
        completed: false
      },
      {
        id: 'logs',
        text: '• Restoring last 20 logs …',
        taskFn: hydrateHistory,
        completed: false
      },
      {
        id: 'complete',
        text: '>>> ONLINE — press ⎋ or ⏎ to continue',
        completed: false
      }
    ];

    setBootStages(stages);

    // Start all tasks immediately in parallel
    stages.forEach((stage, index) => {
      if (stage.taskFn) {
        stage.taskFn().finally(() => {
          setBootStages(prev => {
            const updated = [...prev];
            updated[index].completed = true;
            return updated;
          });
        });
      } else {
        // Non-task stages are completed immediately
        setTimeout(() => {
          setBootStages(prev => {
            const updated = [...prev];
            updated[index].completed = true;
            return updated;
          });
        }, 100);
      }
    });
  }, [logoComplete, database, llmManager, imageManager, avatarController]);

  // Check if all tasks are complete
  useEffect(() => {
    const allComplete = bootStages.length > 0 && bootStages.every(stage => stage.completed);
    if (allComplete && !allTasksComplete) {
      setAllTasksComplete(true);
    }
  }, [bootStages, allTasksComplete]);

  // Handle typewriter effect
  useEffect(() => {
    if (!logoComplete || currentStageIndex >= bootStages.length) return;

    const currentStage = bootStages[currentStageIndex];
    if (!currentStage) return;

    setIsTyping(true);
    setDisplayedText('');

    let charIndex = 0;
    const typeNextChar = () => {
      if (charIndex < currentStage.text.length) {
        setDisplayedText(prev => prev + currentStage.text[charIndex]);
        charIndex++;
        typingTimeoutRef.current = setTimeout(typeNextChar, TYPEWRITER_SPEED);
      } else {
        setIsTyping(false);
        
        // Move to next stage after a short delay
        setTimeout(() => {
          if (currentStageIndex < bootStages.length - 1) {
            setCurrentStageIndex(prev => prev + 1);
          }
        }, 300);
      }
    };

    typingTimeoutRef.current = setTimeout(typeNextChar, 100);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [logoComplete, currentStageIndex, bootStages]);

  // Handle audio chime and avatar display
  useEffect(() => {
    if (currentStageIndex === 4 && !audioPlayed) { // Phase E (logs stage)
      setAudioPlayed(true);
      
      // Play boot chime
      const audio = new Audio('/audio/boot_chime.ogg');
      audio.volume = 0.3;
      audio.play().catch(error => {
        console.warn('Failed to play boot chime:', error);
      });
      
      // Show neutral avatar after a brief delay
      setTimeout(() => {
        setShowNeutralAvatar(true);
        drawNeutralAvatar();
      }, 500);
    }
  }, [currentStageIndex, audioPlayed]);

  // Draw neutral avatar on canvas
  const drawNeutralAvatar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 120;
    canvas.height = 120;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.2; // 20% opacity
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = '/src/assets/neutral.png';
  }, []);

  // Handle completion logic
  const handleComplete = useCallback(() => {
    const elapsedTime = Date.now() - startTime;
    const shouldComplete = allTasksComplete && elapsedTime >= MIN_DISPLAY_TIME;
    
    if (shouldComplete && currentStageIndex >= bootStages.length - 1) {
      setFadeOut(true);
      setTimeout(() => {
        // Set localStorage flag to skip boot on future loads
        try {
          const claudiaData = JSON.parse(localStorage.getItem('claudia') || '{}');
          claudiaData.skipBoot = 'true';
          localStorage.setItem('claudia', JSON.stringify(claudiaData));
        } catch (error) {
          console.warn('Failed to set skipBoot flag:', error);
        }
        onComplete();
      }, FADE_DURATION);
    }
  }, [allTasksComplete, startTime, currentStageIndex, bootStages.length, onComplete]);

  // Auto-complete when conditions are met
  useEffect(() => {
    if (allTasksComplete && currentStageIndex >= bootStages.length - 1) {
      stageCheckRef.current = setTimeout(handleComplete, 100);
    }

    return () => {
      if (stageCheckRef.current) {
        clearTimeout(stageCheckRef.current);
      }
    };
  }, [allTasksComplete, currentStageIndex, bootStages.length, handleComplete]);

  // Handle skip functionality
  const handleSkip = useCallback(() => {
    if (showLogo) {
      // If showing logo, skip to boot sequence
      setShowLogo(false);
      setLogoComplete(true);
      return;
    }
    
    setFadeOut(true);
    setTimeout(() => {
      onSkip();
    }, 100);
  }, [showLogo, onSkip]);

  // Use the boot interrupt hook
  useBootInterrupt({
    onSkip: handleSkip,
    enabled: true
  });

  // Cool glitch text effect
  const glitchText = (text: string): string => {
    if (!glitchActive) return text;
    
    return text.split('').map(char => {
      if (Math.random() < 0.3) {
        return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
      return char;
    }).join('');
  };

  // Render spinner based on stage completion - fix undefined issue
  const getSpinner = (stageIndex: number): string => {
    if (stageIndex >= bootStages.length) return '';
    const stage = bootStages[stageIndex];
    if (!stage) return '';
    
    if (stage.id === 'init' || stage.id === 'complete') return '';
    
    if (stage.completed) {
      return ' ✔';
    } else {
      // Animated spinner effect using state
      const frames = ['∙', '∘', '○', '●', '○', '∘'];
      return ` ${frames[spinnerFrame]}`;
    }
  };

  // Show logo first
  if (showLogo) {
    return (
      <div className="boot-sequence">
        <div className="boot-content">
          <pre className="ascii-logo">
            {ASCII_LOGO}
          </pre>
        </div>
        <div className="skip-hint">Press ⎋, ⏎, SPACE, or tap anywhere to skip...</div>
      </div>
    );
  }

  return (
    <div className={`boot-sequence ${fadeOut ? 'fade-out' : ''} ${glitchActive ? 'glitch' : ''}`}>
      {/* Cool scanline effect */}
      <div 
        className="scanline" 
        style={{ 
          top: `${scanlinePosition}%`,
          position: 'absolute',
          width: '100%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #00ff00, transparent)',
          opacity: 0.6,
          zIndex: 10
        }} 
      />
      
      <div className="boot-content">
        <pre className={`boot-text ${glitchActive ? 'glitch' : ''}`}>
          {/* Show all previous stages */}
          {bootStages.slice(0, currentStageIndex).map((stage, index) => {
            const spinner = getSpinner(index);
            const stageText = glitchActive ? glitchText(stage.text) : stage.text;
            return (
              <div key={stage.id} className="boot-line">
                <span className="stage-text">{stageText}</span>
                {spinner && <span className="spinner">{spinner}</span>}
              </div>
            );
          })}
          
          {/* Show current stage being typed */}
          {currentStageIndex < bootStages.length && (
            <div className="boot-line current-line">
              <span className="stage-text">
                {glitchActive ? glitchText(displayedText) : displayedText}
              </span>
              <span className="spinner">{getSpinner(currentStageIndex)}</span>
              {isTyping && <span className="cursor">_</span>}
            </div>
          )}
        </pre>
      </div>
      
      {/* Neutral avatar canvas */}
      {showNeutralAvatar && (
        <canvas
          ref={canvasRef}
          className="neutral-avatar"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            pointerEvents: 'none',
            zIndex: 1999
          }}
        />
      )}
      
      <div className="skip-hint">Press ⎋, ⏎, SPACE, or tap anywhere to skip...</div>
      
      <style>{`
        .boot-sequence.fade-out {
          opacity: 0;
          transition: opacity ${FADE_DURATION}ms ease-out;
        }
        
        .boot-line {
          margin: 0;
          padding: 0;
          position: relative;
          overflow: hidden;
        }
        
        .boot-line.current-line {
          background: linear-gradient(90deg, transparent, rgba(0, 255, 0, 0.1), transparent);
          animation: lineGlow 2s ease-in-out infinite;
        }
        
        .stage-text {
          display: inline-block;
          text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
        }
        
        .spinner {
          display: inline-block;
          color: #00ff00;
          text-shadow: 0 0 10px #00ff00;
          animation: spinnerGlow 1s ease-in-out infinite;
        }
        
        .scanline {
          animation: scanlineMove 3s linear infinite;
          box-shadow: 0 0 10px #00ff00;
        }
        
        .boot-sequence.glitch .boot-text {
          animation: screenShake 0.1s ease-in-out;
        }
        
        .neutral-avatar {
          opacity: 0;
          animation: fadeInAvatar 1s ease-in-out 0.5s forwards;
          border: 1px solid rgba(0, 255, 0, 0.3);
          border-radius: 8px;
          box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
        }
        
        @keyframes fadeInAvatar {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 0.2; transform: scale(1); }
        }
        
        @keyframes lineGlow {
          0%, 100% { background: transparent; }
          50% { background: linear-gradient(90deg, transparent, rgba(0, 255, 0, 0.1), transparent); }
        }
        
        @keyframes spinnerGlow {
          0%, 100% { text-shadow: 0 0 5px #00ff00; }
          50% { text-shadow: 0 0 15px #00ff00, 0 0 25px #00ff00; }
        }
        
        @keyframes scanlineMove {
          0% { top: 0%; opacity: 0; }
          50% { opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }
        
        @keyframes screenShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          50% { transform: translateX(2px); }
          75% { transform: translateX(-1px); }
        }
      `}</style>
    </div>
  );
};