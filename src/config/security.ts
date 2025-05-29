/**
 * Security utilities for handling API keys and sensitive configuration
 * 
 * IMPORTANT: This is a temporary client-side solution. For production deployment,
 * API keys should be moved to a secure backend proxy service.
 */

interface SecureStorageOptions {
  encrypt?: boolean;
  expirationMs?: number;
}

/**
 * Simple encryption for localStorage (not cryptographically secure, just obfuscation)
 */
class ClientSideEncryption {
  private static readonly KEY = 'claudia-app-key';
  
  static encrypt(text: string): string {
    // Simple XOR cipher for basic obfuscation
    const key = ClientSideEncryption.KEY;
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
  }
  
  static decrypt(encryptedText: string): string {
    try {
      const text = atob(encryptedText);
      const key = ClientSideEncryption.KEY;
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch {
      return '';
    }
  }
}

/**
 * Secure storage wrapper for sensitive data
 */
export class SecureStorage {
  private static readonly PREFIX = 'claudia_secure_';
  
  static set(key: string, value: string, options: SecureStorageOptions = {}): void {
    const data = {
      value: options.encrypt ? ClientSideEncryption.encrypt(value) : value,
      encrypted: !!options.encrypt,
      timestamp: Date.now(),
      expirationMs: options.expirationMs
    };
    
    localStorage.setItem(
      SecureStorage.PREFIX + key, 
      JSON.stringify(data)
    );
  }
  
  static get(key: string): string | null {
    try {
      const stored = localStorage.getItem(SecureStorage.PREFIX + key);
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      
      // Check expiration
      if (data.expirationMs && (Date.now() - data.timestamp) > data.expirationMs) {
        SecureStorage.remove(key);
        return null;
      }
      
      return data.encrypted ? ClientSideEncryption.decrypt(data.value) : data.value;
    } catch {
      return null;
    }
  }
  
  static remove(key: string): void {
    localStorage.removeItem(SecureStorage.PREFIX + key);
  }
  
  static clear(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith(SecureStorage.PREFIX))
      .forEach(key => localStorage.removeItem(key));
  }
  
  /**
   * Store an API key securely (encrypted)
   */
  static setApiKey(provider: string, apiKey: string): void {
    SecureStorage.set(`api_${provider}`, apiKey, { encrypt: true });
  }
  
  /**
   * Retrieve an API key
   */
  static getApiKey(provider: string): string | null {
    return SecureStorage.get(`api_${provider}`);
  }
  
  /**
   * Remove an API key
   */
  static removeApiKey(provider: string): void {
    SecureStorage.remove(`api_${provider}`);
  }
  
  /**
   * Clear all stored API keys
   */
  static clearAllApiKeys(): void {
    const providers = ['anthropic', 'google', 'google-image', 'openai', 'replicate'];
    providers.forEach(provider => SecureStorage.removeApiKey(provider));
  }
}

/**
 * API Key security manager
 */
export class ApiKeySecurity {
  private static readonly WARNING_SHOWN_KEY = 'api_key_warning_shown';
  
  /**
   * Validate API key format for each provider
   */
  static validateApiKey(provider: string, apiKey: string): { valid: boolean; message?: string } {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, message: 'API key is empty' };
    }
    
    switch (provider) {
      case 'anthropic':
        if (!apiKey.startsWith('sk-ant-')) {
          return { valid: false, message: 'Invalid Anthropic API key format' };
        }
        break;
      case 'replicate':
        if (!apiKey.startsWith('r8_')) {
          return { valid: false, message: 'Invalid Replicate API token format' };
        }
        break;
      case 'google':
      case 'google-image':
        if (apiKey.length < 30 || !apiKey.startsWith('AIza')) {
          return { valid: false, message: 'Invalid Google API key format' };
        }
        break;
      case 'openai':
        if (!apiKey.startsWith('sk-')) {
          return { valid: false, message: 'Invalid OpenAI API key format' };
        }
        break;
    }
    
    return { valid: true };
  }
  
  /**
   * Check if running in development mode and show security warning
   */
  static checkEnvironmentSecurity(): void {
    const isDev = import.meta.env.DEV;
    const warningShown = localStorage.getItem(ApiKeySecurity.WARNING_SHOWN_KEY);
    
    if (isDev && !warningShown) {
      console.warn(
        '🚨 SECURITY WARNING: You are running in development mode with API keys exposed in the client.\n' +
        'For production deployment, implement a backend proxy service to secure API keys.\n' +
        'See docs/SECURITY.md for implementation guidance.'
      );
      localStorage.setItem(ApiKeySecurity.WARNING_SHOWN_KEY, 'true');
    }
  }
  
  /**
   * Mask API key for logging (show only first 8 and last 4 characters)
   */
  static maskApiKey(apiKey: string): string {
    if (apiKey.length <= 12) return '***';
    return apiKey.substring(0, 8) + '***' + apiKey.substring(apiKey.length - 4);
  }
  
  /**
   * Check for potentially exposed API keys in client bundle
   */
  static auditApiKeyExposure(): { exposed: string[]; recommendations: string[] } {
    const exposed: string[] = [];
    const recommendations: string[] = [];
    
    // Check if API keys exist in environment
    const envKeys = [
      { key: 'VITE_ANTHROPIC_API_KEY', provider: 'Anthropic' },
      { key: 'VITE_REPLICATE_API_TOKEN', provider: 'Replicate' },
      { key: 'VITE_GOOGLE_API_KEY', provider: 'Google' },
      { key: 'VITE_OPENAI_API_KEY', provider: 'OpenAI' }
    ];
    
    envKeys.forEach(({ key, provider }) => {
      if (import.meta.env[key]) {
        exposed.push(`${provider} API key exposed in client bundle`);
      }
    });
    
    if (exposed.length > 0) {
      recommendations.push('Move API keys to a secure backend proxy service');
      recommendations.push('Use environment variables only for development');
      recommendations.push('Implement authentication tokens instead of direct API keys');
    }
    
    return { exposed, recommendations };
  }
}

/**
 * Production-ready backend proxy configuration
 */
export const BACKEND_PROXY_CONFIG = {
  // Example configuration for backend proxy endpoints
  endpoints: {
    anthropic: '/api/proxy/anthropic',
    replicate: '/api/proxy/replicate', 
    google: '/api/proxy/google',
    openai: '/api/proxy/openai'
  },
  
  // Authentication configuration
  auth: {
    tokenKey: 'claudia_auth_token',
    refreshEndpoint: '/api/auth/refresh',
    loginEndpoint: '/api/auth/login'
  },
  
  // Security headers
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
};

// Initialize security checks
ApiKeySecurity.checkEnvironmentSecurity();