import { z } from 'zod';
import {
  callHubSpotApi,
  ensureArray,
  summarizeObject,
  withHubSpotRetry,
} from '../utils/hubspot-api.js';

const ObjectTypeSchema = z.enum(['contacts', 'companies', 'deals', 'tickets', 'notes']);

export const GetAssociationsInputSchema = {
  fromObjectType: ObjectTypeSchema.describe('Source object type'),
  fromObjectId: z.string().min(1).describe('Source object ID'),
  toObjectType: ObjectTypeSchema.describe('Target object type'),
  limit: z.number().int().min(1).max(500).optional().describe('Page size, max 500'),
  after: z.string().optional().describe('Paging cursor from previous response'),
};

export const AssociateRecordsInputSchema = {
  fromObjectType: ObjectTypeSchema.describe('Source object type'),
  fromObjectId: z.string().min(1).describe('Source object ID'),
  toObjectType: ObjectTypeSchema.describe('Target object type'),
  toObjectId: z.string().min(1).describe('Target object ID'),
};

export const RemoveAssociationInputSchema = {
  fromObjectType: ObjectTypeSchema.describe('Source object type'),
  fromObjectId: z.string().min(1).describe('Source object ID'),
  toObjectType: ObjectTypeSchema.describe('Target object type'),
  toObjectId: z.string().min(1).describe('Target object ID'),
};

export const GetObjectPropertiesInputSchema = {
  objectType: ObjectTypeSchema.describe('Object type'),
  archived: z.boolean().optional().describe('Include archived properties'),
};

const NoteAssociationSchema = z.object({
  toObjectType: ObjectTypeSchema.describe('Target object type'),
  toObjectId: z.string().min(1).describe('Target object ID'),
});

export const CreateNoteEngagementInputSchema = {
  noteBody: z.string().min(1).describe('Text content of the note'),
  timestamp: z
    .number()
    .int()
    .optional()
    .describe('Unix epoch milliseconds. Defaults to current time.'),
  associations: z
    .array(NoteAssociationSchema)
    .optional()
    .describe('Records to associate with note'),
};

export interface GetAssociationsParams {
  fromObjectType: z.infer<typeof ObjectTypeSchema>;
  fromObjectId: string;
  toObjectType: z.infer<typeof ObjectTypeSchema>;
  limit?: number;
  after?: string;
}

export interface AssociateRecordsParams {
  fromObjectType: z.infer<typeof ObjectTypeSchema>;
  fromObjectId: string;
  toObjectType: z.infer<typeof ObjectTypeSchema>;
  toObjectId: string;
}

export interface RemoveAssociationParams {
  fromObjectType: z.infer<typeof ObjectTypeSchema>;
  fromObjectId: string;
  toObjectType: z.infer<typeof ObjectTypeSchema>;
  toObjectId: string;
}

export interface GetObjectPropertiesParams {
  objectType: z.infer<typeof ObjectTypeSchema>;
  archived?: boolean;
}

export interface CreateNoteEngagementParams {
  noteBody: string;
  timestamp?: number;
  associations?: Array<{
    toObjectType: z.infer<typeof ObjectTypeSchema>;
    toObjectId: string;
  }>;
}

interface AssociationListResponse {
  results?: Array<Record<string, unknown>>;
  paging?: { next?: { after?: string } };
}

interface PropertyDefinition {
  name?: string;
  label?: string;
  type?: string;
  fieldType?: string;
  groupName?: string;
  description?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface PropertyListResponse {
  results?: PropertyDefinition[];
}

async function associateDefault(params: AssociateRecordsParams, context: string): Promise<void> {
  await withHubSpotRetry(
    () =>
      callHubSpotApi(
        `/crm/v4/objects/${params.fromObjectType}/${params.fromObjectId}/associations/default/${params.toObjectType}/${params.toObjectId}`,
        {
          method: 'PUT',
        }
      ),
    context
  );
}

async function removeAssociationDefault(
  params: RemoveAssociationParams,
  context: string
): Promise<void> {
  await withHubSpotRetry(
    () =>
      callHubSpotApi(
        `/crm/v4/objects/${params.fromObjectType}/${params.fromObjectId}/associations/${params.toObjectType}/${params.toObjectId}`,
        {
          method: 'DELETE',
        }
      ),
    context
  );
}

export async function hubspotGetAssociations(params: GetAssociationsParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<AssociationListResponse>(
        `/crm/v4/objects/${params.fromObjectType}/${params.fromObjectId}/associations/${params.toObjectType}`,
        {
          query: {
            limit: params.limit ?? 100,
            after: params.after,
          },
        }
      ),
    'hubspotGetAssociations'
  );

  const results = ensureArray<Record<string, unknown>>(response.results);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            count: results.length,
            nextAfter: response.paging?.next?.after,
            results,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function hubspotAssociateRecords(params: AssociateRecordsParams) {
  await associateDefault(params, 'hubspotAssociateRecords');
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            association: params,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function hubspotRemoveAssociation(params: RemoveAssociationParams) {
  await removeAssociationDefault(params, 'hubspotRemoveAssociation');
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            removedAssociation: params,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function hubspotGetObjectProperties(params: GetObjectPropertiesParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<PropertyDefinition[] | PropertyListResponse>(
        `/crm/v3/properties/${params.objectType}`,
        {
          query: {
            archived: params.archived ?? false,
          },
        }
      ),
    'hubspotGetObjectProperties'
  );

  const list = Array.isArray(response)
    ? response
    : ensureArray<PropertyDefinition>(response.results);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            objectType: params.objectType,
            count: list.length,
            properties: list.map((item) => ({
              name: item.name,
              label: item.label,
              type: item.type,
              fieldType: item.fieldType,
              groupName: item.groupName,
              description: item.description,
              updatedAt: item.updatedAt,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function hubspotCreateNoteEngagement(params: CreateNoteEngagementParams) {
  const timestamp = String(params.timestamp ?? Date.now());
  const created = await withHubSpotRetry(
    () =>
      callHubSpotApi<Record<string, unknown>>('/crm/v3/objects/notes', {
        method: 'POST',
        body: {
          properties: {
            hs_note_body: params.noteBody,
            hs_timestamp: timestamp,
          },
        },
      }),
    'hubspotCreateNoteEngagement.create'
  );

  const noteId = String(created.id ?? '');
  const associations = params.associations ?? [];
  for (const target of associations) {
    await associateDefault(
      {
        fromObjectType: 'notes',
        fromObjectId: noteId,
        toObjectType: target.toObjectType,
        toObjectId: target.toObjectId,
      },
      'hubspotCreateNoteEngagement.associate'
    );
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            noteId,
            note: summarizeObject(created),
            associatedCount: associations.length,
          },
          null,
          2
        ),
      },
    ],
  };
}
