import { z } from 'zod';
import { callPipedriveApi, formatToolResult, withPipedriveRetry } from '../utils/pipedrive-api.js';
import { BaseListInputSchema, listV2 } from './common.js';

export const ListPipelinesInputSchema = {
  ...BaseListInputSchema,
};

export const GetPipelineInputSchema = {
  pipelineId: z.number().int().positive().describe('Pipedrive pipeline ID'),
};

export const ListStagesInputSchema = {
  ...BaseListInputSchema,
  pipelineId: z.number().int().optional(),
};

export const GetStageInputSchema = {
  stageId: z.number().int().positive().describe('Pipedrive stage ID'),
};

export async function pipedriveListPipelines(params: { limit?: number; cursor?: string }) {
  const payload = await listV2<Record<string, unknown>>(
    '/api/v2/pipelines',
    {
      limit: params.limit ?? 100,
      cursor: params.cursor,
    },
    'pipedriveListPipelines'
  );

  return {
    ...formatToolResult(payload),
    structuredContent: {
      kind: 'pipedrive-pipeline-summary',
      mode: 'pipelines',
      count: payload.count,
      nextCursor: payload.nextCursor ?? null,
      hasMore: payload.hasMore,
      results: payload.results,
    },
  };
}

export async function pipedriveGetPipeline(params: { pipelineId: number }) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>(`/api/v2/pipelines/${params.pipelineId}`),
    'pipedriveGetPipeline'
  );

  return formatToolResult(response.data);
}

export async function pipedriveListStages(params: { limit?: number; cursor?: string; pipelineId?: number }) {
  const payload = await listV2<Record<string, unknown>>(
    '/api/v2/stages',
    {
      limit: params.limit ?? 100,
      cursor: params.cursor,
      pipeline_id: params.pipelineId,
    },
    'pipedriveListStages'
  );

  return {
    ...formatToolResult(payload),
    structuredContent: {
      kind: 'pipedrive-pipeline-summary',
      mode: 'stages',
      pipelineId: params.pipelineId ?? null,
      count: payload.count,
      nextCursor: payload.nextCursor ?? null,
      hasMore: payload.hasMore,
      results: payload.results,
    },
  };
}

export async function pipedriveGetStage(params: { stageId: number }) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>(`/api/v2/stages/${params.stageId}`),
    'pipedriveGetStage'
  );

  return formatToolResult(response.data);
}
