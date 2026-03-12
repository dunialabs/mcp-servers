import { z } from 'zod';
import { callPipedriveApi, formatToolResult, withPipedriveRetry } from '../utils/pipedrive-api.js';
import { BaseListInputSchema, PropertiesSchema, listV1, listV2 } from './common.js';

export const ListActivitiesInputSchema = {
  ...BaseListInputSchema,
  userId: z.number().int().optional(),
  dealId: z.number().int().optional(),
  personId: z.number().int().optional(),
  orgId: z.number().int().optional(),
  done: z.boolean().optional(),
};

export const GetActivityInputSchema = {
  activityId: z.number().int().positive().describe('Pipedrive activity ID'),
};

export const CreateActivityInputSchema = {
  properties: PropertiesSchema.describe('Activity fields to create'),
};

export const UpdateActivityInputSchema = {
  activityId: z.number().int().positive().describe('Pipedrive activity ID'),
  properties: PropertiesSchema.describe('Activity fields to update'),
};

export const DeleteActivityInputSchema = {
  activityId: z.number().int().positive().describe('Pipedrive activity ID'),
};

export const ListActivityTypesInputSchema = {
  limit: z.number().int().min(1).max(500).optional(),
  start: z.number().int().min(0).optional(),
};

export async function pipedriveListActivities(params: {
  limit?: number;
  cursor?: string;
  userId?: number;
  dealId?: number;
  personId?: number;
  orgId?: number;
  done?: boolean;
}) {
  const payload = await listV2<Record<string, unknown>>(
    '/api/v2/activities',
    {
      limit: params.limit ?? 100,
      cursor: params.cursor,
      user_id: params.userId,
      deal_id: params.dealId,
      person_id: params.personId,
      org_id: params.orgId,
      done: params.done,
    },
    'pipedriveListActivities'
  );

  return formatToolResult(payload);
}

export async function pipedriveGetActivity(params: { activityId: number }) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>(`/api/v2/activities/${params.activityId}`),
    'pipedriveGetActivity'
  );

  return formatToolResult(response.data);
}

export async function pipedriveCreateActivity(params: {
  properties: Record<string, string | number | boolean | null>;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>('/api/v2/activities', {
        method: 'POST',
        body: params.properties,
      }),
    'pipedriveCreateActivity'
  );

  return formatToolResult(response.data);
}

export async function pipedriveUpdateActivity(params: {
  activityId: number;
  properties: Record<string, string | number | boolean | null>;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(`/api/v2/activities/${params.activityId}`, {
        method: 'PATCH',
        body: params.properties,
      }),
    'pipedriveUpdateActivity'
  );

  return formatToolResult(response.data);
}

export async function pipedriveDeleteActivity(params: { activityId: number }) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(`/api/v2/activities/${params.activityId}`, {
        method: 'DELETE',
      }),
    'pipedriveDeleteActivity'
  );

  return formatToolResult(response.data);
}

export async function pipedriveListActivityTypes(params: { limit?: number; start?: number }) {
  const payload = await listV1<Record<string, unknown>>(
    '/api/v1/activityTypes',
    {
      limit: params.limit ?? 100,
      start: params.start,
    },
    'pipedriveListActivityTypes'
  );

  return formatToolResult(payload);
}
