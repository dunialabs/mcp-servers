import { z } from 'zod';
import { callPipedriveApi, formatToolResult, withPipedriveRetry } from '../utils/pipedrive-api.js';
import { BaseListInputSchema, BaseSearchInputSchema, PropertiesSchema, listV1, listV2 } from './common.js';

export const ListOrganizationsInputSchema = {
  ...BaseListInputSchema,
  ownerId: z.number().int().optional(),
};

export const SearchOrganizationsInputSchema = {
  ...BaseSearchInputSchema,
  fields: z.array(z.string().min(1)).optional().describe('Fields to search in'),
};

export const GetOrganizationInputSchema = {
  organizationId: z.number().int().positive().describe('Pipedrive organization ID'),
};

export const CreateOrganizationInputSchema = {
  properties: PropertiesSchema.describe('Organization fields to create'),
};

export const UpdateOrganizationInputSchema = {
  organizationId: z.number().int().positive().describe('Pipedrive organization ID'),
  properties: PropertiesSchema.describe('Organization fields to update'),
};

export const DeleteOrganizationInputSchema = {
  organizationId: z.number().int().positive().describe('Pipedrive organization ID'),
};

export const MergeOrganizationsInputSchema = {
  organizationId: z.number().int().positive().describe('Organization to keep'),
  mergeWithId: z.number().int().positive().describe('Organization to merge into organizationId'),
};

export const ListOrganizationDealsInputSchema = {
  organizationId: z.number().int().positive().describe('Pipedrive organization ID'),
  limit: z.number().int().min(1).max(500).optional(),
  start: z.number().int().min(0).optional(),
};

export async function pipedriveListOrganizations(params: {
  limit?: number;
  cursor?: string;
  ownerId?: number;
}) {
  const payload = await listV2<Record<string, unknown>>(
    '/api/v2/organizations',
    {
      limit: params.limit ?? 100,
      cursor: params.cursor,
      owner_id: params.ownerId,
    },
    'pipedriveListOrganizations'
  );

  return {
    ...formatToolResult(payload),
    structuredContent: {
      kind: 'pipedrive-crm-list',
      objectType: 'organizations',
      mode: 'list',
      count: payload.count,
      nextCursor: payload.nextCursor ?? null,
      hasMore: payload.hasMore,
      results: payload.results,
    },
  };
}

export async function pipedriveSearchOrganizations(params: {
  term: string;
  limit?: number;
  cursor?: string;
  exactMatch?: boolean;
  fields?: string[];
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>[]>('/api/v2/organizations/search', {
        query: {
          term: params.term,
          limit: params.limit ?? 50,
          cursor: params.cursor,
          exact_match: params.exactMatch,
          fields: params.fields?.join(','),
        },
      }),
    'pipedriveSearchOrganizations'
  );

  const items = Array.isArray(response.data)
    ? response.data
    : Array.isArray((response.data as Record<string, unknown>)?.items)
      ? ((response.data as Record<string, unknown>).items as Record<string, unknown>[])
      : [];
  const payload = {
    count: items.length,
    nextCursor: (response.additionalData?.next_cursor as string | undefined) ?? undefined,
    results: items,
  };

  return {
    ...formatToolResult(payload),
    structuredContent: {
      kind: 'pipedrive-crm-list',
      objectType: 'organizations',
      mode: 'search',
      query: params.term,
      count: payload.count,
      nextCursor: payload.nextCursor ?? null,
      results: payload.results,
    },
  };
}

export async function pipedriveGetOrganization(params: { organizationId: number }) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>(`/api/v2/organizations/${params.organizationId}`),
    'pipedriveGetOrganization'
  );

  return formatToolResult(response.data);
}

export async function pipedriveCreateOrganization(params: {
  properties: Record<string, string | number | boolean | null>;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>('/api/v2/organizations', {
        method: 'POST',
        body: params.properties,
      }),
    'pipedriveCreateOrganization'
  );

  return formatToolResult(response.data);
}

export async function pipedriveUpdateOrganization(params: {
  organizationId: number;
  properties: Record<string, string | number | boolean | null>;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(`/api/v2/organizations/${params.organizationId}`, {
        method: 'PATCH',
        body: params.properties,
      }),
    'pipedriveUpdateOrganization'
  );

  return formatToolResult(response.data);
}

export async function pipedriveDeleteOrganization(params: { organizationId: number }) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(`/api/v2/organizations/${params.organizationId}`, {
        method: 'DELETE',
      }),
    'pipedriveDeleteOrganization'
  );

  return formatToolResult(response.data);
}

export async function pipedriveMergeOrganizations(params: {
  organizationId: number;
  mergeWithId: number;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(`/api/v1/organizations/${params.organizationId}/merge`, {
        method: 'PUT',
        body: { merge_with_id: params.mergeWithId },
      }),
    'pipedriveMergeOrganizations'
  );

  return formatToolResult(response.data);
}

export async function pipedriveListOrganizationDeals(params: {
  organizationId: number;
  limit?: number;
  start?: number;
}) {
  const payload = await listV1<Record<string, unknown>>(
    `/api/v1/organizations/${params.organizationId}/deals`,
    {
      limit: params.limit ?? 100,
      start: params.start,
    },
    'pipedriveListOrganizationDeals'
  );

  return formatToolResult(payload);
}
