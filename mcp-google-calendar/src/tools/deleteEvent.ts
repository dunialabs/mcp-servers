/**
 * Delete Event Tool
 * Deletes a calendar event
 */

import { getCalendarClient } from './common.js';
import { logger } from '../utils/logger.js';

export interface DeleteEventParams {
  calendarId?: string;
  eventId: string;
}

export async function deleteEvent(params: DeleteEventParams) {
  const calendar = getCalendarClient();
  const calendarId = params.calendarId || 'primary';

  logger.debug('[DeleteEvent] Deleting event', { eventId: params.eventId, calendarId });

  try {
    await calendar.events.delete({
      calendarId,
      eventId: params.eventId,
      sendUpdates: 'all',
    });

    logger.info('[DeleteEvent] Event deleted', { eventId: params.eventId });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'Event deleted successfully',
            eventId: params.eventId,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    logger.error('[DeleteEvent] Error:', error.message);
    throw new Error(`Failed to delete event: ${error.message}`);
  }
}
