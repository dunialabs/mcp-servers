import { z } from 'zod';
import { callPipedriveApi, formatToolResult, withPipedriveRetry } from '../utils/pipedrive-api.js';
import { PropertiesSchema, listV1 } from './common.js';

export const ListNotesInputSchema = {
  limit: z.number().int().min(1).max(500).optional(),
  start: z.number().int().min(0).optional(),
  userId: z.number().int().optional(),
  leadId: z.string().optional(),
  dealId: z.number().int().optional(),
  personId: z.number().int().optional(),
  orgId: z.number().int().optional(),
};

export const GetNoteInputSchema = {
  noteId: z.number().int().positive().describe('Pipedrive note ID'),
};

export const CreateNoteInputSchema = {
  properties: PropertiesSchema.describe('Note fields to create'),
};

export const UpdateNoteInputSchema = {
  noteId: z.number().int().positive().describe('Pipedrive note ID'),
  properties: PropertiesSchema.describe('Note fields to update'),
};

export const DeleteNoteInputSchema = {
  noteId: z.number().int().positive().describe('Pipedrive note ID'),
};

export async function pipedriveListNotes(params: {
  limit?: number;
  start?: number;
  userId?: number;
  leadId?: string;
  dealId?: number;
  personId?: number;
  orgId?: number;
}) {
  const payload = await listV1<Record<string, unknown>>(
    '/api/v1/notes',
    {
      limit: params.limit ?? 100,
      start: params.start,
      user_id: params.userId,
      lead_id: params.leadId,
      deal_id: params.dealId,
      person_id: params.personId,
      org_id: params.orgId,
    },
    'pipedriveListNotes'
  );

  return formatToolResult(payload);
}

export async function pipedriveGetNote(params: { noteId: number }) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>(`/api/v1/notes/${params.noteId}`),
    'pipedriveGetNote'
  );

  return formatToolResult(response.data);
}

export async function pipedriveCreateNote(params: {
  properties: Record<string, string | number | boolean | null>;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>('/api/v1/notes', {
        method: 'POST',
        body: params.properties,
      }),
    'pipedriveCreateNote'
  );

  return formatToolResult(response.data);
}

export async function pipedriveUpdateNote(params: {
  noteId: number;
  properties: Record<string, string | number | boolean | null>;
}) {
  const response = await withPipedriveRetry(
    () =>
      callPipedriveApi<Record<string, unknown>>(`/api/v1/notes/${params.noteId}`, {
        method: 'PUT',
        body: params.properties,
      }),
    'pipedriveUpdateNote'
  );

  return formatToolResult(response.data);
}

export async function pipedriveDeleteNote(params: { noteId: number }) {
  const response = await withPipedriveRetry(
    () => callPipedriveApi<Record<string, unknown>>(`/api/v1/notes/${params.noteId}`, { method: 'DELETE' }),
    'pipedriveDeleteNote'
  );

  return formatToolResult(response.data);
}
