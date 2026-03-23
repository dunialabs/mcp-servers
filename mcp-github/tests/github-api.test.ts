import { afterEach, describe, expect, it } from 'vitest';
import { handleGitHubError } from '../src/utils/errors.js';
import { getDefaultTimeout } from '../src/utils/github-api.js';

const ORIGINAL_TIMEOUT = process.env.GITHUB_API_TIMEOUT;

describe('github api helpers', () => {
  afterEach(() => {
    if (ORIGINAL_TIMEOUT === undefined) {
      delete process.env.GITHUB_API_TIMEOUT;
      return;
    }

    process.env.GITHUB_API_TIMEOUT = ORIGINAL_TIMEOUT;
  });

  it('uses env timeout when valid', () => {
    process.env.GITHUB_API_TIMEOUT = '45000';
    expect(getDefaultTimeout()).toBe(45000);
  });

  it('falls back when env timeout is invalid', () => {
    process.env.GITHUB_API_TIMEOUT = 'bad';
    expect(getDefaultTimeout()).toBe(30000);
  });

  it('maps 401 to AuthenticationFailed', () => {
    const error = handleGitHubError(
      { status: 401, response: { data: { message: 'bad token' } } },
      'test'
    );
    expect(error.code).toBe(-32030);
  });
});
