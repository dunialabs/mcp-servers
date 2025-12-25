/**
 * Zendesk Authentication Module
 *
 * Supports hybrid authentication modes:
 * 1. OAuth Token (Production - Console/peta-core)
 * 2. API Token (Development - Local testing)
 *
 * OAuth Token:
 * - Provided by Console via accessToken
 * - Can be refreshed via MCP notifications
 * - Used in production environments
 *
 * API Token:
 * - User-generated in Zendesk admin panel
 * - Never expires (unless manually revoked)
 * - Requires zendeskEmail and zendeskApiToken
 * - Recommended for local development
 */

export enum AuthMode {
  OAUTH = 'oauth',
  API_TOKEN = 'api_token'
}

export interface ZendeskCredentials {
  mode: AuthMode;
  subdomain: string;
  // OAuth mode
  accessToken?: string;
  // API Token mode
  email?: string;
  apiToken?: string;
}

/**
 * Get current Zendesk credentials
 *
 * Priority order:
 * 1. OAuth Token (accessToken) - Production/Console
 * 2. API Token (zendeskEmail + zendeskApiToken) - Development
 *
 * @returns Zendesk credentials with authentication mode
 * @throws Error if subdomain is missing or no valid credentials found
 */
export function getCurrentCredentials(): ZendeskCredentials {
  const subdomain = process.env.zendeskSubdomain;

  if (!subdomain) {
    throw new Error(
      'zendeskSubdomain is required.\n' +
      'Example: If your Zendesk is https://mycompany.zendesk.com, ' +
      'set zendeskSubdomain=mycompany'
    );
  }

  // Priority 1: OAuth Token (Console production or manual OAuth)
  const accessToken = process.env.accessToken;
  if (accessToken) {
    return {
      mode: AuthMode.OAUTH,
      subdomain,
      accessToken,
    };
  }

  // Priority 2: API Token (Local development)
  const email = process.env.zendeskEmail;
  const apiToken = process.env.zendeskApiToken;

  if (email && apiToken) {
    return {
      mode: AuthMode.API_TOKEN,
      subdomain,
      email,
      apiToken,
    };
  }

  // No valid credentials found
  throw new Error(
    'Missing Zendesk credentials. Please provide ONE of:\n\n' +
    '1. OAuth Token (Production - Console):\n' +
    '   accessToken=your_oauth_token\n\n' +
    '2. API Token (Development - Recommended):\n' +
    '   zendeskEmail=admin@company.com\n' +
    '   zendeskApiToken=your_api_token\n\n' +
    'See .env.example for details.'
  );
}

/**
 * Get Authorization header value based on current auth mode
 *
 * OAuth mode: Bearer token
 * API Token mode: Basic authentication
 *
 * @returns Authorization header value
 */
export function getAuthHeader(): string {
  const creds = getCurrentCredentials();

  switch (creds.mode) {
    case AuthMode.OAUTH:
      return `Bearer ${creds.accessToken}`;

    case AuthMode.API_TOKEN:
      // Zendesk API Token uses Basic Auth format: email/token:api_token
      const credentials = `${creds.email}/token:${creds.apiToken}`;
      const encoded = Buffer.from(credentials).toString('base64');
      return `Basic ${encoded}`;

    default:
      throw new Error(`Unknown auth mode: ${creds.mode}`);
  }
}

/**
 * Get current authentication mode
 * Useful for logging and debugging
 *
 * @returns Current auth mode or 'none' if not configured
 */
export function getAuthMode(): AuthMode | 'none' {
  try {
    const creds = getCurrentCredentials();
    return creds.mode;
  } catch {
    return 'none';
  }
}

/**
 * Get Zendesk base URL for API requests
 *
 * @returns Full API base URL (e.g., https://mycompany.zendesk.com/api/v2)
 */
export function getBaseURL(): string {
  const { subdomain } = getCurrentCredentials();
  return `https://${subdomain}.zendesk.com/api/v2`;
}
