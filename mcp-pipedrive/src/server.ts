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
import { validateTokenFormat, normalizeApiDomain, normalizeAccessToken } from './auth/token.js';
import { logger } from './utils/logger.js';
import { readAppHtml } from './utils/app-resource.js';
import {
  AddDealProductInputSchema,
  CreateDealInputSchema,
  DeleteDealInputSchema,
  GetDealInputSchema,
  ListDealActivitiesInputSchema,
  ListDealProductsInputSchema,
  ListDealsInputSchema,
  RemoveDealProductInputSchema,
  SearchDealsInputSchema,
  UpdateDealInputSchema,
  pipedriveAddDealProduct,
  pipedriveCreateDeal,
  pipedriveDeleteDeal,
  pipedriveGetDeal,
  pipedriveListDealActivities,
  pipedriveListDealProducts,
  pipedriveListDeals,
  pipedriveRemoveDealProduct,
  pipedriveSearchDeals,
  pipedriveUpdateDeal,
} from './tools/deals.js';
import {
  CreatePersonInputSchema,
  DeletePersonInputSchema,
  GetPersonInputSchema,
  ListPersonDealsInputSchema,
  ListPersonsInputSchema,
  MergePersonsInputSchema,
  SearchPersonsInputSchema,
  UpdatePersonInputSchema,
  pipedriveCreatePerson,
  pipedriveDeletePerson,
  pipedriveGetPerson,
  pipedriveListPersonDeals,
  pipedriveListPersons,
  pipedriveMergePersons,
  pipedriveSearchPersons,
  pipedriveUpdatePerson,
} from './tools/persons.js';
import {
  CreateOrganizationInputSchema,
  DeleteOrganizationInputSchema,
  GetOrganizationInputSchema,
  ListOrganizationDealsInputSchema,
  ListOrganizationsInputSchema,
  MergeOrganizationsInputSchema,
  SearchOrganizationsInputSchema,
  UpdateOrganizationInputSchema,
  pipedriveCreateOrganization,
  pipedriveDeleteOrganization,
  pipedriveGetOrganization,
  pipedriveListOrganizationDeals,
  pipedriveListOrganizations,
  pipedriveMergeOrganizations,
  pipedriveSearchOrganizations,
  pipedriveUpdateOrganization,
} from './tools/organizations.js';
import {
  CreateActivityInputSchema,
  DeleteActivityInputSchema,
  GetActivityInputSchema,
  ListActivitiesInputSchema,
  ListActivityTypesInputSchema,
  UpdateActivityInputSchema,
  pipedriveCreateActivity,
  pipedriveDeleteActivity,
  pipedriveGetActivity,
  pipedriveListActivities,
  pipedriveListActivityTypes,
  pipedriveUpdateActivity,
} from './tools/activities.js';
import {
  CreateLeadInputSchema,
  DeleteLeadInputSchema,
  GetLeadInputSchema,
  ListLeadsInputSchema,
  SearchLeadsInputSchema,
  UpdateLeadInputSchema,
  pipedriveCreateLead,
  pipedriveDeleteLead,
  pipedriveGetLead,
  pipedriveListLeads,
  pipedriveSearchLeads,
  pipedriveUpdateLead,
} from './tools/leads.js';
import {
  CreateNoteInputSchema,
  DeleteNoteInputSchema,
  GetNoteInputSchema,
  ListNotesInputSchema,
  UpdateNoteInputSchema,
  pipedriveCreateNote,
  pipedriveDeleteNote,
  pipedriveGetNote,
  pipedriveListNotes,
  pipedriveUpdateNote,
} from './tools/notes.js';
import {
  CreateProductInputSchema,
  DeleteProductInputSchema,
  GetProductInputSchema,
  ListProductsInputSchema,
  SearchProductsInputSchema,
  UpdateProductInputSchema,
  pipedriveCreateProduct,
  pipedriveDeleteProduct,
  pipedriveGetProduct,
  pipedriveListProducts,
  pipedriveSearchProducts,
  pipedriveUpdateProduct,
} from './tools/products.js';
import {
  GetPipelineInputSchema,
  GetStageInputSchema,
  ListPipelinesInputSchema,
  ListStagesInputSchema,
  pipedriveGetPipeline,
  pipedriveGetStage,
  pipedriveListPipelines,
  pipedriveListStages,
} from './tools/pipelines.js';
import {
  GetUserInputSchema,
  ListRecentsInputSchema,
  ListUsersInputSchema,
  SearchAllItemsInputSchema,
  pipedriveGetUser,
  pipedriveListRecents,
  pipedriveListUsers,
  pipedriveSearchAllItems,
} from './tools/users.js';

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

