import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export enum HubSpotErrorCode {
  InvalidParams = ErrorCode.InvalidParams,
  InternalError = ErrorCode.InternalError,
  AuthenticationFailed = -32030,
  PermissionDenied = -32031,
  NotFound = -32032,
  Conflict = -32033,
  RateLimited = -32034,
  ApiUnavailable = -32035,
}

export function createMcpError(code: number, message: string, data?: unknown): McpError {
  logger.error(`[McpError] code=${code} message=${message}`, data);
  return new McpError(code, message, data);
}

export interface HubSpotApiErrorShape {
  status?: number;
  category?: string;
  message?: string;
  details?: unknown;
}

export function handleHubSpotApiError(error: HubSpotApiErrorShape, context: string): McpError {
  const status = error.status;
  const category = error.category;
  const details = error.details;

  if (status === 401) {
    return createMcpError(
      HubSpotErrorCode.AuthenticationFailed,
      'Authentication failed or token expired. Reconnect HubSpot integration.',
      details
    );
  }

  if (status === 403) {
    return createMcpError(
      HubSpotErrorCode.PermissionDenied,
      'Permission denied. Verify HubSpot app scopes and installation.',
      details
    );
  }

  if (status === 404) {
    return createMcpError(HubSpotErrorCode.NotFound, 'HubSpot resource not found.', details);
  }

  if (status === 409 || category === 'CONFLICT') {
    return createMcpError(
      HubSpotErrorCode.Conflict,
      'HubSpot resource conflict. Check duplicate constraints or association state.',
      details
    );
  }

  if (status === 429) {
    return createMcpError(
      HubSpotErrorCode.RateLimited,
      'HubSpot API rate limit exceeded. Retry shortly.',
      details
    );
  }

  if (status !== undefined && status >= 500) {
    return createMcpError(
      HubSpotErrorCode.ApiUnavailable,
      'HubSpot API temporarily unavailable. Retry shortly.',
      details
    );
  }

  return createMcpError(
    HubSpotErrorCode.InternalError,
    `${context}: ${error.message || 'HubSpot API error'}`,
    {
      status,
      category,
      details,
    }
  );
}
