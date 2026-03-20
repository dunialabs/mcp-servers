import { describe, expect, it } from 'vitest';
import { handleBraveApiError } from '../src/utils/errors.js';

describe('handleBraveApiError', () => {
  it('maps VALIDATION errors to InvalidParams', () => {
    const err = handleBraveApiError(
      {
        status: 422,
        code: 'VALIDATION',
        message: 'Unable to validate request parameter(s)',
      },
      'braveSearchVideo'
    );

    expect(err.code).toBe(-32602);
    expect(err.message).toContain('Unable to validate request parameter(s)');
  });

  it('maps OPTION_NOT_IN_PLAN to PermissionDenied', () => {
    const err = handleBraveApiError(
      {
        status: 400,
        code: 'OPTION_NOT_IN_PLAN',
        message: 'The option is not subscribed in the plan.',
      },
      'braveSummarizeByKey'
    );

    expect(err.code).toBe(-32031);
    expect(err.message).toContain('Current Brave plan does not include this feature');
  });
});
