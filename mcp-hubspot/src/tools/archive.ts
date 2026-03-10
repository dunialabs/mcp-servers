import { z } from 'zod';
import { callHubSpotApi, withHubSpotRetry } from '../utils/hubspot-api.js';

const ArchivableObjectTypeSchema = z.enum(['contacts', 'companies', 'deals', 'tickets']);

export const ArchiveContactInputSchema = {
  contactId: z.string().min(1).describe('HubSpot contact record ID'),
};

export const ArchiveCompanyInputSchema = {
  companyId: z.string().min(1).describe('HubSpot company record ID'),
};

export const ArchiveDealInputSchema = {
  dealId: z.string().min(1).describe('HubSpot deal record ID'),
};

export const ArchiveTicketInputSchema = {
  ticketId: z.string().min(1).describe('HubSpot ticket record ID'),
};

interface ArchiveParams {
  objectType: z.infer<typeof ArchivableObjectTypeSchema>;
  objectId: string;
  context: string;
}

async function archiveObject(params: ArchiveParams) {
  await withHubSpotRetry(
    () =>
      callHubSpotApi(`/crm/v3/objects/${params.objectType}/${params.objectId}`, {
        method: 'DELETE',
      }),
    params.context
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            action: 'archived',
            objectType: params.objectType,
            objectId: params.objectId,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function hubspotArchiveContact(params: { contactId: string }) {
  return archiveObject({
    objectType: 'contacts',
    objectId: params.contactId,
    context: 'hubspotArchiveContact',
  });
}

export async function hubspotArchiveCompany(params: { companyId: string }) {
  return archiveObject({
    objectType: 'companies',
    objectId: params.companyId,
    context: 'hubspotArchiveCompany',
  });
}

export async function hubspotArchiveDeal(params: { dealId: string }) {
  return archiveObject({
    objectType: 'deals',
    objectId: params.dealId,
    context: 'hubspotArchiveDeal',
  });
}

export async function hubspotArchiveTicket(params: { ticketId: string }) {
  return archiveObject({
    objectType: 'tickets',
    objectId: params.ticketId,
    context: 'hubspotArchiveTicket',
  });
}
