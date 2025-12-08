/**
 * Common utilities for Figma API tools
 */

import { getCurrentToken } from '../auth/token.js';
import { HttpsProxyAgent } from 'https-proxy-agent';

export const FIGMA_API_BASE = 'https://api.figma.com/v1';

/**
 * Create fetch with Figma authentication and proxy support
 */
export function createFigmaFetch() {
  const token = getCurrentToken();
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

  return async (url: string, options: RequestInit = {}): Promise<any> => {
    const headers = {
      'X-Figma-Token': token,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const fetchOptions: RequestInit = {
      ...options,
      headers,
    };

    if (proxyUrl) {
      const agent = new HttpsProxyAgent(proxyUrl);
      (fetchOptions as any).agent = agent;
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Figma API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<any>;
  };
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string | undefined | null): string {
  if (!timestamp) return 'N/A';
  try {
    return new Date(timestamp).toISOString();
  } catch {
    return timestamp;
  }
}
