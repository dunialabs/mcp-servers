import { z } from 'zod';
import { callHubSpotApi, summarizeObject, withHubSpotRetry } from '../utils/hubspot-api.js';
import {
  BaseSearchInputSchema,
  PropertiesSchema,
  SearchFilterGroupSchema,
  searchObjects,
} from './common.js';

export const GetTicketInputSchema = {
  ticketId: z.string().min(1).describe('HubSpot ticket record ID'),
  properties: z.array(z.string().min(1)).optional().describe('Ticket properties to return'),
  associations: z
    .array(z.string().min(1))
    .optional()
    .describe('Associated object types to include'),
};

export const SearchTicketsInputSchema = {
  ...BaseSearchInputSchema,
  query: z.string().optional().describe('Free-text query'),
};

export const CreateTicketInputSchema = {
  properties: PropertiesSchema.describe('Ticket properties'),
};

export const UpdateTicketInputSchema = {
  ticketId: z.string().min(1).describe('HubSpot ticket record ID'),
  properties: PropertiesSchema.describe('Ticket properties to update'),
};

export interface GetTicketParams {
  ticketId: string;
  properties?: string[];
  associations?: string[];
}

export interface SearchTicketsParams {
  query?: string;
  limit?: number;
  after?: string;
  properties?: string[];
  sorts?: string[];
  filterGroups?: z.infer<typeof SearchFilterGroupSchema>[];
}

export interface CreateTicketParams {
  properties: Record<string, string | number | boolean | null>;
}

export interface UpdateTicketParams {
  ticketId: string;
  properties: Record<string, string | number | boolean | null>;
}

export async function hubspotGetTicket(params: GetTicketParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<Record<string, unknown>>(`/crm/v3/objects/tickets/${params.ticketId}`, {
        query: {
          properties: params.properties?.join(','),
          associations: params.associations?.join(','),
        },
      }),
    'hubspotGetTicket'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(summarizeObject(response), null, 2) }],
  };
}

export async function hubspotSearchTickets(params: SearchTicketsParams) {
  const payload = await searchObjects(
    {
      objectType: 'tickets',
      query: params.query,
      limit: params.limit,
      after: params.after,
      properties: params.properties,
      sorts: params.sorts,
      filterGroups: params.filterGroups,
    },
    'hubspotSearchTickets'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

export async function hubspotCreateTicket(params: CreateTicketParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<Record<string, unknown>>('/crm/v3/objects/tickets', {
        method: 'POST',
        body: { properties: params.properties },
      }),
    'hubspotCreateTicket'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(summarizeObject(response), null, 2) }],
  };
}

export async function hubspotUpdateTicket(params: UpdateTicketParams) {
  const response = await withHubSpotRetry(
    () =>
      callHubSpotApi<Record<string, unknown>>(`/crm/v3/objects/tickets/${params.ticketId}`, {
        method: 'PATCH',
        body: { properties: params.properties },
      }),
    'hubspotUpdateTicket'
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(summarizeObject(response), null, 2) }],
  };
}
