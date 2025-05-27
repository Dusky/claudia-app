/**
 * Security tests for XSS and injection attack prevention
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContentSanitizer, isContentSafe } from '../utils/contentSanitizer';
import { InputValidator } from '../utils/inputValidation';
import { ApiKeySecurity } from '../config/security';
import { XSS_TEST_VECTORS, SQL_INJECTION_TEST_VECTORS } from './testUtils';

describe('Security Tests', () => {
  describe('ContentSanitizer', () => {
    describe('HTML Sanitization', () => {
      it('should escape HTML entities', () => {
        const maliciousInput = '<script>alert("xss")</script>';
        const escaped = ContentSanitizer.escapeHtml(maliciousInput);
        expect(escaped).not.toContain('<script>');
        expect(escaped).toContain('&lt;script&gt;');
      });

      it('should sanitize dangerous HTML tags', () => {
        const maliciousContent = '<script>alert("xss")</script><iframe src="javascript:alert()"></iframe>';
        const sanitized = ContentSanitizer.sanitizeContent(maliciousContent);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('<iframe>');
        expect(sanitized).not.toContain('javascript:');
      });

      it('should remove event handlers', () => {
        const maliciousContent = '<div onclick="alert(\'xss\')" onload="evil()">content</div>';
        const sanitized = ContentSanitizer.sanitizeContent(maliciousContent);
        expect(sanitized).not.toContain('onclick');
        expect(sanitized).not.toContain('onload');
      });

      it('should remove style blocks and dangerous CSS', () => {
        const maliciousContent = '<style>@import "javascript:alert(\'xss\')"</style>';
        const sanitized = ContentSanitizer.sanitizeContent(maliciousContent);
        expect(sanitized).not.toContain('<style>');
        expect(sanitized).not.toContain('@import');
        expect(sanitized).not.toContain('javascript:');
      });

      it('should validate HTML tag structure', () => {
        const { isAllowed, sanitizedAttributes } = ContentSanitizer.sanitizeHtmlTag('script', {});
        expect(isAllowed).toBe(false);

        const validTag = ContentSanitizer.sanitizeHtmlTag('b', {});
        expect(validTag.isAllowed).toBe(true);
      });
    });

    describe('CSS Sanitization', () => {
      it('should sanitize CSS values', () => {
        const maliciousValue = 'expression(alert("xss"))';
        const sanitized = ContentSanitizer.sanitizeCssValue('color', maliciousValue);
        expect(sanitized).toBeNull();
      });

      it('should allow safe CSS colors', () => {
        const safeColor = '#ff0000';
        const sanitized = ContentSanitizer.sanitizeCssValue('color', safeColor);
        expect(sanitized).toBe(safeColor);
      });

      it('should block dangerous CSS properties', () => {
        const maliciousProperty = 'behavior';
        const sanitized = ContentSanitizer.sanitizeCssValue(maliciousProperty, 'url(evil.htc)');
        expect(sanitized).toBeNull();
      });

      it('should sanitize CSS class names', () => {
        const validClass = ContentSanitizer.sanitizeCssClass('color-red');
        expect(validClass).toBe('color-red');

        const invalidClass = ContentSanitizer.sanitizeCssClass('javascript:alert()');
        expect(invalidClass).toBeNull();
      });
    });

    describe('URL Sanitization', () => {
      it('should block javascript: URLs', () => {
        const maliciousUrl = 'javascript:alert("xss")';
        const sanitized = ContentSanitizer.sanitizeUrl(maliciousUrl);
        expect(sanitized).toBeNull();
      });

      it('should block data: URLs with HTML', () => {
        const maliciousUrl = 'data:text/html,<script>alert("xss")</script>';
        const sanitized = ContentSanitizer.sanitizeUrl(maliciousUrl);
        expect(sanitized).toBeNull();
      });

      it('should allow safe URLs', () => {
        const safeUrls = [
          'https://example.com',
          'http://localhost:3000',
          '/relative/path',
          './relative/path',
          '#anchor'
        ];

        safeUrls.forEach(url => {
          const sanitized = ContentSanitizer.sanitizeUrl(url);
          expect(sanitized).toBe(url);
        });
      });
    });

    describe('Text Content Validation', () => {
      it('should detect dangerous Unicode characters', () => {
        const maliciousText = 'normal\u0000text'; // Null byte
        const isValid = ContentSanitizer.validateTextContent(maliciousText);
        expect(isValid).toBe(false);
      });

      it('should detect excessive repetition', () => {
        const maliciousText = 'a'.repeat(2000);
        const isValid = ContentSanitizer.validateTextContent(maliciousText);
        expect(isValid).toBe(false);
      });

      it('should allow normal text', () => {
        const normalText = 'This is normal text with 123 numbers and punctuation!';
        const isValid = ContentSanitizer.validateTextContent(normalText);
        expect(isValid).toBe(true);
      });
    });
  });

  describe('XSS Prevention', () => {
    it('should detect and block all XSS vectors', () => {
      XSS_TEST_VECTORS.forEach(vector => {
        const isSafe = isContentSafe(vector);
        expect(isSafe).toBe(false, `XSS vector should be blocked: ${vector}`);
      });
    });

    it('should sanitize XSS vectors safely', () => {
      XSS_TEST_VECTORS.forEach(vector => {
        const sanitized = ContentSanitizer.sanitizeContent(vector);
        const stillUnsafe = isContentSafe(sanitized);
        expect(stillUnsafe).toBe(true, `Sanitized content should be safe: ${vector} -> ${sanitized}`);
      });
    });
  });

  describe('Input Validation', () => {
    describe('Text Validation', () => {
      it('should validate normal text', () => {
        const result = InputValidator.validateText('Normal text input');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject text exceeding length limits', () => {
        const longText = 'a'.repeat(2000);
        const result = InputValidator.validateText(longText, 100);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Input exceeds maximum length of 100 characters');
      });

      it('should detect dangerous patterns', () => {
        const maliciousText = '<script>alert("xss")</script>';
        const result = InputValidator.validateText(maliciousText);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('dangerous content'))).toBe(true);
      });
    });

    describe('Name Validation', () => {
      it('should validate normal names', () => {
        const result = InputValidator.validateName('John Doe');
        expect(result.isValid).toBe(true);
      });

      it('should reject empty names', () => {
        const result = InputValidator.validateName('');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Name cannot be empty');
      });

      it('should warn about unusual characters', () => {
        const result = InputValidator.validateName('Name<script>');
        expect(result.isValid).toBe(false); // Should be invalid due to dangerous content
      });
    });

    describe('URL Validation', () => {
      it('should validate safe URLs', () => {
        const safeUrls = [
          'https://example.com',
          'http://localhost:3000',
          '/api/endpoint'
        ];

        safeUrls.forEach(url => {
          const result = InputValidator.validateUrl(url);
          expect(result.isValid).toBe(true, `URL should be valid: ${url}`);
        });
      });

      it('should reject dangerous URLs', () => {
        const dangerousUrls = [
          'javascript:alert("xss")',
          'data:text/html,<script>alert("xss")</script>',
          'vbscript:msgbox("xss")'
        ];

        dangerousUrls.forEach(url => {
          const result = InputValidator.validateUrl(url);
          expect(result.isValid).toBe(false, `URL should be invalid: ${url}`);
        });
      });
    });

    describe('Prompt Validation', () => {
      it('should validate normal prompts', () => {
        const result = InputValidator.validatePrompt('Tell me about the weather');
        expect(result.isValid).toBe(true);
      });

      it('should handle very long prompts', () => {
        const longPrompt = 'a'.repeat(60000);
        const result = InputValidator.validatePrompt(longPrompt);
        expect(result.isValid).toBe(false);
      });

      it('should warn about long lines', () => {
        const promptWithLongLine = 'a'.repeat(1500);
        const result = InputValidator.validatePrompt(promptWithLongLine);
        expect(result.warnings.some(warning => warning.includes('long lines'))).toBe(true);
      });
    });

    describe('Batch Validation', () => {
      it('should validate multiple inputs', () => {
        const inputs = [
          { value: 'John', type: 'name' as const },
          { value: 'https://example.com', type: 'url' as const },
          { value: 'Normal text', type: 'text' as const }
        ];

        const result = InputValidator.validateBatch(inputs);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValues).toHaveLength(3);
      });

      it('should fail if any input is invalid', () => {
        const inputs = [
          { value: 'John', type: 'name' as const },
          { value: 'javascript:alert("xss")', type: 'url' as const },
          { value: 'Normal text', type: 'text' as const }
        ];

        const result = InputValidator.validateBatch(inputs);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('API Key Security', () => {
    describe('API Key Validation', () => {
      it('should validate correct API key formats', () => {
        const testCases = [
          { provider: 'anthropic', key: 'sk-ant-api03-test123', shouldBeValid: true },
          { provider: 'replicate', key: 'r8_test123', shouldBeValid: true },
          { provider: 'google', key: 'AIzaSyTest123456789012345678901234567890', shouldBeValid: true },
          { provider: 'openai', key: 'sk-proj-test123', shouldBeValid: true }
        ];

        testCases.forEach(({ provider, key, shouldBeValid }) => {
          const result = ApiKeySecurity.validateApiKey(provider, key);
          expect(result.valid).toBe(shouldBeValid, `${provider} key validation failed: ${key}`);
        });
      });

      it('should reject invalid API key formats', () => {
        const testCases = [
          { provider: 'anthropic', key: 'invalid-key' },
          { provider: 'replicate', key: 'not-r8-token' },
          { provider: 'google', key: 'short-key' },
          { provider: 'openai', key: 'invalid-openai-key' }
        ];

        testCases.forEach(({ provider, key }) => {
          const result = ApiKeySecurity.validateApiKey(provider, key);
          expect(result.valid).toBe(false, `Invalid ${provider} key should be rejected: ${key}`);
        });
      });

      it('should mask API keys for logging', () => {
        const apiKey = 'sk-ant-api03-very-long-api-key-here-1234567890';
        const masked = ApiKeySecurity.maskApiKey(apiKey);
        expect(masked).toBe('sk-ant-a***7890');
        expect(masked).not.toContain('very-long-api-key-here');
      });

      it('should audit API key exposure', () => {
        const auditResults = ApiKeySecurity.auditApiKeyExposure();
        expect(auditResults).toHaveProperty('exposed');
        expect(auditResults).toHaveProperty('recommendations');
        expect(Array.isArray(auditResults.exposed)).toBe(true);
        expect(Array.isArray(auditResults.recommendations)).toBe(true);
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should test SQL injection vectors (simulation)', () => {
      // Since we don't have direct database access in tests,
      // we simulate testing the sanitization of SQL injection attempts
      SQL_INJECTION_TEST_VECTORS.forEach(vector => {
        const sanitized = ContentSanitizer.sanitizeContent(vector);
        
        // Ensure dangerous SQL keywords are removed or escaped
        expect(sanitized.toLowerCase()).not.toMatch(/drop\s+table/i);
        expect(sanitized.toLowerCase()).not.toMatch(/exec\s+xp_cmdshell/i);
        expect(sanitized.toLowerCase()).not.toMatch(/union\s+select/i);
        expect(sanitized.toLowerCase()).not.toMatch(/waitfor\s+delay/i);
      });
    });

    it('should handle parameter validation for database queries', () => {
      // Test that our validation would catch SQL injection attempts
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1' UNION SELECT * FROM passwords --"
      ];

      maliciousInputs.forEach(input => {
        const result = InputValidator.validateText(input);
        // These should either be rejected or sanitized
        expect(
          !result.isValid || !result.sanitizedValue.includes('DROP') && !result.sanitizedValue.includes('UNION')
        ).toBe(true);
      });
    });
  });

  describe('Content Security Policy', () => {
    it('should have proper CSP configuration', async () => {
      const { generateCSPHeader, isUrlAllowedByCSP } = await import('../utils/csp');
      
      const csp = generateCSPHeader(false); // Production CSP
      expect(csp).toContain('script-src');
      expect(csp).toContain('object-src \'none\'');
      expect(csp).toContain('frame-ancestors \'none\'');
    });

    it('should validate URLs against CSP', async () => {
      const { isUrlAllowedByCSP } = await import('../utils/csp');
      
      expect(isUrlAllowedByCSP('https://api.anthropic.com', 'connect-src')).toBe(true);
      expect(isUrlAllowedByCSP('https://malicious-site.com', 'connect-src')).toBe(false);
      expect(isUrlAllowedByCSP('/api/local', 'connect-src')).toBe(true);
    });
  });

  describe('Security Integration', () => {
    it('should have no security vulnerabilities in sanitization chain', () => {
      // Test the complete sanitization chain
      const maliciousInput = '<script>alert("xss")</script><style>@import "javascript:alert()"</style>';
      
      // Step 1: Content sanitization
      const sanitized = ContentSanitizer.sanitizeContent(maliciousInput);
      expect(isContentSafe(sanitized)).toBe(true);
      
      // Step 2: Input validation
      const validated = InputValidator.validateText(sanitized);
      expect(validated.isValid).toBe(true);
      
      // Step 3: Final safety check
      expect(isContentSafe(validated.sanitizedValue)).toBe(true);
    });

    it('should maintain security under edge cases', () => {
      const edgeCases = [
        '', // Empty string
        ' '.repeat(1000), // Whitespace
        '\n\r\t', // Control characters
        '🚀🎉💻', // Unicode emojis
        'normal text', // Normal case
        '<p>safe html</p>', // Simple HTML
        'https://example.com?param=value&other=123' // Complex URL
      ];

      edgeCases.forEach(input => {
        const sanitized = ContentSanitizer.sanitizeContent(input);
        const validated = InputValidator.validateText(sanitized);
        
        // Should not throw errors
        expect(() => ContentSanitizer.validateTextContent(validated.sanitizedValue)).not.toThrow();
      });
    });
  });
});