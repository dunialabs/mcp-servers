/**
 * GitHub API Client
 *
 * Lightweight HTTP client for GitHub REST API v3
 * Uses native fetch() with proper headers and error handling
 *
 * API Documentation: https://docs.github.com/en/rest
 * API Version: 2022-11-28 (latest stable as of 2025)
 */

import { getCurrentToken } from '../auth/token.js';
import { handleGitHubError } from './errors.js';
import { logger } from './logger.js';

/**
 * GitHub API base URL
 * Default: https://api.github.com
 * Can be overridden for GitHub Enterprise Server via GITHUB_API_URL env var
 */
const GITHUB_API_URL = process.env.GITHUB_API_URL || 'https://api.github.com';

/**
 * GitHub API version
 * https://docs.github.com/en/rest/overview/api-versions
 */
const GITHUB_API_VERSION = '2022-11-28';

/**
 * HTTP request options
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Make a request to GitHub API
 *
 * @param endpoint - API endpoint (e.g., '/repos/owner/repo')
 * @param options - Request options
 * @returns Promise resolving to response data
 * @throws McpError on API errors
 */
export async function githubRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, timeout = 30000 } = options;

  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${GITHUB_API_URL}${normalizedEndpoint}`;

  // Get current access token
  const token = getCurrentToken();

  // Prepare headers according to GitHub API best practices
  // https://docs.github.com/en/rest/overview/resources-in-the-rest-api#user-agent-required
  const requestHeaders: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${token}`,
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    'User-Agent': 'PETA-MCP-GitHub-Server/1.0',
    ...headers,
  };

  // Add Content-Type for requests with body
  if (body && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  // Log request (sanitized)
  logger.debug(`[GitHub API] ${method} ${normalizedEndpoint}`, {
    method,
    endpoint: normalizedEndpoint,
    hasBody: !!body,
  });

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle response
    const responseData = await parseResponse(response);

    // Log rate limit info if available
    logRateLimit(response.headers);

    if (!response.ok) {
      // GitHub API error
      throw {
        status: response.status,
        message: response.statusText,
        response: { data: responseData },
      };
    }

    logger.debug(`[GitHub API] ${method} ${normalizedEndpoint} - Success`, {
      status: response.status,
    });

    return responseData;
  } catch (error: any) {
    // Handle timeout
    if (error.name === 'AbortError') {
      throw handleGitHubError(
        {
          status: 0,
          message: `Request timeout after ${timeout}ms`,
        },
        `${method} ${normalizedEndpoint}`
      );
    }

    // Handle GitHub API errors
    throw handleGitHubError(error, `${method} ${normalizedEndpoint}`);
  }
}

/**
 * Parse GitHub API response
 *
 * Handles both JSON and non-JSON responses
 */
async function parseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');

  // No content (204)
  if (response.status === 204) {
    return null;
  }

  // JSON response
  if (contentType?.includes('application/json')) {
    return await response.json();
  }

  // Text response
  return await response.text();
}

/**
 * Log GitHub API rate limit information
 *
 * https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting
 */
function logRateLimit(headers: Headers): void {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');

  if (limit && remaining && reset) {
    const resetDate = new Date(parseInt(reset) * 1000);
    const percentUsed = ((parseInt(limit) - parseInt(remaining)) / parseInt(limit)) * 100;

    logger.debug('[GitHub API] Rate Limit Status', {
      limit: parseInt(limit),
      remaining: parseInt(remaining),
      percentUsed: percentUsed.toFixed(1) + '%',
      resetAt: resetDate.toISOString(),
    });

    // Warn if getting close to rate limit
    if (parseInt(remaining) < 100) {
      logger.warn('[GitHub API] Rate limit running low', {
        remaining: parseInt(remaining),
        resetAt: resetDate.toISOString(),
      });
    }
  }
}

/**
 * Helper: GET request
 */
export async function githubGet<T = any>(
  endpoint: string,
  headers?: Record<string, string>
): Promise<T> {
  return githubRequest<T>(endpoint, { method: 'GET', headers });
}

/**
 * Helper: POST request
 */
export async function githubPost<T = any>(
  endpoint: string,
  body: any,
  headers?: Record<string, string>
): Promise<T> {
  return githubRequest<T>(endpoint, { method: 'POST', body, headers });
}

/**
 * Helper: PUT request
 */
export async function githubPut<T = any>(
  endpoint: string,
  body: any,
  headers?: Record<string, string>
): Promise<T> {
  return githubRequest<T>(endpoint, { method: 'PUT', body, headers });
}

/**
 * Helper: PATCH request
 */
export async function githubPatch<T = any>(
  endpoint: string,
  body: any,
  headers?: Record<string, string>
): Promise<T> {
  return githubRequest<T>(endpoint, { method: 'PATCH', body, headers });
}

/**
 * Helper: DELETE request
 */
export async function githubDelete<T = any>(
  endpoint: string,
  body?: any,
  headers?: Record<string, string>
): Promise<T> {
  return githubRequest<T>(endpoint, { method: 'DELETE', body, headers });
}

/**
 * Build query string from parameters
 *
 * @param params - Query parameters
 * @returns Query string (e.g., '?key=value&foo=bar')
 */
export function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    });

  return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}