const PIPEDRIVE_BROWSER_VIEW_URI = 'ui://pipedrive/browser-view.html';
const PIPEDRIVE_PIPELINE_VIEW_URI = 'ui://pipedrive/pipeline-view.html';

export class PipedriveMcpServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'pipedrive',
      version: getServerVersion(),
    });
  }

  async initialize() {
    logger.info('[Server] Initializing Pipedrive MCP Server');

    const tokenUpdateSchema = z
      .object({
        method: z.literal('notifications/token/update'),
        params: z
          .object({
            token: z.string().optional(),
            accessToken: z.string().optional(),
            apiDomain: z.string().optional(),
            timestamp: z.number().optional(),
          })
          .catchall(z.unknown()),
      })
      .catchall(z.unknown());

    type TokenUpdateNotification = z.infer<typeof tokenUpdateSchema>;

    this.server.server.setNotificationHandler(
      tokenUpdateSchema,
      async (notification: TokenUpdateNotification) => {
        const tokenCandidate =
          typeof notification?.params?.accessToken === 'string'
            ? notification.params.accessToken
            : notification?.params?.token;

        if (typeof tokenCandidate === 'string' && tokenCandidate.trim().length > 0) {
          const normalizedToken = normalizeAccessToken(tokenCandidate);
          if (!validateTokenFormat(normalizedToken)) {
            logger.error('[Token] Invalid token format in notifications/token/update');
            return;
          }
          process.env.accessToken = normalizedToken;
          logger.info('[Token] accessToken updated via notification');
        }

        if (
          typeof notification?.params?.apiDomain === 'string' &&
          notification.params.apiDomain.trim().length > 0
        ) {
          try {
            process.env.apiDomain = normalizeApiDomain(notification.params.apiDomain);
            logger.info('[Token] apiDomain updated via notification');
          } catch (error) {
            logger.error('[Token] Invalid apiDomain in notifications/token/update', error);
          }
        }
      }
    );

    this.registerTools();
    this.registerAppResources();
    logger.info('[Server] Pipedrive MCP Server initialized');
  }

  private registerTools() {
    registerAppTool(
      this.server,
      'pipedriveListDeals',
      {
        title: 'Pipedrive - List Deals',
        description: 'List deals.',
        inputSchema: ListDealsInputSchema,
        _meta: {
          ui: {
            resourceUri: PIPEDRIVE_BROWSER_VIEW_URI,
          },
        },
      },
      async (params) => pipedriveListDeals(params)
    );
    registerAppTool(
      this.server,
      'pipedriveSearchDeals',
      {
        title: 'Pipedrive - Search Deals',
        description: 'Search deals by term.',
        inputSchema: SearchDealsInputSchema,
        _meta: {
          ui: {
            resourceUri: PIPEDRIVE_BROWSER_VIEW_URI,
          },
        },
      },
      async (params) => pipedriveSearchDeals(params)
    );
    this.server.registerTool(
      'pipedriveGetDeal',
      { title: 'Pipedrive - Get Deal', description: 'Get deal by ID.', inputSchema: GetDealInputSchema },
      async (params) => pipedriveGetDeal(params)
    );
    this.server.registerTool(
      'pipedriveCreateDeal',
      { title: 'Pipedrive - Create Deal', description: 'Create deal.', inputSchema: CreateDealInputSchema },
      async (params) => pipedriveCreateDeal(params)
    );
    this.server.registerTool(
      'pipedriveUpdateDeal',
      { title: 'Pipedrive - Update Deal', description: 'Update deal.', inputSchema: UpdateDealInputSchema },
      async (params) => pipedriveUpdateDeal(params)
    );
    this.server.registerTool(
      'pipedriveDeleteDeal',
      { title: 'Pipedrive - Delete Deal', description: 'Delete deal.', inputSchema: DeleteDealInputSchema },
      async (params) => pipedriveDeleteDeal(params)
    );
    this.server.registerTool(
      'pipedriveListDealActivities',
      {
        title: 'Pipedrive - List Deal Activities',
        description: 'List activities in a deal.',
        inputSchema: ListDealActivitiesInputSchema,
      },
      async (params) => pipedriveListDealActivities(params)
    );
    this.server.registerTool(
      'pipedriveListDealProducts',
      {
        title: 'Pipedrive - List Deal Products',
        description: 'List products attached to deal.',
        inputSchema: ListDealProductsInputSchema,
      },
      async (params) => pipedriveListDealProducts(params)
    );
    this.server.registerTool(
      'pipedriveAddDealProduct',
      {
        title: 'Pipedrive - Add Deal Product',
        description: 'Attach product to deal.',
        inputSchema: AddDealProductInputSchema,
      },
      async (params) => pipedriveAddDealProduct(params)
    );
    this.server.registerTool(
      'pipedriveRemoveDealProduct',
      {
        title: 'Pipedrive - Remove Deal Product',
        description: 'Remove product attachment from deal.',
        inputSchema: RemoveDealProductInputSchema,
      },
      async (params) => pipedriveRemoveDealProduct(params)
    );

    registerAppTool(
      this.server,
      'pipedriveListPersons',
      {
        title: 'Pipedrive - List Persons',
        description: 'List persons.',
        inputSchema: ListPersonsInputSchema,
        _meta: {
          ui: {
            resourceUri: PIPEDRIVE_BROWSER_VIEW_URI,
          },
        },
      },
      async (params) => pipedriveListPersons(params)
    );
    registerAppTool(
      this.server,
      'pipedriveSearchPersons',
      {
        title: 'Pipedrive - Search Persons',
        description: 'Search persons.',
        inputSchema: SearchPersonsInputSchema,
        _meta: {
          ui: {
            resourceUri: PIPEDRIVE_BROWSER_VIEW_URI,
          },
        },
      },
      async (params) => pipedriveSearchPersons(params)
    );
    this.server.registerTool(
      'pipedriveGetPerson',
      { title: 'Pipedrive - Get Person', description: 'Get person by ID.', inputSchema: GetPersonInputSchema },
      async (params) => pipedriveGetPerson(params)
    );
    this.server.registerTool(
      'pipedriveCreatePerson',
      { title: 'Pipedrive - Create Person', description: 'Create person.', inputSchema: CreatePersonInputSchema },
      async (params) => pipedriveCreatePerson(params)
    );
    this.server.registerTool(
      'pipedriveUpdatePerson',
      { title: 'Pipedrive - Update Person', description: 'Update person.', inputSchema: UpdatePersonInputSchema },
      async (params) => pipedriveUpdatePerson(params)
    );
    this.server.registerTool(
      'pipedriveDeletePerson',
      { title: 'Pipedrive - Delete Person', description: 'Delete person.', inputSchema: DeletePersonInputSchema },
      async (params) => pipedriveDeletePerson(params)
    );
    this.server.registerTool(
      'pipedriveMergePersons',
      { title: 'Pipedrive - Merge Persons', description: 'Merge persons.', inputSchema: MergePersonsInputSchema },
      async (params) => pipedriveMergePersons(params)
    );
    this.server.registerTool(
      'pipedriveListPersonDeals',
      {
        title: 'Pipedrive - List Person Deals',
        description: 'List deals of a person.',
        inputSchema: ListPersonDealsInputSchema,
      },
      async (params) => pipedriveListPersonDeals(params)
    );

    registerAppTool(
      this.server,
      'pipedriveListOrganizations',
      {
        title: 'Pipedrive - List Organizations',
        description: 'List organizations.',
        inputSchema: ListOrganizationsInputSchema,
        _meta: {
          ui: {
            resourceUri: PIPEDRIVE_BROWSER_VIEW_URI,
          },
        },
      },
      async (params) => pipedriveListOrganizations(params)
    );
    registerAppTool(
      this.server,
      'pipedriveSearchOrganizations',
      {
        title: 'Pipedrive - Search Organizations',
        description: 'Search organizations.',
        inputSchema: SearchOrganizationsInputSchema,
        _meta: {
          ui: {
            resourceUri: PIPEDRIVE_BROWSER_VIEW_URI,
          },
        },
      },
      async (params) => pipedriveSearchOrganizations(params)
    );
    this.server.registerTool(
      'pipedriveGetOrganization',
      {
        title: 'Pipedrive - Get Organization',
        description: 'Get organization by ID.',
        inputSchema: GetOrganizationInputSchema,
      },
      async (params) => pipedriveGetOrganization(params)
    );
    this.server.registerTool(
      'pipedriveCreateOrganization',
      {
        title: 'Pipedrive - Create Organization',
        description: 'Create organization.',
        inputSchema: CreateOrganizationInputSchema,
      },
      async (params) => pipedriveCreateOrganization(params)
    );
    this.server.registerTool(
      'pipedriveUpdateOrganization',
      {
        title: 'Pipedrive - Update Organization',
        description: 'Update organization.',
        inputSchema: UpdateOrganizationInputSchema,
      },
      async (params) => pipedriveUpdateOrganization(params)
    );
    this.server.registerTool(
      'pipedriveDeleteOrganization',
      {
        title: 'Pipedrive - Delete Organization',
        description: 'Delete organization.',
        inputSchema: DeleteOrganizationInputSchema,
      },
      async (params) => pipedriveDeleteOrganization(params)
    );
    this.server.registerTool(
      'pipedriveMergeOrganizations',
      {
        title: 'Pipedrive - Merge Organizations',
        description: 'Merge organizations.',
        inputSchema: MergeOrganizationsInputSchema,
      },
      async (params) => pipedriveMergeOrganizations(params)
    );
    this.server.registerTool(
      'pipedriveListOrganizationDeals',
      {
        title: 'Pipedrive - List Organization Deals',
        description: 'List deals of an organization.',
        inputSchema: ListOrganizationDealsInputSchema,
      },
      async (params) => pipedriveListOrganizationDeals(params)
    );

    this.server.registerTool(
      'pipedriveListActivities',
      {
        title: 'Pipedrive - List Activities',
        description: 'List activities.',
        inputSchema: ListActivitiesInputSchema,
      },
      async (params) => pipedriveListActivities(params)
    );
    this.server.registerTool(
      'pipedriveGetActivity',
      {
        title: 'Pipedrive - Get Activity',
        description: 'Get activity by ID.',
        inputSchema: GetActivityInputSchema,
      },
      async (params) => pipedriveGetActivity(params)
    );
    this.server.registerTool(
      'pipedriveCreateActivity',
      {
        title: 'Pipedrive - Create Activity',
        description: 'Create activity.',
        inputSchema: CreateActivityInputSchema,
      },
      async (params) => pipedriveCreateActivity(params)
    );
    this.server.registerTool(
      'pipedriveUpdateActivity',
      {
        title: 'Pipedrive - Update Activity',
        description: 'Update activity.',
        inputSchema: UpdateActivityInputSchema,
      },
      async (params) => pipedriveUpdateActivity(params)
    );
    this.server.registerTool(
      'pipedriveDeleteActivity',
      {
        title: 'Pipedrive - Delete Activity',
        description: 'Delete activity.',
        inputSchema: DeleteActivityInputSchema,
      },
      async (params) => pipedriveDeleteActivity(params)
    );
    this.server.registerTool(
      'pipedriveListActivityTypes',
      {
        title: 'Pipedrive - List Activity Types',
        description: 'List activity types.',
        inputSchema: ListActivityTypesInputSchema,
      },
      async (params) => pipedriveListActivityTypes(params)
    );

    this.server.registerTool(
      'pipedriveListLeads',
      { title: 'Pipedrive - List Leads', description: 'List leads.', inputSchema: ListLeadsInputSchema },
      async (params) => pipedriveListLeads(params)
    );
    this.server.registerTool(
      'pipedriveSearchLeads',
      { title: 'Pipedrive - Search Leads', description: 'Search leads.', inputSchema: SearchLeadsInputSchema },
      async (params) => pipedriveSearchLeads(params)
    );
    this.server.registerTool(
      'pipedriveGetLead',
      { title: 'Pipedrive - Get Lead', description: 'Get lead by ID.', inputSchema: GetLeadInputSchema },
      async (params) => pipedriveGetLead(params)
    );
    this.server.registerTool(
      'pipedriveCreateLead',
      { title: 'Pipedrive - Create Lead', description: 'Create lead.', inputSchema: CreateLeadInputSchema },
      async (params) => pipedriveCreateLead(params)
    );
    this.server.registerTool(
      'pipedriveUpdateLead',
      { title: 'Pipedrive - Update Lead', description: 'Update lead.', inputSchema: UpdateLeadInputSchema },
      async (params) => pipedriveUpdateLead(params)
    );
    this.server.registerTool(
      'pipedriveDeleteLead',
      { title: 'Pipedrive - Delete Lead', description: 'Delete lead.', inputSchema: DeleteLeadInputSchema },
      async (params) => pipedriveDeleteLead(params)
    );

    this.server.registerTool(
      'pipedriveListNotes',
      { title: 'Pipedrive - List Notes', description: 'List notes.', inputSchema: ListNotesInputSchema },
      async (params) => pipedriveListNotes(params)
    );
    this.server.registerTool(
      'pipedriveGetNote',
      { title: 'Pipedrive - Get Note', description: 'Get note by ID.', inputSchema: GetNoteInputSchema },
      async (params) => pipedriveGetNote(params)
    );
    this.server.registerTool(
      'pipedriveCreateNote',
      { title: 'Pipedrive - Create Note', description: 'Create note.', inputSchema: CreateNoteInputSchema },
      async (params) => pipedriveCreateNote(params)
    );
    this.server.registerTool(
      'pipedriveUpdateNote',
      { title: 'Pipedrive - Update Note', description: 'Update note.', inputSchema: UpdateNoteInputSchema },
      async (params) => pipedriveUpdateNote(params)
    );
    this.server.registerTool(
      'pipedriveDeleteNote',
      { title: 'Pipedrive - Delete Note', description: 'Delete note.', inputSchema: DeleteNoteInputSchema },
      async (params) => pipedriveDeleteNote(params)
    );

    this.server.registerTool(
      'pipedriveListProducts',
      { title: 'Pipedrive - List Products', description: 'List products.', inputSchema: ListProductsInputSchema },
      async (params) => pipedriveListProducts(params)
    );
    this.server.registerTool(
      'pipedriveSearchProducts',
      { title: 'Pipedrive - Search Products', description: 'Search products.', inputSchema: SearchProductsInputSchema },
      async (params) => pipedriveSearchProducts(params)
    );
    this.server.registerTool(
      'pipedriveGetProduct',
      { title: 'Pipedrive - Get Product', description: 'Get product by ID.', inputSchema: GetProductInputSchema },
      async (params) => pipedriveGetProduct(params)
    );
    this.server.registerTool(
      'pipedriveCreateProduct',
      { title: 'Pipedrive - Create Product', description: 'Create product.', inputSchema: CreateProductInputSchema },
      async (params) => pipedriveCreateProduct(params)
    );
    this.server.registerTool(
      'pipedriveUpdateProduct',
      { title: 'Pipedrive - Update Product', description: 'Update product.', inputSchema: UpdateProductInputSchema },
      async (params) => pipedriveUpdateProduct(params)
    );
    this.server.registerTool(
      'pipedriveDeleteProduct',
      { title: 'Pipedrive - Delete Product', description: 'Delete product.', inputSchema: DeleteProductInputSchema },
      async (params) => pipedriveDeleteProduct(params)
    );

    registerAppTool(
      this.server,
      'pipedriveListPipelines',
      {
        title: 'Pipedrive - List Pipelines',
        description: 'List pipelines.',
        inputSchema: ListPipelinesInputSchema,
        _meta: {
          ui: {
            resourceUri: PIPEDRIVE_PIPELINE_VIEW_URI,
          },
        },
      },
      async (params) => pipedriveListPipelines(params)
    );
    this.server.registerTool(
      'pipedriveGetPipeline',
      {
        title: 'Pipedrive - Get Pipeline',
        description: 'Get pipeline by ID.',
        inputSchema: GetPipelineInputSchema,
      },
      async (params) => pipedriveGetPipeline(params)
    );
    registerAppTool(
      this.server,
      'pipedriveListStages',
      {
        title: 'Pipedrive - List Stages',
        description: 'List stages.',
        inputSchema: ListStagesInputSchema,
        _meta: {
          ui: {
            resourceUri: PIPEDRIVE_PIPELINE_VIEW_URI,
          },
        },
      },
      async (params) => pipedriveListStages(params)
    );
    this.server.registerTool(
      'pipedriveGetStage',
      { title: 'Pipedrive - Get Stage', description: 'Get stage by ID.', inputSchema: GetStageInputSchema },
      async (params) => pipedriveGetStage(params)
    );

    this.server.registerTool(
      'pipedriveListUsers',
      { title: 'Pipedrive - List Users', description: 'List users.', inputSchema: ListUsersInputSchema },
      async (params) => pipedriveListUsers(params)
    );
    this.server.registerTool(
      'pipedriveGetUser',
      { title: 'Pipedrive - Get User', description: 'Get user by ID.', inputSchema: GetUserInputSchema },
      async (params) => pipedriveGetUser(params)
    );
    this.server.registerTool(
      'pipedriveSearchAllItems',
      {
        title: 'Pipedrive - Search All Items',
        description: 'Cross-object search over deals/persons/organizations/products/leads.',
        inputSchema: SearchAllItemsInputSchema,
      },
      async (params) => pipedriveSearchAllItems(params)
    );
    this.server.registerTool(
      'pipedriveListRecents',
      {
        title: 'Pipedrive - List Recents',
        description: 'List recent updates across selected item types.',
        inputSchema: ListRecentsInputSchema,
      },
      async (params) => pipedriveListRecents(params)
    );
  }

  private registerAppResources() {
    registerAppResource(
      this.server,
      'Pipedrive Browser View',
      PIPEDRIVE_BROWSER_VIEW_URI,
      {},
      async () => ({
        contents: [
          {
            uri: PIPEDRIVE_BROWSER_VIEW_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: await readAppHtml('pipedrive-browser-view.html'),
          },
        ],
      })
    );

    registerAppResource(
      this.server,
      'Pipedrive Pipeline View',
      PIPEDRIVE_PIPELINE_VIEW_URI,
      {},
      async () => ({
        contents: [
          {
            uri: PIPEDRIVE_PIPELINE_VIEW_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: await readAppHtml('pipedrive-pipeline-view.html'),
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
