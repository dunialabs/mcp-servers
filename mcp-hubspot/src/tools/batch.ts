import { z } from 'zod';
import {
  callHubSpotApi,
  ensureArray,
  summarizeObject,
  withHubSpotRetry,
} from '../utils/hubspot-api.js';

const BatchObjectTypeSchema = z.enum(['contacts', 'companies', 'deals', 'tickets']);

const BatchUpdateRecordSchema = z.object({
  id: z.string().min(1).describe('HubSpot record ID'),
  properties: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .refine((value) => Object.keys(value).length > 0, 'properties must not be empty')
    .describe('Fields to update'),
});

export const BatchUpdateContactsInputSchema = {
  inputs: z
    .array(BatchUpdateRecordSchema)
    .min(1)
    .max(100)
    .describe('Batch update records, max 100'),
};

export const BatchUpdateCompaniesInputSchema = {
  inputs: z
    .array(BatchUpdateRecordSchema)
    .min(1)
    .max(100)
    .describe('Batch update records, max 100'),
};

export const BatchUpdateDealsInputSchema = {
  inputs: z
    .array(BatchUpdateRecordSchema)
    .min(1)
    .max(100)
    .describe('Batch update records, max 100'),
};

export const BatchUpdateTicketsInputSchema = {
  inputs: z
    .array(BatchUpdateRecordSchema)
    .min(1)
    .max(100)
    .describe('Batch update records, max 100'),
};

interface BatchUpdateParams {
  objectType: z.infer<typeof BatchObjectTypeSchema>;
  inputs: Array<{
    id: string;
    properties: Record<string, string | number | boolean | null>;
  }>;
  context: string;
}

interface BatchUpdateResponse {
  results?: Array<Record<string, unknown>>;
  numErrors?: number;
  status?: string;
}

async function batchUpdateObjects(params: BatchUpdateParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<BatchUpdateResponse>(`/crm/v3/objects/${params.objectType}/batch/update`, {
        method: 'POST',
        body: {
          inputs: params.inputs,
        },
      }),
    params.context
  );

  const results = ensureArray<Record<string, unknown>>(response.results);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            objectType: params.objectType,
            requestedCount: params.inputs.length,
            updatedCount: results.length,
            numErrors: response.numErrors ?? 0,
            status: response.status ?? null,
            results: results.map((result) => summarizeObject(result)),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function hubspotBatchUpdateContacts(params: {
  inputs: Array<{ id: string; properties: Record<string, string | number | boolean | null> }>;
}) {
  return batchUpdateObjects({
    objectType: 'contacts',
    inputs: params.inputs,
    context: 'hubspotBatchUpdateContacts',
  });
}

export async function hubspotBatchUpdateCompanies(params: {
  inputs: Array<{ id: string; properties: Record<string, string | number | boolean | null> }>;
}) {
  return batchUpdateObjects({
    objectType: 'companies',
    inputs: params.inputs,
    context: 'hubspotBatchUpdateCompanies',
  });
}

export async function hubspotBatchUpdateDeals(params: {
  inputs: Array<{ id: string; properties: Record<string, string | number | boolean | null> }>;
}) {
  return batchUpdateObjects({
    objectType: 'deals',
    inputs: params.inputs,
    context: 'hubspotBatchUpdateDeals',
  });
}

export async function hubspotBatchUpdateTickets(params: {
  inputs: Array<{ id: string; properties: Record<string, string | number | boolean | null> }>;
}) {
  return batchUpdateObjects({
    objectType: 'tickets',
    inputs: params.inputs,
    context: 'hubspotBatchUpdateTickets',
  });
}
