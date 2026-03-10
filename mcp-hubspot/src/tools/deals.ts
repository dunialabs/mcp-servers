import { z } from 'zod';
import { callHubSpotApi, summarizeObject, withHubSpotRetry } from '../utils/hubspot-api.js';
import {
  BaseSearchInputSchema,
  PropertiesSchema,
  SearchFilterGroupSchema,
  searchObjects,
} from './common.js';

export const GetDealInputSchema = {
  dealId: z.string().min(1).describe('HubSpot deal record ID'),
  properties: z.array(z.string().min(1)).optional().describe('Deal properties to return'),
  associations: z
    .array(z.string().min(1))
    .optional()
    .describe('Associated object types to include'),
};

export const SearchDealsInputSchema = {
  ...BaseSearchInputSchema,
  query: z.string().optional().describe('Free-text query'),
};

export const CreateDealInputSchema = {
  properties: PropertiesSchema.describe('Deal properties'),
};

export const UpdateDealInputSchema = {
  dealId: z.string().min(1).describe('HubSpot deal record ID'),
  properties: PropertiesSchema.describe('Deal properties to update'),
};

export interface GetDealParams {
  dealId: string;
  properties?: string[];
  associations?: string[];
}

export interface SearchDealsParams {
  query?: string;
  limit?: number;
  after?: string;
  properties?: string[];
  sorts?: string[];
  filterGroups?: z.infer<typeof SearchFilterGroupSchema>[];
}

export interface CreateDealParams {
  properties: Record<string, string | number | boolean | null>;
}

export interface UpdateDealParams {
  dealId: string;
  properties: Record<string, string | number | boolean | null>;
}

export async function hubspotGetDeal(params: GetDealParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<Record<string, unknown>>(`/crm/v3/objects/deals/${params.dealId}`, {
        query: {
          properties: params.properties?.join(','),
          associations: params.associations?.join(','),
        },
      }),
    'hubspotGetDeal'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(summarizeObject(response), null, 2) }],
  };
}

export async function hubspotSearchDeals(params: SearchDealsParams) {
  const payload = await searchObjects(
    {
      objectType: 'deals',
      query: params.query,
      limit: params.limit,
      after: params.after,
      properties: params.properties,
      sorts: params.sorts,
      filterGroups: params.filterGroups,
    },
    'hubspotSearchDeals'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

export async function hubspotCreateDeal(params: CreateDealParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<Record<string, unknown>>('/crm/v3/objects/deals', {
        method: 'POST',
        body: { properties: params.properties },
      }),
    'hubspotCreateDeal'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(summarizeObject(response), null, 2) }],
  };
}

export async function hubspotUpdateDeal(params: UpdateDealParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<Record<string, unknown>>(`/crm/v3/objects/deals/${params.dealId}`, {
        method: 'PATCH',
        body: { properties: params.properties },
      }),
    'hubspotUpdateDeal'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(summarizeObject(response), null, 2) }],
  };
}
