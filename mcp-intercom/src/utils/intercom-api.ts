/**
 * Intercom API Client
 *
 * Provides a wrapper around the Intercom REST API v2.11
 * Handles authentication, rate limiting, and error handling
 */

import { getAuthHeader, getBaseURL } from '../auth/token.js';
import { IntercomError, handleIntercomError } from './errors.js';
import { logger } from './logger.js';

/**
 * Intercom API version
 */
const INTERCOM_API_VERSION = '2.11';

export interface RequestOptions extends RequestInit {
  timeout?: number;
}

/**
 * Intercom API Client
 * Handles all HTTP requests to Intercom API with proper authentication
 */
export class IntercomAPI {
  private baseURL: string;
  private defaultTimeout: number;

  constructor() {
    this.baseURL = getBaseURL();
    this.defaultTimeout = parseInt(process.env.INTERCOM_API_TIMEOUT || '30000', 10);
  }

  /**
   * Make an authenticated request to Intercom API
   *
   * @param endpoint - API endpoint (e.g., '/contacts' or '/contacts/123')
   * @param options - Fetch options including method, body, etc.
   * @returns Parsed JSON response
   * @throws IntercomError for API errors
   */
  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const timeout = options.timeout || this.defaultTimeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const authHeader = getAuthHeader();

      logger.debug(`[API] ${options.method || 'GET'} ${endpoint}`);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Intercom-Version': INTERCOM_API_VERSION,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await handleIntercomError(response);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      // Handle 202 Accepted (async job started)
      if (response.status === 202) {
        const data = (await response.json()) as T;
        logger.debug(`[API] Async job started`, { endpoint });
        return data;
      }

      const data = (await response.json()) as T;

      logger.debug(`[API] Response received`, {
        status: response.status,
        endpoint,
      });

      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof IntercomError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new IntercomError(
            `Request timeout after ${timeout}ms`,
            408,
            'TIMEOUT'
          );
        }
        throw new IntercomError(
          `Request failed: ${error.message}`,
          0,
          'NETWORK_ERROR'
        );
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const intercomAPI = new IntercomAPI();
