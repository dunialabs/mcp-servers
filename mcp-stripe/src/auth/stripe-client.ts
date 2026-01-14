/**
 * Stripe client initialization and configuration
 */

import Stripe from 'stripe';
import { logger } from '../utils/logger.js';
import type { StripeConfig } from '../types/index.js';

let stripeInstance: Stripe | null = null;

/**
 * Create and configure Stripe client
 */
export function createStripeClient(config?: Partial<StripeConfig>): Stripe {
  const secretKey = config?.secretKey || process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      'Stripe secret key is required. Set STRIPE_SECRET_KEY environment variable or pass secretKey in config.'
    );
  }

  const apiVersion = (config?.apiVersion || process.env.STRIPE_API_VERSION || '2024-06-20') as Stripe.LatestApiVersion;

  const stripe = new Stripe(secretKey, {
    apiVersion,
    typescript: true,
    appInfo: {
      name: 'mcp-stripe',
      version: '1.0.0',
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
export function generateIdempotencyKey(operation: string, params: any): string {
  const crypto = require('crypto');
  const data = JSON.stringify({ operation, params, timestamp: Date.now() });
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return hash.substring(0, 32);
}
