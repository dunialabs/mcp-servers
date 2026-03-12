import { z } from 'zod';
import { callPipedriveApi, formatToolResult, withPipedriveRetry } from '../utils/pipedrive-api.js';
import { BaseListInputSchema, BaseSearchInputSchema, PropertiesSchema, listV1, listV2 } from './common.js';

export const ListDealsInputSchema = {
  ...BaseListInputSchema,
  status: z.enum(['open', 'won', 'lost', 'deleted', 'all_not_deleted']).optional(),
  ownerId: z.number().int().optional(),
  stageId: z.number().int().optional(),
  pipelineId: z.number().int().optional(),
};

export const SearchDealsInputSchema = {
  ...BaseSearchInputSchema,
  fields: z.array(z.string().min(1)).optional().describe('Fields to search in'),
};

export const GetDealInputSchema = {
  dealId: z.number().int().positive().describe('Pipedrive deal ID'),
};

export const CreateDealInputSchema = {
  properties: PropertiesSchema.describe('Deal fields to create'),
};

export const UpdateDealInputSchema = {
  dealId: z.number().int().positive().describe('Pipedrive deal ID'),
  properties: PropertiesSchema.describe('Deal fields to update'),
};

export const DeleteDealInputSchema = {
  dealId: z.number().int().positive().describe('Pipedrive deal ID'),
};

export const ListDealActivitiesInputSchema = {
  dealId: z.number().int().positive().describe('Pipedrive deal ID'),
  limit: z.number().int().min(1).max(500).optional(),
  start: z.number().int().min(0).optional(),
};

export const ListDealProductsInputSchema = {
  dealId: z.number().int().positive().describe('Pipedrive deal ID'),
  ...BaseListInputSchema,
};

export const AddDealProductInputSchema = {
  dealId: z.number().int().positive().describe('Pipedrive deal ID'),
  productId: z.number().int().positive().describe('Pipedrive product ID'),
  itemPrice: z.number().optional(),
  quantity: z.number().optional(),
  discount: z.number().optional(),
  duration: z.number().int().optional(),
  tax: z.number().optional(),
  comments: z.string().optional(),
};

export const RemoveDealProductInputSchema = {
  dealId: z.number().int().positive().describe('Pipedrive deal ID'),
  productAttachmentId: z.number().int().positive().describe('Deal product attachment ID'),
};

export async function pipedriveListDeals(params: {
  limit?: number;
  cursor?: string;
  status?: 'open' | 'won' | 'lost' | 'deleted' | 'all_not_deleted';
  ownerId?: number;
  stageId?: number;
  pipelineId?: number;
}) {
  const payload = await listV2<Record<string, unknown>>(
    '/api/v2/deals',
    {
      limit: params.limit ?? 100,
      cursor: params.cursor,
      status: params.status,
      owner_id: params.ownerId,
      stage_id: params.stageId,
      pipeline_id: params.pipelineId,
    },
    'pipedriveListDeals'
  );

  return formatToolResult(payload);
}

export async function pipedriveSearchDeals(params: {
  term: string;
  limit?: number;
  cursor?: string;
  exactMatch?: boolean;
  fields?: string[];
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>[]>('/api/v2/deals/search', {
        query: {
          term: params.term,
          limit: params.limit ?? 50,
          cursor: params.cursor,
          exact_match: params.exactMatch,
          fields: params.fields?.join(','),
        },
      }),
    'pipedriveSearchDeals'
  );

  return formatToolResult({
    count: Array.isArray(response.data) ? response.data.length : 0,
    nextCursor: (response.additionalData?.next_cursor as string | undefined) ?? undefined,
    results: response.data,
  });
}

export async function pipedriveGetDeal(params: { dealId: number }) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>(`/api/v2/deals/${params.dealId}`),
    'pipedriveGetDeal'
  );

  return formatToolResult(response.data);
}

export async function pipedriveCreateDeal(params: {
  properties: Record<string, string | number | boolean | null>;
}) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>('/api/v2/deals', { method: 'POST', body: params.properties }),
    'pipedriveCreateDeal'
  );

  return formatToolResult(response.data);
}

export async function pipedriveUpdateDeal(params: {
  dealId: number;
  properties: Record<string, string | number | boolean | null>;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(`/api/v2/deals/${params.dealId}`, {
        method: 'PATCH',
        body: params.properties,
      }),
    'pipedriveUpdateDeal'
  );

  return formatToolResult(response.data);
}

export async function pipedriveDeleteDeal(params: { dealId: number }) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>(`/api/v2/deals/${params.dealId}`, { method: 'DELETE' }),
    'pipedriveDeleteDeal'
  );

  return formatToolResult(response.data);
}

export async function pipedriveListDealActivities(params: {
  dealId: number;
  limit?: number;
  start?: number;
}) {
  const payload = await listV1<Record<string, unknown>>(
    `/api/v1/deals/${params.dealId}/activities`,
    {
      limit: params.limit ?? 100,
      start: params.start,
    },
    'pipedriveListDealActivities'
  );

  return formatToolResult(payload);
}

export async function pipedriveListDealProducts(params: { dealId: number; limit?: number; cursor?: string }) {
  const payload = await listV2<Record<string, unknown>>(
    `/api/v2/deals/${params.dealId}/products`,
    {
      limit: params.limit ?? 100,
      cursor: params.cursor,
    },
    'pipedriveListDealProducts'
  );

  return formatToolResult(payload);
}

export async function pipedriveAddDealProduct(params: {
  dealId: number;
  productId: number;
  itemPrice?: number;
  quantity?: number;
  discount?: number;
  duration?: number;
  tax?: number;
  comments?: string;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(`/api/v2/deals/${params.dealId}/products`, {
        method: 'POST',
        body: {
          product_id: params.productId,
          item_price: params.itemPrice,
          quantity: params.quantity,
          discount: params.discount,
          duration: params.duration,
          tax: params.tax,
          comments: params.comments,
        },
      }),
    'pipedriveAddDealProduct'
  );

  return formatToolResult(response.data);
}

export async function pipedriveRemoveDealProduct(params: { dealId: number; productAttachmentId: number }) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(
        `/api/v2/deals/${params.dealId}/products/${params.productAttachmentId}`,
        { method: 'DELETE' }
      ),
    'pipedriveRemoveDealProduct'
  );

  return formatToolResult(response.data);
}
