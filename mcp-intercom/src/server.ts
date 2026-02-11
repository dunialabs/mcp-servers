/**
 * Intercom MCP Server
 * Registers tools and resources for Intercom API integration
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Contact tools
import {
  listContacts,
  searchContacts,
  getContact,
  createContact,
  updateContact,
} from './tools/contacts.js';

// Conversation tools
import {
  listConversations,
  searchConversations,
  getConversation,
  replyToConversation,
  closeConversation,
  assignConversation,
} from './tools/conversations.js';

// Company tools
import {
  listCompanies,
  getCompany,
} from './tools/companies.js';

// Tag tools
import {
  listTags,
  tagContact,
} from './tools/tags.js';

// Note tools
import {
  createNote,
} from './tools/notes.js';

import { logger } from './utils/logger.js';
import type { ServerConfig } from './types/index.js';

/**
 * Tool schemas using Zod
 */

// Search query schemas
const SingleFilterSchema = z.object({
  field: z.string().describe('Field name to filter on'),
  operator: z.enum(['=', '!=', '>', '<', '~', '!~', 'IN', 'NIN', 'contains', 'starts_with']).describe('Comparison operator'),
  value: z.union([z.string(), z.number(), z.boolean()]).describe('Value to compare against'),
});

const SearchQuerySchema = z.object({
  operator: z.enum(['AND', 'OR']).describe('Logical operator to combine filters'),
  value: z.array(
    z.union([
      SingleFilterSchema,
      z.object({
        operator: z.enum(['AND', 'OR']).describe('Nested logical operator'),
        value: z.array(SingleFilterSchema).describe('Nested filters'),
      }),
    ])
  ).describe('Array of filter conditions'),
});

const PaginationSchema = z.object({
  per_page: z.number().min(1).max(150).optional().describe('Number of results per page (1-150)'),
  starting_after: z.string().optional().describe('Cursor for pagination'),
}).optional();

// Contact schemas
const ListContactsParamsSchema = z.object({
  per_page: z.number().min(1).max(150).optional().describe('Number of results per page (1-150, default: 50)'),
  starting_after: z.string().optional().describe('Cursor for pagination from previous response'),
});

const SearchContactsParamsSchema = z.object({
  query: SearchQuerySchema.describe('Search query with filters'),
  pagination: PaginationSchema.describe('Pagination options'),
});

const GetContactParamsSchema = z.object({
  contactId: z.string().describe('Contact ID (required)'),
});

const CreateContactParamsSchema = z.object({
  role: z.enum(['user', 'lead']).optional().describe('Contact role: user or lead (default: lead)'),
  external_id: z.string().optional().describe('External ID from your system'),
  email: z.string().email().optional().describe('Contact email address'),
  phone: z.string().optional().describe('Contact phone number'),
  name: z.string().optional().describe('Contact full name'),
  avatar: z.string().url().optional().describe('URL to contact avatar image'),
  signed_up_at: z.number().optional().describe('Unix timestamp when contact signed up'),
  last_seen_at: z.number().optional().describe('Unix timestamp when contact was last seen'),
  owner_id: z.number().optional().describe('Admin ID to assign as owner'),
  unsubscribed_from_emails: z.boolean().optional().describe('Whether contact is unsubscribed from emails'),
  custom_attributes: z.record(z.unknown()).optional().describe('Custom attributes object'),
});

// Conversation schemas
const ListConversationsParamsSchema = z.object({
  per_page: z.number().min(1).max(150).optional().describe('Number of results per page (1-150, default: 20)'),
  starting_after: z.string().optional().describe('Cursor for pagination from previous response'),
});

const SearchConversationsParamsSchema = z.object({
  query: SearchQuerySchema.describe('Search query with filters'),
  pagination: PaginationSchema.describe('Pagination options'),
});

const GetConversationParamsSchema = z.object({
  conversationId: z.string().describe('Conversation ID (required)'),
  display_as: z.enum(['plaintext']).optional().describe('Set to "plaintext" to get plain text body instead of HTML'),
});

