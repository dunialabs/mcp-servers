import { z } from 'zod';
import { callPipedriveApi, ensureArray, withPipedriveRetry } from '../utils/pipedrive-api.js';

export const MAX_LIMIT = 500;

const ScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const PropertiesSchema = z
  .record(ScalarSchema)
  .refine((value) => Object.keys(value).length > 0, 'properties must not be empty');

export const BaseListInputSchema = {
  limit: z.number().int().min(1).max(MAX_LIMIT).optional().describe('Page size, max 500'),
  cursor: z.string().optional().describe('Cursor from previous response (v2 APIs)'),
};

export const BaseSearchInputSchema = {
  term: z.string().min(1).describe('Search term'),
  limit: z.number().int().min(1).max(100).optional().describe('Page size, max 100'),
  cursor: z.string().optional().describe('Cursor from previous response'),
  exactMatch: z.boolean().optional().describe('Exact match only'),
};

export async function listV2<T>(
  path: string,
  query: Record<string, string | number | boolean | undefined>,
  context: string
) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<T[] | { data?: T[] }>(path, { query }),
    context
  );

  const rows = Array.isArray(response.data)
    ? ensureArray<T>(response.data)
    : ensureArray<T>((response.data as { data?: T[] } | undefined)?.data);
  const additional = response.additionalData ?? {};
  const pagination = (additional.pagination as Record<string, unknown> | undefined) ?? {};

  return {
    count: rows.length,
    nextCursor:
      (additional.next_cursor as string | undefined) ?? (pagination.next_cursor as string | undefined),
    nextStart: typeof pagination.next_start === 'number' ? pagination.next_start : undefined,
    hasMore: Boolean(pagination.more_items_in_collection),
    results: rows,
  };
}

export async function listV1<T>(
  path: string,
  query: Record<string, string | number | boolean | undefined>,
  context: string
) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<T[] | { data?: T[] }>(path, { query }),
    context
  );

  const rows = Array.isArray(response.data)
    ? ensureArray<T>(response.data)
    : ensureArray<T>((response.data as { data?: T[] } | undefined)?.data);
  const additional = response.additionalData ?? {};
  const pagination = (additional.pagination as Record<string, unknown> | undefined) ?? {};

  return {
    count: rows.length,
    nextStart: typeof pagination.next_start === 'number' ? pagination.next_start : undefined,
    hasMore: Boolean(pagination.more_items_in_collection),
    results: rows,
  };
}
