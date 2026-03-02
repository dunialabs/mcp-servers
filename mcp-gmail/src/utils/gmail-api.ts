import { google, gmail_v1 } from 'googleapis';
import { getCurrentToken } from '../auth/token.js';
import { createMcpError, GmailErrorCode, handleGmailApiError } from './errors.js';
import { logger } from './logger.js';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export function getGmailClient(): gmail_v1.Gmail {
  const token = getCurrentToken();
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  return google.gmail({ version: 'v1', auth });
}

export async function withGmailRetry<T>(fn: () => Promise<T>, context: string, maxAttempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      const parsed =
        typeof error === 'object' && error !== null
          ? (error as { code?: number; response?: { status?: number } })
          : {};
      const status = parsed.response?.status ?? parsed.code;
      const retryable = typeof status === 'number' && RETRYABLE_STATUS.has(status);

      if (!retryable || attempt === maxAttempts) {
        throw handleGmailApiError(error, context);
      }

      const delayMs = 400 * 2 ** (attempt - 1);
      logger.warn(`[GmailAPI] ${context} retry ${attempt}/${maxAttempts} in ${delayMs}ms`, { status });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw handleGmailApiError(lastError, context);
}

export function encodeBase64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function hasNonAscii(input: string): boolean {
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) > 0x7f) {
      return true;
    }
  }
  return false;
}

function ensureSafeHeaderValue(value: string, headerName: string): string {
  if (/[\r\n]/.test(value)) {
    throw createMcpError(
      GmailErrorCode.InvalidParams,
      `Invalid ${headerName}: header value must not contain CR or LF`
    );
  }
  return value;
}

function encodeMimeWordUtf8(input: string): string {
  const b64 = Buffer.from(input, 'utf8').toString('base64');
  return `=?UTF-8?B?${b64}?=`;
}

function encodeHeaderIfNeeded(value: string, headerName: string): string {
  const safe = ensureSafeHeaderValue(value, headerName);
  return hasNonAscii(safe) ? encodeMimeWordUtf8(safe) : safe;
}

export function buildRawEmail(params: {
  to: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  inReplyTo?: string;
  references?: string[];
}): string {
  const { to, subject, bodyText, bodyHtml, cc, bcc, replyTo, inReplyTo, references } = params;

  if (to.length === 0) {
    throw createMcpError(GmailErrorCode.InvalidParams, 'At least one recipient is required in `to`');
  }

  if (!bodyText && !bodyHtml) {
    throw createMcpError(GmailErrorCode.InvalidParams, 'Either bodyText or bodyHtml must be provided');
  }

  const headers: string[] = [
    `To: ${to.join(', ')}`,
    `Subject: ${encodeHeaderIfNeeded(subject, 'subject')}`,
    'MIME-Version: 1.0',
  ];

  if (cc && cc.length > 0) {
    headers.push(`Cc: ${cc.join(', ')}`);
  }
  if (bcc && bcc.length > 0) {
    headers.push(`Bcc: ${bcc.join(', ')}`);
  }
  if (replyTo) {
    headers.push(`Reply-To: ${ensureSafeHeaderValue(replyTo, 'replyTo')}`);
  }
  if (inReplyTo) {
    headers.push(`In-Reply-To: ${ensureSafeHeaderValue(inReplyTo, 'inReplyTo')}`);
  }
  if (references && references.length > 0) {
    const joined = references.join(' ');
    headers.push(`References: ${ensureSafeHeaderValue(joined, 'references')}`);
  }

  let mimeBody: string;

  if (bodyText && bodyHtml) {
    const boundary = `mcp-gmail-${Date.now()}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    mimeBody = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      bodyText,
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      '',
      bodyHtml,
      `--${boundary}--`,
      '',
    ].join('\r\n');
  } else if (bodyHtml) {
    headers.push('Content-Type: text/html; charset="UTF-8"');
    mimeBody = `${bodyHtml}\r\n`;
  } else {
    headers.push('Content-Type: text/plain; charset="UTF-8"');
    mimeBody = `${bodyText}\r\n`;
  }

  const raw = `${headers.join('\r\n')}\r\n\r\n${mimeBody}`;
  return encodeBase64Url(raw);
}

export function pickHeader(message: gmail_v1.Schema$Message, name: string): string | undefined {
  const headers = message.payload?.headers;
  if (!headers) {
    return undefined;
  }
  const found = headers.find((header) => header.name?.toLowerCase() === name.toLowerCase());
  return found?.value ?? undefined;
}

export function summarizeMessage(message: gmail_v1.Schema$Message) {
  return {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds,
    snippet: message.snippet,
    internalDate: message.internalDate,
    sizeEstimate: message.sizeEstimate,
    subject: pickHeader(message, 'Subject'),
    from: pickHeader(message, 'From'),
    to: pickHeader(message, 'To'),
    date: pickHeader(message, 'Date'),
  };
}
