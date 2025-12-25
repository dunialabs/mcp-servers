/**
 * Zendesk Ticket Management Tools
 *
 * Provides MCP tools for managing Zendesk tickets
 */

import { z } from 'zod';
import { zendeskAPI } from '../utils/zendesk-api.js';
import { toMcpError } from '../utils/errors.js';
import type {
  ZendeskTicket,
  ZendeskTicketResponse,
  ZendeskTicketsResponse,
  ZendeskCommentsResponse,
} from '../types/index.js';

/**
 * List tickets
 *
 * Note: The Zendesk API does not support filtering by status or priority
 * in the list endpoint. Use zendesk_search_tickets to filter by these criteria.
 */
export const listTicketsSchema = z.object({
  limit: z.number().min(1).max(100).default(25)
    .describe('Number of tickets to return (1-100, default: 25)'),
});

export async function listTickets(args: z.infer<typeof listTicketsSchema>) {
  try {
    const endpoint = `/tickets?per_page=${args.limit}`;
    const data = await zendeskAPI.get<ZendeskTicketsResponse>(endpoint);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          tickets: data.tickets,
          count: data.count,
          has_more: !!data.next_page,
        }, null, 2),
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'list_tickets');
  }
}

/**
 * Get a single ticket
 */
export const getTicketSchema = z.object({
  ticket_id: z.number().describe('Ticket ID'),
});

export async function getTicket(args: z.infer<typeof getTicketSchema>) {
  try {
    const data = await zendeskAPI.get<ZendeskTicketResponse>(`/tickets/${args.ticket_id}`);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(data.ticket, null, 2),
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'get_ticket');
  }
}

/**
 * Create a new ticket
 */
export const createTicketSchema = z.object({
  subject: z.string().describe('Ticket subject'),
  description: z.string().describe('Ticket description/body'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional()
    .describe('Ticket priority'),
  type: z.enum(['problem', 'incident', 'question', 'task']).optional()
    .describe('Ticket type'),
  tags: z.array(z.string()).optional()
    .describe('Ticket tags'),
  requester_email: z.string().email().optional()
    .describe('Requester email (if creating on behalf of someone)'),
});

export async function createTicket(args: z.infer<typeof createTicketSchema>) {
  try {
    const ticketData: Record<string, unknown> = {
      subject: args.subject,
      comment: { body: args.description },
    };

    if (args.priority) ticketData.priority = args.priority;
    if (args.type) ticketData.type = args.type;
    if (args.tags) ticketData.tags = args.tags;
    if (args.requester_email) {
      ticketData.requester = { email: args.requester_email };
    }

    const data = await zendeskAPI.post<ZendeskTicketResponse>('/tickets', {
      ticket: ticketData,
    });

    return {
      content: [{
        type: 'text' as const,
        text: `Ticket created successfully!\n\n${JSON.stringify(data.ticket, null, 2)}`,
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'create_ticket');
  }
}

/**
 * Update a ticket
 */
export const updateTicketSchema = z.object({
  ticket_id: z.number().describe('Ticket ID'),
  status: z.enum(['new', 'open', 'pending', 'hold', 'solved', 'closed']).optional()
    .describe('New status'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional()
    .describe('New priority'),
  assignee_id: z.number().optional()
    .describe('Assign to agent (user ID)'),
  comment: z.string().optional()
    .describe('Add a comment'),
});

export async function updateTicket(args: z.infer<typeof updateTicketSchema>) {
  try {
    const ticketData: Record<string, unknown> = {};

    if (args.status) ticketData.status = args.status;
    if (args.priority) ticketData.priority = args.priority;
    if (args.assignee_id) ticketData.assignee_id = args.assignee_id;
    if (args.comment) {
      ticketData.comment = { body: args.comment, public: true };
    }

    const data = await zendeskAPI.put<ZendeskTicketResponse>(
      `/tickets/${args.ticket_id}`,
      { ticket: ticketData }
    );

    return {
      content: [{
        type: 'text' as const,
        text: `Ticket updated successfully!\n\n${JSON.stringify(data.ticket, null, 2)}`,
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'update_ticket');
  }
}

/**
 * Get ticket comments
 */
export const getTicketCommentsSchema = z.object({
  ticket_id: z.number().describe('Ticket ID'),
});

export async function getTicketComments(args: z.infer<typeof getTicketCommentsSchema>) {
  try {
    const data = await zendeskAPI.get<ZendeskCommentsResponse>(
      `/tickets/${args.ticket_id}/comments`
    );

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(data.comments, null, 2),
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'get_ticket_comments');
  }
}

/**
 * Add comment to ticket
 */
export const addTicketCommentSchema = z.object({
  ticket_id: z.number().describe('Ticket ID'),
  body: z.string().describe('Comment text'),
  public: z.boolean().default(true)
    .describe('Whether the comment is public (default: true)'),
});

export async function addTicketComment(args: z.infer<typeof addTicketCommentSchema>) {
  try {
    await zendeskAPI.put<ZendeskTicketResponse>(
      `/tickets/${args.ticket_id}`,
      {
        ticket: {
          comment: {
            body: args.body,
            public: args.public,
          },
        },
      }
    );

    return {
      content: [{
        type: 'text' as const,
        text: `Comment added successfully!`,
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'add_ticket_comment');
  }
}

/**
 * Search tickets
 */
export const searchTicketsSchema = z.object({
  query: z.string().describe('Search query (e.g., "status:open priority:high")'),
  limit: z.number().min(1).max(100).default(25)
    .describe('Number of results (1-100, default: 25)'),
});

export async function searchTickets(args: z.infer<typeof searchTicketsSchema>) {
  try {
    const endpoint = `/search?query=${encodeURIComponent(`type:ticket ${args.query}`)}&per_page=${args.limit}`;
    const data = await zendeskAPI.get<{ results: ZendeskTicket[]; count: number }>(endpoint);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          tickets: data.results,
          count: data.count,
        }, null, 2),
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'search_tickets');
  }
}

/**
 * Delete a ticket
 */
export const deleteTicketSchema = z.object({
  ticket_id: z.number().describe('Ticket ID to delete'),
});

export async function deleteTicket(args: z.infer<typeof deleteTicketSchema>) {
  try {
    await zendeskAPI.delete(`/tickets/${args.ticket_id}`);

    return {
      content: [{
        type: 'text' as const,
        text: `Ticket #${args.ticket_id} deleted successfully!`,
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'delete_ticket');
  }
}
