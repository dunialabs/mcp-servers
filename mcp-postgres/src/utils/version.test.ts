import { describe, expect, it } from 'vitest';
import { getServerVersion } from './version.js';

describe('getServerVersion', () => {
  it('reads package version', () => {
    expect(getServerVersion()).toBe('1.1.2');
  });
});
