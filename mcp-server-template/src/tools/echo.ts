/**
 * Echo Tool
 *
 * Demonstrates the standard modular tool pattern:
 *   1. Export a plain Zod-fields schema (inputSchema) — used by server.ts in registerTool()
 *   2. Export a typed Params interface inferred from the schema
 *   3. Export the tool function that returns a full MCP response object
 *
 * server.ts imports both the schema and the function, so no schema is duplicated.
 */

import { z } from 'zod';
import { logger } from '../utils/logger.js';

/**
 * Input schema — exported as a plain object so server.ts can pass it directly
 * to registerTool() as inputSchema. The MCP SDK converts this to JSON Schema
 * and validates incoming params before the handler is called.
 */
export const EchoInputSchema = {
  message: z.string().min(1).max(10000).describe('The message to echo back'),
  uppercase: z.boolean().optional().default(false).describe('Convert to uppercase'),
  repeat: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(1)
    .describe('Number of times to repeat (1-10)'),
};

/**
 * Params type — inferred from the schema.
 * Fields with .default() are non-optional in the output type because the SDK
 * always resolves defaults before passing params to the handler.
 */
export type EchoParams = {
  message: string;
  uppercase: boolean;
  repeat: number;
};

/**
 * Tool implementation.
 *
 * Returns a full MCP response object so server.ts can forward it directly:
 *   async (params) => echoTool(params)
 *
 * No string→content wrapping is needed in server.ts.
 */
export async function echoTool(params: EchoParams) {
  logger.debug(`[echoTool] Processing: "${params.message.substring(0, 50)}"`);

  let result = params.message;

  if (params.uppercase) {
    result = result.toUpperCase();
  }

  if (params.repeat > 1) {
    result = Array(params.repeat).fill(result).join('\n');
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: `Echo: ${result}`,
      },
    ],
  };
}
