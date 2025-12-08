/**
 * Google Calendar MCP Server
 * Registers tools for Google Calendar integration
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listCalendars } from './tools/listCalendars.js';
import { listEvents } from './tools/listEvents.js';
import { searchEvents } from './tools/searchEvents.js';
import { createEvent } from './tools/createEvent.js';
import { updateEvent } from './tools/updateEvent.js';
import { deleteEvent } from './tools/deleteEvent.js';
import { getFreeBusy } from './tools/getFreeBusy.js';
import { quickAdd } from './tools/quickAdd.js';
import { createCalendar } from './tools/createCalendar.js';
import { deleteCalendar } from './tools/deleteCalendar.js';
import { logger } from './utils/logger.js';

/**
 * Tool schemas using Zod
 */
const ListCalendarsParamsSchema = {
  maxResults: z.number().optional().describe('Maximum number of calendars to return (default: 50)'),
};

const ListEventsParamsSchema = {
  calendarId: z.string().optional().describe('Calendar ID (default: primary)'),
  timeMin: z.string().optional().describe('Start time in RFC3339 format (e.g., 2024-01-01T00:00:00Z)'),
  timeMax: z.string().optional().describe('End time in RFC3339 format'),
  maxResults: z.number().optional().describe('Maximum number of events to return (default: 20)'),
  orderBy: z.enum(['startTime', 'updated']).optional().describe('Sort order (default: startTime)'),
};

const SearchEventsParamsSchema = {
  query: z.string().describe('Search query text (required)'),
  calendarId: z.string().optional().describe('Calendar ID (default: primary)'),
  timeMin: z.string().optional().describe('Start time in RFC3339 format'),
  timeMax: z.string().optional().describe('End time in RFC3339 format'),
  maxResults: z.number().optional().describe('Maximum number of results (default: 20)'),
};

const CreateEventParamsSchema = {
  calendarId: z.string().optional().describe('Calendar ID (default: primary)'),
  summary: z.string().describe('Event title (required)'),
  description: z.string().optional().describe('Event description'),
  location: z.string().optional().describe('Event location'),
  start: z.object({
    dateTime: z.string().optional().describe('Start date-time in RFC3339 format'),
    date: z.string().optional().describe('Start date for all-day events (YYYY-MM-DD)'),
    timeZone: z.string().optional().describe('Time zone (e.g., America/New_York)'),
  }).catchall(z.unknown()).describe('Event start time (required)'),
  end: z.object({
    dateTime: z.string().optional().describe('End date-time in RFC3339 format'),
    date: z.string().optional().describe('End date for all-day events (YYYY-MM-DD)'),
    timeZone: z.string().optional().describe('Time zone'),
  }).catchall(z.unknown()).describe('Event end time (required)'),
  attendees: z.array(z.object({
    email: z.string().email().describe('Attendee email address'),
    displayName: z.string().optional().describe('Attendee display name'),
  }).catchall(z.unknown())).optional().describe('List of attendees'),
  reminders: z.object({
    useDefault: z.boolean().optional().describe('Use default reminders'),
    overrides: z.array(z.object({
      method: z.enum(['email', 'popup']).describe('Reminder method'),
      minutes: z.number().describe('Minutes before event'),
    }).catchall(z.unknown())).optional().describe('Custom reminder overrides'),
  }).catchall(z.unknown()).optional().describe('Event reminders'),
  recurrence: z.array(z.string()).optional().describe('Recurrence rules in RRULE format'),
};

const UpdateEventParamsSchema = {
  calendarId: z.string().optional().describe('Calendar ID (default: primary)'),
  eventId: z.string().describe('Event ID to update (required)'),
  summary: z.string().optional().describe('New event title'),
  description: z.string().optional().describe('New event description'),
  location: z.string().optional().describe('New event location'),
  start: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }).catchall(z.unknown()).optional().describe('New start time'),
  end: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }).catchall(z.unknown()).optional().describe('New end time'),
  attendees: z.array(z.object({
    email: z.string().email(),
    displayName: z.string().optional(),
  }).catchall(z.unknown())).optional().describe('Updated attendee list'),
  reminders: z.object({
    useDefault: z.boolean().optional(),
    overrides: z.array(z.object({
      method: z.enum(['email', 'popup']),
      minutes: z.number(),
    }).catchall(z.unknown())).optional(),
  }).catchall(z.unknown()).optional().describe('Updated reminders'),
};

