/**
 * Common utilities for Google Calendar tools
 */

import { google } from 'googleapis';
import { getCurrentToken } from '../auth/token.js';
import type { calendar_v3 } from 'googleapis';

/**
 * Initialize Google Calendar API client
 */
export function getCalendarClient(): calendar_v3.Calendar {
  const token = getCurrentToken();

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });

  // googleapis automatically uses HTTP_PROXY/HTTPS_PROXY environment variables
  return google.calendar({ version: 'v3', auth });
}

/**
 * Format date/time for display
 */
export function formatDateTime(dateTime: string | undefined | null): string {
  if (!dateTime) return 'N/A';
  try {
    return new Date(dateTime).toISOString();
  } catch {
    return dateTime;
  }
}

/**
 * Parse recurrence rules for display
 */
export function formatRecurrence(recurrence: string[] | undefined | null): string {
  if (!recurrence || recurrence.length === 0) return 'None';
  return recurrence.join(', ');
}
