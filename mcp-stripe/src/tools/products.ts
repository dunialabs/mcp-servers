/**
 * Product tools for Stripe MCP Server
 */

import Stripe from 'stripe';
import { getStripeClient, getStripeOptions } from '../auth/stripe-client.js';
import { handleStripeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type {
  CreateProductParams,
  UpdateProductParams,
  ListProductsParams,
} from '../types/index.js';

/**
 * Create a product
 */
export async function createProduct(params: CreateProductParams): Promise<Stripe.Product> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const createParams: Stripe.ProductCreateParams = {
      name: params.name,
      ...(params.description && { description: params.description }),
      ...(params.active !== undefined && { active: params.active }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    logger.debug('Creating product', {
      name: params.name,
    });

    const requestOptions: Stripe.RequestOptions = {
      ...options,
      ...(params.idempotency_key && { idempotencyKey: params.idempotency_key }),
    };

    const product = Object.keys(requestOptions).length > 0
      ? await stripe.products.create(createParams, requestOptions)
      : await stripe.products.create(createParams);

    logger.info('Product created', {
      id: product.id,
      name: product.name,
    });

    return product;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Retrieve a product
 */
export async function getProduct(productId: string): Promise<Stripe.Product> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    logger.debug('Retrieving product', {
      product_id: productId,
    });

    const product = Object.keys(options).length > 0
      ? await stripe.products.retrieve(productId, options)
      : await stripe.products.retrieve(productId);

    logger.debug('Product retrieved', {
      id: product.id,
      name: product.name,
    });

    return product;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Update a product
 */
export async function updateProduct(params: UpdateProductParams): Promise<Stripe.Product> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const updateParams: Stripe.ProductUpdateParams = {
      ...(params.name && { name: params.name }),
      ...(params.description !== undefined && { description: params.description }),
      ...(params.active !== undefined && { active: params.active }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    logger.debug('Updating product', {
      product_id: params.product_id,
    });

    const product = Object.keys(options).length > 0
      ? await stripe.products.update(params.product_id, updateParams, options)
      : await stripe.products.update(params.product_id, updateParams);

    logger.info('Product updated', {
      id: product.id,
      name: product.name,
    });

    return product;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * List products
 */
export async function listProducts(params: ListProductsParams): Promise<Stripe.ApiList<Stripe.Product>> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    const listParams: Stripe.ProductListParams = {
      ...(params.active !== undefined && { active: params.active }),
      ...(params.limit && { limit: params.limit }),
      ...(params.starting_after && { starting_after: params.starting_after }),
    };

    logger.debug('Listing products', params);

    const products = Object.keys(options).length > 0
      ? await stripe.products.list(listParams, options)
      : await stripe.products.list(listParams);

    logger.debug('Products listed', {
      count: products.data.length,
      has_more: products.has_more,
    });

    return products;
  } catch (error) {
    throw handleStripeError(error);
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<Stripe.DeletedProduct> {
  try {
    const stripe = getStripeClient();
    const options = getStripeOptions();

    logger.debug('Deleting product', {
      product_id: productId,
    });

    const deleted = Object.keys(options).length > 0
      ? await stripe.products.del(productId, options)
      : await stripe.products.del(productId);

    logger.info('Product deleted', {
      id: deleted.id,
      deleted: deleted.deleted,
    });

    return deleted;
  } catch (error) {
    throw handleStripeError(error);
  }
}
