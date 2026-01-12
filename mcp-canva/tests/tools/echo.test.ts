import { describe, it, expect } from 'vitest';
import { echoTool } from '../../src/tools/echo.js';

describe('echoTool', () => {
  it('should echo a simple message', async () => {
    const result = await echoTool({ message: 'Hello, World!' });
    expect(result).toBe('Echo: Hello, World!');
  });

  it('should convert message to uppercase when requested', async () => {
    const result = await echoTool({ message: 'test', uppercase: true });
    expect(result).toBe('Echo: TEST');
  });

  it('should repeat message when requested', async () => {
    const result = await echoTool({ message: 'Hi', repeat: 3 });
    expect(result).toBe('Echo: Hi\nHi\nHi');
  });

  it('should throw error for invalid input', async () => {
    await expect(echoTool({ message: '' })).rejects.toThrow();
  });

  it('should throw error for message exceeding max length', async () => {
    const longMessage = 'a'.repeat(10001);
    await expect(echoTool({ message: longMessage })).rejects.toThrow();
  });
});
