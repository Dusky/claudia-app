/**
 * Tests for SecureContentRenderer component
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SecureContentRenderer } from '../terminal/SecureContentRenderer';
import { XSS_TEST_VECTORS } from '../test/testUtils';

describe('SecureContentRenderer', () => {
  describe('Basic Rendering', () => {
    it('renders plain text safely', () => {
      render(<SecureContentRenderer content="Hello, world!" />);
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });

    it('renders empty content safely', () => {
      const { container } = render(<SecureContentRenderer content="" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('handles null/undefined content', () => {
      const { container } = render(<SecureContentRenderer content={null as any} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Markdown Formatting', () => {
    it('renders bold text correctly', () => {
      render(<SecureContentRenderer content="**bold text**" />);
      const boldElement = screen.getByText('bold text');
      expect(boldElement.tagName).toBe('STRONG');
    });

    it('renders italic text correctly', () => {
      render(<SecureContentRenderer content="*italic text*" />);
      const italicElement = screen.getByText('italic text');
      expect(italicElement.tagName).toBe('EM');
    });

    it('renders underlined text correctly', () => {
      render(<SecureContentRenderer content="__underlined text__" />);
      const underlineElement = screen.getByText('underlined text');
      expect(underlineElement.tagName).toBe('U');
    });

    it('renders code text correctly', () => {
      render(<SecureContentRenderer content="`code text`" />);
      const codeElement = screen.getByText('code text');
      expect(codeElement.tagName).toBe('CODE');
    });

    it('renders mixed formatting correctly', () => {
      render(<SecureContentRenderer content="**bold** and *italic* and `code`" />);
      expect(screen.getByText('bold')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
      expect(screen.getByText('code')).toBeInTheDocument();
    });
  });

  describe('Safe HTML Rendering', () => {
    it('renders safe HTML tags', () => {
      render(<SecureContentRenderer content="<b>bold</b> <i>italic</i>" />);
      expect(screen.getByText('bold')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
    });

    it('renders safe color spans', () => {
      render(<SecureContentRenderer content='<span class="color-red">red text</span>' />);
      const redElement = screen.getByText('red text');
      expect(redElement).toHaveStyle({ color: '#ff6b6b' });
    });

    it('renders line breaks', () => {
      const { container } = render(<SecureContentRenderer content="line 1<br/>line 2" />);
      expect(container.querySelector('br')).toBeInTheDocument();
    });
  });

  describe('Link Rendering', () => {
    it('renders safe links with title', () => {
      render(<SecureContentRenderer content="[GitHub](https://github.com)" />);
      const linkElement = screen.getByText('GitHub');
      expect(linkElement).toHaveAttribute('title', 'https://github.com');
    });

    it('does not render links with dangerous URLs', () => {
      render(<SecureContentRenderer content="[Evil](javascript:alert('xss'))" />);
      // Should render as plain text or not at all
      expect(screen.queryByText('Evil')).toBeNull();
    });
  });

  describe('Paragraph Handling', () => {
    it('renders multiple paragraphs correctly', () => {
      const content = "Paragraph 1\n\nParagraph 2\n\nParagraph 3";
      const { container } = render(<SecureContentRenderer content={content} />);
      const paragraphDivs = container.querySelectorAll('div');
      expect(paragraphDivs.length).toBe(3);
    });

    it('renders single paragraph without extra divs', () => {
      const { container } = render(<SecureContentRenderer content="Single paragraph" />);
      const paragraphDivs = container.querySelectorAll('div');
      expect(paragraphDivs.length).toBe(0); // No paragraph divs for single paragraph
    });
  });

  describe('XSS Protection', () => {
    it('blocks all XSS attack vectors', () => {
      XSS_TEST_VECTORS.forEach(vector => {
        const { container } = render(<SecureContentRenderer content={vector} />);
        
        // Check that no script tags are rendered
        expect(container.querySelector('script')).toBeNull();
        
        // Check that no event handlers are present
        const allElements = container.querySelectorAll('*');
        allElements.forEach(element => {
          const attributes = element.getAttributeNames();
          const hasEventHandler = attributes.some(attr => attr.startsWith('on'));
          expect(hasEventHandler).toBe(false);
        });
        
        // Check that no javascript: URLs are present
        const innerHTML = container.innerHTML;
        expect(innerHTML.toLowerCase()).not.toContain('javascript:');
      });
    });

    it('shows security warning for dangerous content', () => {
      render(<SecureContentRenderer content="<script>alert('xss')</script>" />);
      expect(screen.getByText('[Content blocked for security]')).toBeInTheDocument();
    });

    it('sanitizes but preserves safe content', () => {
      const safeContent = "**Bold** text with `code` and normal text";
      render(<SecureContentRenderer content={safeContent} />);
      
      expect(screen.getByText('Bold')).toBeInTheDocument();
      expect(screen.getByText('code')).toBeInTheDocument();
      expect(screen.getByText('text with')).toBeInTheDocument();
    });
  });

  describe('Content Length Protection', () => {
    it('truncates extremely long content', () => {
      const longContent = 'a'.repeat(60000);
      const { container } = render(<SecureContentRenderer content={longContent} />);
      const innerHTML = container.innerHTML;
      expect(innerHTML).toContain('[truncated for security]');
    });

    it('handles normal length content without truncation', () => {
      const normalContent = 'a'.repeat(1000);
      const { container } = render(<SecureContentRenderer content={normalContent} />);
      const innerHTML = container.innerHTML;
      expect(innerHTML).not.toContain('[truncated for security]');
    });
  });

  describe('Text Validation', () => {
    it('blocks content with dangerous Unicode characters', () => {
      const maliciousContent = 'normal\u0000text'; // Null byte
      render(<SecureContentRenderer content={maliciousContent} />);
      expect(screen.getByText('[Content blocked for security]')).toBeInTheDocument();
    });

    it('allows normal Unicode characters', () => {
      const unicodeContent = 'Hello 世界 🌍 café';
      render(<SecureContentRenderer content={unicodeContent} />);
      expect(screen.getByText(/Hello 世界 🌍 café/)).toBeInTheDocument();
    });
  });

  describe('HTML Tag Whitelist', () => {
    it('allows whitelisted HTML tags', () => {
      const whitelistedTags = [
        '<b>bold</b>',
        '<i>italic</i>',
        '<u>underline</u>',
        '<strong>strong</strong>',
        '<em>emphasis</em>',
        '<code>code</code>'
      ];

      whitelistedTags.forEach(tag => {
        const { container } = render(<SecureContentRenderer content={tag} />);
        expect(container.querySelector('b, i, u, strong, em, code')).toBeInTheDocument();
      });
    });

    it('blocks non-whitelisted HTML tags', () => {
      const dangerousTags = [
        '<script>alert("xss")</script>',
        '<iframe src="evil.html"></iframe>',
        '<object data="evil.swf"></object>',
        '<embed src="evil.swf">',
        '<form action="evil.php"></form>',
        '<input type="text">',
        '<textarea>text</textarea>',
        '<link rel="stylesheet" href="evil.css">',
        '<meta http-equiv="refresh" content="0;url=evil.html">'
      ];

      dangerousTags.forEach(tag => {
        render(<SecureContentRenderer content={tag} />);
        expect(screen.queryByText('[Content blocked for security]')).toBeInTheDocument();
      });
    });
  });

  describe('CSS Safety', () => {
    it('allows safe CSS colors', () => {
      render(<SecureContentRenderer content='<span class="color-blue">blue text</span>' />);
      const blueElement = screen.getByText('blue text');
      expect(blueElement).toHaveStyle({ color: '#74c0fc' });
    });

    it('blocks dangerous CSS classes', () => {
      const { container } = render(<SecureContentRenderer content='<span class="evil-class">text</span>' />);
      const spanElement = container.querySelector('span');
      expect(spanElement?.className).not.toContain('evil-class');
    });
  });

  describe('Performance', () => {
    it('handles large safe content efficiently', () => {
      const largeContent = 'Safe content. '.repeat(1000);
      const start = performance.now();
      render(<SecureContentRenderer content={largeContent} />);
      const end = performance.now();
      
      // Should render in under 100ms for large content
      expect(end - start).toBeLessThan(100);
    });

    it('handles complex nested formatting efficiently', () => {
      const complexContent = '**Bold** *italic* `code` **more bold** *more italic*'.repeat(100);
      const start = performance.now();
      render(<SecureContentRenderer content={complexContent} />);
      const end = performance.now();
      
      // Should render complex content efficiently
      expect(end - start).toBeLessThan(50);
    });
  });

  describe('Edge Cases', () => {
    it('handles malformed markdown gracefully', () => {
      const malformedContent = '**unclosed bold *unclosed italic `unclosed code';
      render(<SecureContentRenderer content={malformedContent} />);
      // Should not crash and should render something
      expect(screen.getByText(/unclosed/)).toBeInTheDocument();
    });

    it('handles nested tags correctly', () => {
      const nestedContent = '**bold with *italic inside***';
      render(<SecureContentRenderer content={nestedContent} />);
      // Should handle nesting gracefully
      expect(screen.getByText(/bold with/)).toBeInTheDocument();
    });

    it('handles mixed markdown and HTML', () => {
      const mixedContent = '**bold markdown** and <i>italic html</i>';
      render(<SecureContentRenderer content={mixedContent} />);
      expect(screen.getByText('bold markdown')).toBeInTheDocument();
      expect(screen.getByText('italic html')).toBeInTheDocument();
    });
  });
});