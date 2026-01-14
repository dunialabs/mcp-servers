/**
 * Price tools for Stripe MCP Server
 */

import Stripe from 'stripe';
import { getStripeClient, getStripeOptions } from '../auth/stripe-client.js';
import { handleStripeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type {
  CreatePriceParams,
  UpdatePriceParams,
  ListPricesParams,
} from '../types/index.js';

/**
 * Create a price
 */
export async function createPrice(params: CreatePriceParams): Promise<Stripe.Price> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const createParams: Stripe.PriceCreateParams = {
      product: params.product_id,
      currency: params.currency,
      ...(params.unit_amount !== undefined && { unit_amount: params.unit_amount }),
      ...(params.recurring && {
        recurring: {
          interval: params.recurring.interval,
          ...(params.recurring.interval_count && {
            interval_count: params.recurring.interval_count,
          }),
        },
      }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    logger.debug('Creating price', {
      product_id: params.product_id,
      unit_amount: params.unit_amount,
      currency: params.currency,
      recurring: params.recurring,
    });

    const requestOptions: Stripe.RequestOptions = {
      ...options,
      ...(params.idempotency_key && { idempotencyKey: params.idempotency_key }),
    };

    const price = Object.keys(requestOptions).length > 0
      ? await stripe.prices.create(createParams, requestOptions)
      : await stripe.prices.create(createParams);

    logger.info('Price created', {
      id: price.id,
      unit_amount: price.unit_amount,
      currency: price.currency,
    });

    return price;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Retrieve a price
 */
export async function getPrice(priceId: string): Promise<Stripe.Price> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    logger.debug('Retrieving price', {
      price_id: priceId,
    });

    const price = Object.keys(options).length > 0
      ? await stripe.prices.retrieve(priceId, options)
      : await stripe.prices.retrieve(priceId);

    logger.debug('Price retrieved', {
      id: price.id,
      unit_amount: price.unit_amount,
    });

    return price;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Update a price
 * Note: Only metadata and active status can be updated
 */
export async function updatePrice(params: UpdatePriceParams): Promise<Stripe.Price> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const updateParams: Stripe.PriceUpdateParams = {
      ...(params.active !== undefined && { active: params.active }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    logger.debug('Updating price', {
      price_id: params.price_id,
    });

    const price = Object.keys(options).length > 0
      ? await stripe.prices.update(params.price_id, updateParams, options)
      : await stripe.prices.update(params.price_id, updateParams);

    logger.info('Price updated', {
      id: price.id,
      active: price.active,
    });

    return price;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * List prices
 */
export async function listPrices(params: ListPricesParams): Promise<Stripe.ApiList<Stripe.Price>> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const listParams: Stripe.PriceListParams = {
      ...(params.product && { product: params.product }),
      ...(params.active !== undefined && { active: params.active }),
      ...(params.type && { type: params.type }),
      ...(params.limit && { limit: params.limit }),
      ...(params.starting_after && { starting_after: params.starting_after }),
    };

    logger.debug('Listing prices', params);

    const prices = Object.keys(options).length > 0
      ? await stripe.prices.list(listParams, options)
      : await stripe.prices.list(listParams);

    logger.debug('Prices listed', {
      count: prices.data.length,
      has_more: prices.has_more,
    });

    return prices;
  } catch (error) {
    throw handleStripeError(error);
  }
}
