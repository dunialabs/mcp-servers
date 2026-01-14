/**
 * Customer tools for Stripe MCP Server
 */

import Stripe from 'stripe';
import { getStripeClient, getStripeOptions } from '../auth/stripe-client.js';
import { handleStripeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type {
  CreateCustomerParams,
  UpdateCustomerParams,
  ListCustomersParams,
} from '../types/index.js';

/**
 * Create a customer
 */
export async function createCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const createParams: Stripe.CustomerCreateParams = {
      ...(params.email && { email: params.email }),
      ...(params.name && { name: params.name }),
      ...(params.phone && { phone: params.phone }),
      ...(params.description && { description: params.description }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    logger.debug('Creating customer', {
      email: params.email,
      name: params.name,
    });

    const requestOptions: Stripe.RequestOptions = {
      ...options,
      ...(params.idempotency_key && { idempotencyKey: params.idempotency_key }),
    };

    const customer = Object.keys(requestOptions).length > 0
      ? await stripe.customers.create(createParams, requestOptions)
      : await stripe.customers.create(createParams);

    logger.info('Customer created', {
      id: customer.id,
      email: customer.email,
    });

    return customer;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Retrieve a customer
 */
export async function getCustomer(customerId: string): Promise<Stripe.Customer> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    logger.debug('Retrieving customer', {
      customer_id: customerId,
    });

    const customer = Object.keys(options).length > 0
      ? await stripe.customers.retrieve(customerId, options)
      : await stripe.customers.retrieve(customerId);

    // Check if customer was deleted
    if (customer.deleted) {
      throw new Error(`Customer ${customerId} has been deleted`);
    }

    logger.debug('Customer retrieved', {
      id: customer.id,
      email: customer.email,
    });

    return customer as Stripe.Customer;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Update a customer
 */
export async function updateCustomer(params: UpdateCustomerParams): Promise<Stripe.Customer> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const updateParams: Stripe.CustomerUpdateParams = {
      ...(params.email && { email: params.email }),
      ...(params.name && { name: params.name }),
      ...(params.phone && { phone: params.phone }),
      ...(params.description && { description: params.description }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    logger.debug('Updating customer', {
      customer_id: params.customer_id,
    });

    const customer = Object.keys(options).length > 0
      ? await stripe.customers.update(params.customer_id, updateParams, options)
      : await stripe.customers.update(params.customer_id, updateParams);

    logger.info('Customer updated', {
      id: customer.id,
      email: customer.email,
    });

    return customer;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * List customers
 */
export async function listCustomers(params: ListCustomersParams): Promise<Stripe.ApiList<Stripe.Customer>> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const listParams: Stripe.CustomerListParams = {
      ...(params.email && { email: params.email }),
      ...(params.limit && { limit: params.limit }),
      ...(params.starting_after && { starting_after: params.starting_after }),
    };

    logger.debug('Listing customers', params);

    const customers = Object.keys(options).length > 0
      ? await stripe.customers.list(listParams, options)
      : await stripe.customers.list(listParams);

    logger.debug('Customers listed', {
      count: customers.data.length,
      has_more: customers.has_more,
    });

    return customers;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Delete a customer
 */
export async function deleteCustomer(customerId: string): Promise<Stripe.DeletedCustomer> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    logger.debug('Deleting customer', {
      customer_id: customerId,
    });

    const deleted = Object.keys(options).length > 0
      ? await stripe.customers.del(customerId, options)
      : await stripe.customers.del(customerId);

    logger.info('Customer deleted', {
      id: deleted.id,
      deleted: deleted.deleted,
    });

    return deleted;
  } catch (error) {
    throw handleStripeError(error);
  }
}
