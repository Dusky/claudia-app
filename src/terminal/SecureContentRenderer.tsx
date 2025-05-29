import React from 'react';
import { ContentSanitizer, isContentSafe } from '../utils/contentSanitizer';
import type { TerminalTheme } from './themes';

interface SecureContentRendererProps {
  content: string;
  theme: TerminalTheme;
  className?: string;
  style?: React.CSSProperties;
}

// Security-focused content parser that sanitizes all input
const parseSecureContent = (content: string, theme: TerminalTheme): React.ReactNode => {
  // First, check if content is fundamentally safe
  if (!isContentSafe(content)) {
    console.warn('Potentially unsafe content detected and blocked');
    return <span style={{ color: theme.content.colors.red }}>[Content blocked for security]</span>;
  }

  // Sanitize the content
  const sanitizedContent = ContentSanitizer.sanitizeContent(content);
  
  // Split into paragraphs
  const paragraphs = sanitizedContent.split(/\n\s*\n/).filter(p => p.trim());
  
  if (paragraphs.length > 1) {
    return paragraphs.map((paragraph, paragraphIndex) => (
      <div key={paragraphIndex} style={{ marginBottom: paragraphIndex < paragraphs.length - 1 ? theme.content.spacing.paragraphMargin : '0' }}>
        {parseSecureContentSegment(paragraph.trim(), theme)}
      </div>
    ));
  }
  
  return parseSecureContentSegment(sanitizedContent, theme);
};

const parseSecureContentSegment = (content: string, theme: TerminalTheme): React.ReactNode => {
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
          elements.push(<em key={index++} style={{ fontStyle: 'italic', opacity: theme.content.emphasis.opacity }}>{text}</em>);
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
                backgroundColor: theme.content.codeBlock.background,
                color: theme.content.codeBlock.color,
                padding: theme.content.codeBlock.padding,
                borderRadius: theme.content.codeBlock.borderRadius,
                fontSize: '0.9em',
                border: theme.content.codeBlock.border,
                textShadow: theme.content.codeBlock.textShadow
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
                'color-red': theme.content.colors.red,
                'color-green': theme.content.colors.green,
                'color-blue': theme.content.colors.blue,
                'color-yellow': theme.content.colors.yellow,
                'color-cyan': theme.content.colors.cyan,
                'color-magenta': theme.content.colors.magenta,
                'color-orange': theme.content.colors.orange,
                'color-purple': theme.content.colors.purple,
                'color-gray': theme.content.colors.gray,
                'color-grey': theme.content.colors.gray,
                'color-accent': theme.colors.accent,
                'color-success': theme.colors.success,
                'color-warning': theme.colors.warning, 
                'color-error': theme.colors.error
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
                    backgroundColor: theme.content.codeBlock.background,
                    color: theme.content.codeBlock.color,
                    padding: theme.content.codeBlock.padding,
                    borderRadius: theme.content.codeBlock.borderRadius,
                    fontSize: '0.9em',
                    border: theme.content.codeBlock.border,
                    textShadow: theme.content.codeBlock.textShadow
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
                color: theme.content.link.color,
                textDecoration: theme.content.link.textDecoration,
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
  theme,
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

  const renderedContent = parseSecureContent(truncatedContent, theme);
  
  return (
    <span className={className} style={style}>
      {renderedContent}
    </span>
  );
};

export default SecureContentRenderer;