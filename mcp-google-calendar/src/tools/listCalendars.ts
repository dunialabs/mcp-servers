/**
 * List Calendars Tool
 * Lists all calendars accessible by the authenticated user
 */

import { getCalendarClient } from './common.js';
import { logger } from '../utils/logger.js';

export interface ListCalendarsParams {
  maxResults?: number;
}

export async function listCalendars(params: ListCalendarsParams) {
  const calendar = getCalendarClient();
  const maxResults = params.maxResults || 50;

  logger.debug('[ListCalendars] Fetching calendars', { maxResults });

  try {
    const response = await calendar.calendarList.list({
      maxResults,
      showHidden: false,
    });

    const calendars = response.data.items || [];

    logger.debug('[ListCalendars] Found calendars', { count: calendars.length });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            totalResults: calendars.length,
            calendars: calendars.map(cal => ({
              id: cal.id,
              summary: cal.summary,
              description: cal.description,
              timeZone: cal.timeZone,
              accessRole: cal.accessRole,
              primary: cal.primary,
              backgroundColor: cal.backgroundColor,
              foregroundColor: cal.foregroundColor,
            })),
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    logger.error('[ListCalendars] Error:', error.message);
    throw new Error(`Failed to list calendars: ${error.message}`);
  }
}
