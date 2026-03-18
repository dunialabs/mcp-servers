/**
 * Calculator Tool
 *
 * Demonstrates error handling with MCP standard error codes inside a tool
 * that follows the modular pattern (schema exported separately from handler).
 */

import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { createInvalidParamsError } from '../utils/errors.js';

export const CalculatorInputSchema = {
  operation: z
    .enum(['add', 'subtract', 'multiply', 'divide'])
    .describe('Mathematical operation to perform'),
  a: z.number().describe('First number'),
  b: z.number().describe('Second number'),
};

export type CalculatorParams = {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  a: number;
  b: number;
};

function getSymbol(op: string): string {
  const symbols: Record<string, string> = {
    add: '+',
    subtract: '-',
    multiply: '×',
    divide: '÷',
  };
  return symbols[op] ?? op;
}

export async function calculatorTool(params: CalculatorParams) {
  logger.debug(`[calculatorTool] ${params.operation}: ${params.a}, ${params.b}`);

  let result: number;

  switch (params.operation) {
    case 'add':
      result = params.a + params.b;
      break;
    case 'subtract':
      result = params.a - params.b;
      break;
    case 'multiply':
      result = params.a * params.b;
      break;
    case 'divide':
      if (params.b === 0) {
        throw createInvalidParamsError('Division by zero is not allowed');
      }
      result = params.a / params.b;
      break;
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: `${params.a} ${getSymbol(params.operation)} ${params.b} = ${result}`,
      },
    ],
  };
}
