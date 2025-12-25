/**
 * Zendesk MCP Server
 * Registers tools and handles MCP protocol communication
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { logger } from './utils/logger.js';
import { getCurrentCredentials, getAuthMode } from './auth/token.js';

// Import tools
import * as ticketTools from './tools/tickets.js';
import * as userTools from './tools/users.js';
import * as orgTools from './tools/organizations.js';

/**
 * Zendesk MCP Server Class
 */
export class ZendeskMcpServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'zendesk',
      version: '1.0.0',
    });
  }

  /**
   * Initialize the server and register tools
   */
  async initialize() {
    logger.info('[Server] Initializing Zendesk MCP Server');

    // Validate credentials on startup
    const creds = getCurrentCredentials();
    const mode = getAuthMode();

    logger.info('[Server] Authentication configured', {
      subdomain: creds.subdomain,
      authMode: mode,
      nodeVersion: process.version,
    });

    if (mode === 'api_token') {
      logger.info('[Auth] Using API Token authentication', {
        email: creds.email,
      });
    } else if (mode === 'oauth') {
      logger.info('[Auth] Using OAuth Token authentication', {
        tokenPrefix: creds.accessToken?.substring(0, 8) + '...',
      });
    }

    // Register token update notification handler
    const TokenUpdateNotificationSchema = z.object({
      method: z.literal('notifications/token/update'),
      params: z.object({
        token: z.string(),
        timestamp: z.number().optional(),
      }).catchall(z.unknown()),
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

        // Update environment variable (used by getCurrentCredentials() in token.ts)
        process.env.accessToken = newToken;

        logger.info('[Token] Access token updated successfully', {
          timestamp: timestamp ? new Date(timestamp).toISOString() : 'N/A',
          tokenPrefix: newToken.substring(0, 10) + '...',
        });
      }
    );

    logger.info('[Server] Token update notification handler registered');

    // Register tools
    this.registerTicketTools();
    this.registerUserTools();
    this.registerOrganizationTools();

    logger.info('[Server] All tools registered successfully');
  }

  /**
   * Register Ticket Management Tools
   */
  private registerTicketTools() {
    // List Tickets
    this.server.registerTool(
      'zendeskListTickets',
      {
        title: 'Zendesk - List Tickets',
        description: 'List recent Zendesk tickets. Use zendeskSearchTickets to filter by status or priority.',
        inputSchema: ticketTools.listTicketsSchema.shape,
      },
      async (params: any) => await ticketTools.listTickets(params)
    );

    // Get Ticket
    this.server.registerTool(
      'zendeskGetTicket',
      {
        title: 'Zendesk - Get Ticket',
        description: 'Get details of a specific ticket by ID.',
        inputSchema: ticketTools.getTicketSchema.shape,
      },
      async (params: any) => await ticketTools.getTicket(params)
    );

    // Create Ticket
    this.server.registerTool(
      'zendeskCreateTicket',
      {
        title: 'Zendesk - Create Ticket',
        description: 'Create a new Zendesk ticket with subject and description.',
        inputSchema: ticketTools.createTicketSchema.shape,
      },
      async (params: any) => await ticketTools.createTicket(params)
    );

    // Update Ticket
    this.server.registerTool(
      'zendeskUpdateTicket',
      {
        title: 'Zendesk - Update Ticket',
        description: 'Update ticket status, priority, assignment, or add a comment.',
        inputSchema: ticketTools.updateTicketSchema.shape,
      },
      async (params: any) => await ticketTools.updateTicket(params)
    );

    // Delete Ticket
    this.server.registerTool(
      'zendeskDeleteTicket',
      {
        title: 'Zendesk - Delete Ticket',
        description: 'Delete a ticket permanently.',
        inputSchema: ticketTools.deleteTicketSchema.shape,
      },
      async (params: any) => await ticketTools.deleteTicket(params)
    );

    // Get Ticket Comments
    this.server.registerTool(
      'zendeskGetTicketComments',
      {
        title: 'Zendesk - Get Ticket Comments',
        description: 'Get all comments on a ticket.',
        inputSchema: ticketTools.getTicketCommentsSchema.shape,
      },
      async (params: any) => await ticketTools.getTicketComments(params)
    );

    // Add Ticket Comment
    this.server.registerTool(
      'zendeskAddTicketComment',
      {
        title: 'Zendesk - Add Ticket Comment',
        description: 'Add a public or private comment to a ticket.',
        inputSchema: ticketTools.addTicketCommentSchema.shape,
      },
      async (params: any) => await ticketTools.addTicketComment(params)
    );

    // Search Tickets
    this.server.registerTool(
      'zendeskSearchTickets',
      {
        title: 'Zendesk - Search Tickets',
        description: 'Search tickets using Zendesk query syntax (e.g., "status:open priority:high").',
        inputSchema: ticketTools.searchTicketsSchema.shape,
      },
      async (params: any) => await ticketTools.searchTickets(params)
    );
  }

  /**
   * Register User Management Tools
   */
  private registerUserTools() {
    // List Users
    this.server.registerTool(
      'zendeskListUsers',
      {
        title: 'Zendesk - List Users',
        description: 'List Zendesk users with optional role filter (end-user, agent, admin).',
        inputSchema: userTools.listUsersSchema.shape,
      },
      async (params: any) => await userTools.listUsers(params)
    );

    // Get User
    this.server.registerTool(
      'zendeskGetUser',
      {
        title: 'Zendesk - Get User',
        description: 'Get details of a specific user by ID.',
        inputSchema: userTools.getUserSchema.shape,
      },
      async (params: any) => await userTools.getUser(params)
    );

    // Create User
    this.server.registerTool(
      'zendeskCreateUser',
      {
        title: 'Zendesk - Create User',
        description: 'Create a new Zendesk user with name, email, and role.',
        inputSchema: userTools.createUserSchema.shape,
      },
      async (params: any) => await userTools.createUser(params)
    );

    // Update User
    this.server.registerTool(
      'zendeskUpdateUser',
      {
        title: 'Zendesk - Update User',
        description: 'Update user information (name, email, role, etc.).',
        inputSchema: userTools.updateUserSchema.shape,
      },
      async (params: any) => await userTools.updateUser(params)
    );

    // Delete User
    this.server.registerTool(
      'zendeskDeleteUser',
      {
        title: 'Zendesk - Delete User',
        description: 'Delete a user permanently.',
        inputSchema: userTools.deleteUserSchema.shape,
      },
      async (params: any) => await userTools.deleteUser(params)
    );
  }

  /**
   * Register Organization Management Tools
   */
  private registerOrganizationTools() {
    // List Organizations
    this.server.registerTool(
      'zendeskListOrganizations',
      {
        title: 'Zendesk - List Organizations',
        description: 'List all Zendesk organizations.',
        inputSchema: orgTools.listOrganizationsSchema.shape,
      },
      async (params: any) => await orgTools.listOrganizations(params)
    );

    // Get Organization
    this.server.registerTool(
      'zendeskGetOrganization',
      {
        title: 'Zendesk - Get Organization',
        description: 'Get details of a specific organization by ID.',
        inputSchema: orgTools.getOrganizationSchema.shape,
      },
      async (params: any) => await orgTools.getOrganization(params)
    );

    // Create Organization
    this.server.registerTool(
      'zendeskCreateOrganization',
      {
        title: 'Zendesk - Create Organization',
        description: 'Create a new organization with name and domains.',
        inputSchema: orgTools.createOrganizationSchema.shape,
      },
      async (params: any) => await orgTools.createOrganization(params)
    );

    // Update Organization
    this.server.registerTool(
      'zendeskUpdateOrganization',
      {
        title: 'Zendesk - Update Organization',
        description: 'Update organization information.',
        inputSchema: orgTools.updateOrganizationSchema.shape,
      },
      async (params: any) => await orgTools.updateOrganization(params)
    );

    // Delete Organization
    this.server.registerTool(
      'zendeskDeleteOrganization',
      {
        title: 'Zendesk - Delete Organization',
        description: 'Delete an organization permanently.',
        inputSchema: orgTools.deleteOrganizationSchema.shape,
      },
      async (params: any) => await orgTools.deleteOrganization(params)
    );
  }

  /**
   * Connect server to transport
   */
  async connect(transport: any) {
    await this.initialize();
    await this.server.server.connect(transport);
    logger.info('[Server] Zendesk MCP Server connected successfully');
  }
}
