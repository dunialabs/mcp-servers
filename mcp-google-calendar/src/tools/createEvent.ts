/**
 * Create Event Tool
 * Creates a new calendar event
 */

import { getCalendarClient } from './common.js';
import { logger } from '../utils/logger.js';
import type { calendar_v3 } from 'googleapis';

export interface CreateEventParams {
  calendarId?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  recurrence?: string[];
}

export async function createEvent(params: CreateEventParams) {
  const calendar = getCalendarClient();
  const calendarId = params.calendarId || 'primary';

  logger.debug('[CreateEvent] Creating event', { summary: params.summary, calendarId });

  try {
    const eventBody: calendar_v3.Schema$Event = {
      summary: params.summary,
      description: params.description,
      location: params.location,
      start: params.start,
      end: params.end,
      attendees: params.attendees,
      reminders: params.reminders,
      recurrence: params.recurrence,
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventBody,
      sendUpdates: 'all',
    });

    const event = response.data;

    logger.info('[CreateEvent] Event created', { eventId: event.id });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            event: {
              id: event.id,
              summary: event.summary,
              description: event.description,
              location: event.location,
              start: event.start?.dateTime || event.start?.date,
              end: event.end?.dateTime || event.end?.date,
              status: event.status,
              htmlLink: event.htmlLink,
              attendees: event.attendees?.map(a => ({
                email: a.email,
                displayName: a.displayName,
                responseStatus: a.responseStatus,
              })),
              recurrence: event.recurrence,
            },
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    logger.error('[CreateEvent] Error:', error.message);
    throw new Error(`Failed to create event: ${error.message}`);
  }
}
