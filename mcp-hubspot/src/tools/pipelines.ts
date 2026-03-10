import { z } from 'zod';
import { callHubSpotApi, ensureArray, withHubSpotRetry } from '../utils/hubspot-api.js';

const PipelineObjectTypeSchema = z.enum(['deals', 'tickets']);

export const ListDealPipelinesInputSchema = {
  archived: z.boolean().optional().describe('Include archived pipelines'),
};

export const ListTicketPipelinesInputSchema = {
  archived: z.boolean().optional().describe('Include archived pipelines'),
};

export const ListPipelineStagesInputSchema = {
  objectType: PipelineObjectTypeSchema.describe('Object type: deals or tickets'),
  pipelineId: z.string().min(1).describe('Pipeline ID'),
};

interface StageShape {
  id?: string;
  label?: string;
  displayOrder?: number;
  metadata?: Record<string, unknown>;
  archived?: boolean;
}

interface PipelineShape {
  id?: string;
  label?: string;
  displayOrder?: number;
  archived?: boolean;
  stages?: StageShape[];
}

interface PipelineListResponse {
  results?: PipelineShape[];
}

function summarizeStage(stage: StageShape) {
  return {
    id: stage.id,
    label: stage.label,
    displayOrder: stage.displayOrder,
    archived: stage.archived,
    metadata: stage.metadata,
  };
}

function summarizePipeline(pipeline: PipelineShape) {
  const stages = ensureArray<StageShape>(pipeline.stages);
  return {
    id: pipeline.id,
    label: pipeline.label,
    displayOrder: pipeline.displayOrder,
    archived: pipeline.archived,
    stageCount: stages.length,
    stages: stages.map((stage) => summarizeStage(stage)),
  };
}

async function listPipelines(
  objectType: z.infer<typeof PipelineObjectTypeSchema>,
  archived?: boolean
) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<PipelineListResponse>(`/crm/v3/pipelines/${objectType}`, {
        query: { archived: archived ?? false },
      }),
    `listPipelines.${objectType}`
  );

  const results = ensureArray<PipelineShape>(response.results);
  return {
    objectType,
    count: results.length,
    pipelines: results.map((pipeline) => summarizePipeline(pipeline)),
  };
}

export async function hubspotListDealPipelines(params: { archived?: boolean }) {
  const payload = await listPipelines('deals', params.archived);
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

export async function hubspotListTicketPipelines(params: { archived?: boolean }) {
  const payload = await listPipelines('tickets', params.archived);
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

export async function hubspotListPipelineStages(params: {
  objectType: z.infer<typeof PipelineObjectTypeSchema>;
  pipelineId: string;
}) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<PipelineShape>(`/crm/v3/pipelines/${params.objectType}/${params.pipelineId}`),
    'hubspotListPipelineStages'
  );

  const stages = ensureArray<StageShape>(response.stages);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            objectType: params.objectType,
            pipelineId: response.id ?? params.pipelineId,
            pipelineLabel: response.label,
            stageCount: stages.length,
            stages: stages.map((stage) => summarizeStage(stage)),
          },
          null,
          2
        ),
      },
    ],
  };
}
