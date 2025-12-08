/**
 * Update Event Tool
 * Updates an existing calendar event
 */

import { getCalendarClient } from './common.js';
import { logger } from '../utils/logger.js';
import type { calendar_v3 } from 'googleapis';

export interface UpdateEventParams {
  calendarId?: string;
  eventId: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
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
}

export async function updateEvent(params: UpdateEventParams) {
  const calendar = getCalendarClient();
  const calendarId = params.calendarId || 'primary';

  logger.debug('[UpdateEvent] Updating event', { eventId: params.eventId, calendarId });

  try {
    // First, get the current event
    const currentEvent = await calendar.events.get({
      calendarId,
      eventId: params.eventId,
    });

    // Merge with updates
    const eventBody: calendar_v3.Schema$Event = {
      ...currentEvent.data,
      summary: params.summary ?? currentEvent.data.summary,
      description: params.description ?? currentEvent.data.description,
      location: params.location ?? currentEvent.data.location,
      start: params.start ?? currentEvent.data.start,
      end: params.end ?? currentEvent.data.end,
      attendees: params.attendees ?? currentEvent.data.attendees,
      reminders: params.reminders ?? currentEvent.data.reminders,
    };

    const response = await calendar.events.update({
      calendarId,
      eventId: params.eventId,
      requestBody: eventBody,
      sendUpdates: 'all',
    });

    const event = response.data;

    logger.info('[UpdateEvent] Event updated', { eventId: event.id });

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
            },
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    logger.error('[UpdateEvent] Error:', error.message);
    throw new Error(`Failed to update event: ${error.message}`);
  }
}
