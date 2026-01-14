/**
 * Type definitions for Stripe MCP Server
 * Based on Stripe API v2024-06-20
 */

export interface ServerConfig {
  name: string;
  version: string;
  description?: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ==================== Stripe Configuration ====================

export interface StripeConfig {
  secretKey: string;
  stripeAccount?: string; // Connect account ID
  apiVersion?: string;
}

export interface StripeRequestOptions {
  stripeAccount?: string;
  idempotencyKey?: string;
}

// ==================== Currency & Amount ====================

export type Currency = 'usd' | 'eur' | 'gbp' | 'cny' | 'jpy';

export interface AmountLimits {
  min: number;
  max: number;
}

// ==================== Payment Intent ====================

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded';

export type CancellationReason =
  | 'duplicate'
  | 'fraudulent'
  | 'requested_by_customer'
  | 'abandoned';

export interface CreatePaymentIntentParams {
  amount: number;
  currency: Currency;
  customer?: string;
  payment_method?: string;
  description?: string;
  metadata?: Record<string, string>;
  idempotency_key?: string;
}

export interface ConfirmPaymentIntentParams {
  payment_intent_id: string;
  payment_method?: string;
  return_url?: string;
}

export interface CancelPaymentIntentParams {
  payment_intent_id: string;
  cancellation_reason?: CancellationReason;
}

export interface ListPaymentIntentsParams {
  customer?: string;
  // Note: Stripe API does not support status filtering on list endpoint
  limit?: number;
  starting_after?: string;
}

// ==================== Customer ====================

export interface CreateCustomerParams {
  email?: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata?: Record<string, string>;
  idempotency_key?: string;
}

export interface UpdateCustomerParams {
  customer_id: string;
  email?: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface ListCustomersParams {
  email?: string;
  limit?: number;
  starting_after?: string;
}

// ==================== Payment Method ====================

export type PaymentMethodType = 'card' | 'us_bank_account' | 'sepa_debit' | 'alipay' | 'wechat_pay';

export interface AttachPaymentMethodParams {
  payment_method_id: string;
  customer_id: string;
}

export interface ListPaymentMethodsParams {
  customer_id: string;
  type: PaymentMethodType;
}

// ==================== Refund ====================

export type RefundReason = 'duplicate' | 'fraudulent' | 'requested_by_customer';

export interface CreateRefundParams {
  charge?: string;
  payment_intent?: string;
  amount?: number;
  reason?: RefundReason;
  metadata?: Record<string, string>;
  idempotency_key?: string;
}

export interface ListRefundsParams {
  charge?: string;
  payment_intent?: string;
  limit?: number;
  starting_after?: string;
}

// ==================== Subscription ====================

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing';

export interface SubscriptionItem {
  price: string;
  quantity?: number;
}

export interface CreateSubscriptionParams {
  customer_id: string;
  items: SubscriptionItem[];
  trial_period_days?: number;
  coupon?: string;
  metadata?: Record<string, string>;
  idempotency_key?: string;
}

export interface UpdateSubscriptionParams {
  subscription_id: string;
  items?: Array<{
    id?: string;
    price: string;
    quantity?: number;
  }>;
  metadata?: Record<string, string>;
}

export interface CancelSubscriptionParams {
  subscription_id: string;
  prorate?: boolean;
  invoice_now?: boolean;
}

export interface ListSubscriptionsParams {
  customer?: string;
  status?: SubscriptionStatus;
  price?: string;
  limit?: number;
  starting_after?: string;
}

// ==================== Product ====================

export interface CreateProductParams {
  name: string;
  description?: string;
  active?: boolean;
  metadata?: Record<string, string>;
  idempotency_key?: string;
}

export interface UpdateProductParams {
  product_id: string;
  name?: string;
  description?: string;
  active?: boolean;
  metadata?: Record<string, string>;
}

export interface ListProductsParams {
  active?: boolean;
  limit?: number;
  starting_after?: string;
}

// ==================== Price ====================

export type PriceInterval = 'day' | 'week' | 'month' | 'year';

export interface PriceRecurring {
  interval: PriceInterval;
  interval_count?: number;
}

export interface CreatePriceParams {
  product_id: string;
  unit_amount?: number;
  currency: Currency;
  recurring?: PriceRecurring;
  metadata?: Record<string, string>;
  idempotency_key?: string;
}

export interface UpdatePriceParams {
  price_id: string;
  active?: boolean;
  metadata?: Record<string, string>;
}

export type PriceType = 'one_time' | 'recurring';

export interface ListPricesParams {
  product?: string;
  active?: boolean;
  type?: PriceType;
  limit?: number;
  starting_after?: string;
}

// ==================== Invoice ====================

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';

export interface CreateInvoiceParams {
  customer_id: string;
  description?: string;
  metadata?: Record<string, string>;
  auto_advance?: boolean;
  idempotency_key?: string;
}

export interface FinalizeInvoiceParams {
  invoice_id: string;
  auto_advance?: boolean;
}

export interface PayInvoiceParams {
  invoice_id: string;
  payment_method?: string;
}

export interface ListInvoicesParams {
  customer?: string;
  status?: InvoiceStatus;
  subscription?: string;
  limit?: number;
  starting_after?: string;
}

// ==================== Event ====================

export interface ListEventsParams {
  type?: string;
  limit?: number;
  starting_after?: string;
}

// ==================== Balance ====================

export interface ListBalanceTransactionsParams {
  type?: string;
  limit?: number;
  starting_after?: string;
}
