import React, { useState } from 'react';
import './ConfigModal.css';

export interface ConfigSettings {
  // Boot Sequence
  enhancedBoot: boolean;
  bootSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  glitchIntensity: 'off' | 'subtle' | 'medium' | 'heavy';
  asciiLogo: boolean;
  strangeMessages: boolean;
  
  // Visual Effects
  screenFlicker: boolean;
  flickerIntensity: number;
  scanLines: 'off' | 'subtle' | 'heavy';
  terminalBreathing: boolean;
  visualArtifacts: boolean;
  progressiveClarity: boolean;
  
  // Atmosphere
  crtGlow: boolean;
  backgroundAnimation: boolean;
  colorShifts: boolean;
  staticOverlay: boolean;
  
  // Performance
  reducedAnimations: boolean;
  highContrast: boolean;
}

export const defaultConfig: ConfigSettings = {
  enhancedBoot: true,
  bootSpeed: 'normal',
  glitchIntensity: 'subtle',
  asciiLogo: true,
  strangeMessages: true,
  screenFlicker: false,
  flickerIntensity: 0.3,
  scanLines: 'subtle',
  terminalBreathing: true,
  visualArtifacts: true,
  progressiveClarity: true,
  crtGlow: true,
  backgroundAnimation: true,
  colorShifts: false,
  staticOverlay: false,
  reducedAnimations: false,
  highContrast: false,
};

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfigSettings;
  onConfigChange: (config: ConfigSettings) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
}) => {
  const [activeTab, setActiveTab] = useState<'boot' | 'visual' | 'atmosphere' | 'performance'>('boot');
  const [tempConfig, setTempConfig] = useState<ConfigSettings>(config);

  const updateConfig = (key: keyof ConfigSettings, value: boolean | string | number) => {
    setTempConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onConfigChange(tempConfig);
    onClose();
  };

  const handleCancel = () => {
    setTempConfig(config);
    onClose();
  };

  const handleReset = () => {
    setTempConfig(defaultConfig);
  };

  const setPreset = (preset: 'minimal' | 'balanced' | 'immersive') => {
    switch (preset) {
      case 'minimal':
        setTempConfig({
          ...defaultConfig,
          enhancedBoot: false,
          glitchIntensity: 'off',
          screenFlicker: false,
          scanLines: 'off',
          terminalBreathing: false,
          visualArtifacts: false,
          crtGlow: false,
          backgroundAnimation: false,
          reducedAnimations: true,
        });
        break;
      case 'balanced':
        setTempConfig(defaultConfig);
        break;
      case 'immersive':
        setTempConfig({
          ...defaultConfig,
          bootSpeed: 'slow',
          glitchIntensity: 'heavy',
          screenFlicker: true,
          flickerIntensity: 0.5,
          scanLines: 'heavy',
          colorShifts: true,
          staticOverlay: true,
        });
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="config-modal-overlay">
      <div className="config-modal">
        <div className="config-header">
          <h2>Terminal Configuration</h2>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>

        <div className="config-content">
          <div className="config-tabs">
            <button 
              className={activeTab === 'boot' ? 'active' : ''}
              onClick={() => setActiveTab('boot')}
            >
              Boot Sequence
            </button>
            <button 
              className={activeTab === 'visual' ? 'active' : ''}
              onClick={() => setActiveTab('visual')}
            >
              Visual Effects
            </button>
            <button 
              className={activeTab === 'atmosphere' ? 'active' : ''}
              onClick={() => setActiveTab('atmosphere')}
            >
              Atmosphere
            </button>
            <button 
              className={activeTab === 'performance' ? 'active' : ''}
              onClick={() => setActiveTab('performance')}
            >
              Performance
            </button>
          </div>

          <div className="config-panel">
            {activeTab === 'boot' && (
              <div className="config-section">
                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tempConfig.enhancedBoot}
                      onChange={(e) => updateConfig('enhancedBoot', e.target.checked)}
                    />
                    Enhanced Boot Sequence
                  </label>
                </div>

                <div className="config-item">
                  <label>Boot Speed:</label>
                  <select
                    value={tempConfig.bootSpeed}
                    onChange={(e) => updateConfig('bootSpeed', e.target.value)}
                    disabled={!tempConfig.enhancedBoot}
                  >
                    <option value="instant">Instant</option>
                    <option value="fast">Fast</option>
                    <option value="normal">Normal</option>
                    <option value="slow">Slow</option>
                  </select>
                </div>

                <div className="config-item">
                  <label>Glitch Effects:</label>
                  <select
                    value={tempConfig.glitchIntensity}
                    onChange={(e) => updateConfig('glitchIntensity', e.target.value)}
                    disabled={!tempConfig.enhancedBoot}
                  >
                    <option value="off">Off</option>
                    <option value="subtle">Subtle</option>
                    <option value="medium">Medium</option>
                    <option value="heavy">Heavy</option>
                  </select>
                </div>

                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tempConfig.asciiLogo}
                      onChange={(e) => updateConfig('asciiLogo', e.target.checked)}
                      disabled={!tempConfig.enhancedBoot}
                    />
                    ASCII Logo Display
                  </label>
                </div>

                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tempConfig.strangeMessages}
                      onChange={(e) => updateConfig('strangeMessages', e.target.checked)}
                      disabled={!tempConfig.enhancedBoot}
                    />
                    Strange System Messages
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'visual' && (
              <div className="config-section">
                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tempConfig.screenFlicker}
                      onChange={(e) => updateConfig('screenFlicker', e.target.checked)}
                    />
                    Screen Flicker
                  </label>
                </div>

                <div className="config-item">
                  <label>Flicker Intensity:</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={tempConfig.flickerIntensity}
                    onChange={(e) => updateConfig('flickerIntensity', parseFloat(e.target.value))}
                    disabled={!tempConfig.screenFlicker}
                  />
                  <span>{(tempConfig.flickerIntensity * 100).toFixed(0)}%</span>
                </div>

                <div className="config-item">
                  <label>Scan Lines:</label>
                  <select
                    value={tempConfig.scanLines}
                    onChange={(e) => updateConfig('scanLines', e.target.value)}
                  >
                    <option value="off">Off</option>
                    <option value="subtle">Subtle</option>
                    <option value="heavy">Heavy</option>
                  </select>
                </div>

                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tempConfig.terminalBreathing}
                      onChange={(e) => updateConfig('terminalBreathing', e.target.checked)}
                    />
                    Terminal Breathing Effect
                  </label>
                </div>

                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tempConfig.visualArtifacts}
                      onChange={(e) => updateConfig('visualArtifacts', e.target.checked)}
                    />
                    Visual Artifacts
                  </label>
                </div>

                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tempConfig.progressiveClarity}
                      onChange={(e) => updateConfig('progressiveClarity', e.target.checked)}
                    />
                    Progressive Clarity on Boot
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'atmosphere' && (
              <div className="config-section">
                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tempConfig.crtGlow}
                      onChange={(e) => updateConfig('crtGlow', e.target.checked)}
                    />
                    CRT Phosphor Glow
                  </label>
                </div>

                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tempConfig.backgroundAnimation}
                      onChange={(e) => updateConfig('backgroundAnimation', e.target.checked)}
                    />
                    Background Animation
                  </label>
                </div>

                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tempConfig.colorShifts}
                      onChange={(e) => updateConfig('colorShifts', e.target.checked)}
                    />
                    Color Shift Effects
                  </label>
                </div>

                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tempConfig.staticOverlay}
                      onChange={(e) => updateConfig('staticOverlay', e.target.checked)}
                    />
                    Static Overlay
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="config-section">
                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tempConfig.reducedAnimations}
                      onChange={(e) => updateConfig('reducedAnimations', e.target.checked)}
                    />
                    Reduced Animations Mode
                  </label>
                </div>

                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tempConfig.highContrast}
                      onChange={(e) => updateConfig('highContrast', e.target.checked)}
                    />
                    High Contrast Mode
                  </label>
                </div>

                <div className="config-presets">
                  <h3>Quick Presets</h3>
                  <div className="preset-buttons">
                    <button onClick={() => setPreset('minimal')}>Minimal</button>
                    <button onClick={() => setPreset('balanced')}>Balanced</button>
                    <button onClick={() => setPreset('immersive')}>Immersive</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="config-footer">
          <button className="reset-button" onClick={handleReset}>Reset to Defaults</button>
          <div className="action-buttons">
            <button className="cancel-button" onClick={handleCancel}>Cancel</button>
            <button className="save-button" onClick={handleSave}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};