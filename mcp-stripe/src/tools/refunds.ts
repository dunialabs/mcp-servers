/**
 * Refund tools for Stripe MCP Server
 */

import Stripe from 'stripe';
import { getStripeClient, getStripeOptions } from '../auth/stripe-client.js';
import { handleStripeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { CreateRefundParams, ListRefundsParams } from '../types/index.js';

/**
 * Create a refund
 */
export async function createRefund(params: CreateRefundParams): Promise<Stripe.Refund> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    // Validate that at least one of charge or payment_intent is provided
    if (!params.charge && !params.payment_intent) {
      throw new Error('Either charge or payment_intent must be provided');
    }

    const createParams: Stripe.RefundCreateParams = {
      ...(params.charge && { charge: params.charge }),
      ...(params.payment_intent && { payment_intent: params.payment_intent }),
      ...(params.amount && { amount: params.amount }),
      ...(params.reason && { reason: params.reason }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    logger.debug('Creating refund', {
      charge: params.charge,
      payment_intent: params.payment_intent,
      amount: params.amount,
    });

    const requestOptions: Stripe.RequestOptions = {
      ...options,
      ...(params.idempotency_key && { idempotencyKey: params.idempotency_key }),
    };

    const refund = Object.keys(requestOptions).length > 0
      ? await stripe.refunds.create(createParams, requestOptions)
      : await stripe.refunds.create(createParams);

    logger.info('Refund created', {
      id: refund.id,
      amount: refund.amount,
      status: refund.status,
    });

    return refund;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Retrieve a refund
 */
export async function getRefund(refundId: string): Promise<Stripe.Refund> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    logger.debug('Retrieving refund', {
      refund_id: refundId,
    });

    const refund = Object.keys(options).length > 0
      ? await stripe.refunds.retrieve(refundId, options)
      : await stripe.refunds.retrieve(refundId);

    logger.debug('Refund retrieved', {
      id: refund.id,
      amount: refund.amount,
      status: refund.status,
    });

    return refund;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * List refunds
 */
export async function listRefunds(params: ListRefundsParams): Promise<Stripe.ApiList<Stripe.Refund>> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const listParams: Stripe.RefundListParams = {
      ...(params.charge && { charge: params.charge }),
      ...(params.payment_intent && { payment_intent: params.payment_intent }),
      ...(params.limit && { limit: params.limit }),
      ...(params.starting_after && { starting_after: params.starting_after }),
    };

    logger.debug('Listing refunds', params);

    const refunds = Object.keys(options).length > 0
      ? await stripe.refunds.list(listParams, options)
      : await stripe.refunds.list(listParams);

    logger.debug('Refunds listed', {
      count: refunds.data.length,
      has_more: refunds.has_more,
    });

    return refunds;
  } catch (error) {
    throw handleStripeError(error);
  }
}
