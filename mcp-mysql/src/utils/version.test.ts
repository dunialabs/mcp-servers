import { describe, expect, it } from 'vitest';
import { getServerVersion } from './version.js';

describe('getServerVersion', () => {
  it('reads version from package.json', () => {
    expect(getServerVersion()).toBe('1.0.0');
  });
});
