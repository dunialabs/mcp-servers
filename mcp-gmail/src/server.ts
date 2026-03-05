import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import {
  gmailBatchModifyMessages,
  gmailDownloadAttachment,
  gmailGetAttachment,
  gmailGetMessage,
  gmailListMessages,
  gmailModifyMessageLabels,
  gmailSendMessage,
  gmailTrashMessage,
  gmailUntrashMessage,
  BatchModifyMessagesInputSchema,
  DownloadAttachmentInputSchema,
  GetAttachmentInputSchema,
  GetMessageInputSchema,
  ListMessagesInputSchema,
  ModifyLabelsInputSchema,
  SendMessageInputSchema,
  TrashMessageInputSchema,
  UntrashMessageInputSchema,
} from './tools/messages.js';
import {
  CreateDraftInputSchema,
  gmailCreateDraft,
  gmailSendDraft,
  SendDraftInputSchema,
} from './tools/drafts.js';
import { gmailListLabels, ListLabelsInputSchema } from './tools/labels.js';
import { validateTokenFormat } from './auth/token.js';
import { logger } from './utils/logger.js';

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

export class GmailMcpServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'gmail',
      version: getServerVersion(),
    });
  }

  async initialize() {
    logger.info('[Server] Initializing Gmail MCP Server');

    const tokenUpdateSchema = z
      .object({
        method: z.literal('notifications/token/update'),
        params: z
          .object({
            token: z.string(),
            timestamp: z.number().optional(),
          })
          .catchall(z.unknown()),
      })
      .catchall(z.unknown());

    type TokenUpdateNotification = z.infer<typeof tokenUpdateSchema>;

    this.server.server.setNotificationHandler(tokenUpdateSchema, async (notification: TokenUpdateNotification) => {
      const newToken = notification?.params?.token;

      if (!newToken || typeof newToken !== 'string' || newToken.trim().length === 0) {
        logger.error('[Token] Invalid token in notifications/token/update');
        return;
      }

      if (!validateTokenFormat(newToken)) {
        logger.error('[Token] Invalid token format in notifications/token/update');
        return;
      }

      process.env.accessToken = newToken;
      logger.info('[Token] accessToken updated via notification');
    });

    this.registerTools();

    logger.info('[Server] Gmail MCP Server initialized');
  }

  private registerTools() {
    this.server.registerTool(
      'gmailListMessages',
      {
        title: 'Gmail - List Messages',
        description: 'List Gmail messages using query and label filters.',
        inputSchema: ListMessagesInputSchema,
      },
      async (params) => gmailListMessages(params)
    );

    this.server.registerTool(
      'gmailGetMessage',
      {
        title: 'Gmail - Get Message',
        description: 'Get one Gmail message in metadata or full format.',
        inputSchema: GetMessageInputSchema,
      },
      async (params) => gmailGetMessage(params)
    );

    this.server.registerTool(
      'gmailSendMessage',
      {
        title: 'Gmail - Send Message',
        description: 'Send an email message from the authenticated mailbox.',
        inputSchema: SendMessageInputSchema,
      },
      async (params) => gmailSendMessage(params)
    );

    this.server.registerTool(
      'gmailModifyMessageLabels',
      {
        title: 'Gmail - Modify Message Labels',
        description: 'Add or remove labels on an existing Gmail message.',
        inputSchema: ModifyLabelsInputSchema,
      },
      async (params) => gmailModifyMessageLabels(params)
    );

    this.server.registerTool(
      'gmailCreateDraft',
      {
        title: 'Gmail - Create Draft',
        description: 'Create a Gmail draft message.',
        inputSchema: CreateDraftInputSchema,
      },
      async (params) => gmailCreateDraft(params)
    );

    this.server.registerTool(
      'gmailSendDraft',
      {
        title: 'Gmail - Send Draft',
        description: 'Send an existing Gmail draft.',
        inputSchema: SendDraftInputSchema,
      },
      async (params) => gmailSendDraft(params)
    );

    this.server.registerTool(
      'gmailListLabels',
      {
        title: 'Gmail - List Labels',
        description: 'List Gmail labels available for the mailbox.',
        inputSchema: ListLabelsInputSchema,
      },
      async (params) => gmailListLabels(params)
    );

    this.server.registerTool(
      'gmailTrashMessage',
      {
        title: 'Gmail - Trash Message',
        description: 'Move a message to trash.',
        inputSchema: TrashMessageInputSchema,
      },
      async (params) => gmailTrashMessage(params)
    );

    this.server.registerTool(
      'gmailUntrashMessage',
      {
        title: 'Gmail - Untrash Message',
        description: 'Restore a message from trash.',
        inputSchema: UntrashMessageInputSchema,
      },
      async (params) => gmailUntrashMessage(params)
    );

    this.server.registerTool(
      'gmailBatchModifyMessages',
      {
        title: 'Gmail - Batch Modify Messages',
        description: 'Batch add/remove labels across multiple messages.',
        inputSchema: BatchModifyMessagesInputSchema,
      },
      async (params) => gmailBatchModifyMessages(params)
    );

    this.server.registerTool(
      'gmailGetAttachment',
      {
        title: 'Gmail - Get Attachment',
        description: 'Fetch attachment content and return base64 payload.',
        inputSchema: GetAttachmentInputSchema,
      },
      async (params) => gmailGetAttachment(params)
    );

    this.server.registerTool(
      'gmailDownloadAttachment',
      {
        title: 'Gmail - Download Attachment',
        description: 'Download attachment bytes to a local file path.',
        inputSchema: DownloadAttachmentInputSchema,
      },
      async (params) => gmailDownloadAttachment(params)
    );

    logger.info('[Server] Registered 12 Gmail tools');
  }

  async connect(transport: Transport) {
    await this.server.connect(transport);
  }

  async cleanup() {
    logger.info('[Server] Cleanup completed');
  }
}
