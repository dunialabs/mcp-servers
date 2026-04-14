import { z } from 'zod';
import { callHubSpotApi, summarizeObject, withHubSpotRetry } from '../utils/hubspot-api.js';
import {
  BaseSearchInputSchema,
  PropertiesSchema,
  SearchFilterGroupSchema,
  searchObjects,
} from './common.js';

export const GetContactInputSchema = {
  contactId: z.string().min(1).describe('HubSpot contact record ID'),
  properties: z.array(z.string().min(1)).optional().describe('Contact properties to return'),
  associations: z
    .array(z.string().min(1))
    .optional()
    .describe('Associated object types to include'),
};

export const SearchContactsInputSchema = {
  ...BaseSearchInputSchema,
  query: z.string().optional().describe('Free-text query'),
};

export const CreateContactInputSchema = {
  properties: PropertiesSchema.describe('Contact properties'),
};

export const UpdateContactInputSchema = {
  contactId: z.string().min(1).describe('HubSpot contact record ID'),
  properties: PropertiesSchema.describe('Contact properties to update'),
};

export const UpsertContactByEmailInputSchema = {
  email: z.string().email().describe('Unique contact email'),
  properties: PropertiesSchema.describe('Contact properties for create or update'),
};

export interface GetContactParams {
  contactId: string;
  properties?: string[];
  associations?: string[];
}

export interface SearchContactsParams {
  query?: string;
  limit?: number;
  after?: string;
  properties?: string[];
  sorts?: string[];
  filterGroups?: z.infer<typeof SearchFilterGroupSchema>[];
}

export interface CreateContactParams {
  properties: Record<string, string | number | boolean | null>;
}

export interface UpdateContactParams {
  contactId: string;
  properties: Record<string, string | number | boolean | null>;
}

export interface UpsertContactByEmailParams {
  email: string;
  properties: Record<string, string | number | boolean | null>;
}

export async function hubspotGetContact(params: GetContactParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<Record<string, unknown>>(`/crm/v3/objects/contacts/${params.contactId}`, {
        query: {
          properties: params.properties?.join(','),
          associations: params.associations?.join(','),
        },
      }),
    'hubspotGetContact'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(summarizeObject(response), null, 2) }],
  };
}

export async function hubspotSearchContacts(params: SearchContactsParams) {
  const payload = await searchObjects(
    {
      objectType: 'contacts',
      query: params.query,
      limit: params.limit,
      after: params.after,
      properties: params.properties,
      sorts: params.sorts,
      filterGroups: params.filterGroups,
    },
    'hubspotSearchContacts'
  );
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: {
      kind: 'hubspot-crm-list',
      objectType: 'contacts',
      mode: 'search',
      query: params.query ?? null,
      total: payload.total ?? null,
      count: payload.count,
      nextAfter: payload.nextAfter ?? null,
      records: payload.results,
    },
  };
}

export async function hubspotCreateContact(params: CreateContactParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<Record<string, unknown>>('/crm/v3/objects/contacts', {
        method: 'POST',
        body: { properties: params.properties },
      }),
    'hubspotCreateContact'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(summarizeObject(response), null, 2) }],
  };
}

export async function hubspotUpdateContact(params: UpdateContactParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<Record<string, unknown>>(`/crm/v3/objects/contacts/${params.contactId}`, {
        method: 'PATCH',
        body: { properties: params.properties },
      }),
    'hubspotUpdateContact'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(summarizeObject(response), null, 2) }],
  };
}

export async function hubspotUpsertContactByEmail(params: UpsertContactByEmailParams) {
  const found = await searchObjects(
    {
      objectType: 'contacts',
      limit: 1,
      properties: ['email'],
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: 'EQ',
              value: params.email,
            },
          ],
        },
      ],
    },
    'hubspotUpsertContactByEmail.search'
  );

  const mergedProperties = {
    ...params.properties,
    email: params.email,
  };

  if (found.results.length > 0) {
    const existing = found.results[0];
    const contactId = String(existing.id ?? '');
    const updated = await withHubSpotRetry(
      () =>
        callHubSpotApi<Record<string, unknown>>(`/crm/v3/objects/contacts/${contactId}`, {
          method: 'PATCH',
          body: { properties: mergedProperties },
        }),
      'hubspotUpsertContactByEmail.update'
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              operation: 'updated',
              contactId,
              contact: summarizeObject(updated),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const created = await withHubSpotRetry(
    () =>
      callHubSpotApi<Record<string, unknown>>('/crm/v3/objects/contacts', {
        method: 'POST',
        body: { properties: mergedProperties },
      }),
    'hubspotUpsertContactByEmail.create'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            operation: 'created',
            contactId: created.id,
            contact: summarizeObject(created),
          },
          null,
          2
        ),
      },
    ],
  };
}
