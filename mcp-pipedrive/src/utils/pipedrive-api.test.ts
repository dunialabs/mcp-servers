import { describe, expect, it } from 'vitest';
import { parseRetryAfterSeconds } from './pipedrive-api.js';

describe('parseRetryAfterSeconds', () => {
  it('returns undefined for invalid retry-after values', () => {
    expect(parseRetryAfterSeconds(undefined)).toBeUndefined();
    expect(parseRetryAfterSeconds(null)).toBeUndefined();
    expect(parseRetryAfterSeconds('abc')).toBeUndefined();
    expect(parseRetryAfterSeconds('-1')).toBeUndefined();
  });

  it('returns parsed seconds for valid values', () => {
    expect(parseRetryAfterSeconds('0')).toBe(0);
    expect(parseRetryAfterSeconds('2')).toBe(2);
    expect(parseRetryAfterSeconds('2.5')).toBe(2.5);
  });
});
