/**
 * Notion API Client
 * Provides initialized Notion client with authentication and retry logic
 */

import { Client } from '@notionhq/client';
import { getCurrentToken } from '../auth/token.js';
import { retryWithBackoff } from '../utils/retry.js';

/**
 * Initialize Notion API client
 *
 * Uses API version 2022-06-28 (stable, widely supported).
 * Note: 2025-09-03 introduces breaking changes for multi-source databases
 * and requires significant migration work. Will upgrade in a future release.
 *
 * @returns Initialized Notion client with authentication
 */
export function getNotionClient(): Client {
  const token = getCurrentToken();

  // @notionhq/client automatically uses HTTP_PROXY/HTTPS_PROXY environment variables
  return new Client({
    auth: token,
    notionVersion: '2022-06-28',
  });
}

/**
 * Execute a Notion API call with automatic retry on transient errors
 *
 * Automatically retries on:
 * - 429 (Rate limit)
 * - 500 (Internal server error)
 * - 502/503/504 (Gateway errors)
 *
 * @param fn - The async function that makes the Notion API call
 * @returns Promise with the API call result
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  });
}
