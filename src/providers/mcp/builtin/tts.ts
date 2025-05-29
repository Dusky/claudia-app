// Built-in Text-to-Speech MCP Server for browser environment
// Uses Web Speech API for speech synthesis

import type { MCPTool, MCPToolCall, MCPToolResult } from '../types';

export class BuiltinTTSServer {
  readonly id = 'builtin-tts';
  readonly name = 'Built-in TTS';
  readonly description = 'Text-to-speech using Web Speech API';
  
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'speak',
        description: 'Convert text to speech and play it',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to convert to speech'
            },
            voice: {
              type: 'string',
              description: 'Voice name to use (use list_voices to see available voices)'
            },
            rate: {
              type: 'number',
              description: 'Speech rate (0.1 to 10, default 1)',
              minimum: 0.1,
              maximum: 10,
              default: 1
            },
            pitch: {
              type: 'number',
              description: 'Speech pitch (0 to 2, default 1)',
              minimum: 0,
              maximum: 2,
              default: 1
            },
            volume: {
              type: 'number',
              description: 'Speech volume (0 to 1, default 1)',
              minimum: 0,
              maximum: 1,
              default: 1
            },
            language: {
              type: 'string',
              description: 'Language code (e.g., en-US, es-ES, fr-FR)'
            }
          },
          required: ['text']
        }
      },
      {
        name: 'list_voices',
        description: 'List available speech synthesis voices',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              description: 'Filter voices by language code'
            }
          }
        }
      },
      {
        name: 'stop_speech',
        description: 'Stop current speech synthesis',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'pause_speech',
        description: 'Pause current speech synthesis',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'resume_speech',
        description: 'Resume paused speech synthesis',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_speech_status',
        description: 'Get current speech synthesis status',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'test_voice',
        description: 'Test a voice with sample text',
        inputSchema: {
          type: 'object',
          properties: {
            voice: {
              type: 'string',
              description: 'Voice name to test'
            },
            sample_text: {
              type: 'string',
              description: 'Custom sample text (default: "Hello, this is a test of the voice")',
              default: 'Hello, this is a test of the voice'
            }
          },
          required: ['voice']
        }
      }
    ];
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      // Initialize TTS if needed
      await this.initializeTTS();

      switch (toolCall.name) {
        case 'speak':
          return await this.handleSpeak(toolCall.arguments);
        case 'list_voices':
          return await this.handleListVoices(toolCall.arguments);
        case 'stop_speech':
          return await this.handleStopSpeech(toolCall.arguments);
        case 'pause_speech':
          return await this.handlePauseSpeech(toolCall.arguments);
        case 'resume_speech':
          return await this.handleResumeSpeech(toolCall.arguments);
        case 'get_speech_status':
          return await this.handleGetSpeechStatus(toolCall.arguments);
        case 'test_voice':
          return await this.handleTestVoice(toolCall.arguments);
        default:
          return {
            content: [{
              type: 'text',
              text: `Unknown tool: ${toolCall.name}`
            }],
            isError: true
          };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error executing ${toolCall.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async initializeTTS(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        
        // Load voices (may be async in some browsers)
        this.voices = this.synth.getVoices();
        
        // Wait for voices to load if empty
        if (this.voices.length === 0) {
          await new Promise<void>((resolve) => {
            const checkVoices = () => {
              this.voices = this.synth!.getVoices();
              if (this.voices.length > 0) {
                resolve();
              } else {
                setTimeout(checkVoices, 100);
              }
            };
            
            this.synth!.addEventListener('voiceschanged', () => {
              this.voices = this.synth!.getVoices();
              resolve();
            });
            
            checkVoices();
          });
        }
        
        this.isInitialized = true;
        console.log(`✅ TTS initialized with ${this.voices.length} voices`);
      } else {
        throw new Error('Speech synthesis not supported in this browser');
      }
    } catch (error) {
      console.warn('⚠️ TTS initialization failed:', error);
      throw error;
    }
  }

  private async handleSpeak(args: Record<string, unknown>): Promise<MCPToolResult> {
    const text = args.text as string;
    const voiceName = args.voice as string;
    const rate = (args.rate as number) || 1;
    const pitch = (args.pitch as number) || 1;
    const volume = (args.volume as number) || 1;
    const language = args.language as string;

    if (!text) {
      return {
        content: [{ type: 'text', text: 'Text is required for speech synthesis' }],
        isError: true
      };
    }

    if (!this.synth) {
      return {
        content: [{ type: 'text', text: 'Speech synthesis not available' }],
        isError: true
      };
    }

    try {
      // Stop any current speech
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice if specified
      if (voiceName) {
        const voice = this.voices.find(v => 
          v.name === voiceName || 
          v.name.toLowerCase().includes(voiceName.toLowerCase())
        );
        if (voice) {
          utterance.voice = voice;
        } else {
          return {
            content: [{
              type: 'text',
              text: `Voice '${voiceName}' not found. Use list_voices to see available voices.`
            }],
            isError: true
          };
        }
      }

      // Set language if specified
      if (language) {
        utterance.lang = language;
      }

      // Set speech parameters
      utterance.rate = Math.max(0.1, Math.min(10, rate));
      utterance.pitch = Math.max(0, Math.min(2, pitch));
      utterance.volume = Math.max(0, Math.min(1, volume));

      // Track speech completion
      const speechPromise = new Promise<void>((resolve, reject) => {
        utterance.onend = () => resolve();
        utterance.onerror = (event) => reject(new Error(`Speech error: ${event.error}`));
      });

      // Start speaking
      this.synth.speak(utterance);

      // Wait for completion or timeout
      const timeoutPromise = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Speech timeout')), 30000)
      );

      try {
        await Promise.race([speechPromise, timeoutPromise]);
      } catch (error) {
        this.synth.cancel();
        throw error;
      }

      return {
        content: [{
          type: 'text',
          text: `🔊 Spoke: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"\nVoice: ${utterance.voice?.name || 'Default'}\nRate: ${rate}, Pitch: ${pitch}, Volume: ${volume}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to speak text: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleListVoices(args: Record<string, unknown>): Promise<MCPToolResult> {
    const languageFilter = args.language as string;

    if (!this.synth) {
      return {
        content: [{ type: 'text', text: 'Speech synthesis not available' }],
        isError: true
      };
    }

    try {
      let voices = this.voices;
      
      if (languageFilter) {
        voices = voices.filter(voice => 
          voice.lang.toLowerCase().includes(languageFilter.toLowerCase())
        );
      }

      if (voices.length === 0) {
        return {
          content: [{
            type: 'text',
            text: languageFilter 
              ? `No voices found for language '${languageFilter}'`
              : 'No voices available'
          }]
        };
      }

      const voiceList = voices.map(voice => 
        `🎤 ${voice.name} (${voice.lang}) ${voice.default ? '⭐ Default' : ''} ${voice.localService ? '💻 Local' : '🌐 Remote'}`
      ).join('\n');

      return {
        content: [{
          type: 'text',
          text: `Available voices${languageFilter ? ` for '${languageFilter}'` : ''} (${voices.length}):\n\n${voiceList}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to list voices: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleStopSpeech(_args: Record<string, unknown>): Promise<MCPToolResult> {
    if (!this.synth) {
      return {
        content: [{ type: 'text', text: 'Speech synthesis not available' }],
        isError: true
      };
    }

    try {
      this.synth.cancel();
      return {
        content: [{
          type: 'text',
          text: '🛑 Speech stopped'
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to stop speech: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handlePauseSpeech(_args: Record<string, unknown>): Promise<MCPToolResult> {
    if (!this.synth) {
      return {
        content: [{ type: 'text', text: 'Speech synthesis not available' }],
        isError: true
      };
    }

    try {
      this.synth.pause();
      return {
        content: [{
          type: 'text',
          text: '⏸️ Speech paused'
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to pause speech: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleResumeSpeech(_args: Record<string, unknown>): Promise<MCPToolResult> {
    if (!this.synth) {
      return {
        content: [{ type: 'text', text: 'Speech synthesis not available' }],
        isError: true
      };
    }

    try {
      this.synth.resume();
      return {
        content: [{
          type: 'text',
          text: '▶️ Speech resumed'
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to resume speech: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleGetSpeechStatus(_args: Record<string, unknown>): Promise<MCPToolResult> {
    if (!this.synth) {
      return {
        content: [{ type: 'text', text: 'Speech synthesis not available' }],
        isError: true
      };
    }

    try {
      const status = {
        speaking: this.synth.speaking,
        pending: this.synth.pending,
        paused: this.synth.paused,
        voicesLoaded: this.voices.length > 0,
        totalVoices: this.voices.length
      };

      let statusText = '🎤 Speech Synthesis Status:\n';
      statusText += `Speaking: ${status.speaking ? '🔊 Yes' : '🔇 No'}\n`;
      statusText += `Pending: ${status.pending ? '⏳ Yes' : '✅ No'}\n`;
      statusText += `Paused: ${status.paused ? '⏸️ Yes' : '▶️ No'}\n`;
      statusText += `Voices Available: ${status.totalVoices}`;

      return {
        content: [{
          type: 'text',
          text: statusText
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to get speech status: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleTestVoice(args: Record<string, unknown>): Promise<MCPToolResult> {
    const voiceName = args.voice as string;
    const sampleText = (args.sample_text as string) || 'Hello, this is a test of the voice';

    if (!voiceName) {
      return {
        content: [{ type: 'text', text: 'Voice name is required' }],
        isError: true
      };
    }

    // Use the speak function with the specified voice
    return await this.handleSpeak({
      text: sampleText,
      voice: voiceName
    });
  }
}