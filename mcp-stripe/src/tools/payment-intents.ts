/**
 * Payment Intent tools for Stripe MCP Server
 */

import Stripe from 'stripe';
import { getStripeClient, getStripeOptions } from '../auth/stripe-client.js';
import { handleStripeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type {
  CreatePaymentIntentParams,
  ConfirmPaymentIntentParams,
  CancelPaymentIntentParams,
  ListPaymentIntentsParams,
} from '../types/index.js';

/**
 * Create a payment intent
 */
export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const createParams: Stripe.PaymentIntentCreateParams = {
      amount: params.amount,
      currency: params.currency,
      ...(params.customer && { customer: params.customer }),
      ...(params.payment_method && { payment_method: params.payment_method }),
      ...(params.description && { description: params.description }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    logger.debug('Creating payment intent', {
      amount: params.amount,
      currency: params.currency,
      customer: params.customer,
    });

    const requestOptions: Stripe.RequestOptions = {
      ...options,
      ...(params.idempotency_key && { idempotencyKey: params.idempotency_key }),
    };

    const paymentIntent = Object.keys(requestOptions).length > 0
      ? await stripe.paymentIntents.create(createParams, requestOptions)
      : await stripe.paymentIntents.create(createParams);

    logger.info('Payment intent created', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
    });

    return paymentIntent;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Confirm a payment intent
 */
export async function confirmPaymentIntent(params: ConfirmPaymentIntentParams): Promise<Stripe.PaymentIntent> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const confirmParams: Stripe.PaymentIntentConfirmParams = {
      ...(params.payment_method && { payment_method: params.payment_method }),
      ...(params.return_url && { return_url: params.return_url }),
    };

    logger.debug('Confirming payment intent', {
      payment_intent_id: params.payment_intent_id,
    });

    const paymentIntent = Object.keys(options).length > 0
      ? await stripe.paymentIntents.confirm(params.payment_intent_id, confirmParams, options)
      : await stripe.paymentIntents.confirm(params.payment_intent_id, confirmParams);

    logger.info('Payment intent confirmed', {
      id: paymentIntent.id,
      status: paymentIntent.status,
    });

    return paymentIntent;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Cancel a payment intent
 */
export async function cancelPaymentIntent(params: CancelPaymentIntentParams): Promise<Stripe.PaymentIntent> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const cancelParams: Stripe.PaymentIntentCancelParams = {
      ...(params.cancellation_reason && { cancellation_reason: params.cancellation_reason }),
    };

    logger.debug('Canceling payment intent', {
      payment_intent_id: params.payment_intent_id,
    });

    const paymentIntent = Object.keys(options).length > 0
      ? await stripe.paymentIntents.cancel(params.payment_intent_id, cancelParams, options)
      : await stripe.paymentIntents.cancel(params.payment_intent_id, cancelParams);

    logger.info('Payment intent canceled', {
      id: paymentIntent.id,
      status: paymentIntent.status,
    });

    return paymentIntent;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Retrieve a payment intent
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    logger.debug('Retrieving payment intent', {
      payment_intent_id: paymentIntentId,
    });

    const paymentIntent = Object.keys(options).length > 0
      ? await stripe.paymentIntents.retrieve(paymentIntentId, options)
      : await stripe.paymentIntents.retrieve(paymentIntentId);

    logger.debug('Payment intent retrieved', {
      id: paymentIntent.id,
      status: paymentIntent.status,
    });

    return paymentIntent;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * List payment intents
 */
export async function listPaymentIntents(params: ListPaymentIntentsParams): Promise<Stripe.ApiList<Stripe.PaymentIntent>> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const listParams: Stripe.PaymentIntentListParams = {
      ...(params.customer && { customer: params.customer }),
      ...(params.limit && { limit: params.limit }),
      ...(params.starting_after && { starting_after: params.starting_after }),
    };

    // Note: Stripe API does not support status filtering on list endpoint
    // Status filtering must be done client-side if needed

    logger.debug('Listing payment intents', params);

    const paymentIntents = Object.keys(options).length > 0
      ? await stripe.paymentIntents.list(listParams, options)
      : await stripe.paymentIntents.list(listParams);

    logger.debug('Payment intents listed', {
      count: paymentIntents.data.length,
      has_more: paymentIntents.has_more,
    });

    return paymentIntents;
  } catch (error) {
    throw handleStripeError(error);
  }
}
