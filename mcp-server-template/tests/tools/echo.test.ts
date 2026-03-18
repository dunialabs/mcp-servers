import { describe, expect, it } from 'vitest';
import { echoTool } from '../../src/tools/echo.js';

describe('echoTool', () => {
  it('echoes a plain message', async () => {
    const result = await echoTool({ message: 'test', uppercase: false, repeat: 1 });
    expect(result.content[0].text).toBe('Echo: test');
  });

  it('uppercases message when requested', async () => {
    const result = await echoTool({ message: 'test', uppercase: true, repeat: 1 });
    expect(result.content[0].text).toBe('Echo: TEST');
  });

  it('repeats message when requested', async () => {
    const result = await echoTool({ message: 'Hi', uppercase: false, repeat: 3 });
    expect(result.content[0].text).toBe('Echo: Hi\nHi\nHi');
  });
});
