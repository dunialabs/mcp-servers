/**
 * Delete Calendar Tool
 * Deletes a calendar
 */

import { getCalendarClient } from './common.js';
import { logger } from '../utils/logger.js';

export interface DeleteCalendarParams {
  calendarId: string;
}

export async function deleteCalendar(params: DeleteCalendarParams) {
  const calendar = getCalendarClient();

  logger.debug('[DeleteCalendar] Deleting calendar', { calendarId: params.calendarId });

  try {
    await calendar.calendars.delete({
      calendarId: params.calendarId,
    });

    logger.info('[DeleteCalendar] Calendar deleted', { calendarId: params.calendarId });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'Calendar deleted successfully',
            calendarId: params.calendarId,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    logger.error('[DeleteCalendar] Error:', error.message);
    throw new Error(`Failed to delete calendar: ${error.message}`);
  }
}
