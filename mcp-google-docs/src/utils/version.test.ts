import { describe, expect, it } from 'vitest';
import { getServerVersion } from './version.js';

describe('getServerVersion', () => {
  it('reads the package version', () => {
    expect(getServerVersion()).toBe('1.0.0');
  });
});
