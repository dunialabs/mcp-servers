/**
 * Conversation Management Tools
 * Implements Intercom API conversation endpoints
 */

import { intercomAPI } from '../utils/intercom-api.js';
import { toMcpError } from '../utils/errors.js';
import type {
  Conversation,
  ConversationList,
  SearchResponse,
  SearchQuery,
  PaginationRequest,
  ReplyToConversationRequest,
  CloseConversationRequest,
  AssignConversationRequest,
} from '../types/index.js';

/**
 * List all conversations with pagination
 */
export async function listConversations(params: {
  per_page?: number;
  starting_after?: string;
}): Promise<string> {
  try {
    const queryParams = new URLSearchParams();
    if (params.per_page) queryParams.set('per_page', params.per_page.toString());
    if (params.starting_after) queryParams.set('starting_after', params.starting_after);

    const endpoint = `/conversations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await intercomAPI.get<ConversationList>(endpoint);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'listConversations');
  }
}

/**
 * Search conversations using query
 */
export async function searchConversations(params: {
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

    const response = await intercomAPI.post<SearchResponse<Conversation>>(
      '/conversations/search',
      body
    );
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'searchConversations');
  }
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(
  conversationId: string,
  params?: { display_as?: 'plaintext' }
): Promise<string> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.display_as) queryParams.set('display_as', params.display_as);

    const endpoint = `/conversations/${conversationId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await intercomAPI.get<Conversation>(endpoint);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getConversation');
  }
}

/**
 * Reply to a conversation
 */
export async function replyToConversation(
  conversationId: string,
  params: ReplyToConversationRequest
): Promise<string> {
  try {
    const response = await intercomAPI.post<Conversation>(
      `/conversations/${conversationId}/reply`,
      params
    );
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'replyToConversation');
  }
}

/**
 * Close a conversation
 */
export async function closeConversation(
  conversationId: string,
  params: CloseConversationRequest
): Promise<string> {
  try {
    const response = await intercomAPI.post<Conversation>(
      `/conversations/${conversationId}/parts`,
      {
        message_type: 'close',
        type: 'admin',
        admin_id: params.admin_id,
        body: params.body,
      }
    );
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'closeConversation');
  }
}

/**
 * Assign a conversation to an admin or team
 */
export async function assignConversation(
  conversationId: string,
  params: AssignConversationRequest
): Promise<string> {
  try {
    const response = await intercomAPI.post<Conversation>(
      `/conversations/${conversationId}/parts`,
      {
        message_type: 'assignment',
        type: 'admin',
        admin_id: params.admin_id,
        assignee_id: params.assignee_id,
        body: params.body,
      }
    );
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'assignConversation');
  }
}
