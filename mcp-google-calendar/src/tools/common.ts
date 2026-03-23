/**
 * Common utilities for Google Calendar tools
 */

import { google } from 'googleapis';
import { getCurrentToken, TokenValidationError } from '../auth/token.js';
import type { calendar_v3 } from 'googleapis';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { handleGoogleCalendarError } from '../utils/errors.js';

/**
 * Initialize Google Calendar API client
 */
export function getCalendarClient(): calendar_v3.Calendar {
  try {
    const token = getCurrentToken();

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });

    // googleapis automatically uses HTTP_PROXY/HTTPS_PROXY environment variables
    return google.calendar({ version: 'v3', auth });
  } catch (error) {
    if (error instanceof TokenValidationError) {
      throw handleGoogleCalendarError(
        {
          status: 401,
          message: error.message,
          details: { reason: error.message },
        },
        'Google Calendar authentication failed'
      );
    }

    throw error;
  }
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

export function rethrowCalendarToolError(error: unknown, fallbackPrefix: string): never {
  if (error instanceof McpError) {
    throw error;
  }

  const parsed = error as {
    code?: number;
    errors?: Array<{ reason?: string; message?: string }>;
    message?: string;
    response?: { status?: number; data?: unknown };
    status?: number;
  };

  const status =
    typeof parsed?.status === 'number'
      ? parsed.status
      : typeof parsed?.response?.status === 'number'
        ? parsed.response.status
        : undefined;

  const message =
    parsed?.errors?.[0]?.message ||
    parsed?.message ||
    (error instanceof Error ? error.message : String(error));

  if (status !== undefined) {
    throw handleGoogleCalendarError(
      {
        status,
        message,
        details: parsed?.response?.data ?? parsed?.errors,
      },
      fallbackPrefix
    );
  }

  throw new Error(`${fallbackPrefix}: ${message}`);
}
