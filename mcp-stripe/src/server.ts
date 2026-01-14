/**
 * Stripe MCP Server
 * Provides Stripe API integration via Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { logger } from './utils/logger.js';
import { validateEnvironment, validateConnectOperation } from './utils/errors.js';
import { createStripeClient } from './auth/stripe-client.js';

// Import tool functions
import {
  createPaymentIntent,
  confirmPaymentIntent,
  cancelPaymentIntent,
  getPaymentIntent,
  listPaymentIntents,
} from './tools/payment-intents.js';
import {
  createCustomer,
  getCustomer,
  updateCustomer,
  listCustomers,
  deleteCustomer,
} from './tools/customers.js';
import { createRefund, getRefund, listRefunds } from './tools/refunds.js';
import {
  createProduct,
  getProduct,
  updateProduct,
  listProducts,
  deleteProduct,
} from './tools/products.js';
import {
  createPrice,
  getPrice,
  updatePrice,
  listPrices,
} from './tools/prices.js';
import {
  createSubscription,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  resumeSubscription,
  listSubscriptions,
} from './tools/subscriptions.js';

// ==================== Zod Schemas ====================

// Payment Intent Schemas
// NOTE: We do not validate minimum amounts here because:
// 1. Minimum amounts depend on the account's settlement currency and custom settings
// 2. Stripe API will return accurate error messages including currency conversion details
// 3. Client-side validation could give false positives or false negatives
const CreatePaymentIntentSchema = z.object({
  amount: z.number().int().positive().max(99999999).describe('Amount in smallest currency unit (e.g., cents for USD). Must be positive integer.'),
  currency: z.enum(['usd', 'eur', 'gbp', 'cny', 'jpy']).describe('Three-letter ISO currency code'),
  customer: z.string().optional().describe('Customer ID (cus_xxx)'),
  payment_method: z.string().optional().describe('Payment method ID (pm_xxx)'),
  description: z.string().max(1000).optional().describe('Description of the payment'),
  metadata: z.record(z.string()).optional().describe('Key-value metadata (max 50 keys)'),
  idempotency_key: z.string().optional().describe('Idempotency key for safe retries'),
});

const ConfirmPaymentIntentSchema = z.object({
  payment_intent_id: z.string().describe('Payment intent ID (pi_xxx)'),
  payment_method: z.string().optional().describe('Payment method ID if not already attached'),
  return_url: z.string().url().optional().describe('URL to redirect after authentication'),
});

const CancelPaymentIntentSchema = z.object({
  payment_intent_id: z.string().describe('Payment intent ID (pi_xxx)'),
  cancellation_reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer', 'abandoned']).optional().describe('Reason for cancellation'),
});

const GetPaymentIntentSchema = z.object({
  payment_intent_id: z.string().describe('Payment intent ID (pi_xxx)'),
});

const ListPaymentIntentsSchema = z.object({
  customer: z.string().optional().describe('Filter by customer ID'),
  limit: z.number().min(1).max(100).optional().describe('Number of results (1-100, default: 10)'),
  starting_after: z.string().optional().describe('Cursor for pagination'),
});

// Customer Schemas
const CreateCustomerSchema = z.object({
  email: z.string().email().optional().describe('Customer email address'),
  name: z.string().max(255).optional().describe('Customer name'),
  phone: z.string().max(20).optional().describe('Customer phone number'),
  description: z.string().max(350).optional().describe('Description of the customer'),
  metadata: z.record(z.string()).optional().describe('Key-value metadata'),
  idempotency_key: z.string().optional().describe('Idempotency key for safe retries'),
});

const GetCustomerSchema = z.object({
  customer_id: z.string().describe('Customer ID (cus_xxx)'),
});

const UpdateCustomerSchema = z.object({
  customer_id: z.string().describe('Customer ID (cus_xxx)'),
  email: z.string().email().optional().describe('Customer email address'),
  name: z.string().max(255).optional().describe('Customer name'),
  phone: z.string().max(20).optional().describe('Customer phone number'),
  description: z.string().max(350).optional().describe('Description of the customer'),
  metadata: z.record(z.string()).optional().describe('Key-value metadata'),
});

const ListCustomersSchema = z.object({
  email: z.string().email().optional().describe('Filter by email address'),
  limit: z.number().min(1).max(100).optional().describe('Number of results (1-100, default: 10)'),
  starting_after: z.string().optional().describe('Cursor for pagination'),
});

const DeleteCustomerSchema = z.object({
  customer_id: z.string().describe('Customer ID (cus_xxx)'),
});

// Refund Schemas
const CreateRefundSchema = z.object({
  charge: z.string().optional().describe('Charge ID (ch_xxx)'),
  payment_intent: z.string().optional().describe('Payment intent ID (pi_xxx)'),
  amount: z.number().min(1).optional().describe('Amount to refund (partial refund if less than original)'),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional().describe('Reason for refund'),
  metadata: z.record(z.string()).optional().describe('Key-value metadata'),
  idempotency_key: z.string().optional().describe('Idempotency key for safe retries'),
}).refine(data => data.charge || data.payment_intent, {
  message: 'Either charge or payment_intent must be provided',
});

const GetRefundSchema = z.object({
  refund_id: z.string().describe('Refund ID (re_xxx)'),
});

const ListRefundsSchema = z.object({
  charge: z.string().optional().describe('Filter by charge ID'),
  payment_intent: z.string().optional().describe('Filter by payment intent ID'),
  limit: z.number().min(1).max(100).optional().describe('Number of results (1-100, default: 10)'),
  starting_after: z.string().optional().describe('Cursor for pagination'),
});

// Product Schemas
const CreateProductSchema = z.object({
  name: z.string().min(1).max(250).describe('Product name'),
  description: z.string().max(5000).optional().describe('Product description'),
  active: z.boolean().optional().describe('Whether the product is available (default: true)'),
  metadata: z.record(z.string()).optional().describe('Key-value metadata'),
  idempotency_key: z.string().optional().describe('Idempotency key for safe retries'),
});

const GetProductSchema = z.object({
  product_id: z.string().describe('Product ID (prod_xxx)'),
});

const UpdateProductSchema = z.object({
  product_id: z.string().describe('Product ID (prod_xxx)'),
  name: z.string().min(1).max(250).optional().describe('Product name'),
  description: z.string().max(5000).optional().describe('Product description'),
  active: z.boolean().optional().describe('Whether the product is available'),
  metadata: z.record(z.string()).optional().describe('Key-value metadata'),
});

const ListProductsSchema = z.object({
  active: z.boolean().optional().describe('Filter by active status'),
  limit: z.number().min(1).max(100).optional().describe('Number of results (1-100, default: 10)'),
  starting_after: z.string().optional().describe('Cursor for pagination'),
});

const DeleteProductSchema = z.object({
  product_id: z.string().describe('Product ID (prod_xxx)'),
});

// Price Schemas
// NOTE: We do not validate minimum unit_amount here for the same reasons as Payment Intents.
// Stripe API will enforce the correct minimum based on account settings and settlement currency.
const CreatePriceSchema = z.object({
  product_id: z.string().describe('Product ID (prod_xxx)'),
  unit_amount: z.number().int().min(0).optional().describe('Price in smallest currency unit. Optional for custom/metered pricing.'),
  currency: z.enum(['usd', 'eur', 'gbp', 'cny', 'jpy']).describe('Three-letter ISO currency code'),
  recurring: z.object({
    interval: z.enum(['day', 'week', 'month', 'year']).describe('Billing frequency'),
    interval_count: z.number().min(1).optional().describe('Number of intervals between billings'),
  }).optional().describe('Recurring billing parameters'),
  metadata: z.record(z.string()).optional().describe('Key-value metadata'),
  idempotency_key: z.string().optional().describe('Idempotency key for safe retries'),
});

const GetPriceSchema = z.object({
  price_id: z.string().describe('Price ID (price_xxx)'),
});

const UpdatePriceSchema = z.object({
  price_id: z.string().describe('Price ID (price_xxx)'),
  active: z.boolean().optional().describe('Whether the price is active'),
  metadata: z.record(z.string()).optional().describe('Key-value metadata'),
});

const ListPricesSchema = z.object({
  product: z.string().optional().describe('Filter by product ID'),
  active: z.boolean().optional().describe('Filter by active status'),
  type: z.enum(['one_time', 'recurring']).optional().describe('Filter by price type'),
  limit: z.number().min(1).max(100).optional().describe('Number of results (1-100, default: 10)'),
  starting_after: z.string().optional().describe('Cursor for pagination'),
});

// Subscription Schemas
const SubscriptionItemSchema = z.object({
  price: z.string().describe('Price ID (price_xxx)'),
  quantity: z.number().min(1).optional().describe('Quantity (default: 1)'),
});

const CreateSubscriptionSchema = z.object({
  customer_id: z.string().describe('Customer ID (cus_xxx)'),
  items: z.array(SubscriptionItemSchema).min(1).describe('Subscription items'),
  trial_period_days: z.number().min(0).max(730).optional().describe('Trial period in days'),
  coupon: z.string().optional().describe('Coupon ID'),
  metadata: z.record(z.string()).optional().describe('Key-value metadata'),
  idempotency_key: z.string().optional().describe('Idempotency key for safe retries'),
});

const GetSubscriptionSchema = z.object({
  subscription_id: z.string().describe('Subscription ID (sub_xxx)'),
});

const UpdateSubscriptionItemSchema = z.object({
  id: z.string().optional().describe('Subscription item ID (si_xxx)'),
  price: z.string().describe('Price ID (price_xxx)'),
  quantity: z.number().min(1).optional().describe('Quantity'),
});

const UpdateSubscriptionSchema = z.object({
  subscription_id: z.string().describe('Subscription ID (sub_xxx)'),
  items: z.array(UpdateSubscriptionItemSchema).optional().describe('Update subscription items'),
  metadata: z.record(z.string()).optional().describe('Key-value metadata'),
});

const CancelSubscriptionSchema = z.object({
  subscription_id: z.string().describe('Subscription ID (sub_xxx)'),
  prorate: z.boolean().optional().describe('Prorate the cancellation'),
  invoice_now: z.boolean().optional().describe('Invoice immediately'),
});

const ResumeSubscriptionSchema = z.object({
  subscription_id: z.string().describe('Subscription ID (sub_xxx)'),
});

const ListSubscriptionsSchema = z.object({
  customer: z.string().optional().describe('Filter by customer ID'),
  status: z.enum(['active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'trialing']).optional().describe('Filter by status'),
  price: z.string().optional().describe('Filter by price ID'),
  limit: z.number().min(1).max(100).optional().describe('Number of results (1-100, default: 10)'),
  starting_after: z.string().optional().describe('Cursor for pagination'),
});

// ==================== Tool Definitions ====================

const TOOLS: Tool[] = [
  // Payment Intent Tools
  {
    name: 'stripeCreatePaymentIntent',
    description: 'Create a payment intent for processing payments. Use this to initiate a payment flow.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount in smallest currency unit (e.g., cents for USD)' },
        currency: { type: 'string', enum: ['usd', 'eur', 'gbp', 'cny', 'jpy'], description: 'Three-letter ISO currency code' },
        customer: { type: 'string', description: 'Customer ID (cus_xxx)' },
        payment_method: { type: 'string', description: 'Payment method ID (pm_xxx)' },
        description: { type: 'string', description: 'Description of the payment' },
        metadata: { type: 'object', description: 'Key-value metadata' },
        idempotency_key: { type: 'string', description: 'Idempotency key for safe retries' },
      },
      required: ['amount', 'currency'],
    },
  },
  {
    name: 'stripeConfirmPaymentIntent',
    description: 'Confirm a payment intent to complete the payment. Call this after creating a payment intent.',
    inputSchema: {
      type: 'object',
      properties: {
        payment_intent_id: { type: 'string', description: 'Payment intent ID (pi_xxx)' },
        payment_method: { type: 'string', description: 'Payment method ID if not already attached' },
        return_url: { type: 'string', description: 'URL to redirect after authentication' },
      },
      required: ['payment_intent_id'],
    },
  },
  {
    name: 'stripeCancelPaymentIntent',
    description: 'Cancel a payment intent. Use this to cancel a payment before it is confirmed.',
    inputSchema: {
      type: 'object',
      properties: {
        payment_intent_id: { type: 'string', description: 'Payment intent ID (pi_xxx)' },
        cancellation_reason: { type: 'string', enum: ['duplicate', 'fraudulent', 'requested_by_customer', 'abandoned'], description: 'Reason for cancellation' },
      },
      required: ['payment_intent_id'],
    },
  },
  {
    name: 'stripeGetPaymentIntent',
    description: 'Retrieve a payment intent by ID. Use this to check the status of a payment.',
    inputSchema: {
      type: 'object',
      properties: {
        payment_intent_id: { type: 'string', description: 'Payment intent ID (pi_xxx)' },
      },
      required: ['payment_intent_id'],
    },
  },
  {
    name: 'stripeListPaymentIntents',
    description: 'List payment intents with optional filters. Use this to view payment history. Note: Status filtering is not supported by Stripe API.',
    inputSchema: {
      type: 'object',
      properties: {
        customer: { type: 'string', description: 'Filter by customer ID' },
        limit: { type: 'number', description: 'Number of results (1-100)' },
        starting_after: { type: 'string', description: 'Cursor for pagination' },
      },
    },
  },
  // Customer Tools
  {
    name: 'stripeCreateCustomer',
    description: 'Create a new customer. Use this to store customer information for future payments.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Customer email address' },
        name: { type: 'string', description: 'Customer name' },
        phone: { type: 'string', description: 'Customer phone number' },
        description: { type: 'string', description: 'Description of the customer' },
        metadata: { type: 'object', description: 'Key-value metadata' },
        idempotency_key: { type: 'string', description: 'Idempotency key for safe retries' },
      },
    },
  },
  {
    name: 'stripeGetCustomer',
    description: 'Retrieve a customer by ID. Use this to get customer details.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'Customer ID (cus_xxx)' },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'stripeUpdateCustomer',
    description: 'Update customer information. Use this to modify customer details.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'Customer ID (cus_xxx)' },
        email: { type: 'string', description: 'Customer email address' },
        name: { type: 'string', description: 'Customer name' },
        phone: { type: 'string', description: 'Customer phone number' },
        description: { type: 'string', description: 'Description of the customer' },
        metadata: { type: 'object', description: 'Key-value metadata' },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'stripeListCustomers',
    description: 'List all customers with optional filters. Use this to browse customer records.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Filter by email address' },
        limit: { type: 'number', description: 'Number of results (1-100)' },
        starting_after: { type: 'string', description: 'Cursor for pagination' },
      },
    },
  },
  {
    name: 'stripeDeleteCustomer',
    description: 'Delete a customer. Use this to remove a customer from your Stripe account.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'Customer ID (cus_xxx)' },
      },
      required: ['customer_id'],
    },
  },
  // Refund Tools
  {
    name: 'stripeCreateRefund',
    description: 'Create a refund for a charge or payment intent. Use this to refund a payment (full or partial).',
    inputSchema: {
      type: 'object',
      properties: {
        charge: { type: 'string', description: 'Charge ID (ch_xxx)' },
        payment_intent: { type: 'string', description: 'Payment intent ID (pi_xxx)' },
        amount: { type: 'number', description: 'Amount to refund (partial refund if less than original)' },
        reason: { type: 'string', enum: ['duplicate', 'fraudulent', 'requested_by_customer'], description: 'Reason for refund' },
        metadata: { type: 'object', description: 'Key-value metadata' },
        idempotency_key: { type: 'string', description: 'Idempotency key for safe retries' },
      },
    },
  },
  {
    name: 'stripeGetRefund',
    description: 'Retrieve a refund by ID. Use this to check refund status.',
    inputSchema: {
      type: 'object',
      properties: {
        refund_id: { type: 'string', description: 'Refund ID (re_xxx)' },
      },
      required: ['refund_id'],
    },
  },
  {
    name: 'stripeListRefunds',
    description: 'List refunds with optional filters. Use this to view refund history.',
    inputSchema: {
      type: 'object',
      properties: {
        charge: { type: 'string', description: 'Filter by charge ID' },
        payment_intent: { type: 'string', description: 'Filter by payment intent ID' },
        limit: { type: 'number', description: 'Number of results (1-100)' },
        starting_after: { type: 'string', description: 'Cursor for pagination' },
      },
    },
  },
  // Product Tools
  {
    name: 'stripeCreateProduct',
    description: 'Create a new product. Use this to define a product in your catalog.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Product name' },
        description: { type: 'string', description: 'Product description' },
        active: { type: 'boolean', description: 'Whether product is available (default: true)' },
        metadata: { type: 'object', description: 'Key-value metadata' },
        idempotency_key: { type: 'string', description: 'Idempotency key for safe retries' },
      },
      required: ['name'],
    },
  },
  {
    name: 'stripeGetProduct',
    description: 'Retrieve a product by ID. Use this to get product details.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product ID (prod_xxx)' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'stripeUpdateProduct',
    description: 'Update product information. Use this to modify product details.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product ID (prod_xxx)' },
        name: { type: 'string', description: 'Product name' },
        description: { type: 'string', description: 'Product description' },
        active: { type: 'boolean', description: 'Whether product is available' },
        metadata: { type: 'object', description: 'Key-value metadata' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'stripeListProducts',
    description: 'List all products with optional filters. Use this to browse your product catalog.',
    inputSchema: {
      type: 'object',
      properties: {
        active: { type: 'boolean', description: 'Filter by active status' },
        limit: { type: 'number', description: 'Number of results (1-100)' },
        starting_after: { type: 'string', description: 'Cursor for pagination' },
      },
    },
  },
  {
    name: 'stripeDeleteProduct',
    description: 'Delete a product. Use this to remove a product from your catalog.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product ID (prod_xxx)' },
      },
      required: ['product_id'],
    },
  },
  // Price Tools
  {
    name: 'stripeCreatePrice',
    description: 'Create a price for a product. Use this to define one-time or recurring pricing.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product ID (prod_xxx)' },
        unit_amount: { type: 'number', description: 'Price in smallest currency unit' },
        currency: { type: 'string', enum: ['usd', 'eur', 'gbp', 'cny', 'jpy'], description: 'Three-letter ISO currency code' },
        recurring: { type: 'object', description: 'Recurring billing parameters' },
        metadata: { type: 'object', description: 'Key-value metadata' },
        idempotency_key: { type: 'string', description: 'Idempotency key for safe retries' },
      },
      required: ['product_id', 'currency'],
    },
  },
  {
    name: 'stripeGetPrice',
    description: 'Retrieve a price by ID. Use this to get price details.',
    inputSchema: {
      type: 'object',
      properties: {
        price_id: { type: 'string', description: 'Price ID (price_xxx)' },
      },
      required: ['price_id'],
    },
  },
  {
    name: 'stripeUpdatePrice',
    description: 'Update a price (only metadata and active status). Use this to modify price settings.',
    inputSchema: {
      type: 'object',
      properties: {
        price_id: { type: 'string', description: 'Price ID (price_xxx)' },
        active: { type: 'boolean', description: 'Whether price is active' },
        metadata: { type: 'object', description: 'Key-value metadata' },
      },
      required: ['price_id'],
    },
  },
  {
    name: 'stripeListPrices',
    description: 'List prices with optional filters. Use this to browse pricing.',
    inputSchema: {
      type: 'object',
      properties: {
        product: { type: 'string', description: 'Filter by product ID' },
        active: { type: 'boolean', description: 'Filter by active status' },
        type: { type: 'string', enum: ['one_time', 'recurring'], description: 'Filter by price type' },
        limit: { type: 'number', description: 'Number of results (1-100)' },
        starting_after: { type: 'string', description: 'Cursor for pagination' },
      },
    },
  },
  // Subscription Tools
  {
    name: 'stripeCreateSubscription',
    description: 'Create a subscription for a customer. Use this to start recurring billing.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'Customer ID (cus_xxx)' },
        items: { type: 'array', description: 'Subscription items with price IDs' },
        trial_period_days: { type: 'number', description: 'Trial period in days' },
        coupon: { type: 'string', description: 'Coupon ID' },
        metadata: { type: 'object', description: 'Key-value metadata' },
        idempotency_key: { type: 'string', description: 'Idempotency key for safe retries' },
      },
      required: ['customer_id', 'items'],
    },
  },
  {
    name: 'stripeGetSubscription',
    description: 'Retrieve a subscription by ID. Use this to check subscription status.',
    inputSchema: {
      type: 'object',
      properties: {
        subscription_id: { type: 'string', description: 'Subscription ID (sub_xxx)' },
      },
      required: ['subscription_id'],
    },
  },
  {
    name: 'stripeUpdateSubscription',
    description: 'Update a subscription. Use this to upgrade, downgrade, or modify a subscription.',
    inputSchema: {
      type: 'object',
      properties: {
        subscription_id: { type: 'string', description: 'Subscription ID (sub_xxx)' },
        items: { type: 'array', description: 'Updated subscription items' },
        metadata: { type: 'object', description: 'Key-value metadata' },
      },
      required: ['subscription_id'],
    },
  },
  {
    name: 'stripeCancelSubscription',
    description: 'Cancel a subscription. Use this to stop recurring billing.',
    inputSchema: {
      type: 'object',
      properties: {
        subscription_id: { type: 'string', description: 'Subscription ID (sub_xxx)' },
        prorate: { type: 'boolean', description: 'Prorate the cancellation' },
        invoice_now: { type: 'boolean', description: 'Invoice immediately' },
      },
      required: ['subscription_id'],
    },
  },
  {
    name: 'stripeResumeSubscription',
    description: 'Resume a paused subscription. Use this to restart billing.',
    inputSchema: {
      type: 'object',
      properties: {
        subscription_id: { type: 'string', description: 'Subscription ID (sub_xxx)' },
      },
      required: ['subscription_id'],
    },
  },
  {
    name: 'stripeListSubscriptions',
    description: 'List subscriptions with optional filters. Use this to view subscription records.',
    inputSchema: {
      type: 'object',
      properties: {
        customer: { type: 'string', description: 'Filter by customer ID' },
        status: { type: 'string', description: 'Filter by status' },
        price: { type: 'string', description: 'Filter by price ID' },
        limit: { type: 'number', description: 'Number of results (1-100)' },
        starting_after: { type: 'string', description: 'Cursor for pagination' },
      },
    },
  },
];

// ==================== Server Implementation ====================

export function createServer() {
  const server = new Server(
    {
      name: 'mcp-stripe',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    logger.info('Tool called', { name, args });

    try {
      // Validate Connect operation safety
      validateConnectOperation(name);

      // Route to appropriate tool handler
      switch (name) {
        // Payment Intent Tools
        case 'stripeCreatePaymentIntent': {
          const params = CreatePaymentIntentSchema.parse(args);
          const result = await createPaymentIntent(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeConfirmPaymentIntent': {
          const params = ConfirmPaymentIntentSchema.parse(args);
          const result = await confirmPaymentIntent(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeCancelPaymentIntent': {
          const params = CancelPaymentIntentSchema.parse(args);
          const result = await cancelPaymentIntent(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeGetPaymentIntent': {
          const params = GetPaymentIntentSchema.parse(args);
          const result = await getPaymentIntent(params.payment_intent_id);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeListPaymentIntents': {
          const params = ListPaymentIntentsSchema.parse(args);
          const result = await listPaymentIntents(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // Customer Tools
        case 'stripeCreateCustomer': {
          const params = CreateCustomerSchema.parse(args);
          const result = await createCustomer(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeGetCustomer': {
          const params = GetCustomerSchema.parse(args);
          const result = await getCustomer(params.customer_id);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeUpdateCustomer': {
          const params = UpdateCustomerSchema.parse(args);
          const result = await updateCustomer(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeListCustomers': {
          const params = ListCustomersSchema.parse(args);
          const result = await listCustomers(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeDeleteCustomer': {
          const params = DeleteCustomerSchema.parse(args);
          const result = await deleteCustomer(params.customer_id);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // Refund Tools
        case 'stripeCreateRefund': {
          const params = CreateRefundSchema.parse(args);
          const result = await createRefund(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeGetRefund': {
          const params = GetRefundSchema.parse(args);
          const result = await getRefund(params.refund_id);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeListRefunds': {
          const params = ListRefundsSchema.parse(args);
          const result = await listRefunds(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // Product Tools
        case 'stripeCreateProduct': {
          const params = CreateProductSchema.parse(args);
          const result = await createProduct(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeGetProduct': {
          const params = GetProductSchema.parse(args);
          const result = await getProduct(params.product_id);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeUpdateProduct': {
          const params = UpdateProductSchema.parse(args);
          const result = await updateProduct(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeListProducts': {
          const params = ListProductsSchema.parse(args);
          const result = await listProducts(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeDeleteProduct': {
          const params = DeleteProductSchema.parse(args);
          const result = await deleteProduct(params.product_id);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // Price Tools
        case 'stripeCreatePrice': {
          const params = CreatePriceSchema.parse(args);
          const result = await createPrice(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeGetPrice': {
          const params = GetPriceSchema.parse(args);
          const result = await getPrice(params.price_id);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeUpdatePrice': {
          const params = UpdatePriceSchema.parse(args);
          const result = await updatePrice(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeListPrices': {
          const params = ListPricesSchema.parse(args);
          const result = await listPrices(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // Subscription Tools
        case 'stripeCreateSubscription': {
          const params = CreateSubscriptionSchema.parse(args);
          const result = await createSubscription(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeGetSubscription': {
          const params = GetSubscriptionSchema.parse(args);
          const result = await getSubscription(params.subscription_id);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeUpdateSubscription': {
          const params = UpdateSubscriptionSchema.parse(args);
          const result = await updateSubscription(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeCancelSubscription': {
          const params = CancelSubscriptionSchema.parse(args);
          const result = await cancelSubscription(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeResumeSubscription': {
          const params = ResumeSubscriptionSchema.parse(args);
          const result = await resumeSubscription(params.subscription_id);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'stripeListSubscriptions': {
          const params = ListSubscriptionsSchema.parse(args);
          const result = await listSubscriptions(params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      logger.error('Tool execution failed', { name, error });
      throw error;
    }
  });

  return server;
}

export async function runServer() {
  // Validate environment before starting
  validateEnvironment();

  // Initialize Stripe client
  createStripeClient();

  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  logger.info('Stripe MCP Server started', {
    mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live',
    stripeAccount: process.env.STRIPE_ACCOUNT || 'platform',
  });
}
