// Built-in SQLite MCP Server for browser environment
// Uses WebAssembly SQLite for database operations

import type { MCPTool, MCPToolCall, MCPToolResult } from '../types';

interface SQLiteDatabase {
  exec(sql: string): Array<{columns: string[], values: unknown[][]}>;
  close(): void;
}

declare global {
  interface Window {
    initSqlJs?: () => Promise<{
      Database: new (data?: Uint8Array) => SQLiteDatabase;
      FS: {
        writeFile: (filename: string, data: Uint8Array) => void;
        readFile: (filename: string) => Uint8Array;
        unlink: (filename: string) => void;
      };
    }>;
  }
}

export class BuiltinSQLiteServer {
  readonly id = 'builtin-sqlite';
  readonly name = 'Built-in SQLite';
  readonly description = 'SQLite database operations in browser';
  
  private sqliteModule: any = null;
  private databases = new Map<string, SQLiteDatabase>();

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'create_database',
        description: 'Create a new SQLite database',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Database name/identifier'
            },
            from_file: {
              type: 'string',
              description: 'Optional: Initialize from existing database file data (base64)'
            }
          },
          required: ['name']
        }
      },
      {
        name: 'execute_sql',
        description: 'Execute SQL query on a database',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Database name'
            },
            sql: {
              type: 'string',
              description: 'SQL query to execute'
            },
            format: {
              type: 'string',
              description: 'Output format: table, json, csv',
              enum: ['table', 'json', 'csv'],
              default: 'table'
            }
          },
          required: ['database', 'sql']
        }
      },
      {
        name: 'list_tables',
        description: 'List all tables in a database',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Database name'
            }
          },
          required: ['database']
        }
      },
      {
        name: 'describe_table',
        description: 'Get schema information for a table',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Database name'
            },
            table: {
              type: 'string',
              description: 'Table name'
            }
          },
          required: ['database', 'table']
        }
      },
      {
        name: 'export_database',
        description: 'Export database as SQL dump or binary data',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Database name'
            },
            format: {
              type: 'string',
              description: 'Export format: sql, binary',
              enum: ['sql', 'binary'],
              default: 'sql'
            }
          },
          required: ['database']
        }
      },
      {
        name: 'close_database',
        description: 'Close and remove database from memory',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Database name'
            }
          },
          required: ['database']
        }
      },
      {
        name: 'list_databases',
        description: 'List all open databases',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      // Initialize SQLite module if needed
      await this.initializeSQLite();

      switch (toolCall.name) {
        case 'create_database':
          return await this.handleCreateDatabase(toolCall.arguments);
        case 'execute_sql':
          return await this.handleExecuteSQL(toolCall.arguments);
        case 'list_tables':
          return await this.handleListTables(toolCall.arguments);
        case 'describe_table':
          return await this.handleDescribeTable(toolCall.arguments);
        case 'export_database':
          return await this.handleExportDatabase(toolCall.arguments);
        case 'close_database':
          return await this.handleCloseDatabase(toolCall.arguments);
        case 'list_databases':
          return await this.handleListDatabases(toolCall.arguments);
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

  private async initializeSQLite(): Promise<void> {
    if (this.sqliteModule) return;

    try {
      // Try to load sql.js (WebAssembly SQLite)
      if (typeof window !== 'undefined' && window.initSqlJs) {
        this.sqliteModule = await window.initSqlJs();
        console.log('✅ SQLite WebAssembly module loaded');
      } else {
        // Fallback: use a simple in-memory storage simulation
        console.warn('⚠️ SQLite WebAssembly not available, using simulation mode');
        this.sqliteModule = this.createSimulatedSQLite();
      }
    } catch (error) {
      console.warn('⚠️ Failed to load SQLite, using simulation mode:', error);
      this.sqliteModule = this.createSimulatedSQLite();
    }
  }

  private createSimulatedSQLite() {
    // Simple simulation for when WASM SQLite isn't available
    const simulatedStorage = new Map<string, Map<string, any[]>>();

    return {
      Database: class {
        private storage: Map<string, any[]>;
        private dbName: string;

        constructor(dbName: string = 'default') {
          this.dbName = dbName;
          this.storage = simulatedStorage.get(dbName) || new Map();
          simulatedStorage.set(dbName, this.storage);
        }

        exec(sql: string) {
          const sqlLower = sql.toLowerCase().trim();
          
          if (sqlLower.startsWith('create table')) {
            const match = sql.match(/create table\s+(\w+)/i);
            if (match) {
              const tableName = match[1];
              this.storage.set(tableName, []);
              return [];
            }
          }
          
          if (sqlLower.startsWith('insert into')) {
            const match = sql.match(/insert into\s+(\w+)\s*\([^)]+\)\s*values\s*\(([^)]+)\)/i);
            if (match) {
              const tableName = match[1];
              const valuesStr = match[2];
              const values = valuesStr.split(',').map(v => v.trim().replace(/'/g, ''));
              const table = this.storage.get(tableName) || [];
              table.push(values);
              this.storage.set(tableName, table);
              return [];
            }
          }
          
          if (sqlLower.startsWith('select')) {
            const match = sql.match(/from\s+(\w+)/i);
            if (match) {
              const tableName = match[1];
              const table = this.storage.get(tableName) || [];
              return [{
                columns: ['col1', 'col2', 'col3'],
                values: table
              }];
            }
          }

          if (sqlLower === "select name from sqlite_master where type='table'") {
            const tables = Array.from(this.storage.keys()).map(name => [name]);
            return [{
              columns: ['name'],
              values: tables
            }];
          }
          
          return [{
            columns: ['result'],
            values: [['Simulated SQLite - SQL executed successfully']]
          }];
        }

        close() {
          // Cleanup if needed
          console.log(`Closing simulated database: ${this.dbName}`);
        }
      }
    };
  }

  private async handleCreateDatabase(args: Record<string, unknown>): Promise<MCPToolResult> {
    const name = args.name as string;
    const fromFile = args.from_file as string;

    if (!name) {
      return {
        content: [{ type: 'text', text: 'Database name is required' }],
        isError: true
      };
    }

    try {
      let db: SQLiteDatabase;
      
      if (fromFile) {
        // Initialize from existing data
        const binaryData = Uint8Array.from(atob(fromFile), c => c.charCodeAt(0));
        db = new this.sqliteModule.Database(binaryData);
      } else {
        // Create new empty database
        db = new this.sqliteModule.Database();
      }

      this.databases.set(name, db);

      return {
        content: [{
          type: 'text',
          text: `Database '${name}' created successfully${fromFile ? ' from existing data' : ''}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to create database: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleExecuteSQL(args: Record<string, unknown>): Promise<MCPToolResult> {
    const dbName = args.database as string;
    const sql = args.sql as string;
    const format = (args.format as string) || 'table';

    if (!dbName || !sql) {
      return {
        content: [{ type: 'text', text: 'Database name and SQL query are required' }],
        isError: true
      };
    }

    const db = this.databases.get(dbName);
    if (!db) {
      return {
        content: [{
          type: 'text',
          text: `Database '${dbName}' not found. Use create_database first.`
        }],
        isError: true
      };
    }

    try {
      const results = db.exec(sql);
      
      if (results.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'Query executed successfully (no results returned)'
          }]
        };
      }

      let output = '';
      for (const result of results) {
        output += this.formatQueryResult(result, format) + '\n\n';
      }

      return {
        content: [{
          type: 'text',
          text: output.trim()
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `SQL Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleListTables(args: Record<string, unknown>): Promise<MCPToolResult> {
    const dbName = args.database as string;

    if (!dbName) {
      return {
        content: [{ type: 'text', text: 'Database name is required' }],
        isError: true
      };
    }

    const db = this.databases.get(dbName);
    if (!db) {
      return {
        content: [{
          type: 'text',
          text: `Database '${dbName}' not found`
        }],
        isError: true
      };
    }

    try {
      const results = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
      
      if (results.length === 0 || results[0].values.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No tables found in database '${dbName}'`
          }]
        };
      }

      const tables = results[0].values.map(row => row[0] as string);
      return {
        content: [{
          type: 'text',
          text: `Tables in database '${dbName}':\n${tables.join('\n')}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error listing tables: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleDescribeTable(args: Record<string, unknown>): Promise<MCPToolResult> {
    const dbName = args.database as string;
    const tableName = args.table as string;

    if (!dbName || !tableName) {
      return {
        content: [{ type: 'text', text: 'Database name and table name are required' }],
        isError: true
      };
    }

    const db = this.databases.get(dbName);
    if (!db) {
      return {
        content: [{
          type: 'text',
          text: `Database '${dbName}' not found`
        }],
        isError: true
      };
    }

    try {
      const results = db.exec(`PRAGMA table_info(${tableName})`);
      
      if (results.length === 0 || results[0].values.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `Table '${tableName}' not found in database '${dbName}'`
          }],
          isError: true
        };
      }

      const schema = this.formatQueryResult(results[0], 'table');
      return {
        content: [{
          type: 'text',
          text: `Schema for table '${tableName}':\n\n${schema}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error describing table: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleExportDatabase(args: Record<string, unknown>): Promise<MCPToolResult> {
    const dbName = args.database as string;
    const format = (args.format as string) || 'sql';

    if (!dbName) {
      return {
        content: [{ type: 'text', text: 'Database name is required' }],
        isError: true
      };
    }

    const db = this.databases.get(dbName);
    if (!db) {
      return {
        content: [{
          type: 'text',
          text: `Database '${dbName}' not found`
        }],
        isError: true
      };
    }

    try {
      if (format === 'binary') {
        // Export as binary data (base64 encoded)
        const binaryData = (db as any).export();
        const base64Data = btoa(String.fromCharCode(...binaryData));
        return {
          content: [{
            type: 'text',
            text: `Binary export of database '${dbName}' (base64):\n${base64Data}`
          }]
        };
      } else {
        // Export as SQL dump
        const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
        let sqlDump = `-- SQLite dump for database '${dbName}'\n\n`;
        
        for (const tableRow of tables[0]?.values || []) {
          const tableName = tableRow[0] as string;
          const createTable = db.exec(`SELECT sql FROM sqlite_master WHERE name='${tableName}'`);
          if (createTable[0]?.values[0]) {
            sqlDump += `${createTable[0].values[0][0]};\n\n`;
          }
          
          const data = db.exec(`SELECT * FROM ${tableName}`);
          if (data[0]?.values.length) {
            for (const row of data[0].values) {
              const values = row.map(v => typeof v === 'string' ? `'${v}'` : v).join(', ');
              sqlDump += `INSERT INTO ${tableName} VALUES (${values});\n`;
            }
            sqlDump += '\n';
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: sqlDump
          }]
        };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error exporting database: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleCloseDatabase(args: Record<string, unknown>): Promise<MCPToolResult> {
    const dbName = args.database as string;

    if (!dbName) {
      return {
        content: [{ type: 'text', text: 'Database name is required' }],
        isError: true
      };
    }

    const db = this.databases.get(dbName);
    if (!db) {
      return {
        content: [{
          type: 'text',
          text: `Database '${dbName}' not found`
        }],
        isError: true
      };
    }

    try {
      db.close();
      this.databases.delete(dbName);

      return {
        content: [{
          type: 'text',
          text: `Database '${dbName}' closed successfully`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error closing database: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleListDatabases(_args: Record<string, unknown>): Promise<MCPToolResult> {
    const dbNames = Array.from(this.databases.keys());
    
    if (dbNames.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No databases currently open'
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: `Open databases:\n${dbNames.join('\n')}`
      }]
    };
  }

  private formatQueryResult(result: {columns: string[], values: unknown[][]}, format: string): string {
    const { columns, values } = result;
    
    switch (format) {
      case 'json':
        const jsonData = values.map(row => {
          const obj: Record<string, unknown> = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
        return JSON.stringify(jsonData, null, 2);
        
      case 'csv':
        let csv = columns.join(',') + '\n';
        csv += values.map(row => row.map(val => `"${val}"`).join(',')).join('\n');
        return csv;
        
      case 'table':
      default:
        if (values.length === 0) {
          return `Columns: ${columns.join(', ')}\n(No rows)`;
        }
        
        // Calculate column widths
        const widths = columns.map((col, i) => 
          Math.max(col.length, ...values.map(row => String(row[i] || '').length))
        );
        
        // Create table
        let table = '';
        table += columns.map((col, i) => col.padEnd(widths[i])).join(' | ') + '\n';
        table += widths.map(w => '-'.repeat(w)).join('-+-') + '\n';
        table += values.map(row => 
          row.map((val, i) => String(val || '').padEnd(widths[i])).join(' | ')
        ).join('\n');
        
        return table;
    }
  }
}