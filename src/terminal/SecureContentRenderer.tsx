import React from 'react';
import { ContentSanitizer, isContentSafe } from '../utils/contentSanitizer';

interface SecureContentRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

// Security-focused content parser that sanitizes all input
const parseSecureContent = (content: string): React.ReactNode => {
  // First, check if content is fundamentally safe
  if (!isContentSafe(content)) {
    console.warn('Potentially unsafe content detected and blocked');
    return <span style={{ color: '#ff6b6b' }}>[Content blocked for security]</span>;
  }

  // Sanitize the content
  const sanitizedContent = ContentSanitizer.sanitizeContent(content);
  
  // Split into paragraphs
  const paragraphs = sanitizedContent.split(/\n\s*\n/).filter(p => p.trim());
  
  if (paragraphs.length > 1) {
    return paragraphs.map((paragraph, paragraphIndex) => (
      <div key={paragraphIndex} style={{ marginBottom: paragraphIndex < paragraphs.length - 1 ? '16px' : '0' }}>
        {parseSecureContentSegment(paragraph.trim())}
      </div>
    ));
  }
  
  return parseSecureContentSegment(sanitizedContent);
};

const parseSecureContentSegment = (content: string): React.ReactNode => {
  const elements: React.ReactNode[] = [];
  let remaining = content;
  let index = 0;

  while (remaining.length > 0) {
    let matched = false;

    // **Bold text** (markdown style)
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      const text = ContentSanitizer.escapeHtml(boldMatch[1]);
      if (ContentSanitizer.validateTextContent(text)) {
        elements.push(<strong key={index++} style={{ fontWeight: 'bold' }}>{text}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        matched = true;
      }
    }

    // *Italic text* (markdown style)
    else if (remaining.match(/^\*[^*]/)) {
      const italicMatch = remaining.match(/^\*([^*]+)\*/);
      if (italicMatch) {
        const text = ContentSanitizer.escapeHtml(italicMatch[1]);
        if (ContentSanitizer.validateTextContent(text)) {
          elements.push(<em key={index++} style={{ fontStyle: 'italic' }}>{text}</em>);
          remaining = remaining.slice(italicMatch[0].length);
          matched = true;
        }
      }
    }

    // __Underline text__ (markdown style)
    else if (remaining.startsWith('__')) {
      const underlineMatch = remaining.match(/^__([^_]+)__/);
      if (underlineMatch) {
        const text = ContentSanitizer.escapeHtml(underlineMatch[1]);
        if (ContentSanitizer.validateTextContent(text)) {
          elements.push(<u key={index++} style={{ textDecoration: 'underline' }}>{text}</u>);
          remaining = remaining.slice(underlineMatch[0].length);
          matched = true;
        }
      }
    }

    // _Emphasis text_ (markdown style)
    else if (remaining.startsWith('_') && !remaining.startsWith('__')) {
      const emphasisMatch = remaining.match(/^_([^_]+)_/);
      if (emphasisMatch && !/\w_\w/.test(remaining.slice(0, 10))) {
        const text = ContentSanitizer.escapeHtml(emphasisMatch[1]);
        if (ContentSanitizer.validateTextContent(text)) {
          elements.push(<em key={index++} style={{ fontStyle: 'italic', opacity: 0.8 }}>{text}</em>);
          remaining = remaining.slice(emphasisMatch[0].length);
          matched = true;
        }
      }
    }

    // `Code text` (markdown style)
    else if (remaining.startsWith('`')) {
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        const text = ContentSanitizer.escapeHtml(codeMatch[1]);
        if (ContentSanitizer.validateTextContent(text)) {
          elements.push(
            <code 
              key={index++}
              style={{ 
                fontFamily: 'JetBrains Mono, Monaco, Consolas, "Courier New", monospace',
                backgroundColor: 'rgba(0, 255, 255, 0.08)',
                color: 'rgba(0, 255, 255, 0.9)',
                padding: '3px 6px',
                borderRadius: '3px',
                fontSize: '0.9em',
                border: '1px solid rgba(0, 255, 255, 0.2)',
                textShadow: '0 0 2px rgba(0, 255, 255, 0.3)'
              }}
            >
              {text}
            </code>
          );
          remaining = remaining.slice(codeMatch[0].length);
          matched = true;
        }
      }
    }

    // Secure HTML tag parsing with whitelist
    else if (remaining.startsWith('<')) {
      const htmlMatch = remaining.match(/^<(\w+)([^>]*)>(.*?)<\/\1>/);
      if (htmlMatch) {
        const [fullMatch, tagName, attributesStr, innerText] = htmlMatch;
        
        // Parse attributes
        const attributes: Record<string, string> = {};
        const attrMatches = attributesStr.matchAll(/(\w+)=["']([^"']*)["']/g);
        for (const attrMatch of attrMatches) {
          attributes[attrMatch[1]] = attrMatch[2];
        }
        
        // Sanitize the tag and attributes
        const { isAllowed, sanitizedAttributes } = ContentSanitizer.sanitizeHtmlTag(tagName, attributes);
        
        if (isAllowed) {
          const sanitizedInnerText = ContentSanitizer.escapeHtml(innerText);
          
          if (ContentSanitizer.validateTextContent(sanitizedInnerText)) {
            // Handle different tag types securely
            if (tagName.toLowerCase() === 'span' && sanitizedAttributes.class) {
              // Secure color span handling
              const colorClass = sanitizedAttributes.class;
              const colorMap: Record<string, string> = {
                'color-red': '#ff6b6b',
                'color-green': '#51cf66',
                'color-blue': '#74c0fc',
                'color-yellow': '#ffd43b',
                'color-cyan': '#66d9ef',
                'color-magenta': '#ff79c6',
                'color-orange': '#ff9f43',
                'color-purple': '#b197fc',
                'color-gray': '#868e96',
                'color-grey': '#868e96',
                'color-accent': 'var(--accent-color, #00ff00)',
                'color-success': 'var(--success-color, #00ff00)',
                'color-warning': 'var(--warning-color, #ffff00)', 
                'color-error': 'var(--error-color, #ff0000)'
              };
              
              elements.push(
                <span 
                  key={index++}
                  style={{ color: colorMap[colorClass] || '#ffffff' }}
                >
                  {sanitizedInnerText}
                </span>
              );
            } else if (tagName.toLowerCase() === 'b' || tagName.toLowerCase() === 'strong') {
              elements.push(<strong key={index++} style={{ fontWeight: 'bold' }}>{sanitizedInnerText}</strong>);
            } else if (tagName.toLowerCase() === 'i' || tagName.toLowerCase() === 'em') {
              elements.push(<em key={index++} style={{ fontStyle: 'italic' }}>{sanitizedInnerText}</em>);
            } else if (tagName.toLowerCase() === 'u') {
              elements.push(<u key={index++} style={{ textDecoration: 'underline' }}>{sanitizedInnerText}</u>);
            } else if (tagName.toLowerCase() === 'code') {
              elements.push(
                <code 
                  key={index++}
                  style={{ 
                    fontFamily: 'JetBrains Mono, Monaco, Consolas, "Courier New", monospace',
                    backgroundColor: 'rgba(0, 255, 255, 0.08)',
                    color: 'rgba(0, 255, 255, 0.9)',
                    padding: '3px 6px',
                    borderRadius: '3px',
                    fontSize: '0.9em',
                    border: '1px solid rgba(0, 255, 255, 0.2)',
                    textShadow: '0 0 2px rgba(0, 255, 255, 0.3)'
                  }}
                >
                  {sanitizedInnerText}
                </code>
              );
            } else {
              // For other allowed tags, render as span for safety
              elements.push(<span key={index++}>{sanitizedInnerText}</span>);
            }
            
            remaining = remaining.slice(fullMatch.length);
            matched = true;
          }
        }
      }
      
      // Handle self-closing tags like <br/>
      else {
        const selfClosingMatch = remaining.match(/^<(br|hr)\s*\/?>/i);
        if (selfClosingMatch) {
          const tagName = selfClosingMatch[1].toLowerCase();
          if (tagName === 'br') {
            elements.push(<br key={index++} />);
            remaining = remaining.slice(selfClosingMatch[0].length);
            matched = true;
          }
        }
      }
    }

    // Secure link parsing [text](url)
    else if (remaining.startsWith('[')) {
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [fullMatch, text, url] = linkMatch;
        const sanitizedText = ContentSanitizer.escapeHtml(text);
        const sanitizedUrl = ContentSanitizer.sanitizeUrl(url);
        
        if (ContentSanitizer.validateTextContent(sanitizedText) && sanitizedUrl) {
          elements.push(
            <span 
              key={index++}
              style={{ 
                color: '#66ccff',
                textDecoration: 'underline',
                cursor: 'default'
              }}
              title={sanitizedUrl}
            >
              {sanitizedText}
            </span>
          );
          remaining = remaining.slice(fullMatch.length);
          matched = true;
        }
      }
    }

    // If no special formatting matched, take the next character as plain text
    if (!matched) {
      const nextSpecial = remaining.search(/[*_`<[]/);
      const textLength = nextSpecial === -1 ? remaining.length : nextSpecial;
      const plainText = remaining.slice(0, Math.max(1, textLength));
      
      if (plainText) {
        const sanitizedText = ContentSanitizer.escapeHtml(plainText);
        if (ContentSanitizer.validateTextContent(sanitizedText)) {
          elements.push(<span key={index++}>{sanitizedText}</span>);
        }
      }
      remaining = remaining.slice(plainText.length);
    }
  }

  return elements;
};

export const SecureContentRenderer: React.FC<SecureContentRendererProps> = ({ 
  content, 
  className, 
  style 
}) => {
  // Validate input
  if (!content || typeof content !== 'string') {
    return <span className={className} style={style}></span>;
  }

  // Limit content length to prevent DoS
  const maxLength = 50000;
  const truncatedContent = content.length > maxLength 
    ? content.substring(0, maxLength) + '... [truncated for security]'
    : content;

  const renderedContent = parseSecureContent(truncatedContent);
  
  return (
    <span className={className} style={style}>
      {renderedContent}
    </span>
  );
};

export default SecureContentRenderer;