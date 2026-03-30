/**
 * Error handling utilities for Stripe MCP Server
 * Maps Stripe API errors to MCP error codes
 */

import Stripe from 'stripe';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';
import {
  TokenValidationError,
  normalizeAccessToken,
  validateTokenFormat,
} from '../auth/stripe-client.js';

export enum StripeMcpErrorCode {
  InvalidParams = ErrorCode.InvalidParams,
  InternalError = ErrorCode.InternalError,
  AuthenticationFailed = -32030,
  PermissionDenied = -32031,
  NotFound = -32032,
  RateLimited = -32034,
  ApiUnavailable = -32035,
}

export function createMcpError(code: number, message: string): McpError {
  return new McpError(code, message);
}

/**
 * Handle Stripe API errors and convert to MCP errors
 */
export function handleStripeError(error: unknown): McpError {
  if (error instanceof McpError) {
    return error;
  }

  if (error instanceof TokenValidationError) {
    return createMcpError(
      StripeMcpErrorCode.AuthenticationFailed,
      'Authentication failed. Check STRIPE_SECRET_KEY.'
    );
  }

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
        return createMcpError(ErrorCode.InvalidRequest, `Card error: ${error.message}`);

      case 'StripeInvalidRequestError':
        if (error.statusCode === 404) {
          return createMcpError(
            StripeMcpErrorCode.NotFound,
            `Stripe resource not found: ${error.message}`
          );
        }
        return createMcpError(StripeMcpErrorCode.InvalidParams, `Invalid request: ${error.message}`);

      case 'StripeAPIError':
        return createMcpError(
          StripeMcpErrorCode.ApiUnavailable,
          `Stripe API error: ${error.message}. Request ID: ${error.requestId}`
        );

      case 'StripeConnectionError':
        return createMcpError(
          StripeMcpErrorCode.ApiUnavailable,
          'Failed to connect to Stripe API. Please check your network connection.'
        );

      case 'StripeAuthenticationError':
        return createMcpError(
          StripeMcpErrorCode.AuthenticationFailed,
          'Invalid Stripe API key. Please check your STRIPE_SECRET_KEY environment variable.'
        );

      case 'StripePermissionError':
        return createMcpError(
          StripeMcpErrorCode.PermissionDenied,
          `Permission denied: ${error.message}. Your API key may not have sufficient permissions.`
        );

      case 'StripeRateLimitError':
        return createMcpError(
          StripeMcpErrorCode.RateLimited,
          'Rate limit exceeded. Please try again in a few moments.'
        );

      case 'StripeIdempotencyError':
        return createMcpError(
          ErrorCode.InvalidRequest,
          `Idempotency error: ${error.message}. The idempotency key is being reused incorrectly.`
        );

      default:
        return createMcpError(
          StripeMcpErrorCode.InternalError,
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
    return createMcpError(StripeMcpErrorCode.InternalError, error.message);
  }

  // Unknown error type
  logger.error('Unknown error', { error });
  return createMcpError(StripeMcpErrorCode.InternalError, 'An unknown error occurred');
}

/**
 * Validate that required environment variables are set
 */
export function validateEnvironment(): void {
  const rawSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!rawSecretKey || typeof rawSecretKey !== 'string' || rawSecretKey.trim().length === 0) {
    throw new TokenValidationError(
      'STRIPE_SECRET_KEY environment variable is required. Please set it to your Stripe secret key (sk_test_xxx or sk_live_xxx).'
    );
  }

  const secretKey = normalizeAccessToken(rawSecretKey);

  if (!validateTokenFormat(secretKey)) {
    throw new TokenValidationError(
      'STRIPE_SECRET_KEY must be a valid Stripe secret key starting with sk_test_ or sk_live_'
    );
  }

  process.env.STRIPE_SECRET_KEY = secretKey;

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
