export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

export interface PipedriveAuthContext {
  accessToken: string;
  apiDomain: string;
}

export function validateTokenFormat(token: string): boolean {
  return typeof token === 'string' && token.trim().length >= 20;
}

export function normalizeApiDomain(apiDomain: string): string {
  const trimmed = apiDomain.trim();
  if (trimmed.length === 0) {
    throw new TokenValidationError('apiDomain environment variable not set');
  }

  const prefixed = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(prefixed);
  } catch {
    throw new TokenValidationError('Invalid apiDomain format for Pipedrive');
  }

  if (!parsed.hostname || parsed.hostname.length < 4) {
    throw new TokenValidationError('Invalid apiDomain hostname for Pipedrive');
  }

  return `${parsed.protocol}//${parsed.host}`;
}

export function getAuthContext(): PipedriveAuthContext {
  const token = process.env.accessToken;
  const apiDomain = process.env.apiDomain;

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    throw new TokenValidationError('accessToken environment variable not set');
  }

  if (!validateTokenFormat(token)) {
    throw new TokenValidationError('Invalid accessToken format for Pipedrive OAuth token');
  }

  if (!apiDomain || typeof apiDomain !== 'string') {
    throw new TokenValidationError('apiDomain environment variable not set');
  }

  return {
    accessToken: token.trim(),
    apiDomain: normalizeApiDomain(apiDomain),
  };
}
