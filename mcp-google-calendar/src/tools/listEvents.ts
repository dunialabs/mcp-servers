/**
 * List Events Tool
 * Lists events from a specific calendar within a time range
 */

import { getCalendarClient } from './common.js';
import { logger } from '../utils/logger.js';

export interface ListEventsParams {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  orderBy?: 'startTime' | 'updated';
}

export async function listEvents(params: ListEventsParams) {
  const calendar = getCalendarClient();
  const calendarId = params.calendarId || 'primary';
  const maxResults = params.maxResults || 20;

  logger.debug('[ListEvents] Fetching events', { calendarId, maxResults });

  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      maxResults,
      singleEvents: true,
      orderBy: params.orderBy || 'startTime',
    });

    const events = response.data.items || [];

    logger.debug('[ListEvents] Found events', { count: events.length });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            calendarId,
            totalResults: events.length,
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
              organizer: event.organizer,
              htmlLink: event.htmlLink,
              recurrence: event.recurrence,
            })),
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    logger.error('[ListEvents] Error:', error.message);
    throw new Error(`Failed to list events: ${error.message}`);
  }
}
