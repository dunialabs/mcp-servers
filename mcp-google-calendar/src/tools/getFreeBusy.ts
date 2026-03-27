/**
 * Get Free/Busy Tool
 * Queries free/busy information for calendars
 */

import { getCalendarClient, rethrowCalendarToolError } from './common.js';
import { logger } from '../utils/logger.js';

export interface GetFreeBusyParams {
  calendarIds: string[];
  timeMin: string;
  timeMax: string;
  timeZone?: string;
}

export interface BusySlot {
  start?: string | null;
  end?: string | null;
}

export interface CalendarBusySummary {
  calendarId: string;
  busy: BusySlot[];
  busyCount: number;
  errors?: unknown;
}

export async function fetchFreeBusyData(params: GetFreeBusyParams): Promise<{
  timeMin: string;
  timeMax: string;
  timeZone: string;
  calendars: CalendarBusySummary[];
}> {
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
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      timeZone: params.timeZone || 'UTC',
      calendars: Object.entries(calendars).map(([calendarId, info]) => ({
        calendarId,
        busy:
          info.busy?.map(period => ({
            start: period.start,
            end: period.end,
          })) ?? [],
        busyCount: info.busy?.length ?? 0,
        errors: info.errors,
      })),
    };
  } catch (error: any) {
    logger.error('[GetFreeBusy] Error:', error.message);
    rethrowCalendarToolError(error, 'Failed to get free/busy info');
  }
}

export async function getFreeBusy(params: GetFreeBusyParams) {
  const result = await fetchFreeBusyData(params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
    structuredContent: result,
  };
}
