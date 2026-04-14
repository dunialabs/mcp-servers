export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

export function normalizeAccessToken(token: string): string {
  return token.trim().replace(/^Bearer\s+/i, '').trim();
}

export function getCurrentToken(): string {
  const token = process.env.accessToken;

  if (!token) {
    throw new TokenValidationError('accessToken environment variable not set');
  }

  const normalizedToken = normalizeAccessToken(token);

  if (!validateTokenFormat(normalizedToken)) {
    throw new TokenValidationError(
      'Invalid accessToken format: expected a Slack token (xoxp-..., xoxb-..., etc.)'
    );
  }

  return normalizedToken;
}

// Valid Slack access token prefixes.
// Reference: https://docs.slack.dev/authentication/token-types
//   xoxb-  Bot token
//   xoxp-  User token
//   xapp-  App-level token
//   xwfp-  Workflow step token
//   xoxe.  Token rotation access token (xoxe.xoxb-... or xoxe.xoxp-...)
// Note: xoxe- (refresh token) is intentionally excluded — it cannot be used for API calls.
// Reference: https://docs.slack.dev/authentication/using-token-rotation/
const VALID_TOKEN_PREFIXES = ['xoxb-', 'xoxp-', 'xapp-', 'xwfp-', 'xoxe.'];

export function validateTokenFormat(token: string): boolean {
  const normalizedToken = normalizeAccessToken(token);
  return typeof token === 'string' && normalizedToken.length > 10 && VALID_TOKEN_PREFIXES.some((prefix) => normalizedToken.startsWith(prefix));
}
