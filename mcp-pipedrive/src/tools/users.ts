import { z } from 'zod';
import { callPipedriveApi, formatToolResult, withPipedriveRetry } from '../utils/pipedrive-api.js';
import { listV1 } from './common.js';

export const ListUsersInputSchema = {
  limit: z.number().int().min(1).max(500).optional(),
  start: z.number().int().min(0).optional(),
};

export const GetUserInputSchema = {
  userId: z.number().int().positive().describe('Pipedrive user ID'),
};

export const SearchAllItemsInputSchema = {
  term: z.string().min(1).describe('Search term'),
  limit: z.number().int().min(1).max(100).optional().describe('Page size, max 100'),
  cursor: z.string().optional().describe('Cursor from previous response (v2 Search API)'),
  exactMatch: z.boolean().optional().describe('Exact match only'),
  itemTypes: z
    .array(z.enum(['deal', 'person', 'organization', 'product', 'lead']))
    .optional()
    .describe('Item types to search'),
};

export const ListRecentsInputSchema = {
  limit: z.number().int().min(1).max(500).optional(),
  sinceTimestamp: z
    .string()
    .min(1)
    .optional()
    .describe("Timestamp string like 'YYYY-MM-DD HH:mm:ss'"),
  items: z
    .array(z.enum(['deal', 'person', 'organization', 'activity', 'note', 'product', 'lead']))
    .optional(),
};

export async function pipedriveListUsers(params: { limit?: number; start?: number }) {
  const payload = await listV1<Record<string, unknown>>(
    '/api/v1/users',
    {
      limit: params.limit ?? 100,
      start: params.start,
    },
    'pipedriveListUsers'
  );

  return formatToolResult(payload);
}

export async function pipedriveGetUser(params: { userId: number }) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>(`/api/v1/users/${params.userId}`),
    'pipedriveGetUser'
  );

  return formatToolResult(response.data);
}

export async function pipedriveSearchAllItems(params: {
  term: string;
  limit?: number;
  cursor?: string;
  exactMatch?: boolean;
  itemTypes?: Array<'deal' | 'person' | 'organization' | 'product' | 'lead'>;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<{ items?: Record<string, unknown>[] }>('/api/v2/itemSearch', {
        query: {
          term: params.term,
          limit: params.limit ?? 50,
          cursor: params.cursor,
          exact_match: params.exactMatch,
          item_types: params.itemTypes?.join(','),
        },
      }),
    'pipedriveSearchAllItems'
  );

  const items = Array.isArray(response.data?.items) ? response.data.items : [];
  return formatToolResult({
    count: items.length,
    nextCursor: (response.additionalData?.next_cursor as string | undefined) ?? undefined,
    results: items,
  });
}

export async function pipedriveListRecents(params: {
  limit?: number;
  sinceTimestamp?: string;
  items?: Array<'deal' | 'person' | 'organization' | 'activity' | 'note' | 'product' | 'lead'>;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>[]>('/api/v1/recents', {
        query: {
          limit: params.limit ?? 100,
          since_timestamp: params.sinceTimestamp,
          items: params.items?.join(','),
        },
      }),
    'pipedriveListRecents'
  );

  return formatToolResult({
    count: Array.isArray(response.data) ? response.data.length : 0,
    results: response.data,
    additionalData: response.additionalData,
  });
}
