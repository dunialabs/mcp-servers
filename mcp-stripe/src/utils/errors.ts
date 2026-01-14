/**
 * Error handling utilities for Stripe MCP Server
 * Maps Stripe API errors to MCP error codes
 */

import Stripe from 'stripe';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

/**
 * Handle Stripe API errors and convert to MCP errors
 */
export function handleStripeError(error: unknown): McpError {
  if (error instanceof Stripe.errors.StripeError) {
    logger.error('Stripe API error', {
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId,
      message: error.message,
    });

    // Map Stripe error types to MCP error codes
    switch (error.type) {
      case 'StripeCardError':
        return new McpError(ErrorCode.InvalidRequest, `Card error: ${error.message}`);

      case 'StripeInvalidRequestError':
        return new McpError(ErrorCode.InvalidParams, `Invalid request: ${error.message}`);

      case 'StripeAPIError':
        return new McpError(
          ErrorCode.InternalError,
          `Stripe API error: ${error.message}. Request ID: ${error.requestId}`
        );

      case 'StripeConnectionError':
        return new McpError(
          ErrorCode.InternalError,
          'Failed to connect to Stripe API. Please check your network connection.'
        );

      case 'StripeAuthenticationError':
        return new McpError(
          ErrorCode.InvalidRequest,
          'Invalid Stripe API key. Please check your STRIPE_SECRET_KEY environment variable.'
        );

      case 'StripePermissionError':
        return new McpError(
          ErrorCode.InvalidRequest,
          `Permission denied: ${error.message}. Your API key may not have sufficient permissions.`
        );

      case 'StripeRateLimitError':
        return new McpError(
          ErrorCode.InternalError,
          'Rate limit exceeded. Please try again in a few moments.'
        );

      case 'StripeIdempotencyError':
        return new McpError(
          ErrorCode.InvalidRequest,
          `Idempotency error: ${error.message}. The idempotency key is being reused incorrectly.`
        );

      default:
        return new McpError(
          ErrorCode.InternalError,
          `Stripe error (${error.type}): ${error.message}`
        );
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    logger.error('Unexpected error', {
      message: error.message,
      stack: error.stack,
    });
    return new McpError(ErrorCode.InternalError, error.message);
  }

  // Unknown error type
  logger.error('Unknown error', { error });
  return new McpError(ErrorCode.InternalError, 'An unknown error occurred');
}

/**
 * Validate that required environment variables are set
 */
export function validateEnvironment(): void {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_SECRET_KEY environment variable is required. ' +
        'Please set it to your Stripe secret key (sk_test_xxx or sk_live_xxx).'
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  // Validate key format
  if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
    throw new Error(
      'STRIPE_SECRET_KEY must be a valid Stripe secret key starting with sk_test_ or sk_live_'
    );
  }

  // Warn about production keys
  if (secretKey.startsWith('sk_live_')) {
    logger.warn(
      'Using LIVE Stripe API key. Ensure you are in production mode and understand the implications.'
    );
  } else {
    logger.info('Using TEST Stripe API key. Safe for development and testing.');
  }
}

/**
 * Validate Connect operation safety
 * Prevents write operations from accidentally affecting platform account when STRIPE_ACCOUNT is not set
 */
export function validateConnectOperation(toolName: string): void {
  const isWriteOperation = ['create', 'update', 'delete', 'confirm', 'cancel', 'finalize', 'pay', 'void', 'attach', 'detach'].some(
    (op) => toolName.toLowerCase().includes(op)
  );

  if (isWriteOperation && !process.env.STRIPE_ACCOUNT) {
    const secretKey = process.env.STRIPE_SECRET_KEY || '';

    // If using a Connect access token (starts with different prefix), require STRIPE_ACCOUNT
    // This is a safety check to prevent accidentally operating on platform account
    if (secretKey.startsWith('sk_') && process.env.NODE_ENV === 'production') {
      logger.warn(
        `Write operation '${toolName}' executing without STRIPE_ACCOUNT. ` +
        'Operation will affect platform account. Set STRIPE_ACCOUNT to target connected account.'
      );
    }
  }
}
