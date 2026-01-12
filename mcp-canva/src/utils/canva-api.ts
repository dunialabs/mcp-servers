/**
 * Canva API Client
 *
 * Provides a wrapper around the Canva Connect API v1
 * Handles authentication, rate limiting, and error handling
 */

import { getAuthHeader, getBaseURL } from '../auth/token.js';
import { CanvaError, handleCanvaError } from './errors.js';
import { logger } from './logger.js';

export interface RequestOptions extends RequestInit {
  timeout?: number;
}

/**
 * Canva API Client
 * Handles all HTTP requests to Canva API with proper authentication
 */
export class CanvaAPI {
  private baseURL: string;
  private defaultTimeout: number;

  constructor() {
    this.baseURL = getBaseURL();
    this.defaultTimeout = parseInt(process.env.CANVA_API_TIMEOUT || '30000', 10);
  }

  /**
   * Make an authenticated request to Canva API
   *
   * @param endpoint - API endpoint (e.g., '/designs' or '/designs/123')
   * @param options - Fetch options including method, body, etc.
   * @returns Parsed JSON response
   * @throws CanvaError for API errors
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
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await handleCanvaError(response);
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

      if (error instanceof CanvaError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new CanvaError(
            `Request timeout after ${timeout}ms`,
            408,
            'TIMEOUT'
          );
        }
        throw new CanvaError(
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
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
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

  /**
   * Upload binary file (multipart/form-data)
   * Used for asset uploads and design imports
   */
  async uploadBinary<T>(
    endpoint: string,
    file: Blob | Buffer,
    metadata?: Record<string, string>,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const timeout = options?.timeout || this.defaultTimeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const authHeader = getAuthHeader();

      logger.debug(`[API] POST ${endpoint} (binary upload)`);

      // Prepare headers
      const headers: Record<string, string> = {
        'Authorization': authHeader,
        ...(options?.headers as Record<string, string> || {}),
      };

      // Add metadata headers if provided
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          headers[key] = value;
        });
      }

      const response = await fetch(url, {
        ...options,
        method: 'POST',
        signal: controller.signal,
        headers,
        body: file,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await handleCanvaError(response);
      }

      // Handle 202 Accepted (async job started)
      if (response.status === 202) {
        const data = (await response.json()) as T;
        logger.debug(`[API] Binary upload job started`, { endpoint });
        return data;
      }

      const data = (await response.json()) as T;

      logger.debug(`[API] Binary upload completed`, {
        status: response.status,
        endpoint,
      });

      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof CanvaError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new CanvaError(
            `Upload timeout after ${timeout}ms`,
            408,
            'TIMEOUT'
          );
        }
        throw new CanvaError(
          `Upload failed: ${error.message}`,
          0,
          'NETWORK_ERROR'
        );
      }

      throw error;
    }
  }
}

// Export singleton instance
export const canvaAPI = new CanvaAPI();