const ReplyToConversationParamsSchema = z.object({
  conversationId: z.string().describe('Conversation ID (required)'),
  message_type: z.enum(['comment', 'note']).describe('Type of reply: comment (visible to customer) or note (internal only)'),
  type: z.enum(['admin', 'user']).describe('Who is sending the reply: admin or user'),
  body: z.string().describe('The message body (HTML for admin, plain text for user)'),
  admin_id: z.string().optional().describe('Admin ID when type is "admin" (required for admin replies)'),
  intercom_user_id: z.string().optional().describe('Intercom user ID when type is "user"'),
  user_id: z.string().optional().describe('External user ID when type is "user"'),
  email: z.string().optional().describe('User email when type is "user"'),
  attachment_urls: z.array(z.string().url()).optional().describe('Array of publicly accessible URLs to attach'),
  attachment_files: z.array(z.object({
    content_type: z.string().describe('MIME type of the file (e.g. "image/png", "application/pdf")'),
    data: z.string().describe('Base64-encoded file content'),
    name: z.string().describe('File name including extension (e.g. "screenshot.png")'),
  })).optional().describe('Array of inline file attachments (base64-encoded); use instead of attachment_urls when the file is not publicly hosted'),
}).refine(
  (data) => data.type !== 'admin' || !!data.admin_id,
  { message: 'admin_id is required when type is "admin"', path: ['admin_id'] }
).refine(
  (data) => data.type !== 'user' || !!(data.intercom_user_id || data.user_id || data.email),
  { message: 'One of intercom_user_id, user_id, or email is required when type is "user"', path: ['intercom_user_id'] }
);

// ==================== Phase 2 Schemas ====================

// Update contact schema — email does not support null: Intercom may reject a 400
// if the contact has no other identifier. Use external_id/phone to identify instead.
const UpdateContactParamsSchema = z.object({
  contactId: z.string().describe('Contact ID (required)'),
  role: z.enum(['user', 'lead']).optional().describe('Contact role: user or lead'),
  external_id: z.string().nullable().optional().describe('External ID from your system — pass null to clear'),
  email: z.string().email().optional().describe('Contact email address (omit to leave unchanged; clearing email is not supported as Intercom requires at least one identifier)'),
  phone: z.string().nullable().optional().describe('Contact phone number — pass null to clear'),
  name: z.string().nullable().optional().describe('Contact full name — pass null to clear'),
  avatar: z.string().url().nullable().optional().describe('URL to contact avatar image — pass null to clear'),
  signed_up_at: z.number().optional().describe('Unix timestamp when contact signed up'),
  last_seen_at: z.number().optional().describe('Unix timestamp when contact was last seen'),
  owner_id: z.number().nullable().optional().describe('Admin ID to assign as owner — pass null to unassign'),
  unsubscribed_from_emails: z.boolean().optional().describe('Whether contact is unsubscribed from emails'),
  custom_attributes: z.record(z.unknown()).optional().describe('Custom attributes object'),
});

// Note schema
const AddNoteParamsSchema = z.object({
  contactId: z.string().describe('Contact ID (required)'),
  body: z.string().describe('Note body content (required)'),
  admin_id: z.string().optional().describe('Admin ID of the note author'),
});

// Company schemas
const ListCompaniesParamsSchema = z.object({
  per_page: z.number().min(1).max(60).optional().describe('Number of results per page (1-60, default: 15)'),
  page: z.number().min(1).optional().describe('Page number (1-based)'),
  order: z.enum(['asc', 'desc']).optional().describe('Sort order by created_at'),
});

const GetCompanyParamsSchema = z.object({
  companyId: z.string().describe('Intercom internal company ID (required) — this is the id field returned by intercomListCompanies, not the external company_id'),
});

// Tag schemas
const TagContactParamsSchema = z.object({
  contactId: z.string().describe('Contact ID (required)'),
  tagId: z.string().describe('Tag ID to apply (required)'),
});

