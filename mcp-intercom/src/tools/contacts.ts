/**
 * Contact Management Tools
 * Implements Intercom API contact endpoints
 */

import { intercomAPI } from '../utils/intercom-api.js';
import { toMcpError } from '../utils/errors.js';
import type {
  Contact,
  ContactList,
  CreateContactRequest,
  UpdateContactRequest,
  SearchResponse,
  SearchQuery,
  PaginationRequest,
} from '../types/index.js';

/**
 * List all contacts with pagination
 */
export async function listContacts(params: {
  per_page?: number;
  starting_after?: string;
}): Promise<string> {
  try {
    const queryParams = new URLSearchParams();
    if (params.per_page) queryParams.set('per_page', params.per_page.toString());
    if (params.starting_after) queryParams.set('starting_after', params.starting_after);

    const endpoint = `/contacts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await intercomAPI.get<ContactList>(endpoint);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'listContacts');
  }
}

/**
 * Search contacts using query
 */
export async function searchContacts(params: {
  query: SearchQuery;
  pagination?: PaginationRequest;
}): Promise<string> {
  try {
    const body: Record<string, unknown> = {
      query: params.query,
    };

    if (params.pagination) {
      body.pagination = params.pagination;
    }

    const response = await intercomAPI.post<SearchResponse<Contact>>(
      '/contacts/search',
      body
    );
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'searchContacts');
  }
}

/**
 * Get a single contact by ID
 */
export async function getContact(contactId: string): Promise<string> {
  try {
    const response = await intercomAPI.get<Contact>(`/contacts/${contactId}`);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getContact');
  }
}

/**
 * Create a new contact
 */
export async function createContact(params: CreateContactRequest): Promise<string> {
  try {
    const response = await intercomAPI.post<Contact>('/contacts', params);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'createContact');
  }
}

/**
 * Update an existing contact
 */
export async function updateContact(
  contactId: string,
  params: UpdateContactRequest
): Promise<string> {
  try {
    const response = await intercomAPI.put<Contact>(`/contacts/${contactId}`, params);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'updateContact');
  }
}
