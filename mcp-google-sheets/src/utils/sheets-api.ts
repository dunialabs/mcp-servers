import { google, sheets_v4 } from 'googleapis';
import { getCurrentToken, TokenValidationError } from '../auth/token.js';
import { handleSheetsApiError } from './errors.js';
import { createMcpError, SheetsErrorCode } from './errors.js';
import { logger } from './logger.js';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export function getSheetsClient(): sheets_v4.Sheets {
  const token = getCurrentToken();
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  return google.sheets({ version: 'v4', auth });
}

export async function withSheetsRetry<T>(fn: () => Promise<T>, context: string, maxAttempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (error instanceof TokenValidationError) {
        logger.error(`[SheetsAPI] ${context} token validation failed`, { reason: error.message });
        throw createMcpError(
          SheetsErrorCode.AuthenticationFailed,
          'Authentication failed or token expired. Reconnect Google integration.',
          { reason: error.message }
        );
      }

      const parsed =
        typeof error === 'object' && error !== null
          ? (error as { code?: number; response?: { status?: number; headers?: Record<string, unknown> } })
          : {};
      const status = parsed.response?.status ?? parsed.code;
      const retryable = typeof status === 'number' && RETRYABLE_STATUS.has(status);

      if (!retryable || attempt === maxAttempts) {
        throw handleSheetsApiError(error, context);
      }

      const retryAfterRaw = parsed.response?.headers?.['retry-after'];
      const retryAfterValue = Array.isArray(retryAfterRaw) ? retryAfterRaw[0] : retryAfterRaw;
      const retryAfterSeconds =
        typeof retryAfterValue === 'string'
          ? Number(retryAfterValue)
          : typeof retryAfterValue === 'number'
            ? retryAfterValue
            : undefined;

      const delayMs =
        status === 429 && retryAfterSeconds !== undefined && Number.isFinite(retryAfterSeconds)
          ? Math.max(1000, retryAfterSeconds * 1000)
          : 400 * 2 ** (attempt - 1);
      logger.warn(`[SheetsAPI] ${context} retry ${attempt}/${maxAttempts} in ${delayMs}ms`, { status });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw handleSheetsApiError(lastError, context);
}

export function summarizeSpreadsheet(spreadsheet: sheets_v4.Schema$Spreadsheet) {
  const sheets = spreadsheet.sheets ?? [];

  return {
    spreadsheetId: spreadsheet.spreadsheetId,
    spreadsheetUrl: spreadsheet.spreadsheetUrl,
    title: spreadsheet.properties?.title,
    locale: spreadsheet.properties?.locale,
    timeZone: spreadsheet.properties?.timeZone,
    sheetCount: sheets.length,
    sheets: sheets.map((sheet) => ({
      sheetId: sheet.properties?.sheetId,
      title: sheet.properties?.title,
      index: sheet.properties?.index,
      sheetType: sheet.properties?.sheetType,
      rowCount: sheet.properties?.gridProperties?.rowCount,
      columnCount: sheet.properties?.gridProperties?.columnCount,
    })),
  };
}
