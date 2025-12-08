import { describe, it, expect } from 'vitest';
import { calculatorTool } from '../../src/tools/calculator.js';

describe('calculatorTool', () => {
  it('should add two numbers', async () => {
    const result = await calculatorTool({ operation: 'add', a: 5, b: 3 });
    expect(result).toBe('5 + 3 = 8');
  });

  it('should subtract two numbers', async () => {
    const result = await calculatorTool({ operation: 'subtract', a: 10, b: 4 });
    expect(result).toBe('10 - 4 = 6');
  });

  it('should multiply two numbers', async () => {
    const result = await calculatorTool({ operation: 'multiply', a: 6, b: 7 });
    expect(result).toBe('6 × 7 = 42');
  });

  it('should divide two numbers', async () => {
    const result = await calculatorTool({ operation: 'divide', a: 20, b: 4 });
    expect(result).toBe('20 ÷ 4 = 5');
  });

  it('should handle decimal numbers', async () => {
    const result = await calculatorTool({ operation: 'multiply', a: 3.14, b: 2 });
    expect(result).toBe('3.14 × 2 = 6.28');
  });

  it('should throw error for division by zero', async () => {
    await expect(
      calculatorTool({ operation: 'divide', a: 10, b: 0 })
    ).rejects.toThrow('Division by zero is not allowed');
  });
});
