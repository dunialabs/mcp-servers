import { z } from 'zod';
import { callPipedriveApi, formatToolResult, withPipedriveRetry } from '../utils/pipedrive-api.js';
import { BaseSearchInputSchema, PropertiesSchema, listV1 } from './common.js';

export const ListLeadsInputSchema = {
  limit: z.number().int().min(1).max(500).optional().describe('Page size, max 500'),
  start: z.number().int().min(0).optional().describe('Pagination start offset'),
  personId: z.number().int().optional(),
  organizationId: z.number().int().optional(),
};

export const SearchLeadsInputSchema = {
  ...BaseSearchInputSchema,
};

export const GetLeadInputSchema = {
  leadId: z.string().min(1).describe('Pipedrive lead ID (UUID-like string)'),
};

export const CreateLeadInputSchema = {
  properties: PropertiesSchema.describe('Lead fields to create'),
};

export const UpdateLeadInputSchema = {
  leadId: z.string().min(1).describe('Pipedrive lead ID (UUID-like string)'),
  properties: PropertiesSchema.describe('Lead fields to update'),
};

export const DeleteLeadInputSchema = {
  leadId: z.string().min(1).describe('Pipedrive lead ID (UUID-like string)'),
};

export async function pipedriveListLeads(params: {
  limit?: number;
  start?: number;
  personId?: number;
  organizationId?: number;
}) {
  const payload = await listV1<Record<string, unknown>>(
    '/api/v1/leads',
    {
      limit: params.limit ?? 100,
      start: params.start,
      person_id: params.personId,
      organization_id: params.organizationId,
    },
    'pipedriveListLeads'
  );

  return formatToolResult(payload);
}

export async function pipedriveSearchLeads(params: {
  term: string;
  limit?: number;
  cursor?: string;
  exactMatch?: boolean;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<{ items?: Record<string, unknown>[] }>('/api/v2/itemSearch', {
        query: {
          term: params.term,
          item_types: 'lead',
          limit: params.limit ?? 50,
          cursor: params.cursor,
          exact_match: params.exactMatch,
        },
      }),
    'pipedriveSearchLeads'
  );

  const items = Array.isArray(response.data?.items) ? response.data.items : [];
  return formatToolResult({
    count: items.length,
    nextCursor: (response.additionalData?.next_cursor as string | undefined) ?? undefined,
    results: items,
  });
}

export async function pipedriveGetLead(params: { leadId: string }) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>(`/api/v1/leads/${params.leadId}`),
    'pipedriveGetLead'
  );

  return formatToolResult(response.data);
}

export async function pipedriveCreateLead(params: {
  properties: Record<string, string | number | boolean | null>;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>('/api/v1/leads', {
        method: 'POST',
        body: params.properties,
      }),
    'pipedriveCreateLead'
  );

  return formatToolResult(response.data);
}

export async function pipedriveUpdateLead(params: {
  leadId: string;
  properties: Record<string, string | number | boolean | null>;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(`/api/v1/leads/${params.leadId}`, {
        method: 'PATCH',
        body: params.properties,
      }),
    'pipedriveUpdateLead'
  );

  return formatToolResult(response.data);
}

export async function pipedriveDeleteLead(params: { leadId: string }) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(`/api/v1/leads/${params.leadId}`, {
        method: 'DELETE',
      }),
    'pipedriveDeleteLead'
  );

  return formatToolResult(response.data);
}
