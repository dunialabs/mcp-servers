/**
 * Subscription tools for Stripe MCP Server
 */

import Stripe from 'stripe';
import { getStripeClient, getStripeOptions } from '../auth/stripe-client.js';
import { handleStripeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type {
  CreateSubscriptionParams,
  UpdateSubscriptionParams,
  CancelSubscriptionParams,
  ListSubscriptionsParams,
} from '../types/index.js';

/**
 * Create a subscription
 */
export async function createSubscription(params: CreateSubscriptionParams): Promise<Stripe.Subscription> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const createParams: Stripe.SubscriptionCreateParams = {
      customer: params.customer_id,
      items: params.items.map(item => ({
        price: item.price,
        ...(item.quantity && { quantity: item.quantity }),
      })),
      ...(params.trial_period_days && { trial_period_days: params.trial_period_days }),
      ...(params.coupon && { coupon: params.coupon }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    logger.debug('Creating subscription', {
      customer_id: params.customer_id,
      items: params.items,
    });

    const requestOptions: Stripe.RequestOptions = {
      ...options,
      ...(params.idempotency_key && { idempotencyKey: params.idempotency_key }),
    };

    const subscription = Object.keys(requestOptions).length > 0
      ? await stripe.subscriptions.create(createParams, requestOptions)
      : await stripe.subscriptions.create(createParams);

    logger.info('Subscription created', {
      id: subscription.id,
      customer: subscription.customer,
      status: subscription.status,
    });

    return subscription;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Retrieve a subscription
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    logger.debug('Retrieving subscription', {
      subscription_id: subscriptionId,
    });

    const subscription = Object.keys(options).length > 0
      ? await stripe.subscriptions.retrieve(subscriptionId, options)
      : await stripe.subscriptions.retrieve(subscriptionId);

    logger.debug('Subscription retrieved', {
      id: subscription.id,
      status: subscription.status,
    });

    return subscription;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Update a subscription
 */
export async function updateSubscription(params: UpdateSubscriptionParams): Promise<Stripe.Subscription> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const updateParams: Stripe.SubscriptionUpdateParams = {
      ...(params.items && {
        items: params.items.map(item => ({
          ...(item.id && { id: item.id }),
          price: item.price,
          ...(item.quantity && { quantity: item.quantity }),
        })),
      }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    logger.debug('Updating subscription', {
      subscription_id: params.subscription_id,
    });

    const subscription = Object.keys(options).length > 0
      ? await stripe.subscriptions.update(params.subscription_id, updateParams, options)
      : await stripe.subscriptions.update(params.subscription_id, updateParams);

    logger.info('Subscription updated', {
      id: subscription.id,
      status: subscription.status,
    });

    return subscription;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(params: CancelSubscriptionParams): Promise<Stripe.Subscription> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const cancelParams: Stripe.SubscriptionCancelParams = {
      ...(params.prorate !== undefined && { prorate: params.prorate }),
      ...(params.invoice_now !== undefined && { invoice_now: params.invoice_now }),
    };

    logger.debug('Canceling subscription', {
      subscription_id: params.subscription_id,
    });

    const subscription = Object.keys(options).length > 0
      ? await stripe.subscriptions.cancel(params.subscription_id, cancelParams, options)
      : await stripe.subscriptions.cancel(params.subscription_id, cancelParams);

    logger.info('Subscription canceled', {
      id: subscription.id,
      status: subscription.status,
    });

    return subscription;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Resume a paused subscription
 */
export async function resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    logger.debug('Resuming subscription', {
      subscription_id: subscriptionId,
    });

    // Resume by clearing pause_collection (set to empty string)
    const subscription = Object.keys(options).length > 0
      ? await stripe.subscriptions.update(
          subscriptionId,
          {
            pause_collection: '',
          },
          options
        )
      : await stripe.subscriptions.update(
          subscriptionId,
          {
            pause_collection: '',
          }
        );

    logger.info('Subscription resumed', {
      id: subscription.id,
      status: subscription.status,
    });

    return subscription;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * List subscriptions
 */
export async function listSubscriptions(params: ListSubscriptionsParams): Promise<Stripe.ApiList<Stripe.Subscription>> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const listParams: Stripe.SubscriptionListParams = {
      ...(params.customer && { customer: params.customer }),
      ...(params.status && { status: params.status }),
      ...(params.price && { price: params.price }),
      ...(params.limit && { limit: params.limit }),
      ...(params.starting_after && { starting_after: params.starting_after }),
    };

    logger.debug('Listing subscriptions', params);

    const subscriptions = Object.keys(options).length > 0
      ? await stripe.subscriptions.list(listParams, options)
      : await stripe.subscriptions.list(listParams);

    logger.debug('Subscriptions listed', {
      count: subscriptions.data.length,
      has_more: subscriptions.has_more,
    });

    return subscriptions;
  } catch (error) {
    throw handleStripeError(error);
  }
}
