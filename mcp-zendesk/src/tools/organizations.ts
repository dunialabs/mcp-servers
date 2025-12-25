/**
 * Zendesk Organization Management Tools
 *
 * Provides MCP tools for managing Zendesk organizations
 */

import { z } from 'zod';
import { zendeskAPI } from '../utils/zendesk-api.js';
import { toMcpError } from '../utils/errors.js';
import type {
  ZendeskOrganizationResponse,
  ZendeskOrganizationsResponse,
} from '../types/index.js';

/**
 * List organizations
 */
export const listOrganizationsSchema = z.object({
  limit: z.number().min(1).max(100).default(25)
    .describe('Number of organizations to return (1-100, default: 25)'),
});

export async function listOrganizations(args: z.infer<typeof listOrganizationsSchema>) {
  try {
    const endpoint = `/organizations?per_page=${args.limit}`;
    const data = await zendeskAPI.get<ZendeskOrganizationsResponse>(endpoint);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          organizations: data.organizations,
          count: data.count,
          has_more: !!data.next_page,
        }, null, 2),
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'list_organizations');
  }
}

/**
 * Get a single organization
 */
export const getOrganizationSchema = z.object({
  organization_id: z.number().describe('Organization ID'),
});

export async function getOrganization(args: z.infer<typeof getOrganizationSchema>) {
  try {
    const data = await zendeskAPI.get<ZendeskOrganizationResponse>(
      `/organizations/${args.organization_id}`
    );

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(data.organization, null, 2),
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'get_organization');
  }
}

/**
 * Create a new organization
 */
export const createOrganizationSchema = z.object({
  name: z.string().describe('Organization name'),
  domain_names: z.array(z.string()).optional()
    .describe('Domain names associated with organization'),
  details: z.string().optional()
    .describe('Details about the organization'),
  notes: z.string().optional()
    .describe('Notes about the organization'),
  tags: z.array(z.string()).optional()
    .describe('Organization tags'),
});

export async function createOrganization(args: z.infer<typeof createOrganizationSchema>) {
  try {
    const orgData: Record<string, unknown> = {
      name: args.name,
    };

    if (args.domain_names) orgData.domain_names = args.domain_names;
    if (args.details) orgData.details = args.details;
    if (args.notes) orgData.notes = args.notes;
    if (args.tags) orgData.tags = args.tags;

    const data = await zendeskAPI.post<ZendeskOrganizationResponse>('/organizations', {
      organization: orgData,
    });

    return {
      content: [{
        type: 'text' as const,
        text: `Organization created successfully!\n\n${JSON.stringify(data.organization, null, 2)}`,
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'create_organization');
  }
}

/**
 * Update an organization
 */
export const updateOrganizationSchema = z.object({
  organization_id: z.number().describe('Organization ID'),
  name: z.string().optional()
    .describe('New organization name'),
  domain_names: z.array(z.string()).optional()
    .describe('Domain names'),
  details: z.string().optional()
    .describe('Details about the organization'),
  notes: z.string().optional()
    .describe('Notes about the organization'),
  tags: z.array(z.string()).optional()
    .describe('Organization tags'),
});

export async function updateOrganization(args: z.infer<typeof updateOrganizationSchema>) {
  try {
    const orgData: Record<string, unknown> = {};

    if (args.name) orgData.name = args.name;
    if (args.domain_names) orgData.domain_names = args.domain_names;
    if (args.details) orgData.details = args.details;
    if (args.notes) orgData.notes = args.notes;
    if (args.tags) orgData.tags = args.tags;

    const data = await zendeskAPI.put<ZendeskOrganizationResponse>(
      `/organizations/${args.organization_id}`,
      { organization: orgData }
    );

    return {
      content: [{
        type: 'text' as const,
        text: `Organization updated successfully!\n\n${JSON.stringify(data.organization, null, 2)}`,
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'update_organization');
  }
}

/**
 * Delete an organization
 */
export const deleteOrganizationSchema = z.object({
  organization_id: z.number().describe('Organization ID to delete'),
});

export async function deleteOrganization(args: z.infer<typeof deleteOrganizationSchema>) {
  try {
    await zendeskAPI.delete(`/organizations/${args.organization_id}`);

    return {
      content: [{
        type: 'text' as const,
        text: `Organization #${args.organization_id} deleted successfully!`,
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'delete_organization');
  }
}
