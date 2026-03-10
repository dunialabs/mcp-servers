import { z } from 'zod';
import { callHubSpotApi, ensureArray, withHubSpotRetry } from '../utils/hubspot-api.js';

const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 10;

const HelperObjectTypeSchema = z.enum(['contacts', 'companies', 'deals', 'tickets']);

export const GetPipelineSummaryInputSchema = {
  pipelineId: z.string().optional().describe('Filter by one pipeline ID'),
  limitPerPage: z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .optional()
    .describe('Page size, max 200'),
  maxPages: z.number().int().min(1).max(MAX_PAGES).optional().describe('Maximum pages to scan'),
};

export const GetOwnerWorkloadInputSchema = {
  pipelineId: z.string().optional().describe('Filter deals by pipeline ID'),
  limitPerPage: z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .optional()
    .describe('Page size, max 200'),
  maxPages: z.number().int().min(1).max(MAX_PAGES).optional().describe('Maximum pages to scan'),
};

export const ValidateRecordRequiredFieldsInputSchema = {
  objectType: HelperObjectTypeSchema.describe('HubSpot object type'),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  requiredFields: z.array(z.string().min(1)).optional().describe('Override required field list'),
};

interface SearchResponse {
  results?: Array<Record<string, unknown>>;
  paging?: { next?: { after?: string } };
}

interface OwnerListResponse {
  results?: Array<{
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }>;
}

interface PropertyNameListResponse {
  results?: Array<{ name?: string }>;
}

