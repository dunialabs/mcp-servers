/**
 * Get Free/Busy Tool
 * Queries free/busy information for calendars
 */

import { getCalendarClient } from './common.js';
import { logger } from '../utils/logger.js';

export interface GetFreeBusyParams {
  calendarIds: string[];
  timeMin: string;
  timeMax: string;
  timeZone?: string;
}

export async function getFreeBusy(params: GetFreeBusyParams) {
  const calendar = getCalendarClient();

  logger.debug('[GetFreeBusy] Querying free/busy', { calendarIds: params.calendarIds });

  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: params.timeMin,
        timeMax: params.timeMax,
        timeZone: params.timeZone || 'UTC',
        items: params.calendarIds.map(id => ({ id })),
      },
    });

    const calendars = response.data.calendars || {};

    logger.debug('[GetFreeBusy] Got free/busy info', { count: Object.keys(calendars).length });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            timeMin: params.timeMin,
            timeMax: params.timeMax,
            calendars: Object.entries(calendars).map(([calendarId, info]) => ({
              calendarId,
              busy: info.busy?.map(period => ({
                start: period.start,
                end: period.end,
              })),
              errors: info.errors,
            })),
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    logger.error('[GetFreeBusy] Error:', error.message);
    throw new Error(`Failed to get free/busy info: ${error.message}`);
  }
}
