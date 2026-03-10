import { z } from 'zod';
import {
  callHubSpotApi,
  ensureArray,
  summarizeObject,
  withHubSpotRetry,
} from '../utils/hubspot-api.js';

export const MAX_PAGE_SIZE = 200;

const PropertyScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const PropertiesSchema = z
  .record(PropertyScalarSchema)
  .refine((value) => Object.keys(value).length > 0, 'properties must not be empty');

export const SearchFilterSchema = z.object({
  propertyName: z.string().min(1),
  operator: z.string().min(1),
  value: PropertyScalarSchema.optional(),
  values: z.array(PropertyScalarSchema).optional(),
});

export const SearchFilterGroupSchema = z.object({
  filters: z.array(SearchFilterSchema).min(1),
});

export const BaseSearchInputSchema = {
  limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().describe('Page size, max 200'),
  after: z.string().optional().describe('Paging cursor from previous response'),
  properties: z.array(z.string().min(1)).optional().describe('Properties to return'),
  sorts: z
    .array(z.string().min(1))
    .optional()
    .describe('Sort fields, e.g. createdate or -createdate'),
  filterGroups: z
    .array(SearchFilterGroupSchema)
    .optional()
    .describe('HubSpot CRM search filterGroups'),
};

interface SearchResponse {
  total?: number;
  results?: Record<string, unknown>[];
  paging?: { next?: { after?: string } };
}

export interface SearchObjectParams {
  objectType: string;
  query?: string;
  limit?: number;
  after?: string;
  properties?: string[];
  sorts?: string[];
  filterGroups?: Array<{
    filters: Array<{
      propertyName: string;
      operator: string;
      value?: string | number | boolean | null;
      values?: Array<string | number | boolean | null>;
    }>;
  }>;
}

export async function searchObjects(params: SearchObjectParams, context: string) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<SearchResponse>(`/crm/v3/objects/${params.objectType}/search`, {
        method: 'POST',
        body: {
          query: params.query,
          limit: params.limit ?? 100,
          after: params.after,
          properties: params.properties,
          sorts: params.sorts,
          filterGroups: params.filterGroups,
        },
      }),
    context
  );

  const results = ensureArray<Record<string, unknown>>(response.results);
  return {
    total: response.total,
    nextAfter: response.paging?.next?.after,
    count: results.length,
    results: results.map((result) => summarizeObject(result)),
  };
}
