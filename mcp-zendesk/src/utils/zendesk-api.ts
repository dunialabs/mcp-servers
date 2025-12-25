/**
 * Zendesk API Client
 *
 * Provides a wrapper around the Zendesk REST API v2
 * Handles authentication, rate limiting, and error handling
 */

import { getAuthHeader, getBaseURL, getCurrentCredentials } from '../auth/token.js';
import { ZendeskError, handleZendeskError } from './errors.js';
import { logger } from './logger.js';

export interface RequestOptions extends RequestInit {
  timeout?: number;
}

/**
 * Zendesk API Client
 * Handles all HTTP requests to Zendesk API with proper authentication
 */
export class ZendeskAPI {
  private baseURL: string;
  private defaultTimeout: number;

  constructor() {
    this.baseURL = getBaseURL();
    this.defaultTimeout = parseInt(process.env.zendeskApiTimeout || '30000', 10);
  }

  /**
   * Make an authenticated request to Zendesk API
   *
   * @param endpoint - API endpoint (e.g., '/tickets' or '/tickets/123')
   * @param options - Fetch options including method, body, etc.
   * @returns Parsed JSON response
   * @throws ZendeskError for API errors
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
      const { subdomain } = getCurrentCredentials();

      logger.debug(`[API] ${options.method || 'GET'} ${endpoint}`, {
        subdomain,
      });

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await handleZendeskError(response);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      const data = (await response.json()) as T;

      logger.debug(`[API] Response received`, {
        status: response.status,
        endpoint,
      });

      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ZendeskError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ZendeskError(
            `Request timeout after ${timeout}ms`,
            408,
            'TIMEOUT'
          );
        }
        throw new ZendeskError(
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
export const zendeskAPI = new ZendeskAPI();
