/**
 * Content sanitization utilities to prevent XSS attacks
 */

// Whitelist of allowed HTML tags and their attributes
const ALLOWED_TAGS = {
  'b': [],
  'i': [],
  'u': [],
  'strong': [],
  'em': [],
  'code': [],
  'br': [],
  'span': ['class', 'style']
} as const;

// Whitelist of allowed CSS properties for inline styles
const ALLOWED_CSS_PROPERTIES = [
  'color',
  'background-color',
  'font-weight',
  'font-style',
  'text-decoration',
  'opacity'
] as const;

// Whitelist of allowed color formats
const COLOR_PATTERN = /^(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|[a-zA-Z]+|var\(--[a-zA-Z-]+\))$/;

// Whitelist of allowed CSS class names
const ALLOWED_CSS_CLASSES = [
  'color-red',
  'color-green', 
  'color-blue',
  'color-yellow',
  'color-cyan',
  'color-magenta',
  'color-orange',
  'color-purple',
  'color-gray',
  'color-grey',
  'color-accent',
  'color-success',
  'color-warning',
  'color-error'
] as const;

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export class ContentSanitizer {
  /**
   * Escape HTML entities to prevent injection
   */
  static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Sanitize CSS value to prevent style injection
   */
  static sanitizeCssValue(property: string, value: string): string | null {
    // Check if property is allowed
    if (!(ALLOWED_CSS_PROPERTIES as readonly string[]).includes(property)) {
      return null;
    }

    // Remove dangerous characters and patterns
    const cleanValue = value
      .replace(/[<>\"']/g, '') // Remove HTML/quote chars
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/expression\s*\(/gi, '') // Remove CSS expressions
      .replace(/url\s*\(/gi, '') // Remove url() functions
      .replace(/@import/gi, '') // Remove @import
      .trim();

    // Validate color values specifically
    if (property === 'color' || property === 'background-color') {
      if (!COLOR_PATTERN.test(cleanValue)) {
        return null;
      }
    }

    // Limit length to prevent buffer overflow attacks
    if (cleanValue.length > 100) {
      return null;
    }

    return cleanValue;
  }

  /**
   * Sanitize CSS class name
   */
  static sanitizeCssClass(className: string): string | null {
    // Remove dangerous characters
    const cleanClass = className.replace(/[^a-zA-Z0-9_-]/g, '');
    
    // Check against whitelist
    if (ALLOWED_CSS_CLASSES.includes(cleanClass as any)) {
      return cleanClass;
    }

    return null;
  }

  /**
   * Sanitize URL to prevent javascript: and data: protocols
   */
  static sanitizeUrl(url: string): string | null {
    const cleanUrl = url.trim();
    
    // Block dangerous protocols
    if (/^(javascript|data|vbscript|file|about):/i.test(cleanUrl)) {
      return null;
    }
    
    // Allow only http, https, mailto, and relative URLs
    if (!/^(https?:\/\/|mailto:|\/|\.\/|#)/.test(cleanUrl) && !cleanUrl.startsWith('http')) {
      return null;
    }
    
    // Limit length
    if (cleanUrl.length > 2000) {
      return null;
    }
    
    return cleanUrl;
  }

  /**
   * Validate and sanitize HTML tag
   */
  static sanitizeHtmlTag(tagName: string, attributes: Record<string, string> = {}): {
    isAllowed: boolean;
    sanitizedAttributes: Record<string, string>;
  } {
    const lowerTagName = tagName.toLowerCase();
    
    // Check if tag is allowed
    if (!Object.keys(ALLOWED_TAGS).includes(lowerTagName)) {
      return { isAllowed: false, sanitizedAttributes: {} };
    }
    
    const allowedAttrs = ALLOWED_TAGS[lowerTagName as keyof typeof ALLOWED_TAGS];
    const sanitizedAttributes: Record<string, string> = {};
    
    // Sanitize attributes
    for (const [attrName, attrValue] of Object.entries(attributes)) {
      const lowerAttrName = attrName.toLowerCase();
      
      if (!allowedAttrs.includes(lowerAttrName as any)) {
        continue; // Skip disallowed attributes
      }
      
      if (lowerAttrName === 'class') {
        const sanitizedClass = this.sanitizeCssClass(attrValue);
        if (sanitizedClass) {
          sanitizedAttributes[lowerAttrName] = sanitizedClass;
        }
      } else if (lowerAttrName === 'style') {
        // Parse and sanitize inline styles
        const sanitizedStyle = this.sanitizeInlineStyle(attrValue);
        if (sanitizedStyle) {
          sanitizedAttributes[lowerAttrName] = sanitizedStyle;
        }
      } else {
        // For other attributes, escape HTML
        sanitizedAttributes[lowerAttrName] = this.escapeHtml(attrValue);
      }
    }
    
    return { isAllowed: true, sanitizedAttributes };
  }

  /**
   * Sanitize inline CSS style
   */
  static sanitizeInlineStyle(styleString: string): string | null {
    const sanitizedStyles: string[] = [];
    
    // Parse style declarations
    const declarations = styleString.split(';');
    
    for (const declaration of declarations) {
      const [property, ...valueParts] = declaration.split(':');
      if (!property || valueParts.length === 0) continue;
      
      const cleanProperty = property.trim().toLowerCase();
      const cleanValue = valueParts.join(':').trim();
      
      const sanitizedValue = this.sanitizeCssValue(cleanProperty, cleanValue);
      if (sanitizedValue) {
        sanitizedStyles.push(`${cleanProperty}: ${sanitizedValue}`);
      }
    }
    
    return sanitizedStyles.length > 0 ? sanitizedStyles.join('; ') : null;
  }

  /**
   * Remove potentially dangerous content patterns
   */
  static removeDangerousPatterns(content: string): string {
    return content
      // Remove script tags
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      // Remove event handlers
      .replace(/\s*on\w+\s*=\s*['""][^'"]*['"]/gi, '')
      // Remove style blocks
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      // Remove object/embed/iframe
      .replace(/<(object|embed|iframe|form|input|textarea)[^>]*>.*?<\/\1>/gis, '')
      // Remove link tags (except safe ones)
      .replace(/<link(?![^>]*rel=["']stylesheet["'])[^>]*>/gi, '')
      // Remove meta tags
      .replace(/<meta[^>]*>/gi, '')
      // Remove comments that could contain malicious content
      .replace(/<!--[\s\S]*?-->/g, '');
  }

  /**
   * Comprehensive content sanitization
   */
  static sanitizeContent(content: string): string {
    if (!content || typeof content !== 'string') {
      return '';
    }
    
    // First pass: remove dangerous patterns
    let sanitized = this.removeDangerousPatterns(content);
    
    // Limit total length to prevent DoS
    if (sanitized.length > 50000) {
      sanitized = sanitized.substring(0, 50000) + '... [content truncated for security]';
    }
    
    return sanitized;
  }

  /**
   * Validate that text content is safe (no hidden characters, etc.)
   */
  static validateTextContent(text: string): boolean {
    // Check for dangerous Unicode characters
    const dangerousChars = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFEFF]/;
    if (dangerousChars.test(text)) {
      return false;
    }
    
    // Check for excessive repetition (potential DoS)
    const maxRepetition = /(.)\1{1000,}/;
    if (maxRepetition.test(text)) {
      return false;
    }
    
    return true;
  }
}

/**
 * Quick security check for content
 */
export const isContentSafe = (content: string): boolean => {
  if (!content) return true;
  
  // Check for obvious XSS patterns
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
    /vbscript:/i,
    /data:\s*text\/html/i
  ];
  
  return !xssPatterns.some(pattern => pattern.test(content));
};