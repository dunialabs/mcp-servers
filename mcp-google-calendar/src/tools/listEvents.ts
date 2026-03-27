/**
 * List Events Tool
 * Lists events from a specific calendar within a time range
 */

import { getCalendarClient, rethrowCalendarToolError } from './common.js';
import { logger } from '../utils/logger.js';

export interface ListEventsParams {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  orderBy?: 'startTime' | 'updated';
}

export interface CalendarEventSummary {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: string | null;
  end?: string | null;
  status?: string | null;
  attendees?: Array<{
    email?: string | null;
    displayName?: string | null;
    responseStatus?: string | null;
  }>;
  organizer?: {
    email?: string | null;
    displayName?: string | null;
    self?: boolean | null;
  } | null;
  htmlLink?: string | null;
  recurrence?: string[] | null;
}

export async function fetchCalendarEvents(params: ListEventsParams): Promise<{
  calendarId: string;
  totalResults: number;
  timeMin: string;
  timeMax: string | null;
  orderBy: 'startTime' | 'updated';
  events: CalendarEventSummary[];
}> {
  const calendar = getCalendarClient();
  const calendarId = params.calendarId || 'primary';
  const maxResults = params.maxResults || 20;
  const timeMin = params.timeMin ?? new Date().toISOString();
  const timeMax = params.timeMax ?? null;
  const orderBy = params.orderBy || 'startTime';

  logger.debug('[ListEvents] Fetching events', { calendarId, maxResults, timeMin, timeMax, orderBy });

  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax: timeMax ?? undefined,
      maxResults,
      singleEvents: true,
      orderBy,
    });

    const events = response.data.items || [];

    logger.debug('[ListEvents] Found events', { count: events.length });

    return {
      calendarId,
      totalResults: events.length,
      timeMin,
      timeMax,
      orderBy,
      events: events.map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        status: event.status,
        attendees: event.attendees?.map(a => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: a.responseStatus,
        })),
        organizer: event.organizer
          ? {
              email: event.organizer.email,
              displayName: event.organizer.displayName,
              self: event.organizer.self,
            }
          : null,
        htmlLink: event.htmlLink,
        recurrence: event.recurrence,
      })),
    };
  } catch (error: any) {
    logger.error('[ListEvents] Error:', error.message);
    rethrowCalendarToolError(error, 'Failed to list events');
  }
}

export async function listEvents(params: ListEventsParams) {
  const result = await fetchCalendarEvents(params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
    structuredContent: {
      calendarId: result.calendarId,
      totalResults: result.totalResults,
      timeMin: result.timeMin,
      timeMax: result.timeMax,
      orderBy: result.orderBy,
      events: result.events,
    },
  };
}
