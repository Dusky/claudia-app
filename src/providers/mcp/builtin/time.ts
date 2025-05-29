// Built-in Time MCP Server for browser environment
// Provides timezone and time-related operations

import type { MCPTool, MCPToolCall, MCPToolResult } from '../types';

export class BuiltinTimeServer {
  readonly id = 'builtin-time';
  readonly name = 'Built-in Time';
  readonly description = 'Time and timezone operations';

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'get_current_time',
        description: 'Get the current date and time in a specified timezone',
        inputSchema: {
          type: 'object',
          properties: {
            timezone: {
              type: 'string',
              description: 'Timezone identifier (e.g., "America/New_York", "UTC", "local")',
              default: 'local'
            },
            format: {
              type: 'string',
              description: 'Output format: "iso", "locale", "unix", "relative"',
              enum: ['iso', 'locale', 'unix', 'relative'],
              default: 'iso'
            }
          }
        }
      },
      {
        name: 'convert_timezone',
        description: 'Convert time from one timezone to another',
        inputSchema: {
          type: 'object',
          properties: {
            time: {
              type: 'string',
              description: 'Time string to convert (ISO format or common formats)'
            },
            from_timezone: {
              type: 'string',
              description: 'Source timezone identifier',
              default: 'local'
            },
            to_timezone: {
              type: 'string',
              description: 'Target timezone identifier'
            },
            format: {
              type: 'string',
              description: 'Output format',
              enum: ['iso', 'locale', 'unix'],
              default: 'iso'
            }
          },
          required: ['time', 'to_timezone']
        }
      },
      {
        name: 'parse_time',
        description: 'Parse a time string and extract information',
        inputSchema: {
          type: 'object',
          properties: {
            time_string: {
              type: 'string',
              description: 'Time string to parse'
            },
            timezone: {
              type: 'string',
              description: 'Timezone to interpret the time in',
              default: 'local'
            }
          },
          required: ['time_string']
        }
      },
      {
        name: 'get_timezone_info',
        description: 'Get information about a timezone',
        inputSchema: {
          type: 'object',
          properties: {
            timezone: {
              type: 'string',
              description: 'Timezone identifier to get info for'
            }
          },
          required: ['timezone']
        }
      },
      {
        name: 'list_timezones',
        description: 'List available timezone identifiers',
        inputSchema: {
          type: 'object',
          properties: {
            region: {
              type: 'string',
              description: 'Filter by region (e.g., "America", "Europe", "Asia")'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of timezones to return',
              default: 50
            }
          }
        }
      }
    ];
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      switch (toolCall.name) {
        case 'get_current_time':
          return await this.handleGetCurrentTime(toolCall.arguments);
        case 'convert_timezone':
          return await this.handleConvertTimezone(toolCall.arguments);
        case 'parse_time':
          return await this.handleParseTime(toolCall.arguments);
        case 'get_timezone_info':
          return await this.handleGetTimezoneInfo(toolCall.arguments);
        case 'list_timezones':
          return await this.handleListTimezones(toolCall.arguments);
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

  private async handleGetCurrentTime(args: Record<string, unknown>): Promise<MCPToolResult> {
    const timezone = (args.timezone as string) || 'local';
    const format = (args.format as string) || 'iso';

    try {
      const now = new Date();
      let result: string;

      switch (format) {
        case 'iso':
          if (timezone === 'local') {
            result = now.toISOString();
          } else {
            result = now.toLocaleString('sv-SE', { timeZone: timezone }).replace(' ', 'T') + 'Z';
          }
          break;
        case 'locale':
          if (timezone === 'local') {
            result = now.toLocaleString();
          } else {
            result = now.toLocaleString('en-US', { timeZone: timezone });
          }
          break;
        case 'unix':
          result = Math.floor(now.getTime() / 1000).toString();
          break;
        case 'relative':
          result = 'now';
          break;
        default:
          result = now.toISOString();
      }

      const timezoneDisplay = timezone === 'local' ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;

      return {
        content: [{
          type: 'text',
          text: `Current time in ${timezoneDisplay}: ${result}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to get current time: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleConvertTimezone(args: Record<string, unknown>): Promise<MCPToolResult> {
    const timeString = args.time as string;
    const fromTimezone = (args.from_timezone as string) || 'local';
    const toTimezone = args.to_timezone as string;
    const format = (args.format as string) || 'iso';

    if (!timeString || !toTimezone) {
      return {
        content: [{ type: 'text', text: 'Time string and target timezone are required' }],
        isError: true
      };
    }

    try {
      // Parse the input time
      const inputDate = new Date(timeString);
      if (isNaN(inputDate.getTime())) {
        return {
          content: [{ type: 'text', text: 'Invalid time format' }],
          isError: true
        };
      }

      let result: string;
      switch (format) {
        case 'iso':
          result = inputDate.toLocaleString('sv-SE', { timeZone: toTimezone }).replace(' ', 'T') + 'Z';
          break;
        case 'locale':
          result = inputDate.toLocaleString('en-US', { timeZone: toTimezone });
          break;
        case 'unix':
          result = Math.floor(inputDate.getTime() / 1000).toString();
          break;
        default:
          result = inputDate.toLocaleString('sv-SE', { timeZone: toTimezone }).replace(' ', 'T') + 'Z';
      }

      return {
        content: [{
          type: 'text',
          text: `Time converted from ${fromTimezone} to ${toTimezone}: ${result}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to convert timezone: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleParseTime(args: Record<string, unknown>): Promise<MCPToolResult> {
    const timeString = args.time_string as string;
    const timezone = (args.timezone as string) || 'local';

    if (!timeString) {
      return {
        content: [{ type: 'text', text: 'Time string is required' }],
        isError: true
      };
    }

    try {
      const parsed = new Date(timeString);
      if (isNaN(parsed.getTime())) {
        return {
          content: [{ type: 'text', text: 'Invalid time format' }],
          isError: true
        };
      }

      const info = {
        iso: parsed.toISOString(),
        unix: Math.floor(parsed.getTime() / 1000),
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        day: parsed.getDate(),
        hour: parsed.getHours(),
        minute: parsed.getMinutes(),
        second: parsed.getSeconds(),
        dayOfWeek: parsed.toLocaleDateString('en-US', { weekday: 'long' }),
        timezone: timezone === 'local' ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone
      };

      return {
        content: [{
          type: 'text',
          text: `Parsed time information:\n${JSON.stringify(info, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to parse time: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleGetTimezoneInfo(args: Record<string, unknown>): Promise<MCPToolResult> {
    const timezone = args.timezone as string;

    if (!timezone) {
      return {
        content: [{ type: 'text', text: 'Timezone identifier is required' }],
        isError: true
      };
    }

    try {
      const now = new Date();
      const timeInTz = now.toLocaleString('en-US', { timeZone: timezone });
      const offset = this.getTimezoneOffset(timezone);
      
      const info = {
        timezone,
        currentTime: timeInTz,
        offset,
        isDST: this.isDaylightSavingTime(timezone, now)
      };

      return {
        content: [{
          type: 'text',
          text: `Timezone information:\n${JSON.stringify(info, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to get timezone info: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleListTimezones(args: Record<string, unknown>): Promise<MCPToolResult> {
    const region = args.region as string;
    const limit = (args.limit as number) || 50;

    try {
      // Get common timezone identifiers
      const timezones = this.getCommonTimezones();
      
      let filteredTimezones = timezones;
      if (region) {
        filteredTimezones = timezones.filter(tz => 
          tz.toLowerCase().includes(region.toLowerCase())
        );
      }

      const limitedTimezones = filteredTimezones.slice(0, limit);

      return {
        content: [{
          type: 'text',
          text: `Available timezones${region ? ` (filtered by "${region}")` : ''}:\n${limitedTimezones.join('\n')}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to list timezones: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private getTimezoneOffset(timezone: string): string {
    try {
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const tzTime = new Date(utcTime + (this.getTimezoneOffsetMinutes(timezone) * 60000));
      const offset = (tzTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return `UTC${offset >= 0 ? '+' : ''}${offset}`;
    } catch {
      return 'Unknown';
    }
  }

  private getTimezoneOffsetMinutes(timezone: string): number {
    try {
      const now = new Date();
      const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const localDate = new Date(now.toLocaleString('en-US'));
      return (tzDate.getTime() - localDate.getTime()) / (1000 * 60);
    } catch {
      return 0;
    }
  }

  private isDaylightSavingTime(timezone: string, _date: Date): boolean {
    try {
      // Simple DST detection by comparing current offset with standard time
      const currentOffset = this.getTimezoneOffsetMinutes(timezone);
      
      // Create dates for January and July to compare offsets
      const now = new Date();
      const january = new Date(now.getFullYear(), 0, 1);
      const july = new Date(now.getFullYear(), 6, 1);
      
      const janDate = new Date(january.toLocaleString('en-US', { timeZone: timezone }));
      const julDate = new Date(july.toLocaleString('en-US', { timeZone: timezone }));
      
      const janOffset = (janDate.getTime() - january.getTime()) / (1000 * 60);
      const julOffset = (julDate.getTime() - july.getTime()) / (1000 * 60);
      
      return Math.max(janOffset, julOffset) !== currentOffset;
    } catch {
      return false;
    }
  }

  private getCommonTimezones(): string[] {
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Toronto',
      'America/Vancouver',
      'America/Mexico_City',
      'America/Sao_Paulo',
      'America/Buenos_Aires',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Rome',
      'Europe/Madrid',
      'Europe/Amsterdam',
      'Europe/Stockholm',
      'Europe/Moscow',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Hong_Kong',
      'Asia/Singapore',
      'Asia/Mumbai',
      'Asia/Dubai',
      'Asia/Seoul',
      'Asia/Bangkok',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Australia/Perth',
      'Pacific/Auckland',
      'Pacific/Honolulu',
      'Africa/Cairo',
      'Africa/Johannesburg',
      'Africa/Lagos'
    ];
  }
}