function numberValue(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function fetchDealsByPages(params: {
  properties: string[];
  limitPerPage?: number;
  maxPages?: number;
  pipelineId?: string;
}) {
  const limit = params.limitPerPage ?? 100;
  const maxPages = params.maxPages ?? 3;
  let after: string | undefined;
  const rows: Array<Record<string, unknown>> = [];

  for (let page = 0; page < maxPages; page++) {
    const filterGroups = params.pipelineId
      ? [
          {
            filters: [
              {
                propertyName: 'pipeline',
                operator: 'EQ',
                value: params.pipelineId,
              },
            ],
          },
        ]
      : undefined;

    const response = await withHubSpotRetry(
      () =>
        callHubSpotApi<SearchResponse>('/crm/v3/objects/deals/search', {
          method: 'POST',
          body: {
            properties: params.properties,
            filterGroups,
            limit,
            after,
          },
        }),
      'fetchDealsByPages'
    );

    const results = ensureArray<Record<string, unknown>>(response.results);
    rows.push(...results);
    after = response.paging?.next?.after;
    if (!after) {
      break;
    }
  }

  return rows;
}

function getProperties(row: Record<string, unknown>): Record<string, unknown> {
  const properties = row.properties;
  if (typeof properties === 'object' && properties !== null) {
    return properties as Record<string, unknown>;
  }
  return {};
}

export interface GetPipelineSummaryParams {
  pipelineId?: string;
  limitPerPage?: number;
  maxPages?: number;
}

export interface GetOwnerWorkloadParams {
  pipelineId?: string;
  limitPerPage?: number;
  maxPages?: number;
}

export interface ValidateRecordRequiredFieldsParams {
  objectType: z.infer<typeof HelperObjectTypeSchema>;
  properties: Record<string, string | number | boolean | null>;
  requiredFields?: string[];
}

export async function hubspotGetPipelineSummary(params: GetPipelineSummaryParams) {
  const deals = await fetchDealsByPages({
    properties: ['dealstage', 'pipeline', 'amount'],
    pipelineId: params.pipelineId,
    limitPerPage: params.limitPerPage,
    maxPages: params.maxPages,
  });

  const stageMap = new Map<string, { dealCount: number; totalAmount: number }>();
  for (const deal of deals) {
    const properties = getProperties(deal);
    const stage = String(properties.dealstage ?? 'UNKNOWN');
    const amount = numberValue(properties.amount);
    const current = stageMap.get(stage) ?? { dealCount: 0, totalAmount: 0 };
    current.dealCount += 1;
    current.totalAmount += amount;
    stageMap.set(stage, current);
  }

  const stages = [...stageMap.entries()]
    .map(([stage, value]) => ({
      stage,
      dealCount: value.dealCount,
      totalAmount: Number(value.totalAmount.toFixed(2)),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            scannedDeals: deals.length,
            pipelineId: params.pipelineId ?? null,
            stages,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function hubspotGetOwnerWorkload(params: GetOwnerWorkloadParams) {
  const [ownersResponse, deals] = await Promise.all([
    withHubSpotRetry(
      () =>
        callHubSpotApi<OwnerListResponse>('/crm/v3/owners', {
          query: { archived: false, limit: 500 },
        }),
      'hubspotGetOwnerWorkload.owners'
    ),
    fetchDealsByPages({
      properties: ['hubspot_owner_id', 'amount', 'dealstage'],
      pipelineId: params.pipelineId,
      limitPerPage: params.limitPerPage,
      maxPages: params.maxPages,
    }),
  ]);

  const ownerNameMap = new Map<string, string>();
  const owners = ensureArray<{
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }>(ownersResponse.results);
  for (const owner of owners) {
    const ownerId = owner.id ? String(owner.id) : '';
    if (!ownerId) {
      continue;
    }
    const fullName = `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim();
    ownerNameMap.set(ownerId, fullName || owner.email || ownerId);
  }

  const workload = new Map<string, { openDealCount: number; totalAmount: number }>();
  for (const deal of deals) {
    const properties = getProperties(deal);
    const ownerId = String(properties.hubspot_owner_id ?? 'unassigned');
    const amount = numberValue(properties.amount);
    const stage = String(properties.dealstage ?? '');
    const isClosedStage = stage.startsWith('closed');
    const current = workload.get(ownerId) ?? { openDealCount: 0, totalAmount: 0 };
    if (!isClosedStage) {
      current.openDealCount += 1;
    }
    current.totalAmount += amount;
    workload.set(ownerId, current);
  }

  const ownersSummary = [...workload.entries()]
    .map(([ownerId, metrics]) => ({
      ownerId,
      ownerName: ownerNameMap.get(ownerId) ?? ownerId,
      openDealCount: metrics.openDealCount,
      totalAmount: Number(metrics.totalAmount.toFixed(2)),
    }))
    .sort((a, b) => b.openDealCount - a.openDealCount);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            scannedDeals: deals.length,
            pipelineId: params.pipelineId ?? null,
            owners: ownersSummary,
          },
          null,
          2
        ),
      },
    ],
  };
}

const DEFAULT_REQUIRED_FIELDS: Record<z.infer<typeof HelperObjectTypeSchema>, string[]> = {
  contacts: ['email'],
  companies: ['name'],
  deals: ['dealname', 'pipeline', 'dealstage'],
  tickets: ['subject', 'hs_pipeline_stage'],
};

export async function hubspotValidateRecordRequiredFields(
  params: ValidateRecordRequiredFieldsParams
) {
  const requiredFields = params.requiredFields ?? DEFAULT_REQUIRED_FIELDS[params.objectType];
  const missingRequired = requiredFields.filter((key) => {
    const value = params.properties[key];
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string' && value.trim().length === 0) {
      return true;
    }
    return false;
  });

  const propertyDefinitions = await withHubSpotRetry(
    () =>
      callHubSpotApi<Array<{ name?: string }> | PropertyNameListResponse>(
        `/crm/v3/properties/${params.objectType}`
      ),
    'hubspotValidateRecordRequiredFields'
  );
  const normalizedProperties = Array.isArray(propertyDefinitions)
    ? propertyDefinitions
    : ensureArray<{ name?: string }>(propertyDefinitions.results);
  const availablePropertySet = new Set(
    normalizedProperties
      .map((item) => item.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0)
  );
  const unknownProvidedFields = Object.keys(params.properties).filter(
    (key) => !availablePropertySet.has(key)
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            objectType: params.objectType,
            valid: missingRequired.length === 0,
            requiredFields,
            missingRequired,
            unknownProvidedFields,
          },
          null,
          2
        ),
      },
    ],
  };
}
