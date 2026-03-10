import { z } from 'zod';
import { callHubSpotApi, summarizeObject, withHubSpotRetry } from '../utils/hubspot-api.js';
import {
  BaseSearchInputSchema,
  PropertiesSchema,
  SearchFilterGroupSchema,
  searchObjects,
} from './common.js';

export const GetCompanyInputSchema = {
  companyId: z.string().min(1).describe('HubSpot company record ID'),
  properties: z.array(z.string().min(1)).optional().describe('Company properties to return'),
  associations: z
    .array(z.string().min(1))
    .optional()
    .describe('Associated object types to include'),
};

export const SearchCompaniesInputSchema = {
  ...BaseSearchInputSchema,
  query: z.string().optional().describe('Free-text query'),
};

export const CreateCompanyInputSchema = {
  properties: PropertiesSchema.describe('Company properties'),
};

export const UpdateCompanyInputSchema = {
  companyId: z.string().min(1).describe('HubSpot company record ID'),
  properties: PropertiesSchema.describe('Company properties to update'),
};

export interface GetCompanyParams {
  companyId: string;
  properties?: string[];
  associations?: string[];
}

export interface SearchCompaniesParams {
  query?: string;
  limit?: number;
  after?: string;
  properties?: string[];
  sorts?: string[];
  filterGroups?: z.infer<typeof SearchFilterGroupSchema>[];
}

export interface CreateCompanyParams {
  properties: Record<string, string | number | boolean | null>;
}

export interface UpdateCompanyParams {
  companyId: string;
  properties: Record<string, string | number | boolean | null>;
}

export async function hubspotGetCompany(params: GetCompanyParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<Record<string, unknown>>(`/crm/v3/objects/companies/${params.companyId}`, {
        query: {
          properties: params.properties?.join(','),
          associations: params.associations?.join(','),
        },
      }),
    'hubspotGetCompany'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(summarizeObject(response), null, 2) }],
  };
}

export async function hubspotSearchCompanies(params: SearchCompaniesParams) {
  const payload = await searchObjects(
    {
      objectType: 'companies',
      query: params.query,
      limit: params.limit,
      after: params.after,
      properties: params.properties,
      sorts: params.sorts,
      filterGroups: params.filterGroups,
    },
    'hubspotSearchCompanies'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

export async function hubspotCreateCompany(params: CreateCompanyParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<Record<string, unknown>>('/crm/v3/objects/companies', {
        method: 'POST',
        body: { properties: params.properties },
      }),
    'hubspotCreateCompany'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(summarizeObject(response), null, 2) }],
  };
}

export async function hubspotUpdateCompany(params: UpdateCompanyParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<Record<string, unknown>>(`/crm/v3/objects/companies/${params.companyId}`, {
        method: 'PATCH',
        body: { properties: params.properties },
      }),
    'hubspotUpdateCompany'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(summarizeObject(response), null, 2) }],
  };
}
