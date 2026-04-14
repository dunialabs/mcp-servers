import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import {
  CreateContactInputSchema,
  GetContactInputSchema,
  SearchContactsInputSchema,
  UpdateContactInputSchema,
  UpsertContactByEmailInputSchema,
  hubspotCreateContact,
  hubspotGetContact,
  hubspotSearchContacts,
  hubspotUpdateContact,
  hubspotUpsertContactByEmail,
} from './tools/contacts.js';
import {
  CreateCompanyInputSchema,
  GetCompanyInputSchema,
  SearchCompaniesInputSchema,
  UpdateCompanyInputSchema,
  hubspotCreateCompany,
  hubspotGetCompany,
  hubspotSearchCompanies,
  hubspotUpdateCompany,
} from './tools/companies.js';
import {
  CreateDealInputSchema,
  GetDealInputSchema,
  SearchDealsInputSchema,
  UpdateDealInputSchema,
  hubspotCreateDeal,
  hubspotGetDeal,
  hubspotSearchDeals,
  hubspotUpdateDeal,
} from './tools/deals.js';
import {
  CreateTicketInputSchema,
  GetTicketInputSchema,
  SearchTicketsInputSchema,
  UpdateTicketInputSchema,
  hubspotCreateTicket,
  hubspotGetTicket,
  hubspotSearchTickets,
  hubspotUpdateTicket,
} from './tools/tickets.js';
import {
  AssociateRecordsInputSchema,
  CreateNoteEngagementInputSchema,
  GetAssociationsInputSchema,
  GetObjectPropertiesInputSchema,
  RemoveAssociationInputSchema,
  hubspotAssociateRecords,
  hubspotCreateNoteEngagement,
  hubspotGetAssociations,
  hubspotGetObjectProperties,
  hubspotRemoveAssociation,
} from './tools/associations.js';
import {
  ArchiveCompanyInputSchema,
  ArchiveContactInputSchema,
  ArchiveDealInputSchema,
  ArchiveTicketInputSchema,
  hubspotArchiveCompany,
  hubspotArchiveContact,
  hubspotArchiveDeal,
  hubspotArchiveTicket,
} from './tools/archive.js';
import {
  BatchUpdateCompaniesInputSchema,
  BatchUpdateContactsInputSchema,
  BatchUpdateDealsInputSchema,
  BatchUpdateTicketsInputSchema,
  hubspotBatchUpdateCompanies,
  hubspotBatchUpdateContacts,
  hubspotBatchUpdateDeals,
  hubspotBatchUpdateTickets,
} from './tools/batch.js';
import {
  GetOwnerWorkloadInputSchema,
  GetPipelineSummaryInputSchema,
  ValidateRecordRequiredFieldsInputSchema,
  hubspotGetOwnerWorkload,
  hubspotGetPipelineSummary,
  hubspotValidateRecordRequiredFields,
} from './tools/helpers.js';
import {
  ListDealPipelinesInputSchema,
  ListPipelineStagesInputSchema,
  ListTicketPipelinesInputSchema,
  hubspotListDealPipelines,
  hubspotListPipelineStages,
  hubspotListTicketPipelines,
} from './tools/pipelines.js';
import { normalizeAccessToken, validateTokenFormat } from './auth/token.js';
import { logger } from './utils/logger.js';
import { readAppHtml } from './utils/app-resource.js';

const HUBSPOT_BROWSER_VIEW_URI = 'ui://hubspot/browser-view.html';
const HUBSPOT_DEAL_VIEW_URI = 'ui://hubspot/deal-view.html';

function getServerVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
    const raw = readFileSync(packageJsonPath, 'utf8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export class HubSpotMcpServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'hubspot',
      version: getServerVersion(),
    });
  }

  async initialize() {
    logger.info('[Server] Initializing HubSpot MCP Server');

    const tokenUpdateSchema = z
      .object({
        method: z.literal('notifications/token/update'),
        params: z
          .object({
            token: z.string().optional(),
            accessToken: z.string().optional(),
            timestamp: z.number().optional(),
          })
          .catchall(z.unknown()),
      })
      .catchall(z.unknown());

    type TokenUpdateNotification = z.infer<typeof tokenUpdateSchema>;

    this.server.server.setNotificationHandler(
      tokenUpdateSchema,
      async (notification: TokenUpdateNotification) => {
        const newToken =
          typeof notification?.params?.accessToken === 'string'
            ? notification.params.accessToken
            : notification?.params?.token;

        if (!newToken || typeof newToken !== 'string' || newToken.trim().length === 0) {
          logger.error('[Token] Invalid token in notifications/token/update');
          return;
        }

        const normalizedToken = normalizeAccessToken(newToken);

        if (!validateTokenFormat(normalizedToken)) {
          logger.error('[Token] Invalid token format in notifications/token/update');
          return;
        }

        process.env.accessToken = normalizedToken;
        logger.info('[Token] accessToken updated via notification');
      }
    );

    this.registerTools();
    this.registerAppResources();
    logger.info('[Server] HubSpot MCP Server initialized');
  }

  private registerTools() {
    this.server.registerTool(
      'hubspotGetContact',
      {
        title: 'HubSpot - Get Contact',
        description: 'Get contact details by record ID.',
        inputSchema: GetContactInputSchema,
      },
      async (params) => hubspotGetContact(params)
    );
    registerAppTool(
      this.server,
      'hubspotSearchContacts',
      {
        title: 'HubSpot - Search Contacts',
        description: 'Search contacts with query/filter/pagination.',
        inputSchema: SearchContactsInputSchema,
        _meta: {
          ui: {
            resourceUri: HUBSPOT_BROWSER_VIEW_URI,
          },
        },
      },
      async (params) => hubspotSearchContacts(params)
    );
    this.server.registerTool(
      'hubspotCreateContact',
      {
        title: 'HubSpot - Create Contact',
        description: 'Create a contact.',
        inputSchema: CreateContactInputSchema,
      },
      async (params) => hubspotCreateContact(params)
    );
    this.server.registerTool(
      'hubspotUpdateContact',
      {
        title: 'HubSpot - Update Contact',
        description: 'Update a contact by record ID.',
        inputSchema: UpdateContactInputSchema,
      },
      async (params) => hubspotUpdateContact(params)
    );
    this.server.registerTool(
      'hubspotArchiveContact',
      {
        title: 'HubSpot - Archive Contact',
        description: 'Archive a contact by record ID.',
        inputSchema: ArchiveContactInputSchema,
      },
      async (params) => hubspotArchiveContact(params)
    );
    this.server.registerTool(
      'hubspotUpsertContactByEmail',
      {
        title: 'HubSpot - Upsert Contact By Email',
        description: 'Find by email then update, or create when not found.',
        inputSchema: UpsertContactByEmailInputSchema,
      },
      async (params) => hubspotUpsertContactByEmail(params)
    );

    this.server.registerTool(
      'hubspotGetCompany',
      {
        title: 'HubSpot - Get Company',
        description: 'Get company details by record ID.',
        inputSchema: GetCompanyInputSchema,
      },
      async (params) => hubspotGetCompany(params)
    );
    registerAppTool(
      this.server,
      'hubspotSearchCompanies',
      {
        title: 'HubSpot - Search Companies',
        description: 'Search companies with query/filter/pagination.',
        inputSchema: SearchCompaniesInputSchema,
        _meta: {
          ui: {
            resourceUri: HUBSPOT_BROWSER_VIEW_URI,
          },
        },
      },
      async (params) => hubspotSearchCompanies(params)
    );
    this.server.registerTool(
      'hubspotCreateCompany',
      {
        title: 'HubSpot - Create Company',
        description: 'Create a company.',
        inputSchema: CreateCompanyInputSchema,
      },
      async (params) => hubspotCreateCompany(params)
    );
    this.server.registerTool(
      'hubspotUpdateCompany',
      {
        title: 'HubSpot - Update Company',
        description: 'Update a company by record ID.',
        inputSchema: UpdateCompanyInputSchema,
      },
      async (params) => hubspotUpdateCompany(params)
    );
    this.server.registerTool(
      'hubspotArchiveCompany',
      {
        title: 'HubSpot - Archive Company',
        description: 'Archive a company by record ID.',
        inputSchema: ArchiveCompanyInputSchema,
      },
      async (params) => hubspotArchiveCompany(params)
    );

    registerAppTool(
      this.server,
      'hubspotGetDeal',
      {
        title: 'HubSpot - Get Deal',
        description: 'Get deal details by record ID.',
        inputSchema: GetDealInputSchema,
        _meta: {
          ui: {
            resourceUri: HUBSPOT_DEAL_VIEW_URI,
          },
        },
      },
      async (params) => hubspotGetDeal(params)
    );
    registerAppTool(
      this.server,
      'hubspotSearchDeals',
      {
        title: 'HubSpot - Search Deals',
        description: 'Search deals with query/filter/pagination.',
        inputSchema: SearchDealsInputSchema,
        _meta: {
          ui: {
            resourceUri: HUBSPOT_BROWSER_VIEW_URI,
          },
        },
      },
      async (params) => hubspotSearchDeals(params)
    );
    this.server.registerTool(
      'hubspotCreateDeal',
      {
        title: 'HubSpot - Create Deal',
        description: 'Create a deal.',
        inputSchema: CreateDealInputSchema,
      },
      async (params) => hubspotCreateDeal(params)
    );
    this.server.registerTool(
      'hubspotUpdateDeal',
      {
        title: 'HubSpot - Update Deal',
        description: 'Update a deal by record ID.',
        inputSchema: UpdateDealInputSchema,
      },
      async (params) => hubspotUpdateDeal(params)
    );
    this.server.registerTool(
      'hubspotArchiveDeal',
      {
        title: 'HubSpot - Archive Deal',
        description: 'Archive a deal by record ID.',
        inputSchema: ArchiveDealInputSchema,
      },
      async (params) => hubspotArchiveDeal(params)
    );

    this.server.registerTool(
      'hubspotGetTicket',
      {
        title: 'HubSpot - Get Ticket',
        description: 'Get ticket details by record ID.',
        inputSchema: GetTicketInputSchema,
      },
      async (params) => hubspotGetTicket(params)
    );
    this.server.registerTool(
      'hubspotSearchTickets',
      {
        title: 'HubSpot - Search Tickets',
        description: 'Search tickets with query/filter/pagination.',
        inputSchema: SearchTicketsInputSchema,
      },
      async (params) => hubspotSearchTickets(params)
    );
    this.server.registerTool(
      'hubspotCreateTicket',
      {
        title: 'HubSpot - Create Ticket',
        description: 'Create a ticket.',
        inputSchema: CreateTicketInputSchema,
      },
      async (params) => hubspotCreateTicket(params)
    );
    this.server.registerTool(
      'hubspotUpdateTicket',
      {
        title: 'HubSpot - Update Ticket',
        description: 'Update a ticket by record ID.',
        inputSchema: UpdateTicketInputSchema,
      },
      async (params) => hubspotUpdateTicket(params)
    );
    this.server.registerTool(
      'hubspotArchiveTicket',
      {
        title: 'HubSpot - Archive Ticket',
        description: 'Archive a ticket by record ID.',
        inputSchema: ArchiveTicketInputSchema,
      },
      async (params) => hubspotArchiveTicket(params)
    );

    this.server.registerTool(
      'hubspotGetAssociations',
      {
        title: 'HubSpot - Get Associations',
        description: 'List associations between two object types for one record.',
        inputSchema: GetAssociationsInputSchema,
      },
      async (params) => hubspotGetAssociations(params)
    );
    this.server.registerTool(
      'hubspotAssociateRecords',
      {
        title: 'HubSpot - Associate Records',
        description: 'Create default association between two records.',
        inputSchema: AssociateRecordsInputSchema,
      },
      async (params) => hubspotAssociateRecords(params)
    );
    this.server.registerTool(
      'hubspotRemoveAssociation',
      {
        title: 'HubSpot - Remove Association',
        description: 'Remove default association between two records.',
        inputSchema: RemoveAssociationInputSchema,
      },
      async (params) => hubspotRemoveAssociation(params)
    );
    this.server.registerTool(
      'hubspotGetObjectProperties',
      {
        title: 'HubSpot - Get Object Properties',
        description: 'Get property metadata for one object type.',
        inputSchema: GetObjectPropertiesInputSchema,
      },
      async (params) => hubspotGetObjectProperties(params)
    );
    this.server.registerTool(
      'hubspotCreateNoteEngagement',
      {
        title: 'HubSpot - Create Note Engagement',
        description: 'Create note and optionally associate it to records.',
        inputSchema: CreateNoteEngagementInputSchema,
      },
      async (params) => hubspotCreateNoteEngagement(params)
    );

    this.server.registerTool(
      'hubspotBatchUpdateContacts',
      {
        title: 'HubSpot - Batch Update Contacts',
        description: 'Batch update contacts by record IDs.',
        inputSchema: BatchUpdateContactsInputSchema,
      },
      async (params) => hubspotBatchUpdateContacts(params)
    );
    this.server.registerTool(
      'hubspotBatchUpdateCompanies',
      {
        title: 'HubSpot - Batch Update Companies',
        description: 'Batch update companies by record IDs.',
        inputSchema: BatchUpdateCompaniesInputSchema,
      },
      async (params) => hubspotBatchUpdateCompanies(params)
    );
    this.server.registerTool(
      'hubspotBatchUpdateDeals',
      {
        title: 'HubSpot - Batch Update Deals',
        description: 'Batch update deals by record IDs.',
        inputSchema: BatchUpdateDealsInputSchema,
      },
      async (params) => hubspotBatchUpdateDeals(params)
    );
    this.server.registerTool(
      'hubspotBatchUpdateTickets',
      {
        title: 'HubSpot - Batch Update Tickets',
        description: 'Batch update tickets by record IDs.',
        inputSchema: BatchUpdateTicketsInputSchema,
      },
      async (params) => hubspotBatchUpdateTickets(params)
    );

    this.server.registerTool(
      'hubspotGetPipelineSummary',
      {
        title: 'HubSpot - Get Pipeline Summary',
        description: 'Aggregate deal count and amount by stage.',
        inputSchema: GetPipelineSummaryInputSchema,
      },
      async (params) => hubspotGetPipelineSummary(params)
    );
    this.server.registerTool(
      'hubspotGetOwnerWorkload',
      {
        title: 'HubSpot - Get Owner Workload',
        description: 'Summarize open deal workload and amount by owner.',
        inputSchema: GetOwnerWorkloadInputSchema,
      },
      async (params) => hubspotGetOwnerWorkload(params)
    );
    this.server.registerTool(
      'hubspotValidateRecordRequiredFields',
      {
        title: 'HubSpot - Validate Required Fields',
        description: 'Validate required fields before create/update operations.',
        inputSchema: ValidateRecordRequiredFieldsInputSchema,
      },
      async (params) => hubspotValidateRecordRequiredFields(params)
    );

    this.server.registerTool(
      'hubspotListDealPipelines',
      {
        title: 'HubSpot - List Deal Pipelines',
        description: 'List deal pipelines and stages.',
        inputSchema: ListDealPipelinesInputSchema,
      },
      async (params) => hubspotListDealPipelines(params)
    );
    this.server.registerTool(
      'hubspotListTicketPipelines',
      {
        title: 'HubSpot - List Ticket Pipelines',
        description: 'List ticket pipelines and stages.',
        inputSchema: ListTicketPipelinesInputSchema,
      },
      async (params) => hubspotListTicketPipelines(params)
    );
    this.server.registerTool(
      'hubspotListPipelineStages',
      {
        title: 'HubSpot - List Pipeline Stages',
        description: 'List stages for a specific deal or ticket pipeline.',
        inputSchema: ListPipelineStagesInputSchema,
      },
      async (params) => hubspotListPipelineStages(params)
    );

    logger.info('[Server] Registered 36 HubSpot tools');
  }

  private registerAppResources() {
    registerAppResource(
      this.server,
      'HubSpot CRM Browser View',
      HUBSPOT_BROWSER_VIEW_URI,
      {},
      async () => ({
        contents: [
          {
            uri: HUBSPOT_BROWSER_VIEW_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: await readAppHtml('hubspot-browser-view.html'),
          },
        ],
      })
    );

    registerAppResource(
      this.server,
      'HubSpot Deal Detail View',
      HUBSPOT_DEAL_VIEW_URI,
      {},
      async () => ({
        contents: [
          {
            uri: HUBSPOT_DEAL_VIEW_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: await readAppHtml('hubspot-deal-view.html'),
          },
        ],
      })
    );
  }

  async connect(transport: Transport) {
    await this.server.connect(transport);
  }

  async cleanup() {
    logger.info('[Server] Cleanup completed');
  }
}

export function createServer() {
  return new HubSpotMcpServer();
}
