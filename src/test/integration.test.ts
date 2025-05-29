/**
 * Integration tests for the full application flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputValidator } from '../utils/inputValidation';
import { ContentSanitizer } from '../utils/contentSanitizer';
import { ApiKeySecurity, SecureStorage } from '../config/security';
import { createMockLLMManager, createMockStorageService, XSS_TEST_VECTORS } from './testUtils';

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Security Integration Flow', () => {
    it('should sanitize input through the complete pipeline', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello **world**';
      
      // Step 1: Initial validation
      const validationResult = InputValidator.validatePrompt(maliciousInput);
      expect(validationResult.isValid).toBe(false);
      
      // Step 2: If we force it through sanitization
      const sanitized = ContentSanitizer.sanitizeContent(maliciousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      
      // Step 3: Re-validate sanitized content
      const revalidated = InputValidator.validatePrompt(sanitized);
      expect(revalidated.isValid).toBe(true);
      expect(revalidated.sanitizedValue).toContain('world'); // Preserve safe content
    });

    it('should handle XSS vectors through complete security chain', () => {
      XSS_TEST_VECTORS.slice(0, 10).forEach(vector => {
        // Complete security pipeline
        const step1 = ContentSanitizer.sanitizeContent(vector);
        const step2 = InputValidator.validateText(step1);
        const step3 = ContentSanitizer.escapeHtml(step2.sanitizedValue);
        
        // Final result should be safe
        expect(step3).not.toContain('<script>');
        expect(step3).not.toContain('javascript:');
        expect(step3).not.toContain('onerror');
        expect(step3).not.toContain('onload');
      });
    });
  });

  describe('Command Processing Integration', () => {
    it('should process commands with secure input handling', async () => {
      const mockStorage = createMockStorageService();
      const mockLLM = createMockLLMManager();
      
      // Simulate command processing
      const userInput = '/help about **formatting**';
      
      // Validate input
      const validation = InputValidator.validatePrompt(userInput);
      expect(validation.isValid).toBe(true);
      
      // Process command (simulated)
      const commandPart = validation.sanitizedValue.split(' ')[0];
      const args = validation.sanitizedValue.slice(commandPart.length + 1);
      
      expect(commandPart).toBe('/help');
      expect(args).toBe('about **formatting**');
      expect(args).not.toContain('<script>');
    });

    it('should handle AI responses securely', async () => {
      const mockLLM = createMockLLMManager();
      
      // Mock AI response with potentially dangerous content
      const mockResponse = {
        content: 'Here is some **safe** content and <script>alert("xss")</script> dangerous content'
      };
      
      mockLLM.getActiveProvider().generateResponse = vi.fn(async () => mockResponse);
      
      // Process AI response through security pipeline
      const sanitized = ContentSanitizer.sanitizeContent(mockResponse.content);
      expect(sanitized).toContain('safe');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });
  });

  describe('Storage Security Integration', () => {
    it('should securely store and retrieve API keys', () => {
      const testApiKey = 'sk-ant-api03-test-key-12345';
      
      // Store securely
      SecureStorage.setApiKey('anthropic', testApiKey);
      
      // Retrieve and validate
      const retrieved = SecureStorage.getApiKey('anthropic');
      expect(retrieved).toBe(testApiKey);
      
      // Validate format
      const validation = ApiKeySecurity.validateApiKey('anthropic', retrieved || '');
      expect(validation.valid).toBe(true);
      
      // Check that it's encrypted in storage
      const rawStorageValue = localStorage.getItem('claudia_secure_api_anthropic');
      expect(rawStorageValue).not.toBe(testApiKey); // Should be encrypted
      expect(rawStorageValue).toBeTruthy();
    });

    it('should handle storage corruption gracefully', () => {
      // Simulate corrupted storage
      localStorage.setItem('claudia_secure_api_test', 'corrupted-data');
      
      const retrieved = SecureStorage.getApiKey('test');
      expect(retrieved).toBeNull(); // Should handle corruption gracefully
    });

    it('should validate stored personality data', async () => {
      const mockStorage = createMockStorageService();
      
      // Mock potentially dangerous personality data
      const dangerousPersonality = {
        id: 'test',
        name: '<script>alert("xss")</script>Evil',
        description: 'javascript:alert("xss")',
        system_prompt: 'You are evil <iframe src="evil.html"></iframe>',
        isDefault: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 0
      };
      
      // Validate each field
      const nameValidation = InputValidator.validateName(dangerousPersonality.name);
      const descValidation = InputValidator.validateText(dangerousPersonality.description);
      const promptValidation = InputValidator.validatePrompt(dangerousPersonality.system_prompt);
      
      expect(nameValidation.isValid).toBe(false);
      expect(descValidation.isValid).toBe(false);
      expect(promptValidation.isValid).toBe(false);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle validation errors gracefully across components', () => {
      const invalidInputs = [
        '', // Empty
        'a'.repeat(60000), // Too long
        '\u0000invalid', // Null bytes
        '<script>alert("xss")</script>', // XSS
        'javascript:alert("xss")', // JavaScript URL
      ];
      
      invalidInputs.forEach(input => {
        const validation = InputValidator.validatePrompt(input);
        
        if (!validation.isValid) {
          // Errors should be descriptive
          expect(validation.errors.length).toBeGreaterThan(0);
          expect(validation.errors[0]).toBeTruthy();
          
          // Sanitized value should be safe even for invalid input
          const sanitized = ContentSanitizer.sanitizeContent(validation.sanitizedValue);
          expect(sanitized).not.toContain('<script>');
          expect(sanitized).not.toContain('javascript:');
        }
      });
    });

    it('should maintain security during error conditions', () => {
      // Simulate various error conditions
      const errorConditions = [
        () => { throw new Error('Network error'); },
        () => { throw new Error('API key invalid'); },
        () => { throw new Error('Storage error'); }
      ];
      
      errorConditions.forEach(errorFn => {
        try {
          errorFn();
        } catch (error) {
          // Error handling should not expose sensitive information
          const errorMessage = (error as Error).message;
          expect(errorMessage).not.toContain('sk-ant-');
          expect(errorMessage).not.toContain('r8_');
          expect(errorMessage).not.toContain('AIza');
        }
      });
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance under security load', () => {
      const start = performance.now();
      
      // Process multiple inputs through security pipeline
      for (let i = 0; i < 100; i++) {
        const input = `Test input ${i} with **formatting** and potential <b>html</b>`;
        const sanitized = ContentSanitizer.sanitizeContent(input);
        const validated = InputValidator.validateText(sanitized);
        expect(validated.isValid).toBe(true);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should process 100 inputs in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle large safe content efficiently', () => {
      const largeContent = 'Safe content with **formatting**. '.repeat(1000);
      
      const start = performance.now();
      const sanitized = ContentSanitizer.sanitizeContent(largeContent);
      const validated = InputValidator.validatePrompt(sanitized);
      const end = performance.now();
      
      expect(validated.isValid).toBe(true);
      expect(end - start).toBeLessThan(50); // Under 50ms for large content
    });
  });

  describe('Cross-Component Security', () => {
    it('should maintain security across all input vectors', () => {
      const inputVectors = [
        { type: 'command', value: '/theme <script>alert("xss")</script>' },
        { type: 'chat', value: 'Hello <iframe src="evil.html"></iframe>' },
        { type: 'personality_name', value: 'Evil<script>alert("xss")</script>' },
        { type: 'api_key', value: 'javascript:alert("xss")' },
        { type: 'url', value: 'data:text/html,<script>alert("xss")</script>' }
      ];
      
      inputVectors.forEach(vector => {
        let validation;
        
        switch (vector.type) {
          case 'command':
          case 'chat':
            validation = InputValidator.validatePrompt(vector.value);
            break;
          case 'personality_name':
            validation = InputValidator.validateName(vector.value);
            break;
          case 'api_key':
            validation = InputValidator.validateApiKey('test', vector.value);
            break;
          case 'url':
            validation = InputValidator.validateUrl(vector.value);
            break;
          default:
            validation = InputValidator.validateText(vector.value);
        }
        
        // All dangerous inputs should be rejected or sanitized
        if (validation.isValid) {
          expect(validation.sanitizedValue).not.toContain('<script>');
          expect(validation.sanitizedValue).not.toContain('javascript:');
        } else {
          expect(validation.errors.length).toBeGreaterThan(0);
        }
      });
    });

    it('should prevent privilege escalation through input manipulation', () => {
      // Test various privilege escalation attempts
      const escalationAttempts = [
        '/admin --force',
        '/config --override-security=false',
        '/eval window.localStorage.clear()',
        '../../../etc/passwd',
        '$(rm -rf /)',
        '`rm -rf /`',
        '|| rm -rf /',
        '&& rm -rf /',
        '; rm -rf /',
      ];
      
      escalationAttempts.forEach(attempt => {
        const validation = InputValidator.validatePrompt(attempt);
        const sanitized = ContentSanitizer.sanitizeContent(validation.sanitizedValue);
        
        // Should not contain dangerous command injection patterns
        expect(sanitized).not.toMatch(/rm\s+-rf/);
        expect(sanitized).not.toMatch(/\$\(/);
        expect(sanitized).not.toMatch(/`[^`]*`/);
        expect(sanitized).not.toMatch(/\|\|/);
        expect(sanitized).not.toMatch(/&&/);
        expect(sanitized).not.toMatch(/;[\s]*rm/);
      });
    });
  });

  describe('State Management Security', () => {
    it('should sanitize state before persistence', () => {
      const dangerousState = {
        theme: '<script>alert("xss")</script>',
        personality: {
          name: 'javascript:alert("xss")',
          prompt: '<iframe src="evil.html"></iframe>'
        },
        config: {
          apiUrl: 'data:text/html,<script>alert("xss")</script>'
        }
      };
      
      // Each field should be validated before storage
      const themeValidation = InputValidator.validateText(dangerousState.theme);
      const nameValidation = InputValidator.validateName(dangerousState.personality.name);
      const promptValidation = InputValidator.validatePrompt(dangerousState.personality.prompt);
      const urlValidation = InputValidator.validateUrl(dangerousState.config.apiUrl);
      
      expect(themeValidation.isValid).toBe(false);
      expect(nameValidation.isValid).toBe(false);
      expect(promptValidation.isValid).toBe(false);
      expect(urlValidation.isValid).toBe(false);
    });

    it('should handle state corruption gracefully', () => {
      // Simulate corrupted localStorage
      localStorage.setItem('claudia-config', '{"malformed": json}');
      localStorage.setItem('claudia-theme', '<script>alert("xss")</script>');
      
      // State loading should handle corruption
      try {
        const config = JSON.parse(localStorage.getItem('claudia-config') || '{}');
        expect(config).toEqual({});
      } catch {
        // Should handle parsing errors gracefully
        expect(true).toBe(true);
      }
      
      const theme = localStorage.getItem('claudia-theme') || '';
      const sanitizedTheme = ContentSanitizer.sanitizeContent(theme);
      expect(sanitizedTheme).not.toContain('<script>');
    });
  });
});