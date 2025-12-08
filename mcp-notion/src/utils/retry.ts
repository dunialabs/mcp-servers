/**
 * Retry utility for handling transient API errors
 */

import { logger } from './logger.js';

/**
 * HTTP status codes that should trigger a retry
 */
const RETRYABLE_STATUS_CODES = [
  429, // Rate limit
  500, // Internal server error
  502, // Bad gateway
  503, // Service unavailable
  504, // Gateway timeout
];

/**
 * Retry options
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

/**
 * Execute a function with exponential backoff retry logic
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise with the function result
 * @throws The last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const statusCode = error?.status || error?.code;
      const isRetryable = RETRYABLE_STATUS_CODES.includes(statusCode);

      // If not retryable or last attempt, throw immediately
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * delay * 0.1;
      const actualDelay = delay + jitter;

      logger.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed with status ${statusCode}, retrying in ${Math.round(actualDelay)}ms`, {
        error: error?.message,
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, actualDelay));
    }
  }

  throw lastError;
}
