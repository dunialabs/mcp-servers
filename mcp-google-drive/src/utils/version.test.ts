import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getServerVersion } from './version.js';

describe('getServerVersion', () => {
  it('matches package.json version', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf-8')
    ) as { version: string };

    expect(getServerVersion()).toBe(packageJson.version);
  });
});
