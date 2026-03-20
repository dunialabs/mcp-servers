import { afterEach, describe, expect, it, vi } from 'vitest';
import { braveSummarizeByKey } from '../src/tools/search.js';
import { buildUrl } from '../src/utils/brave-api.js';

const originalBraveApiKey = process.env.BRAVE_API_KEY;
const originalFetch = global.fetch;

afterEach(() => {
  process.env.BRAVE_API_KEY = originalBraveApiKey;
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('buildUrl', () => {
  it('maps query to q and appends array params', () => {
    const url = buildUrl('https://api.search.brave.com', '/res/v1/web/search', {
      query: 'openai',
      goggles: ['https://example.com/a', 'https://example.com/b'],
      count: 5,
    });

    expect(url).toContain('q=openai');
    expect(url).toContain('count=5');
    expect(url).toContain('goggles=https%3A%2F%2Fexample.com%2Fa');
    expect(url).toContain('goggles=https%3A%2F%2Fexample.com%2Fb');
  });
});

describe('braveSummarizeByKey', () => {
  it('polls until summarizer status becomes complete', async () => {
    process.env.BRAVE_API_KEY = 'brave_api_key_abcdefghijklmnopqrstuvwxyz';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'pending' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'complete',
            title: 'Summary title',
            summary: 'Summary body',
            references: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

    global.fetch = fetchMock as typeof fetch;

    const result = await braveSummarizeByKey({ key: 'summary-key', inlineReferences: true });
    const payload = JSON.parse(result.content[0].text) as Record<string, unknown>;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(payload.summary).toBe('Summary body');
  });

  it('returns ApiUnavailable when summarizer never completes', async () => {
    process.env.BRAVE_API_KEY = 'brave_api_key_abcdefghijklmnopqrstuvwxyz';

    const fetchMock = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ status: 'pending' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    global.fetch = fetchMock as typeof fetch;

    await expect(
      braveSummarizeByKey({ key: 'summary-key', inlineReferences: true })
    ).rejects.toMatchObject({ code: -32035 });
  });
});
