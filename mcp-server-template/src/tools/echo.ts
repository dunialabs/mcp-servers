/**
 * Echo Tool
 * Demonstrates a simple tool implementation with input validation
 */

import { z } from 'zod';
import { logger } from '../utils/logger.js';

// Input schema validation
const EchoToolInput = z.object({
  message: z.string().min(1).max(10000).describe('The message to echo back'),
  uppercase: z.boolean().optional().default(false).describe('Convert to uppercase'),
  repeat: z.number().int().min(1).max(10).optional().default(1).describe('Number of times to repeat'),
}).catchall(z.unknown());

export type EchoToolInput = z.infer<typeof EchoToolInput>;

export async function echoTool(args: unknown): Promise<string> {
  // Validate input
  const input = EchoToolInput.parse(args);

  logger.debug(`[echoTool] Processing message: "${input.message.substring(0, 50)}..."`);

  // Process message
  let result = input.message;

  if (input.uppercase) {
    result = result.toUpperCase();
  }

  // Repeat if requested
  if (input.repeat > 1) {
    result = Array(input.repeat).fill(result).join('\n');
  }

  return `Echo: ${result}`;
}
