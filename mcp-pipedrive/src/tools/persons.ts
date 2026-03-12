import { z } from 'zod';
import { callPipedriveApi, formatToolResult, withPipedriveRetry } from '../utils/pipedrive-api.js';
import { BaseListInputSchema, BaseSearchInputSchema, listV1, listV2 } from './common.js';

const PersonContactValueSchema = z
  .object({
    value: z.string().min(1).describe('Contact value, e.g. email address or phone number'),
    label: z.string().optional().describe('Contact label, e.g. work/home'),
    primary: z.boolean().optional().describe('Whether this is the primary contact value'),
  })
  .passthrough();

const PersonPropertyValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(PersonContactValueSchema),
]);

export const PersonPropertiesSchema = z
  .record(PersonPropertyValueSchema)
  .refine((value) => Object.keys(value).length > 0, 'properties must not be empty')
  .refine(
    (value) =>
      Object.entries(value).every(
        ([key, entry]) =>
          !Array.isArray(entry) ||
          key === 'phone' ||
          key === 'email' ||
          key === 'phones' ||
          key === 'emails'
      ),
    'Only phone/email/phones/emails fields support array object values'
  );

type PersonProperties = z.infer<typeof PersonPropertiesSchema>;

function normalizePersonPropertiesForV2(properties: PersonProperties): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...properties };

  if ('phone' in normalized && !('phones' in normalized)) {
    normalized.phones = normalized.phone;
  }
  if ('email' in normalized && !('emails' in normalized)) {
    normalized.emails = normalized.email;
  }

  delete normalized.phone;
  delete normalized.email;
  return normalized;
}

export const ListPersonsInputSchema = {
  ...BaseListInputSchema,
  ownerId: z.number().int().optional(),
  orgId: z.number().int().optional(),
};

export const SearchPersonsInputSchema = {
  ...BaseSearchInputSchema,
  fields: z.array(z.string().min(1)).optional().describe('Fields to search in'),
};

export const GetPersonInputSchema = {
  personId: z.number().int().positive().describe('Pipedrive person ID'),
};

export const CreatePersonInputSchema = {
  properties: PersonPropertiesSchema.describe(
    'Person fields to create. phone/email support array object format.'
  ),
};

export const UpdatePersonInputSchema = {
  personId: z.number().int().positive().describe('Pipedrive person ID'),
  properties: PersonPropertiesSchema.describe(
    'Person fields to update. phone/email support array object format.'
  ),
};

export const DeletePersonInputSchema = {
  personId: z.number().int().positive().describe('Pipedrive person ID'),
};

export const MergePersonsInputSchema = {
  personId: z.number().int().positive().describe('Person to keep'),
  mergeWithId: z.number().int().positive().describe('Person to merge into personId'),
};

export const ListPersonDealsInputSchema = {
  personId: z.number().int().positive().describe('Pipedrive person ID'),
  limit: z.number().int().min(1).max(500).optional(),
  start: z.number().int().min(0).optional(),
};

export async function pipedriveListPersons(params: {
  limit?: number;
  cursor?: string;
  ownerId?: number;
  orgId?: number;
}) {
  const payload = await listV2<Record<string, unknown>>(
    '/api/v2/persons',
    {
      limit: params.limit ?? 100,
      cursor: params.cursor,
      owner_id: params.ownerId,
      org_id: params.orgId,
    },
    'pipedriveListPersons'
  );

  return formatToolResult(payload);
}

export async function pipedriveSearchPersons(params: {
  term: string;
  limit?: number;
  cursor?: string;
  exactMatch?: boolean;
  fields?: string[];
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>[]>('/api/v2/persons/search', {
        query: {
          term: params.term,
          limit: params.limit ?? 50,
          cursor: params.cursor,
          exact_match: params.exactMatch,
          fields: params.fields?.join(','),
        },
      }),
    'pipedriveSearchPersons'
  );

  return formatToolResult({
    count: Array.isArray(response.data) ? response.data.length : 0,
    nextCursor: (response.additionalData?.next_cursor as string | undefined) ?? undefined,
    results: response.data,
  });
}

export async function pipedriveGetPerson(params: { personId: number }) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>(`/api/v2/persons/${params.personId}`),
    'pipedriveGetPerson'
  );

  return formatToolResult(response.data);
}

export async function pipedriveCreatePerson(params: {
  properties: PersonProperties;
}) {
  const body = normalizePersonPropertiesForV2(params.properties);
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>('/api/v2/persons', { method: 'POST', body }),
    'pipedriveCreatePerson'
  );

  return formatToolResult(response.data);
}

export async function pipedriveUpdatePerson(params: {
  personId: number;
  properties: PersonProperties;
}) {
  const body = normalizePersonPropertiesForV2(params.properties);
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(`/api/v2/persons/${params.personId}`, {
        method: 'PATCH',
        body,
      }),
    'pipedriveUpdatePerson'
  );

  return formatToolResult(response.data);
}

export async function pipedriveDeletePerson(params: { personId: number }) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>(`/api/v2/persons/${params.personId}`, { method: 'DELETE' }),
    'pipedriveDeletePerson'
  );

  return formatToolResult(response.data);
}

export async function pipedriveMergePersons(params: { personId: number; mergeWithId: number }) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(`/api/v1/persons/${params.personId}/merge`, {
        method: 'PUT',
        body: { merge_with_id: params.mergeWithId },
      }),
    'pipedriveMergePersons'
  );

  return formatToolResult(response.data);
}

export async function pipedriveListPersonDeals(params: {
  personId: number;
  limit?: number;
  start?: number;
}) {
  const payload = await listV1<Record<string, unknown>>(
    `/api/v1/persons/${params.personId}/deals`,
    {
      limit: params.limit ?? 100,
      start: params.start,
    },
    'pipedriveListPersonDeals'
  );

  return formatToolResult(payload);
}
