/**
 * Calculator Tool
 * Demonstrates a tool with multiple operations and error handling using MCP standard errors
 */

import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { createInvalidParamsError } from '../utils/errors.js';

const CalculatorInput = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('Mathematical operation to perform'),
  a: z.number().describe('First number'),
  b: z.number().describe('Second number'),
}).catchall(z.unknown());

export type CalculatorInput = z.infer<typeof CalculatorInput>;

export async function calculatorTool(args: unknown): Promise<string> {
  const input = CalculatorInput.parse(args);

  logger.debug(`[calculatorTool] ${input.operation}: ${input.a}, ${input.b}`);

  let result: number;

  switch (input.operation) {
    case 'add':
      result = input.a + input.b;
      break;
    case 'subtract':
      result = input.a - input.b;
      break;
    case 'multiply':
      result = input.a * input.b;
      break;
    case 'divide':
      if (input.b === 0) {
        // Use MCP standard error code for invalid parameters
        throw createInvalidParamsError('Division by zero is not allowed');
      }
      result = input.a / input.b;
      break;
  }

  return `${input.a} ${getOperationSymbol(input.operation)} ${input.b} = ${result}`;
}

function getOperationSymbol(operation: string): string {
  const symbols: Record<string, string> = {
    add: '+',
    subtract: '-',
    multiply: '×',
    divide: '÷',
  };
  return symbols[operation] || operation;
}
