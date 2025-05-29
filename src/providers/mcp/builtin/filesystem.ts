// Built-in Filesystem MCP Server for browser environment
// Uses Origin Private File System (OPFS) API for secure file operations

import type { MCPTool, MCPToolCall, MCPToolResult } from '../types';

export class BuiltinFilesystemServer {
  readonly id = 'builtin-filesystem';
  readonly name = 'Built-in Filesystem';
  readonly description = 'Secure file system operations using OPFS';
  
  private opfsRoot: FileSystemDirectoryHandle | null = null;

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to read'
            },
            encoding: {
              type: 'string',
              description: 'Text encoding (utf-8, base64)',
              enum: ['utf-8', 'base64'],
              default: 'utf-8'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to write'
            },
            content: {
              type: 'string',
              description: 'Content to write to the file'
            },
            encoding: {
              type: 'string',
              description: 'Text encoding (utf-8, base64)',
              enum: ['utf-8', 'base64'],
              default: 'utf-8'
            },
            create_dirs: {
              type: 'boolean',
              description: 'Create parent directories if they don\'t exist',
              default: true
            }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'list_files',
        description: 'List files and directories in a path',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Directory path to list (empty for root)',
              default: ''
            },
            recursive: {
              type: 'boolean',
              description: 'List files recursively',
              default: false
            },
            show_hidden: {
              type: 'boolean',
              description: 'Include hidden files (starting with .)',
              default: false
            }
          }
        }
      },
      {
        name: 'create_directory',
        description: 'Create a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Directory path to create'
            },
            recursive: {
              type: 'boolean',
              description: 'Create parent directories if needed',
              default: true
            }
          },
          required: ['path']
        }
      },
      {
        name: 'delete_file',
        description: 'Delete a file or directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file or directory to delete'
            },
            recursive: {
              type: 'boolean',
              description: 'Delete directories recursively',
              default: false
            }
          },
          required: ['path']
        }
      },
      {
        name: 'file_info',
        description: 'Get information about a file or directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to get information about'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'copy_file',
        description: 'Copy a file to another location',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'Source file path'
            },
            destination: {
              type: 'string',
              description: 'Destination file path'
            },
            create_dirs: {
              type: 'boolean',
              description: 'Create destination directories if needed',
              default: true
            }
          },
          required: ['source', 'destination']
        }
      },
      {
        name: 'move_file',
        description: 'Move/rename a file or directory',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'Source path'
            },
            destination: {
              type: 'string',
              description: 'Destination path'
            },
            create_dirs: {
              type: 'boolean',
              description: 'Create destination directories if needed',
              default: true
            }
          },
          required: ['source', 'destination']
        }
      },
      {
        name: 'search_files',
        description: 'Search for files by name pattern',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Search pattern (supports * wildcards)'
            },
            path: {
              type: 'string',
              description: 'Directory to search in (empty for root)',
              default: ''
            },
            recursive: {
              type: 'boolean',
              description: 'Search recursively',
              default: true
            }
          },
          required: ['pattern']
        }
      }
    ];
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      // Initialize OPFS if needed
      await this.initializeOPFS();

      switch (toolCall.name) {
        case 'read_file':
          return await this.handleReadFile(toolCall.arguments);
        case 'write_file':
          return await this.handleWriteFile(toolCall.arguments);
        case 'list_files':
          return await this.handleListFiles(toolCall.arguments);
        case 'create_directory':
          return await this.handleCreateDirectory(toolCall.arguments);
        case 'delete_file':
          return await this.handleDeleteFile(toolCall.arguments);
        case 'file_info':
          return await this.handleFileInfo(toolCall.arguments);
        case 'copy_file':
          return await this.handleCopyFile(toolCall.arguments);
        case 'move_file':
          return await this.handleMoveFile(toolCall.arguments);
        case 'search_files':
          return await this.handleSearchFiles(toolCall.arguments);
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

  private async initializeOPFS(): Promise<void> {
    if (this.opfsRoot) return;

    try {
      if ('navigator' in globalThis && 'storage' in navigator && 'getDirectory' in navigator.storage) {
        this.opfsRoot = await navigator.storage.getDirectory();
        console.log('✅ OPFS initialized successfully');
      } else {
        throw new Error('OPFS not supported in this browser');
      }
    } catch (error) {
      console.warn('⚠️ OPFS not available, using simulation mode:', error);
      // Fallback to localStorage-based simulation
      this.opfsRoot = this.createSimulatedFileSystem();
    }
  }

  private createSimulatedFileSystem(): any {
    // Simple simulation using localStorage when OPFS isn't available
    const STORAGE_KEY = 'claudia-filesystem';
    
    const getFileSystem = () => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      } catch {
        return {};
      }
    };

    const saveFileSystem = (fs: any) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fs));
      } catch (error) {
        console.error('Failed to save simulated filesystem:', error);
      }
    };

    return {
      async getFileHandle(path: string, options?: { create?: boolean }) {
        const fs = getFileSystem();
        if (!fs[path] && !options?.create) {
          throw new Error(`File not found: ${path}`);
        }
        if (!fs[path]) {
          fs[path] = { type: 'file', content: '', lastModified: Date.now() };
          saveFileSystem(fs);
        }
        return {
          async getFile() {
            return {
              async text() { return fs[path].content; },
              size: fs[path].content.length,
              lastModified: fs[path].lastModified
            };
          },
          async createWritable() {
            return {
              async write(content: string) {
                fs[path].content = content;
                fs[path].lastModified = Date.now();
                saveFileSystem(fs);
              },
              async close() {}
            };
          }
        };
      },
      async getDirectoryHandle(path: string, options?: { create?: boolean }) {
        const fs = getFileSystem();
        if (!fs[path] && !options?.create) {
          throw new Error(`Directory not found: ${path}`);
        }
        if (!fs[path]) {
          fs[path] = { type: 'directory', children: {}, lastModified: Date.now() };
          saveFileSystem(fs);
        }
        return {
          async entries() {
            const entries = Object.keys(fs).filter(p => p.startsWith(path + '/')).map(p => [p.split('/').pop(), { kind: fs[p].type }]);
            return entries;
          }
        };
      },
      async removeEntry(path: string) {
        const fs = getFileSystem();
        delete fs[path];
        // Remove all children if it's a directory
        Object.keys(fs).forEach(p => {
          if (p.startsWith(path + '/')) {
            delete fs[p];
          }
        });
        saveFileSystem(fs);
      }
    };
  }

  private async handleReadFile(args: Record<string, unknown>): Promise<MCPToolResult> {
    const path = args.path as string;
    const encoding = (args.encoding as string) || 'utf-8';

    if (!path) {
      return {
        content: [{ type: 'text', text: 'File path is required' }],
        isError: true
      };
    }

    try {
      const fileHandle = await this.opfsRoot!.getFileHandle(path);
      const file = await fileHandle.getFile();
      
      let content: string;
      if (encoding === 'base64') {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        content = btoa(String.fromCharCode(...uint8Array));
      } else {
        content = await file.text();
      }

      return {
        content: [{
          type: 'text',
          text: `File: ${path}\nSize: ${file.size} bytes\nLast Modified: ${new Date(file.lastModified).toISOString()}\n\nContent:\n${content}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to read file '${path}': ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleWriteFile(args: Record<string, unknown>): Promise<MCPToolResult> {
    const path = args.path as string;
    const content = args.content as string;
    const encoding = (args.encoding as string) || 'utf-8';
    const createDirs = args.create_dirs !== false;

    if (!path || content === undefined) {
      return {
        content: [{ type: 'text', text: 'File path and content are required' }],
        isError: true
      };
    }

    try {
      // Create parent directories if needed
      if (createDirs && path.includes('/')) {
        const pathParts = path.split('/');
        pathParts.pop(); // Remove filename
        await this.createDirectoryRecursive(pathParts.join('/'));
      }

      const fileHandle = await this.opfsRoot!.getFileHandle(path, { create: true });
      const writable = await fileHandle.createWritable();

      if (encoding === 'base64') {
        const binaryString = atob(content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        await writable.write(bytes);
      } else {
        await writable.write(content);
      }

      await writable.close();

      return {
        content: [{
          type: 'text',
          text: `File '${path}' written successfully (${content.length} ${encoding === 'base64' ? 'base64 characters' : 'characters'})`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to write file '${path}': ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleListFiles(args: Record<string, unknown>): Promise<MCPToolResult> {
    const path = (args.path as string) || '';
    const recursive = args.recursive === true;
    const showHidden = args.show_hidden === true;

    try {
      const files = await this.listDirectory(path, recursive, showHidden);
      
      if (files.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `Directory '${path || '/'}' is empty`
          }]
        };
      }

      const formatted = files.map(file => 
        `${file.type === 'directory' ? '📁' : '📄'} ${file.name}${file.size !== undefined ? ` (${file.size} bytes)` : ''}`
      ).join('\n');

      return {
        content: [{
          type: 'text',
          text: `Contents of '${path || '/'}':\n\n${formatted}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to list directory '${path}': ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleCreateDirectory(args: Record<string, unknown>): Promise<MCPToolResult> {
    const path = args.path as string;
    const recursive = args.recursive !== false;

    if (!path) {
      return {
        content: [{ type: 'text', text: 'Directory path is required' }],
        isError: true
      };
    }

    try {
      if (recursive) {
        await this.createDirectoryRecursive(path);
      } else {
        await this.opfsRoot!.getDirectoryHandle(path, { create: true });
      }

      return {
        content: [{
          type: 'text',
          text: `Directory '${path}' created successfully`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to create directory '${path}': ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleDeleteFile(args: Record<string, unknown>): Promise<MCPToolResult> {
    const path = args.path as string;
    const recursive = args.recursive === true;

    if (!path) {
      return {
        content: [{ type: 'text', text: 'Path is required' }],
        isError: true
      };
    }

    try {
      await this.opfsRoot!.removeEntry(path, { recursive });

      return {
        content: [{
          type: 'text',
          text: `'${path}' deleted successfully`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to delete '${path}': ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleFileInfo(args: Record<string, unknown>): Promise<MCPToolResult> {
    const path = args.path as string;

    if (!path) {
      return {
        content: [{ type: 'text', text: 'Path is required' }],
        isError: true
      };
    }

    try {
      // Try as file first
      try {
        const fileHandle = await this.opfsRoot!.getFileHandle(path);
        const file = await fileHandle.getFile();
        
        return {
          content: [{
            type: 'text',
            text: `File: ${path}\nType: File\nSize: ${file.size} bytes\nLast Modified: ${new Date(file.lastModified).toISOString()}`
          }]
        };
      } catch {
        // Try as directory
        await this.opfsRoot!.getDirectoryHandle(path);
        
        return {
          content: [{
            type: 'text',
            text: `Directory: ${path}\nType: Directory`
          }]
        };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Path '${path}' not found: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleCopyFile(args: Record<string, unknown>): Promise<MCPToolResult> {
    const source = args.source as string;
    const destination = args.destination as string;
    const createDirs = args.create_dirs !== false;

    if (!source || !destination) {
      return {
        content: [{ type: 'text', text: 'Source and destination paths are required' }],
        isError: true
      };
    }

    try {
      // Read source file
      const sourceHandle = await this.opfsRoot!.getFileHandle(source);
      const sourceFile = await sourceHandle.getFile();
      const content = await sourceFile.arrayBuffer();

      // Create destination directories if needed
      if (createDirs && destination.includes('/')) {
        const pathParts = destination.split('/');
        pathParts.pop();
        await this.createDirectoryRecursive(pathParts.join('/'));
      }

      // Write to destination
      const destHandle = await this.opfsRoot!.getFileHandle(destination, { create: true });
      const writable = await destHandle.createWritable();
      await writable.write(content);
      await writable.close();

      return {
        content: [{
          type: 'text',
          text: `File copied from '${source}' to '${destination}' (${content.byteLength} bytes)`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleMoveFile(args: Record<string, unknown>): Promise<MCPToolResult> {
    const source = args.source as string;
    const destination = args.destination as string;

    if (!source || !destination) {
      return {
        content: [{ type: 'text', text: 'Source and destination paths are required' }],
        isError: true
      };
    }

    try {
      // Copy file first
      const copyResult = await this.handleCopyFile(args);
      if (copyResult.isError) {
        return copyResult;
      }

      // Delete source
      await this.opfsRoot!.removeEntry(source);

      return {
        content: [{
          type: 'text',
          text: `File moved from '${source}' to '${destination}'`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleSearchFiles(args: Record<string, unknown>): Promise<MCPToolResult> {
    const pattern = args.pattern as string;
    const path = (args.path as string) || '';
    const recursive = args.recursive !== false;

    if (!pattern) {
      return {
        content: [{ type: 'text', text: 'Search pattern is required' }],
        isError: true
      };
    }

    try {
      const files = await this.listDirectory(path, recursive, true);
      const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
      
      const matches = files.filter(file => regex.test(file.name));
      
      if (matches.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No files found matching pattern '${pattern}' in '${path || '/'}'`
          }]
        };
      }

      const formatted = matches.map(file => 
        `${file.type === 'directory' ? '📁' : '📄'} ${file.path}${file.size !== undefined ? ` (${file.size} bytes)` : ''}`
      ).join('\n');

      return {
        content: [{
          type: 'text',
          text: `Found ${matches.length} files matching '${pattern}':\n\n${formatted}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async createDirectoryRecursive(path: string): Promise<void> {
    if (!path) return;
    
    const parts = path.split('/').filter(Boolean);
    let currentHandle = this.opfsRoot!;
    
    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
    }
  }

  private async listDirectory(path: string, recursive: boolean, showHidden: boolean): Promise<Array<{ name: string; type: 'file' | 'directory'; path: string; size?: number }>> {
    const results: Array<{ name: string; type: 'file' | 'directory'; path: string; size?: number }> = [];
    
    try {
      let dirHandle = this.opfsRoot!;
      if (path) {
        const parts = path.split('/').filter(Boolean);
        for (const part of parts) {
          dirHandle = await dirHandle.getDirectoryHandle(part);
        }
      }

      for await (const [name, handle] of (dirHandle as any).entries()) {
        if (!showHidden && name.startsWith('.')) continue;
        
        const fullPath = path ? `${path}/${name}` : name;
        
        if (handle.kind === 'file') {
          const fileHandle = handle as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          results.push({
            name,
            type: 'file',
            path: fullPath,
            size: file.size
          });
        } else {
          results.push({
            name,
            type: 'directory',
            path: fullPath
          });
          
          if (recursive) {
            const subResults = await this.listDirectory(fullPath, true, showHidden);
            results.push(...subResults);
          }
        }
      }
    } catch (error) {
      console.error('Error listing directory:', error);
    }
    
    return results.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }
}