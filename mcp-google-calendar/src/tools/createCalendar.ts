/**
 * Create Calendar Tool
 * Creates a new calendar
 */

import { getCalendarClient } from './common.js';
import { logger } from '../utils/logger.js';

export interface CreateCalendarParams {
  summary: string;
  description?: string;
  timeZone?: string;
}

export async function createCalendar(params: CreateCalendarParams) {
  const calendar = getCalendarClient();

  logger.debug('[CreateCalendar] Creating calendar', { summary: params.summary });

  try {
    const response = await calendar.calendars.insert({
      requestBody: {
        summary: params.summary,
        description: params.description,
        timeZone: params.timeZone || 'UTC',
      },
    });

    const cal = response.data;

    logger.info('[CreateCalendar] Calendar created', { calendarId: cal.id });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            calendar: {
              id: cal.id,
              summary: cal.summary,
              description: cal.description,
              timeZone: cal.timeZone,
            },
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    logger.error('[CreateCalendar] Error:', error.message);
    throw new Error(`Failed to create calendar: ${error.message}`);
  }
}
