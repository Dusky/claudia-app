// Built-in Fetch MCP Server for browser environment
// Based on the official MCP Fetch server but optimized for browsers

import type { MCPTool, MCPToolCall, MCPToolResult } from '../types';

export class BuiltinFetchServer {
  readonly id = 'builtin-fetch';
  readonly name = 'Built-in Fetch';
  readonly description = 'Fetch and process web content';

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'fetch',
        description: 'Fetch content from a URL and return it as text',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to fetch content from'
            },
            headers: {
              type: 'object',
              description: 'Optional HTTP headers to include',
              additionalProperties: { type: 'string' }
            },
            method: {
              type: 'string',
              description: 'HTTP method (GET, POST, etc.)',
              enum: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
              default: 'GET'
            },
            body: {
              type: 'string',
              description: 'Request body for POST/PUT requests'
            }
          },
          required: ['url']
        }
      },
      {
        name: 'fetch_html_content',
        description: 'Fetch a webpage and extract its main text content',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to fetch and extract content from'
            },
            selector: {
              type: 'string',
              description: 'Optional CSS selector to extract specific content'
            }
          },
          required: ['url']
        }
      },
      {
        name: 'fetch_json',
        description: 'Fetch JSON data from a URL and parse it',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to fetch JSON from'
            },
            headers: {
              type: 'object',
              description: 'Optional HTTP headers',
              additionalProperties: { type: 'string' }
            }
          },
          required: ['url']
        }
      }
    ];
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      switch (toolCall.name) {
        case 'fetch':
          return await this.handleFetch(toolCall.arguments);
        case 'fetch_html_content':
          return await this.handleFetchHtmlContent(toolCall.arguments);
        case 'fetch_json':
          return await this.handleFetchJson(toolCall.arguments);
        default:
          return {
            content: [{
              type: 'text',
              text: `Unknown tool: ${toolCall.name}`
            }],
            isError: true
          };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error executing ${toolCall.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleFetch(args: Record<string, unknown>): Promise<MCPToolResult> {
    const url = args.url as string;
    const method = (args.method as string) || 'GET';
    const headers = args.headers as Record<string, string> || {};
    const body = args.body as string;

    if (!url) {
      return {
        content: [{ type: 'text', text: 'URL is required' }],
        isError: true
      };
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'User-Agent': 'Claudia-AI-Assistant/1.0',
          ...headers
        },
        body: method !== 'GET' && method !== 'HEAD' ? body : undefined
      });

      const text = await response.text();
      const statusText = response.ok ? 'OK' : response.statusText;

      return {
        content: [{
          type: 'text',
          text: `Status: ${response.status} ${statusText}\n\nContent:\n${text}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleFetchHtmlContent(args: Record<string, unknown>): Promise<MCPToolResult> {
    const url = args.url as string;
    const selector = args.selector as string;

    if (!url) {
      return {
        content: [{ type: 'text', text: 'URL is required' }],
        isError: true
      };
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Claudia-AI-Assistant/1.0'
        }
      });

      if (!response.ok) {
        return {
          content: [{
            type: 'text',
            text: `HTTP ${response.status}: ${response.statusText}`
          }],
          isError: true
        };
      }

      const html = await response.text();
      const extractedText = this.extractTextFromHtml(html, selector);

      return {
        content: [{
          type: 'text',
          text: `Content from ${url}:\n\n${extractedText}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to fetch HTML content: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleFetchJson(args: Record<string, unknown>): Promise<MCPToolResult> {
    const url = args.url as string;
    const headers = args.headers as Record<string, string> || {};

    if (!url) {
      return {
        content: [{ type: 'text', text: 'URL is required' }],
        isError: true
      };
    }

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Claudia-AI-Assistant/1.0',
          ...headers
        }
      });

      if (!response.ok) {
        return {
          content: [{
            type: 'text',
            text: `HTTP ${response.status}: ${response.statusText}`
          }],
          isError: true
        };
      }

      const jsonData = await response.json();
      const formattedJson = JSON.stringify(jsonData, null, 2);

      return {
        content: [{
          type: 'text',
          text: `JSON data from ${url}:\n\n${formattedJson}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to fetch JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private extractTextFromHtml(html: string, selector?: string): string {
    // Create a temporary DOM element to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let element: Element = doc.body;
    
    // If selector is provided, try to find the specific element
    if (selector) {
      const selected = doc.querySelector(selector);
      if (selected) {
        element = selected;
      }
    }

    // Extract text content and clean it up
    let text = element.textContent || '';
    
    // Remove excessive whitespace and normalize line breaks
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Limit length to prevent overwhelming responses
    if (text.length > 10000) {
      text = text.substring(0, 10000) + '\n... (content truncated)';
    }

    return text;
  }
}