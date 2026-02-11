/**
 * Tag Management Tools
 * Implements Intercom API tag endpoints
 */

import { intercomAPI } from '../utils/intercom-api.js';
import { toMcpError } from '../utils/errors.js';
import type { Tag, TagList } from '../types/index.js';

/**
 * List all tags
 */
export async function listTags(): Promise<string> {
  try {
    const response = await intercomAPI.get<TagList>('/tags');
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'listTags');
  }
}

/**
 * Tag a contact
 */
export async function tagContact(params: {
  contactId: string;
  tagId: string;
}): Promise<string> {
  try {
    const response = await intercomAPI.post<Tag>(
      `/contacts/${params.contactId}/tags`,
      { id: params.tagId }
    );
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'tagContact');
  }
}

/**
 * Untag a contact (remove a tag from a contact)
 * Available for future tool registration
 */
export async function untagContact(params: {
  contactId: string;
  tagId: string;
}): Promise<string> {
  try {
    const response = await intercomAPI.delete<Tag>(
      `/contacts/${params.contactId}/tags/${params.tagId}`
    );
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'untagContact');
  }
}
