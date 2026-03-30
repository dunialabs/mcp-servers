/**
 * Stripe client initialization and configuration
 */

import Stripe from 'stripe';
import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';
import type { StripeConfig } from '../types/index.js';
import { getServerVersion } from '../utils/version.js';

let stripeInstance: Stripe | null = null;

export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

export function normalizeAccessToken(token: string): string {
  return token.trim().replace(/^Bearer\s+/i, '').trim();
}

export function validateTokenFormat(token: string): boolean {
  return token.startsWith('sk_test_') || token.startsWith('sk_live_');
}

/**
 * Create and configure Stripe client
 */
export function createStripeClient(config?: Partial<StripeConfig>): Stripe {
  const rawSecretKey = config?.secretKey || process.env.STRIPE_SECRET_KEY;

  if (!rawSecretKey || typeof rawSecretKey !== 'string' || rawSecretKey.trim().length === 0) {
    throw new TokenValidationError(
      'Stripe secret key is required. Set STRIPE_SECRET_KEY environment variable or pass secretKey in config.'
    );
  }

  const secretKey = normalizeAccessToken(rawSecretKey);

  if (!validateTokenFormat(secretKey)) {
    throw new TokenValidationError(
      'STRIPE_SECRET_KEY must be a valid Stripe secret key starting with sk_test_ or sk_live_'
    );
  }

  const apiVersion = (config?.apiVersion || process.env.STRIPE_API_VERSION || '2024-06-20') as Stripe.LatestApiVersion;

  const stripe = new Stripe(secretKey, {
    apiVersion,
    typescript: true,
    appInfo: {
      name: 'mcp-stripe',
      version: getServerVersion(),
      url: 'https://github.com/dunialabs/mcp-servers',
    },
  });

  const mode = secretKey.startsWith('sk_test_') ? 'test' : 'live';
  const stripeAccount = config?.stripeAccount || process.env.STRIPE_ACCOUNT;

  logger.info('Stripe client initialized', {
    mode,
    apiVersion,
    stripeAccount: stripeAccount || 'platform',
  });

  stripeInstance = stripe;
  return stripe;
}

/**
 * Get existing Stripe client instance or create new one
 */
export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    stripeInstance = createStripeClient();
  }
  return stripeInstance;
}

export function resetStripeClient(): void {
  stripeInstance = null;
}

/**
 * Get Stripe request options (for Connect account operations)
 */
export function getStripeOptions(): Stripe.RequestOptions {
  const stripeAccount = process.env.STRIPE_ACCOUNT;
  return stripeAccount ? { stripeAccount } : {};
}

/**
 * Generate idempotency key for safe retries
 */
export function generateIdempotencyKey(operation: string, params: unknown): string {
  const data = JSON.stringify({ operation, params, timestamp: Date.now() });
  const hash = createHash('sha256').update(data).digest('hex');
  return hash.substring(0, 32);
}
