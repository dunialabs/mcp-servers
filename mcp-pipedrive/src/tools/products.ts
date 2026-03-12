import { z } from 'zod';
import { callPipedriveApi, formatToolResult, withPipedriveRetry } from '../utils/pipedrive-api.js';
import { BaseListInputSchema, BaseSearchInputSchema, PropertiesSchema, listV2 } from './common.js';

export const ListProductsInputSchema = {
  ...BaseListInputSchema,
  ownerId: z.number().int().optional(),
};

export const SearchProductsInputSchema = {
  ...BaseSearchInputSchema,
};

export const GetProductInputSchema = {
  productId: z.number().int().positive().describe('Pipedrive product ID'),
};

export const CreateProductInputSchema = {
  properties: PropertiesSchema.describe('Product fields to create'),
};

export const UpdateProductInputSchema = {
  productId: z.number().int().positive().describe('Pipedrive product ID'),
  properties: PropertiesSchema.describe('Product fields to update'),
};

export const DeleteProductInputSchema = {
  productId: z.number().int().positive().describe('Pipedrive product ID'),
};

export async function pipedriveListProducts(params: { limit?: number; cursor?: string; ownerId?: number }) {
  const payload = await listV2<Record<string, unknown>>(
    '/api/v2/products',
    {
      limit: params.limit ?? 100,
      cursor: params.cursor,
      owner_id: params.ownerId,
    },
    'pipedriveListProducts'
  );

  return formatToolResult(payload);
}

export async function pipedriveSearchProducts(params: {
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
          item_types: 'product',
          limit: params.limit ?? 50,
          cursor: params.cursor,
          exact_match: params.exactMatch,
        },
      }),
    'pipedriveSearchProducts'
  );

  const items = Array.isArray(response.data?.items) ? response.data.items : [];
  return formatToolResult({
    count: items.length,
    nextCursor: (response.additionalData?.next_cursor as string | undefined) ?? undefined,
    results: items,
  });
}

export async function pipedriveGetProduct(params: { productId: number }) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>(`/api/v2/products/${params.productId}`),
    'pipedriveGetProduct'
  );

  return formatToolResult(response.data);
}

export async function pipedriveCreateProduct(params: {
  properties: Record<string, string | number | boolean | null>;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>('/api/v2/products', {
        method: 'POST',
        body: params.properties,
      }),
    'pipedriveCreateProduct'
  );

  return formatToolResult(response.data);
}

export async function pipedriveUpdateProduct(params: {
  productId: number;
  properties: Record<string, string | number | boolean | null>;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(`/api/v2/products/${params.productId}`, {
        method: 'PATCH',
        body: params.properties,
      }),
    'pipedriveUpdateProduct'
  );

  return formatToolResult(response.data);
}

export async function pipedriveDeleteProduct(params: { productId: number }) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(`/api/v2/products/${params.productId}`, {
        method: 'DELETE',
      }),
    'pipedriveDeleteProduct'
  );

  return formatToolResult(response.data);
}
