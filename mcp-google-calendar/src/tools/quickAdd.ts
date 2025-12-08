/**
 * Quick Add Tool
 * Creates an event from natural language text
 */

import { getCalendarClient } from './common.js';
import { logger } from '../utils/logger.js';

export interface QuickAddParams {
  calendarId?: string;
  text: string;
}

export async function quickAdd(params: QuickAddParams) {
  const calendar = getCalendarClient();
  const calendarId = params.calendarId || 'primary';

  logger.debug('[QuickAdd] Creating event from text', { text: params.text });

  try {
    const response = await calendar.events.quickAdd({
      calendarId,
      text: params.text,
      sendUpdates: 'all',
    });

    const event = response.data;

    logger.info('[QuickAdd] Event created', { eventId: event.id });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            inputText: params.text,
            event: {
              id: event.id,
              summary: event.summary,
              description: event.description,
              location: event.location,
              start: event.start?.dateTime || event.start?.date,
              end: event.end?.dateTime || event.end?.date,
              status: event.status,
              htmlLink: event.htmlLink,
            },
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    logger.error('[QuickAdd] Error:', error.message);
    throw new Error(`Failed to quick add event: ${error.message}`);
  }
}
