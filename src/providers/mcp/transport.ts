// MCP Transport implementations for browser environment

export interface MCPTransport {
  connect(): Promise<void>;
  send(message: string): Promise<void>;
  onMessage(handler: (message: string) => void): void;
  onError(handler: (error: Error) => void): void;
  onClose(handler: () => void): void;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export class WebSocketMCPTransport implements MCPTransport {
  private ws: WebSocket | null = null;
  private messageHandlers: ((message: string) => void)[] = [];
  private errorHandlers: ((error: Error) => void)[] = [];
  private closeHandlers: (() => void)[] = [];
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log(`🔌 WebSocket MCP connection established: ${this.url}`);
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.messageHandlers.forEach(handler => handler(event.data));
        };

        this.ws.onerror = (event) => {
          const error = new Error(`WebSocket error: ${event}`);
          this.errorHandlers.forEach(handler => handler(error));
          reject(error);
        };

        this.ws.onclose = () => {
          this.closeHandlers.forEach(handler => handler());
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  async send(message: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    this.ws.send(message);
  }

  onMessage(handler: (message: string) => void): void {
    this.messageHandlers.push(handler);
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandlers.push(handler);
  }

  onClose(handler: () => void): void {
    this.closeHandlers.push(handler);
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export class HTTPMCPTransport implements MCPTransport {
  private baseUrl: string;
  private connected = false;
  private messageHandlers: ((message: string) => void)[] = [];
  private errorHandlers: ((error: Error) => void)[] = [];
  private closeHandlers: (() => void)[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a health check
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`HTTP MCP server not available: ${response.status}`);
      }
      this.connected = true;
      console.log(`🔌 HTTP MCP connection established: ${this.baseUrl}`);
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to HTTP MCP server: ${error}`);
    }
  }

  async send(message: string): Promise<void> {
    if (!this.connected) {
      throw new Error('HTTP transport not connected');
    }

    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: message,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const responseText = await response.text();
      if (responseText) {
        // Simulate async response
        setTimeout(() => {
          this.messageHandlers.forEach(handler => handler(responseText));
        }, 0);
      }
    } catch (error) {
      const err = new Error(`HTTP send failed: ${error}`);
      this.errorHandlers.forEach(handler => handler(err));
      throw err;
    }
  }

  onMessage(handler: (message: string) => void): void {
    this.messageHandlers.push(handler);
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandlers.push(handler);
  }

  onClose(handler: () => void): void {
    this.closeHandlers.push(handler);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.closeHandlers.forEach(handler => handler());
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export function createMCPTransport(url: string): MCPTransport {
  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    return new WebSocketMCPTransport(url);
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    return new HTTPMCPTransport(url);
  } else {
    throw new Error(`Unsupported MCP transport URL: ${url}`);
  }
}