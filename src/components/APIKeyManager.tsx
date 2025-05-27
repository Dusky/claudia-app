import React, { useState, useEffect } from 'react';
import { SecureStorage, ApiKeySecurity } from '../config/security';

interface APIKeyManagerProps {
  theme: {
    colors: {
      background: string;
      foreground: string;
      accent?: string;
    };
  };
}

interface APIKeyState {
  anthropic: string;
  google: string;
  googleImage: string;
  openai: string;
  replicate: string;
}

interface APIKeyStatus {
  [key: string]: {
    configured: boolean;
    masked: string;
    valid: boolean;
    message?: string;
  };
}

export const APIKeyManager: React.FC<APIKeyManagerProps> = ({ theme }) => {
  const [apiKeys, setApiKeys] = useState<APIKeyState>({
    anthropic: '',
    google: '',
    googleImage: '',
    openai: '',
    replicate: ''
  });
  
  const [keyStatus, setKeyStatus] = useState<APIKeyStatus>({});
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const providers = [
    { id: 'anthropic', name: 'Anthropic Claude', placeholder: 'sk-ant-api03-...' },
    { id: 'google', name: 'Google Gemini', placeholder: 'AIza...' },
    { id: 'googleImage', name: 'Google AI Image', placeholder: 'AIza...' },
    { id: 'openai', name: 'OpenAI', placeholder: 'sk-proj-...' },
    { id: 'replicate', name: 'Replicate', placeholder: 'r8_...' }
  ];

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = () => {
    const status: APIKeyStatus = {};
    const keys: APIKeyState = {
      anthropic: '',
      google: '',
      googleImage: '',
      openai: '',
      replicate: ''
    };

    providers.forEach(provider => {
      const key = SecureStorage.getApiKey(provider.id);
      if (key) {
        keys[provider.id as keyof APIKeyState] = key;
        const validation = ApiKeySecurity.validateApiKey(provider.id, key);
        status[provider.id] = {
          configured: true,
          masked: ApiKeySecurity.maskApiKey(key),
          valid: validation.valid,
          message: validation.message
        };
      } else {
        status[provider.id] = {
          configured: false,
          masked: '',
          valid: false
        };
      }
    });

    setApiKeys(keys);
    setKeyStatus(status);
  };

  const updateAPIKey = (provider: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
    setHasChanges(true);
    setError('');
    setSuccess('');

    // Validate the key in real-time
    if (value.trim()) {
      const validation = ApiKeySecurity.validateApiKey(provider, value);
      setKeyStatus(prev => ({
        ...prev,
        [provider]: {
          configured: !!value.trim(),
          masked: ApiKeySecurity.maskApiKey(value),
          valid: validation.valid,
          message: validation.message
        }
      }));
    } else {
      setKeyStatus(prev => ({
        ...prev,
        [provider]: {
          configured: false,
          masked: '',
          valid: false
        }
      }));
    }
  };

  const saveAPIKeys = () => {
    try {
      let savedCount = 0;
      let removedCount = 0;

      providers.forEach(provider => {
        const key = apiKeys[provider.id as keyof APIKeyState];
        if (key.trim()) {
          SecureStorage.setApiKey(provider.id, key.trim());
          savedCount++;
        } else {
          SecureStorage.removeApiKey(provider.id);
          removedCount++;
        }
      });

      setHasChanges(false);
      setSuccess(`Successfully updated ${savedCount} API keys${removedCount > 0 ? ` and removed ${removedCount}` : ''}.`);
      
      // Reload status to reflect changes
      loadAPIKeys();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to save API keys:', error);
      setError('Failed to save API keys. Please try again.');
    }
  };

  const clearAPIKey = (provider: string) => {
    if (confirm(`Are you sure you want to remove the ${providers.find(p => p.id === provider)?.name} API key?`)) {
      updateAPIKey(provider, '');
      SecureStorage.removeApiKey(provider);
      loadAPIKeys();
    }
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const runSecurityAudit = () => {
    const auditResults = ApiKeySecurity.auditApiKeyExposure();
    if (auditResults.exposed.length > 0) {
      setError(`Security Alert: ${auditResults.exposed.length} API keys may be exposed! ${auditResults.recommendations.join(' ')}`);
    } else {
      setSuccess('Security audit passed - no exposed API keys detected.');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3>API Keys</h3>
        <button
          onClick={runSecurityAudit}
          style={{
            padding: '4px 8px',
            fontSize: '0.8rem',
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            color: '#ffc107',
            cursor: 'pointer'
          }}
        >
          🔒 Security Audit
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div style={{
          background: 'rgba(244, 67, 54, 0.1)',
          border: '1px solid #f44336',
          borderRadius: '4px',
          padding: '8px 12px',
          marginBottom: '16px',
          color: '#f44336',
          fontSize: '0.9rem'
        }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid #4caf50',
          borderRadius: '4px',
          padding: '8px 12px',
          marginBottom: '16px',
          color: '#4caf50',
          fontSize: '0.9rem'
        }}>
          ✅ {success}
        </div>
      )}

      {/* API Key Inputs */}
      {providers.map(provider => (
        <div key={provider.id} style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
              {provider.name}
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {keyStatus[provider.id]?.configured && (
                <>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: keyStatus[provider.id].valid ? '#4caf50' : '#f44336' 
                  }}>
                    {keyStatus[provider.id].valid ? '✅' : '❌'}
                  </span>
                  <button
                    onClick={() => toggleShowKey(provider.id)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      background: 'none',
                      border: '1px solid',
                      borderColor: theme.colors.foreground,
                      borderRadius: '3px',
                      color: theme.colors.foreground,
                      cursor: 'pointer'
                    }}
                  >
                    {showKeys[provider.id] ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => clearAPIKey(provider.id)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      background: 'rgba(244, 67, 54, 0.1)',
                      border: '1px solid #f44336',
                      borderRadius: '3px',
                      color: '#f44336',
                      cursor: 'pointer'
                    }}
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>
          
          <input
            type={showKeys[provider.id] ? 'text' : 'password'}
            value={apiKeys[provider.id as keyof APIKeyState]}
            onChange={(e) => updateAPIKey(provider.id, e.target.value)}
            placeholder={provider.placeholder}
            style={{
              width: '100%',
              padding: '8px',
              border: `1px solid ${keyStatus[provider.id]?.valid === false && apiKeys[provider.id as keyof APIKeyState] ? '#f44336' : theme.colors.foreground}`,
              borderRadius: '4px',
              background: theme.colors.background,
              color: theme.colors.foreground,
              fontSize: '0.9rem',
              fontFamily: 'monospace'
            }}
          />
          
          {/* Key Status */}
          {keyStatus[provider.id] && (
            <div style={{ marginTop: '4px', fontSize: '0.8rem' }}>
              {keyStatus[provider.id].configured && (
                <div style={{ color: keyStatus[provider.id].valid ? '#4caf50' : '#f44336' }}>
                  {keyStatus[provider.id].valid ? 
                    `✅ Valid key: ${keyStatus[provider.id].masked}` : 
                    `❌ ${keyStatus[provider.id].message || 'Invalid key format'}`
                  }
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Save Button */}
      {hasChanges && (
        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <button
            onClick={saveAPIKeys}
            style={{
              padding: '8px 16px',
              background: theme.colors.accent || '#007bff',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Save API Keys
          </button>
        </div>
      )}

      {/* Security Notice */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(255, 193, 7, 0.1)',
        border: '1px solid #ffc107',
        borderRadius: '4px',
        fontSize: '0.8rem',
        color: '#ffc107'
      }}>
        🔒 <strong>Security Notice:</strong> API keys are encrypted and stored locally in your browser. 
        For production deployments, consider using environment variables or a secure backend proxy.
      </div>
    </div>
  );
};