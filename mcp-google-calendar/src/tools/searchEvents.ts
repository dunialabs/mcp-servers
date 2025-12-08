/**
 * Search Events Tool
 * Searches for events matching a query string
 */

import { getCalendarClient } from './common.js';
import { logger } from '../utils/logger.js';

export interface SearchEventsParams {
  query: string;
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}

export async function searchEvents(params: SearchEventsParams) {
  const calendar = getCalendarClient();
  const calendarId = params.calendarId || 'primary';
  const maxResults = params.maxResults || 20;

  logger.debug('[SearchEvents] Searching events', { query: params.query, calendarId });

  try {
    const response = await calendar.events.list({
      calendarId,
      q: params.query,
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    logger.debug('[SearchEvents] Found events', { count: events.length });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            query: params.query,
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
              htmlLink: event.htmlLink,
            })),
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    logger.error('[SearchEvents] Error:', error.message);
    throw new Error(`Failed to search events: ${error.message}`);
  }
}