const DeleteEventParamsSchema = {
  calendarId: z.string().optional().describe('Calendar ID (default: primary)'),
  eventId: z.string().describe('Event ID to delete (required)'),
};

const GetFreeBusyParamsSchema = {
  calendarIds: z.array(z.string()).describe('Array of calendar IDs to query (required)'),
  timeMin: z.string().describe('Start time in RFC3339 format (required)'),
  timeMax: z.string().describe('End time in RFC3339 format (required)'),
  timeZone: z.string().optional().describe('Time zone (default: UTC)'),
};

const QuickAddParamsSchema = {
  calendarId: z.string().optional().describe('Calendar ID (default: primary)'),
  text: z.string().describe('Natural language event description (e.g., "Dinner with John tomorrow 7pm") (required)'),
};

const CreateCalendarParamsSchema = {
  summary: z.string().describe('Calendar name (required)'),
  description: z.string().optional().describe('Calendar description'),
  timeZone: z.string().optional().describe('Calendar time zone (default: UTC)'),
};

const DeleteCalendarParamsSchema = {
  calendarId: z.string().describe('Calendar ID to delete (required)'),
};

/**
 * Google Calendar MCP Server
 */
export class GoogleCalendarMcpServer {
  private server: McpServer;
  private toolHandlers: Map<string, (args: any) => Promise<any>>;

  constructor() {
    this.server = new McpServer({
      name: 'google-calendar',
      version: '1.0.0',
    });

    // Initialize tool handlers map
    this.toolHandlers = new Map<string, (args: any) => Promise<any>>([
      ['gcalendarListCalendars', listCalendars as (args: any) => Promise<any>],
      ['gcalendarListEvents', listEvents as (args: any) => Promise<any>],
      ['gcalendarSearchEvents', searchEvents as (args: any) => Promise<any>],
      ['gcalendarCreateEvent', createEvent as (args: any) => Promise<any>],
      ['gcalendarUpdateEvent', updateEvent as (args: any) => Promise<any>],
      ['gcalendarDeleteEvent', deleteEvent as (args: any) => Promise<any>],
      ['gcalendarGetFreeBusy', getFreeBusy as (args: any) => Promise<any>],
      ['gcalendarQuickAdd', quickAdd as (args: any) => Promise<any>],
      ['gcalendarCreateCalendar', createCalendar as (args: any) => Promise<any>],
      ['gcalendarDeleteCalendar', deleteCalendar as (args: any) => Promise<any>],
    ]);
  }

