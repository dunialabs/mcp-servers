/**
 * HTTP Client using undici
 * Handles authentication, timeouts, and error handling
 */

import { request, Dispatcher } from 'undici';
import { gunzipSync, inflateSync } from 'zlib';
import { AuthConfig } from '../config/types.js';
import { HTTPError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class HTTPClient {
  private baseURL: string;
  private auth: AuthConfig;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(
    baseURL: string,
    auth: AuthConfig,
    defaultHeaders?: Record<string, string>,
    timeout: number = 30000
  ) {
    this.baseURL = baseURL;
    this.auth = auth;
    this.timeout = timeout;
    this.defaultHeaders = this.buildAuthHeaders(defaultHeaders || {}, auth);
  }

  /**
   * Build headers with authentication
   */
  private buildAuthHeaders(
    headers: Record<string, string>,
    auth: AuthConfig
  ): Record<string, string> {
    const authHeaders = { ...headers };

    switch (auth.type) {
      case 'bearer':
        if (auth.value) {
          authHeaders['Authorization'] = `Bearer ${auth.value}`;
        }
        break;

      case 'header':
        if (auth.header && auth.value) {
          authHeaders[auth.header] = auth.value;
        }
        break;

      case 'basic':
        if (auth.username && auth.password) {
          const token = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
          authHeaders['Authorization'] = `Basic ${token}`;
        }
        break;

      case 'none':
      default:
        // No authentication
        break;
    }

    return authHeaders;
  }

  /**
   * Send HTTP request
   */
  async request(
    method: string,
    path: string,
    options: {
      params?: Record<string, any>;
      data?: any;
      headers?: Record<string, string>;
      timeout?: number;
    } = {}
  ): Promise<any> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      // Build full URL
      const url = new URL(path, this.baseURL);

      // Add query_param authentication
      if (this.auth.type === 'query_param' && this.auth.param && this.auth.value) {
        url.searchParams.append(this.auth.param, this.auth.value);
      }

      // Add query parameters
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      // Merge headers
      const headers: Record<string, string> = {
        ...this.defaultHeaders,
        ...options.headers,
      };

      // Add Content-Type for JSON body
      if (options.data && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      // Add Accept-Encoding for gzip support
      if (!headers['Accept-Encoding']) {
        headers['Accept-Encoding'] = 'gzip, deflate';
      }

      // Build request options
      const requestOptions: Dispatcher.RequestOptions = {
        method: method.toUpperCase() as Dispatcher.HttpMethod,
        path: url.pathname + url.search,
        headers,
        body: options.data ? JSON.stringify(options.data) : undefined,
        headersTimeout: options.timeout || this.timeout,
        bodyTimeout: options.timeout || this.timeout,
      };

      logger.debug('[HTTP] Request', {
        requestId,
        method,
        url: url.toString(),
        headers: this.sanitizeHeaders(headers),
      });

      // Send request (use origin, not full URL, since path is in requestOptions)
      const response = await request(url.origin, requestOptions);
      const duration = Date.now() - startTime;

      // Get response body as buffer first
      const rawBody = await response.body.arrayBuffer();
      let bodyBuffer = Buffer.from(rawBody);

      // Decompress if needed
      const contentEncoding = response.headers['content-encoding'] as string;
      if (contentEncoding) {
        if (contentEncoding.includes('gzip')) {
          bodyBuffer = gunzipSync(bodyBuffer);
        } else if (contentEncoding.includes('deflate')) {
          bodyBuffer = inflateSync(bodyBuffer);
        }
      }

      // Parse response body
      const contentType = response.headers['content-type'] as string || '';
      let body: any;

      const bodyText = bodyBuffer.toString('utf-8');
      if (contentType.includes('application/json')) {
        body = JSON.parse(bodyText);
      } else {
        body = bodyText;
      }

      logger.info('[HTTP] Response', {
        requestId,
        status: response.statusCode,
        duration: `${duration}ms`,
      });

      // Handle HTTP errors
      if (response.statusCode >= 400) {
        throw new HTTPError(
          `HTTP ${response.statusCode}`,
          response.statusCode,
          {
            requestId,
            body,
          }
        );
      }

      return body;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('[HTTP] Error', {
        requestId,
        error: error.message,
        duration: `${duration}ms`,
      });

      if (error instanceof HTTPError) {
        throw error;
      }

      throw new HTTPError(
        error.message || 'HTTP request failed',
        error.statusCode || 500,
        { requestId }
      );
    }
  }

  /**
   * Sanitize headers for logging (remove sensitive info)
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    const sensitiveKeys = ['authorization', 'x-api-key', 'token'];

    Object.keys(sanitized).forEach((key) => {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
