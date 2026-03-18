import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { validateTokenFormat } from './auth/token.js';
import { logger } from './utils/logger.js';
import {
  AddMultipleChoiceQuestionInputSchema,
  AddTextQuestionInputSchema,
  BatchUpdateFormInputSchema,
  CreateFormInputSchema,
  GetFormInputSchema,
  GetFormSummaryInputSchema,
  ListResponsesSinceInputSchema,
  SetPublishSettingsInputSchema,
  formsAddMultipleChoiceQuestion,
  formsAddTextQuestion,
  formsBatchUpdateForm,
  formsCreateForm,
  formsGetForm,
  formsGetFormSummary,
  formsListResponsesSince,
  formsSetPublishSettings,
} from './tools/forms.js';
import {
  GetResponseInputSchema,
  ListResponsesInputSchema,
  formsGetResponse,
  formsListResponses,
} from './tools/responses.js';
import {
  ExtractFormIdInputSchema,
  ListFormsInputSchema,
  formsExtractFormId,
  formsListForms,
} from './tools/discovery.js';

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

export class GoogleFormsMcpServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'google-forms',
      version: getServerVersion(),
    });
  }

  async initialize() {
    logger.info('[Server] Initializing Google Forms MCP Server');

    const tokenUpdateSchema = z
      .object({
        method: z.literal('notifications/token/update'),
        params: z
          .object({
            accessToken: z.string().optional(),
            token: z.string().optional(),
            timestamp: z.number().optional(),
          })
          .catchall(z.unknown()),
      })
      .catchall(z.unknown());

    type TokenUpdateNotification = z.infer<typeof tokenUpdateSchema>;

    this.server.server.setNotificationHandler(
      tokenUpdateSchema,
      async (notification: TokenUpdateNotification) => {
        const newToken = notification?.params?.accessToken ?? notification?.params?.token;

        if (!newToken || typeof newToken !== 'string' || newToken.trim().length === 0) {
          logger.error('[Token] Invalid token in notifications/token/update');
          return;
        }

        if (!validateTokenFormat(newToken)) {
          logger.error('[Token] Invalid token format in notifications/token/update');
          return;
        }

        process.env.accessToken = newToken.startsWith('Bearer ')
          ? newToken.slice(7).trim()
          : newToken.trim();
        logger.info('[Token] accessToken updated via notification');
      }
    );

    this.registerTools();
    logger.info('[Server] Google Forms MCP Server initialized');
  }

  private registerTools() {
    this.server.registerTool(
      'gformsCreateForm',
      {
        title: 'GForms - Create Form',
        description: 'Create a Google Form and optionally auto-publish it.',
        inputSchema: CreateFormInputSchema,
      },
      async (params) => formsCreateForm(params)
    );

    this.server.registerTool(
      'gformsGetForm',
      {
        title: 'GForms - Get Form',
        description: 'Get a Google Form definition by formId.',
        inputSchema: GetFormInputSchema,
      },
      async (params) => formsGetForm(params)
    );

    this.server.registerTool(
      'gformsBatchUpdateForm',
      {
        title: 'GForms - Batch Update Form',
        description: 'Apply raw batchUpdate requests to a form.',
        inputSchema: BatchUpdateFormInputSchema,
      },
      async (params) => formsBatchUpdateForm(params)
    );

    this.server.registerTool(
      'gformsSetPublishSettings',
      {
        title: 'GForms - Set Publish Settings',
        description: 'Set publish state and accepting responses state for a form.',
        inputSchema: SetPublishSettingsInputSchema,
      },
      async (params) => formsSetPublishSettings(params)
    );

    this.server.registerTool(
      'gformsAddTextQuestion',
      {
        title: 'GForms - Add Text Question',
        description: 'Add a text/paragraph question using a predefined batchUpdate template.',
        inputSchema: AddTextQuestionInputSchema,
      },
      async (params) => formsAddTextQuestion(params)
    );

    this.server.registerTool(
      'gformsAddMultipleChoiceQuestion',
      {
        title: 'GForms - Add Multiple Choice Question',
        description: 'Add a choice question using a predefined batchUpdate template.',
        inputSchema: AddMultipleChoiceQuestionInputSchema,
      },
      async (params) => formsAddMultipleChoiceQuestion(params)
    );

    this.server.registerTool(
      'gformsListResponses',
      {
        title: 'GForms - List Responses',
        description: 'List form responses with pagination and optional filter.',
        inputSchema: ListResponsesInputSchema,
      },
      async (params) => formsListResponses(params)
    );

    this.server.registerTool(
      'gformsGetResponse',
      {
        title: 'GForms - Get Response',
        description: 'Get one form response by responseId.',
        inputSchema: GetResponseInputSchema,
      },
      async (params) => formsGetResponse(params)
    );

    this.server.registerTool(
      'gformsListResponsesSince',
      {
        title: 'GForms - List Responses Since',
        description: 'List responses submitted since a given RFC3339 UTC timestamp.',
        inputSchema: ListResponsesSinceInputSchema,
      },
      async (params) => formsListResponsesSince(params)
    );

    this.server.registerTool(
      'gformsListForms',
      {
        title: 'GForms - List Forms',
        description: 'List accessible Google Forms via Drive metadata.',
        inputSchema: ListFormsInputSchema,
      },
      async (params) => formsListForms(params)
    );

    this.server.registerTool(
      'gformsExtractFormId',
      {
        title: 'GForms - Extract Form ID',
        description: 'Extract formId from a Google Forms URL.',
        inputSchema: ExtractFormIdInputSchema,
      },
      async (params) => formsExtractFormId(params)
    );

    this.server.registerTool(
      'gformsGetFormSummary',
      {
        title: 'GForms - Get Form Summary',
        description: 'Get compact form metadata summary for quick diagnostics.',
        inputSchema: GetFormSummaryInputSchema,
      },
      async (params) => formsGetFormSummary(params)
    );

    logger.info('[Server] Registered 12 Google Forms tools');
  }

  async connect(transport: Transport) {
    await this.server.connect(transport);
  }

  async cleanup() {
    logger.info('[Server] Cleanup completed');
  }
}