  /**
   * Initialize server and register tools
   */
  async initialize() {
    logger.info('[Server] Initializing Google Calendar MCP Server');

    // Register token update notification handler
    // This allows peta-core to update the access token without restarting the server
    const TokenUpdateNotificationSchema = z.object({
      method: z.literal('notifications/token/update'),
      params: z.object({
        token: z.string(),
        timestamp: z.number().optional()
      }).catchall(z.unknown())
    }).catchall(z.unknown());

    this.server.server.setNotificationHandler(
      TokenUpdateNotificationSchema,
      async (notification) => {
        logger.info('[Token] Received token update notification');

        const { token: newToken, timestamp } = notification.params;

        // Validate token format
        if (!newToken || typeof newToken !== 'string' || newToken.length === 0) {
          logger.error('[Token] Invalid token received in notification');
          return;
        }

        // Update environment variable (used by getCurrentToken() in token.ts)
        process.env.accessToken = newToken;

        logger.info('[Token] Access token updated successfully', {
          timestamp: timestamp ? new Date(timestamp).toISOString() : 'N/A',
          tokenPrefix: newToken.substring(0, 10) + '...'
        });
      }
    );

    logger.info('[Server] Token update notification handler registered');

    // Register tools in order

    // Tool 1: List Calendars
    this.server.registerTool(
      'gcalendarListCalendars',
      {
        title: 'GCalendar - List Calendars',
        description: 'List all calendars accessible by the authenticated user. Returns calendar metadata including ID, name, description, and time zone.',
        inputSchema: ListCalendarsParamsSchema,
      },
      async (params: any) => {
        return await listCalendars(params);
      }
    );

    // Tool 2: List Events
    this.server.registerTool(
      'gcalendarListEvents',
      {
        title: 'GCalendar - List Events',
        description: 'List events from a specific calendar within a time range. Supports filtering by time, ordering, and pagination.',
        inputSchema: ListEventsParamsSchema,
      },
      async (params: any) => {
        return await listEvents(params);
      }
    );

    // Tool 3: Search Events
    this.server.registerTool(
      'gcalendarSearchEvents',
      {
        title: 'GCalendar - Search Events',
        description: 'Search for events matching a query string. Supports full-text search across event titles, descriptions, and locations.',
        inputSchema: SearchEventsParamsSchema,
      },
      async (params: any) => {
        return await searchEvents(params);
      }
    );

    // Tool 4: Create Event
    this.server.registerTool(
      'gcalendarCreateEvent',
      {
        title: 'GCalendar - Create Event',
        description: 'Create a new calendar event with full details including attendees, reminders, and recurrence rules. Supports both timed and all-day events.',
        inputSchema: CreateEventParamsSchema,
      },
      async (params: any) => {
        return await createEvent(params);
      }
    );

    // Tool 5: Update Event
    this.server.registerTool(
      'gcalendarUpdateEvent',
      {
        title: 'GCalendar - Update Event',
        description: 'Update an existing event. Can modify title, description, time, location, attendees, and reminders. Sends notifications to attendees.',
        inputSchema: UpdateEventParamsSchema,
      },
      async (params: any) => {
        return await updateEvent(params);
      }
    );

    // Tool 6: Delete Event
    this.server.registerTool(
      'gcalendarDeleteEvent',
      {
        title: 'GCalendar - Delete Event',
        description: 'Delete a calendar event. Sends cancellation notifications to all attendees.',
        inputSchema: DeleteEventParamsSchema,
      },
      async (params: any) => {
        return await deleteEvent(params);
      }
    );

    // Tool 7: Get Free/Busy
    this.server.registerTool(
      'gcalendarGetFreeBusy',
      {
        title: 'GCalendar - Get Free/Busy',
        description: 'Query free/busy information for multiple calendars within a time range. Useful for finding available meeting times.',
        inputSchema: GetFreeBusyParamsSchema,
      },
      async (params: any) => {
        return await getFreeBusy(params);
      }
    );

    // Tool 8: Quick Add
    this.server.registerTool(
      'gcalendarQuickAdd',
      {
        title: 'GCalendar - Quick Add Event',
        description: 'Create an event from natural language text (e.g., "Dinner with John tomorrow 7pm"). Google Calendar parses the text automatically.',
        inputSchema: QuickAddParamsSchema,
      },
      async (params: any) => {
        return await quickAdd(params);
      }
    );

    // Tool 9: Create Calendar
    this.server.registerTool(
      'gcalendarCreateCalendar',
      {
        title: 'GCalendar - Create Calendar',
        description: 'Create a new calendar with a name, description, and time zone.',
        inputSchema: CreateCalendarParamsSchema,
      },
      async (params: any) => {
        return await createCalendar(params);
      }
    );

    // Tool 10: Delete Calendar
    this.server.registerTool(
      'gcalendarDeleteCalendar',
      {
        title: 'GCalendar - Delete Calendar',
        description: 'Delete a calendar. This permanently removes the calendar and all its events. Cannot delete the primary calendar.',
        inputSchema: DeleteCalendarParamsSchema,
      },
      async (params: any) => {
        return await deleteCalendar(params);
      }
    );

    logger.info('[Server] Registered 10 tools');
  }

  /**
   * Get the underlying MCP server instance
   */
  getServer(): McpServer {
    return this.server;
  }

  /**
   * Connect to transport
   */
  async connect(transport: any) {
    await this.server.connect(transport);
    logger.info('[Server] Connected to transport');
  }

  /**
   * Call a tool directly (for REST API mode)
   */
  async callTool(toolName: string, args: any) {
    logger.debug(`[Server] Calling tool: ${toolName}`);

    const handler = this.toolHandlers.get(toolName);
    if (!handler) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    return await handler(args);
  }

  /**
   * Cleanup resources on server shutdown
   */
  async cleanup() {
    logger.info('[Server] Cleaning up resources...');
    logger.info('[Server] Cleanup complete');
  }
}
