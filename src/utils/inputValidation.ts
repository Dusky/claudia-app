/**
 * Input validation utilities to prevent XSS and injection attacks across the application
 */

import { ContentSanitizer } from './contentSanitizer';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
  warnings: string[];
}

/**
 * Input validation rules
 */
export const ValidationRules = {
  // Maximum lengths for different input types
  MAX_LENGTHS: {
    TEXT_INPUT: 1000,
    TEXTAREA: 10000,
    NAME: 100,
    DESCRIPTION: 500,
    PROMPT: 50000,
    URL: 2000,
    API_KEY: 200
  },
  
  // Patterns for validation
  PATTERNS: {
    // Safe text - alphanumeric, spaces, common punctuation
    SAFE_TEXT: /^[a-zA-Z0-9\s\-_.,!?()[\]{}'"@#$%&*+=:;<>/\\~`|^]+$/,
    // Email pattern
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    // URL pattern (http, https, relative)
    URL: /^(https?:\/\/|\/|\.\/)[^\s<>"'{}|\\^`\[\]]*$/,
    // API key patterns
    ANTHROPIC_KEY: /^sk-ant-[a-zA-Z0-9_-]+$/,
    REPLICATE_KEY: /^r8_[a-zA-Z0-9]+$/,
    GOOGLE_KEY: /^AIza[a-zA-Z0-9_-]+$/,
    OPENAI_KEY: /^sk-[a-zA-Z0-9_-]+$/
  },
  
  // Dangerous patterns to block
  DANGEROUS_PATTERNS: [
    /<script[^>]*>/i,
    /<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
    /vbscript:/i,
    /data:\s*text\/html/i,
    /@import/i,
    /url\s*\(/i,
    /\bexec\b/i,
    /\bsystem\b/i,
    /\bcmd\b/i,
    /\bpowershell\b/i
  ]
} as const;

/**
 * Input validator class
 */
export class InputValidator {
  
  /**
   * Validate general text input
   */
  static validateText(input: string, maxLength: number = ValidationRules.MAX_LENGTHS.TEXT_INPUT): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = input || '';
    
    // Basic sanitization
    sanitizedValue = ContentSanitizer.sanitizeContent(sanitizedValue);
    
    // Length validation
    if (sanitizedValue.length > maxLength) {
      errors.push(`Input exceeds maximum length of ${maxLength} characters`);
      sanitizedValue = sanitizedValue.substring(0, maxLength);
      warnings.push('Input was truncated to maximum length');
    }
    
    // Check for dangerous patterns
    for (const pattern of ValidationRules.DANGEROUS_PATTERNS) {
      if (pattern.test(sanitizedValue)) {
        errors.push('Input contains potentially dangerous content');
        break;
      }
    }
    
    // Text content validation
    if (!ContentSanitizer.validateTextContent(sanitizedValue)) {
      errors.push('Input contains invalid characters');
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors,
      warnings
    };
  }
  
  /**
   * Validate name fields (usernames, personality names, etc.)
   */
  static validateName(name: string): ValidationResult {
    const result = this.validateText(name, ValidationRules.MAX_LENGTHS.NAME);
    
    // Additional name-specific validation
    if (result.sanitizedValue.trim().length === 0) {
      result.errors.push('Name cannot be empty');
      result.isValid = false;
    }
    
    // Check for reasonable name pattern
    if (result.sanitizedValue.length > 0 && !/^[a-zA-Z0-9\s\-_.']+$/.test(result.sanitizedValue)) {
      result.warnings.push('Name contains unusual characters');
    }
    
    return result;
  }
  
  /**
   * Validate URL inputs
   */
  static validateUrl(url: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = url?.trim() || '';
    
    // Length check
    if (sanitizedValue.length > ValidationRules.MAX_LENGTHS.URL) {
      errors.push('URL exceeds maximum length');
      sanitizedValue = sanitizedValue.substring(0, ValidationRules.MAX_LENGTHS.URL);
    }
    
    // URL pattern validation
    if (sanitizedValue && !ValidationRules.PATTERNS.URL.test(sanitizedValue)) {
      errors.push('Invalid URL format');
    }
    
    // Additional URL sanitization
    const cleanUrl = ContentSanitizer.sanitizeUrl(sanitizedValue);
    if (sanitizedValue && !cleanUrl) {
      errors.push('URL contains dangerous content');
      sanitizedValue = '';
    } else if (cleanUrl) {
      sanitizedValue = cleanUrl;
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors,
      warnings
    };
  }
  
  /**
   * Validate API key inputs
   */
  static validateApiKey(provider: string, apiKey: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = apiKey?.trim() || '';
    
    // Length check
    if (sanitizedValue.length > ValidationRules.MAX_LENGTHS.API_KEY) {
      errors.push('API key exceeds maximum length');
      sanitizedValue = '';
    }
    
    // Provider-specific validation (basic format check)
    if (sanitizedValue) {
      // Use the existing validation from ApiKeySecurity
      try {
        const { ApiKeySecurity } = require('../config/security');
        const validation = ApiKeySecurity.validateApiKey(provider, sanitizedValue);
        if (!validation.valid) {
          errors.push(validation.message || 'Invalid API key format');
        }
      } catch (error) {
        // Fallback validation if security module not available
        console.warn('API key validation fallback used');
      }
    }
    
    // Check for dangerous patterns in API key
    for (const pattern of ValidationRules.DANGEROUS_PATTERNS) {
      if (pattern.test(sanitizedValue)) {
        errors.push('API key contains invalid characters');
        sanitizedValue = '';
        break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors,
      warnings
    };
  }
  
  /**
   * Validate prompt/message content
   */
  static validatePrompt(prompt: string): ValidationResult {
    const result = this.validateText(prompt, ValidationRules.MAX_LENGTHS.PROMPT);
    
    // Additional prompt-specific checks
    if (result.sanitizedValue.trim().length === 0) {
      result.warnings.push('Prompt is empty');
    }
    
    // Check for extremely long lines that might cause display issues
    const lines = result.sanitizedValue.split('\n');
    const longLines = lines.filter(line => line.length > 1000);
    if (longLines.length > 0) {
      result.warnings.push('Prompt contains very long lines that may affect display');
    }
    
    return result;
  }
  
  /**
   * Validate configuration values
   */
  static validateConfigValue(key: string, value: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = value;
    
    // Type-specific validation
    if (typeof value === 'string') {
      const textResult = this.validateText(value, ValidationRules.MAX_LENGTHS.TEXT_INPUT);
      sanitizedValue = textResult.sanitizedValue;
      errors.push(...textResult.errors);
      warnings.push(...textResult.warnings);
    } else if (typeof value === 'number') {
      // Validate number ranges for known config keys
      if (key.includes('timeout') && (value < 1000 || value > 300000)) {
        errors.push('Timeout value must be between 1000ms and 300000ms');
      } else if (key.includes('limit') && (value < 1 || value > 1000)) {
        errors.push('Limit value must be between 1 and 1000');
      }
    } else if (typeof value === 'boolean') {
      // Boolean values are generally safe
    } else {
      errors.push('Unsupported configuration value type');
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors,
      warnings
    };
  }
  
  /**
   * Batch validate multiple inputs
   */
  static validateBatch(inputs: Array<{
    value: any;
    type: 'text' | 'name' | 'url' | 'apiKey' | 'prompt' | 'config';
    key?: string;
    provider?: string;
    maxLength?: number;
  }>): {
    isValid: boolean;
    results: ValidationResult[];
    sanitizedValues: any[];
  } {
    const results: ValidationResult[] = [];
    const sanitizedValues: any[] = [];
    
    for (const input of inputs) {
      let result: ValidationResult;
      
      switch (input.type) {
        case 'text':
          result = this.validateText(input.value, input.maxLength);
          break;
        case 'name':
          result = this.validateName(input.value);
          break;
        case 'url':
          result = this.validateUrl(input.value);
          break;
        case 'apiKey':
          result = this.validateApiKey(input.provider || '', input.value);
          break;
        case 'prompt':
          result = this.validatePrompt(input.value);
          break;
        case 'config':
          result = this.validateConfigValue(input.key || '', input.value);
          break;
        default:
          result = {
            isValid: false,
            sanitizedValue: input.value,
            errors: ['Unknown validation type'],
            warnings: []
          };
      }
      
      results.push(result);
      sanitizedValues.push(result.sanitizedValue);
    }
    
    const isValid = results.every(result => result.isValid);
    
    return {
      isValid,
      results,
      sanitizedValues
    };
  }
}

/**
 * React hook for input validation
 */
export const useInputValidation = () => {
  return {
    validateText: InputValidator.validateText,
    validateName: InputValidator.validateName,
    validateUrl: InputValidator.validateUrl,
    validateApiKey: InputValidator.validateApiKey,
    validatePrompt: InputValidator.validatePrompt,
    validateConfigValue: InputValidator.validateConfigValue,
    validateBatch: InputValidator.validateBatch
  };
};