/**
 * Note Management Tools
 * Implements Intercom API note endpoints
 */

import { intercomAPI } from '../utils/intercom-api.js';
import { toMcpError } from '../utils/errors.js';
import type { Note, NoteList, CreateNoteRequest } from '../types/index.js';

/**
 * List notes for a contact
 * Available for future tool registration
 */
export async function listNotes(params: {
  contactId: string;
  per_page?: number;
  page?: number;
}): Promise<string> {
  try {
    const queryParams = new URLSearchParams();
    if (params.per_page) queryParams.set('per_page', params.per_page.toString());
    if (params.page) queryParams.set('page', params.page.toString());

    const endpoint = `/contacts/${params.contactId}/notes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await intercomAPI.get<NoteList>(endpoint);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'listNotes');
  }
}

/**
 * Create a note for a contact
 */
export async function createNote(params: {
  contactId: string;
  body: string;
  admin_id?: string;
}): Promise<string> {
  try {
    const { contactId, ...noteData } = params;
    const response = await intercomAPI.post<Note>(
      `/contacts/${contactId}/notes`,
      noteData as CreateNoteRequest
    );
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'createNote');
  }
}
