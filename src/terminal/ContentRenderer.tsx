import React from 'react';

interface ContentRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

// Parse content with markdown and HTML support
const parseContent = (content: string): React.ReactNode => {
  const elements: React.ReactNode[] = [];
  let remaining = content;
  let index = 0;

  while (remaining.length > 0) {
    // Try to match various patterns from the beginning of the string
    let matched = false;

    // **Bold text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      elements.push(<strong key={index++} style={{ fontWeight: 'bold' }}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      matched = true;
    }

    // *Italic text* (but not **)
    else if (remaining.match(/^\*[^*]/)) {
      const italicMatch = remaining.match(/^\*([^*]+)\*/);
      if (italicMatch) {
        elements.push(<em key={index++} style={{ fontStyle: 'italic' }}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        matched = true;
      }
    }

    // __Underline text__
    else if (remaining.startsWith('__')) {
      const underlineMatch = remaining.match(/^__([^_]+)__/);
      if (underlineMatch) {
        elements.push(<u key={index++} style={{ textDecoration: 'underline' }}>{underlineMatch[1]}</u>);
        remaining = remaining.slice(underlineMatch[0].length);
        matched = true;
      }
    }

    // _Emphasis text_ (but not __)
    else if (remaining.startsWith('_') && !remaining.startsWith('__')) {
      const emphasisMatch = remaining.match(/^_([^_]+)_/);
      if (emphasisMatch) {
        elements.push(<em key={index++} style={{ fontStyle: 'italic', opacity: 0.8 }}>{emphasisMatch[1]}</em>);
        remaining = remaining.slice(emphasisMatch[0].length);
        matched = true;
      }
    }

    // `Code text`
    else if (remaining.startsWith('`')) {
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        elements.push(
          <code 
            key={index++}
            style={{ 
              fontFamily: 'monospace',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '2px 4px',
              borderRadius: '2px',
              fontSize: '0.9em'
            }}
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        matched = true;
      }
    }

    // <span class="color-*">Colored text</span>
    else if (remaining.startsWith('<span')) {
      const spanMatch = remaining.match(/^<span[^>]*class="color-([^"]+)"[^>]*>([^<]*)<\/span>/);
      if (spanMatch) {
        const [fullMatch, colorClass, text] = spanMatch;
        const colorMap: Record<string, string> = {
          'red': '#ff6b6b',
          'green': '#51cf66',
          'blue': '#74c0fc',
          'yellow': '#ffd43b',
          'cyan': '#66d9ef',
          'magenta': '#ff79c6',
          'orange': '#ff9f43',
          'purple': '#b197fc',
          'gray': '#868e96',
          'grey': '#868e96',
          'accent': 'var(--accent-color, #00ff00)',
          'success': 'var(--success-color, #00ff00)',
          'warning': 'var(--warning-color, #ffff00)', 
          'error': 'var(--error-color, #ff0000)'
        };
        
        elements.push(
          <span 
            key={index++}
            style={{ color: colorMap[colorClass] || colorClass }}
          >
            {text}
          </span>
        );
        remaining = remaining.slice(fullMatch.length);
        matched = true;
      }
    }

    // <b>Bold</b>
    else if (remaining.startsWith('<b>')) {
      const boldMatch = remaining.match(/^<b>([^<]*)<\/b>/);
      if (boldMatch) {
        elements.push(<strong key={index++} style={{ fontWeight: 'bold' }}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        matched = true;
      }
    }

    // <i>Italic</i>
    else if (remaining.startsWith('<i>')) {
      const italicMatch = remaining.match(/^<i>([^<]*)<\/i>/);
      if (italicMatch) {
        elements.push(<em key={index++} style={{ fontStyle: 'italic' }}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        matched = true;
      }
    }

    // <u>Underline</u>
    else if (remaining.startsWith('<u>')) {
      const underlineMatch = remaining.match(/^<u>([^<]*)<\/u>/);
      if (underlineMatch) {
        elements.push(<u key={index++} style={{ textDecoration: 'underline' }}>{underlineMatch[1]}</u>);
        remaining = remaining.slice(underlineMatch[0].length);
        matched = true;
      }
    }

    // <code>Code</code>
    else if (remaining.startsWith('<code>')) {
      const codeMatch = remaining.match(/^<code>([^<]*)<\/code>/);
      if (codeMatch) {
        elements.push(
          <code 
            key={index++}
            style={{ 
              fontFamily: 'monospace',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '2px 4px',
              borderRadius: '2px',
              fontSize: '0.9em'
            }}
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        matched = true;
      }
    }

    // <br/> or <br>
    else if (remaining.match(/^<br\s*\/?>/)) {
      const brMatch = remaining.match(/^<br\s*\/?>/);
      if (brMatch) {
        elements.push(<br key={index++} />);
        remaining = remaining.slice(brMatch[0].length);
        matched = true;
      }
    }

    // [Link text](url)
    else if (remaining.startsWith('[')) {
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [fullMatch, text, url] = linkMatch;
        elements.push(
          <span 
            key={index++}
            style={{ 
              color: '#66ccff',
              textDecoration: 'underline',
              cursor: 'default'
            }}
            title={url}
          >
            {text}
          </span>
        );
        remaining = remaining.slice(fullMatch.length);
        matched = true;
      }
    }

    // If no special formatting was matched, take the next character as plain text
    if (!matched) {
      // Find the next special character or take the rest of the string
      const nextSpecial = remaining.search(/[*_`<[]/);
      const textLength = nextSpecial === -1 ? remaining.length : nextSpecial;
      const plainText = remaining.slice(0, Math.max(1, textLength));
      
      if (plainText) {
        elements.push(<span key={index++}>{plainText}</span>);
      }
      remaining = remaining.slice(plainText.length);
    }
  }

  return elements;
};

export const ContentRenderer: React.FC<ContentRendererProps> = ({ content, className, style }) => {
  const renderedContent = parseContent(content);
  
  return (
    <span className={className} style={style}>
      {renderedContent}
    </span>
  );
};

export default ContentRenderer;