// Close conversation schema
const CloseConversationParamsSchema = z.object({
  conversationId: z.string().describe('Conversation ID (required)'),
  admin_id: z.string().describe('Admin ID who is closing the conversation (required)'),
  body: z.string().optional().describe('Optional closing message'),
});

// Assign conversation schema
const AssignConversationParamsSchema = z.object({
  conversationId: z.string().describe('Conversation ID (required)'),
  admin_id: z.string().optional().describe('Admin ID performing the assignment'),
  assignee_id: z.union([z.string(), z.number()]).describe('Admin ID or Team ID to assign to (required) — accepts string or number. Pass 0 to unassign'),
  body: z.string().optional().describe('Optional note about the assignment'),
});

/**
 * Intercom MCP Server Class
 */
export class IntercomMCPServer {
  private server: McpServer;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;

    logger.info(`[Server] Initializing ${config.name} v${config.version}`);

    this.server = new McpServer({
      name: config.name,
      version: config.version,
    });
  }

  /**
   * Initialize server and register tools
   */
  async initialize() {
    logger.info('[Server] Initializing Intercom MCP Server');

    // Register token update notification handler (for Console platform)
    const TokenUpdateNotificationSchema = z.object({
      method: z.literal('notifications/token/update'),
      params: z.object({
        token: z.string(),
        timestamp: z.number().optional()
      }).catchall(z.unknown())
    }).catchall(z.unknown());

    this.server.server.setNotificationHandler(
      TokenUpdateNotificationSchema,
      async (notification) => {
        logger.info('[Token] Received token update notification');

        const { token: newToken, timestamp } = notification.params;

        if (!newToken || typeof newToken !== 'string' || newToken.length === 0) {
          logger.error('[Token] Invalid token received in notification');
          return;
        }

        // Update environment variable
        process.env.accessToken = newToken;

        logger.info('[Token] Access token updated successfully', {
          timestamp: timestamp ? new Date(timestamp).toISOString() : 'N/A',
          tokenPrefix: newToken.substring(0, 10) + '...'
        });
      }
    );

    logger.info('[Server] Token update notification handler registered');

    // Register tools
    this.registerTools();

    logger.info('[Server] All tools registered successfully');
  }

  /**
   * Register all MCP tools
   */
  private registerTools() {
    // ==================== Contact Tools ====================

    this.server.registerTool(
      'intercomListContacts',
      {
        title: 'Intercom - List Contacts',
        description: 'List all contacts (users and leads) in Intercom with pagination support.',
        inputSchema: ListContactsParamsSchema,
      },
      async (params: { per_page?: number; starting_after?: string }) => {
        const result = await listContacts(params);
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    this.server.registerTool(
      'intercomSearchContacts',
      {
        title: 'Intercom - Search Contacts',
        description: `Search for contacts using query filters.

Common search fields:
- email: Contact email address
- name: Contact name
- phone: Contact phone number
- role: "user" or "lead"
- created_at: Unix timestamp
- updated_at: Unix timestamp
- signed_up_at: Unix timestamp
- last_seen_at: Unix timestamp
- owner_id: Assigned admin ID
- external_id: Your system's user ID

Example queries:
- Find by email: { "operator": "AND", "value": [{ "field": "email", "operator": "=", "value": "john@example.com" }] }
- Find leads: { "operator": "AND", "value": [{ "field": "role", "operator": "=", "value": "lead" }] }`,
        inputSchema: SearchContactsParamsSchema,
      },
      async (params: { query: unknown; pagination?: unknown }) => {
        const result = await searchContacts(params as Parameters<typeof searchContacts>[0]);
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    this.server.registerTool(
      'intercomGetContact',
      {
        title: 'Intercom - Get Contact',
        description: 'Get detailed information about a specific contact by ID.',
        inputSchema: GetContactParamsSchema,
      },
      async (params: { contactId: string }) => {
        const result = await getContact(params.contactId);
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    this.server.registerTool(
      'intercomCreateContact',
      {
        title: 'Intercom - Create Contact',
        description: `Create a new contact (user or lead) in Intercom.

At minimum, you should provide an email or external_id.
- role: "lead" (default) for prospects, "user" for signed-up users
- custom_attributes: Any custom data you want to store`,
        inputSchema: CreateContactParamsSchema,
      },
      async (params: unknown) => {
        const result = await createContact(params as Parameters<typeof createContact>[0]);
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    // ==================== Conversation Tools ====================

    this.server.registerTool(
      'intercomListConversations',
      {
        title: 'Intercom - List Conversations',
        description: 'List all conversations with pagination support. Returns conversation metadata without full message history.',
        inputSchema: ListConversationsParamsSchema,
      },
      async (params: { per_page?: number; starting_after?: string }) => {
        const result = await listConversations(params);
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    this.server.registerTool(
      'intercomSearchConversations',
      {
        title: 'Intercom - Search Conversations',
        description: `Search for conversations using query filters.

Common search fields:
- id: Conversation ID
- state: "open", "closed", or "snoozed"
- read: true or false
- priority: "priority" or "not_priority"
- admin_assignee_id: Assigned admin ID
- team_assignee_id: Assigned team ID
- created_at: Unix timestamp
- updated_at: Unix timestamp
- source.type: Message source type
- source.author.id: Author ID

Example queries:
- Find open conversations: { "operator": "AND", "value": [{ "field": "state", "operator": "=", "value": "open" }] }
- Find unread: { "operator": "AND", "value": [{ "field": "read", "operator": "=", "value": false }] }`,
        inputSchema: SearchConversationsParamsSchema,
      },
      async (params: { query: unknown; pagination?: unknown }) => {
        const result = await searchConversations(params as Parameters<typeof searchConversations>[0]);
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    this.server.registerTool(
      'intercomGetConversation',
      {
        title: 'Intercom - Get Conversation',
        description: 'Get detailed information about a specific conversation, including all message parts.',
        inputSchema: GetConversationParamsSchema,
      },
      async (params: { conversationId: string; display_as?: 'plaintext' }) => {
        const result = await getConversation(params.conversationId, { display_as: params.display_as });
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    this.server.registerTool(
      'intercomReplyConversation',
      {
        title: 'Intercom - Reply to Conversation',
        description: `Reply to an existing conversation.

Reply types:
- comment: Visible to the customer
- note: Internal note, not visible to customer

For admin replies (type: "admin"):
- admin_id is required
- body can contain HTML

For user replies (type: "user"):
- One of intercom_user_id, user_id, or email is required
- body should be plain text`,
        inputSchema: ReplyToConversationParamsSchema,
      },
      async (params: {
        conversationId: string;
        message_type: 'comment' | 'note';
        type: 'admin' | 'user';
        body: string;
        admin_id?: string;
        intercom_user_id?: string;
        user_id?: string;
        email?: string;
        attachment_urls?: string[];
        attachment_files?: { content_type: string; data: string; name: string }[];
      }) => {
        const { conversationId, ...replyParams } = params;
        const result = await replyToConversation(conversationId, replyParams);
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    // ==================== Phase 2: Contact Tools ====================

    this.server.registerTool(
      'intercomUpdateContact',
      {
        title: 'Intercom - Update Contact',
        description: `Update an existing contact's information.

Provide the contactId and any fields you want to update.
Only the fields you provide will be updated — other fields remain unchanged.

Passing null to clear a field: name, phone, avatar, external_id, and owner_id accept null
according to the Intercom API. Passing null for email may result in a 400 error if the
contact has no other identifier. Verify behaviour against your workspace before relying on
null clearing in production.`,
        inputSchema: UpdateContactParamsSchema,
      },
      async (params: { contactId: string } & Record<string, unknown>) => {
        const { contactId, ...updateParams } = params;
        const result = await updateContact(
          contactId,
          updateParams as Parameters<typeof updateContact>[1]
        );
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    this.server.registerTool(
      'intercomAddNote',
      {
        title: 'Intercom - Add Note to Contact',
        description: `Add an internal note to a contact.

Notes are internal records visible only to your team — they are not shown to the contact.
Useful for recording context, follow-up reminders, or observations about the contact.`,
        inputSchema: AddNoteParamsSchema,
      },
      async (params: { contactId: string; body: string; admin_id?: string }) => {
        const result = await createNote(params);
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    // ==================== Phase 2: Company Tools ====================

    this.server.registerTool(
      'intercomListCompanies',
      {
        title: 'Intercom - List Companies',
        description: 'List all companies in Intercom with pagination support.',
        inputSchema: ListCompaniesParamsSchema,
      },
      async (params: { per_page?: number; page?: number; order?: 'asc' | 'desc' }) => {
        const result = await listCompanies(params);
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    this.server.registerTool(
      'intercomGetCompany',
      {
        title: 'Intercom - Get Company',
        description: 'Get detailed information about a specific company by ID.',
        inputSchema: GetCompanyParamsSchema,
      },
      async (params: { companyId: string }) => {
        const result = await getCompany(params.companyId);
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    // ==================== Phase 2: Tag Tools ====================

    this.server.registerTool(
      'intercomListTags',
      {
        title: 'Intercom - List Tags',
        description: `List all tags in your Intercom workspace.

Tags can be applied to contacts, conversations, and companies for segmentation.
Use the tag ID returned here with intercomTagContact to apply a tag.`,
        inputSchema: z.object({}),
      },
      async () => {
        const result = await listTags();
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    this.server.registerTool(
      'intercomTagContact',
      {
        title: 'Intercom - Tag Contact',
        description: `Apply a tag to a contact.

Use intercomListTags to get the list of available tag IDs.
A tag can be applied to multiple contacts.`,
        inputSchema: TagContactParamsSchema,
      },
      async (params: { contactId: string; tagId: string }) => {
        const result = await tagContact(params);
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    // ==================== Phase 2: Conversation State Tools ====================

    this.server.registerTool(
      'intercomCloseConversation',
      {
        title: 'Intercom - Close Conversation',
        description: `Close an open conversation.

Closing a conversation marks it as resolved.
An optional closing message can be sent to the contact at the same time.
The admin_id is required — it identifies who is closing the conversation.`,
        inputSchema: CloseConversationParamsSchema,
      },
      async (params: { conversationId: string; admin_id: string; body?: string }) => {
        const { conversationId, ...closeParams } = params;
        const result = await closeConversation(conversationId, closeParams);
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );

    this.server.registerTool(
      'intercomAssignConversation',
      {
        title: 'Intercom - Assign Conversation',
        description: `Assign a conversation to an admin or a team.

- assignee_id: The admin ID or team ID to assign the conversation to (number)
- admin_id: The admin performing the assignment (optional)
- body: Optional internal note to accompany the assignment

To unassign, pass assignee_id as 0 (number).`,
        inputSchema: AssignConversationParamsSchema,
      },
      async (params: {
        conversationId: string;
        admin_id?: string;
        assignee_id: string | number;
        body?: string;
      }) => {
        const { conversationId, ...assignParams } = params;
        const result = await assignConversation(conversationId, assignParams);
        return { content: [{ type: 'text' as const, text: result }] };
      }
    );
  }

  /**
   * Start the MCP server
   */
  async start() {
    const transport = new StdioServerTransport();

    logger.info('[Server] Connecting to STDIO transport...');

    // Global error handler
    this.server.server.onerror = (error) => {
      logger.error('[Server] Server error:', error);
    };

    try {
      await this.server.connect(transport);
      logger.info(`[Server] ${this.config.name} v${this.config.version} running on stdio`);
      logger.info('[Server] Server started successfully');
    } catch (error) {
      logger.error('[Server] Failed to start server:', error);
      throw error;
    }
  }
}
