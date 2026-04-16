import Stripe from 'stripe';
import { getStripeClient, getStripeOptions } from '../auth/stripe-client.js';
import { handleStripeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface ListInvoicesParams {
  customer?: string;
  status?: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  limit?: number;
  starting_after?: string;
}

export async function listInvoices(
  params: ListInvoicesParams
): Promise<Stripe.ApiList<Stripe.Invoice>> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const listParams: Stripe.InvoiceListParams = {
      ...(params.customer && { customer: params.customer }),
      ...(params.status && { status: params.status }),
      ...(params.limit && { limit: params.limit }),
      ...(params.starting_after && { starting_after: params.starting_after }),
    };

    logger.debug('Listing invoices', params);

    const invoices =
      Object.keys(options).length > 0
        ? await stripe.invoices.list(listParams, options)
        : await stripe.invoices.list(listParams);

    logger.debug('Invoices listed', {
      count: invoices.data.length,
      has_more: invoices.has_more,
    });

    return invoices;
  } catch (error) {
    throw handleStripeError(error);
  }
}
