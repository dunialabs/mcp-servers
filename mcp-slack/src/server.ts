import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import {
  slackGetChannelInfo,
  slackListChannels,
  GetChannelInfoInputSchema,
  ListChannelsInputSchema,
} from './tools/channels.js';
import {
  slackArchiveChannel,
  slackCreateChannel,
  slackInviteUserToChannel,
  slackKickUserFromChannel,
  slackSetChannelTopic,
  ArchiveChannelInputSchema,
  CreateChannelInputSchema,
  InviteUserToChannelInputSchema,
  KickUserFromChannelInputSchema,
  SetChannelTopicInputSchema,
} from './tools/admin.js';
import {
  slackAddReaction,
  slackDeleteMessage,
  slackGetMessage,
  slackGetThreadReplies,
  slackListMessages,
  slackRemoveReaction,
  slackSendMessage,
  slackUpdateMessage,
  AddReactionInputSchema,
  DeleteMessageInputSchema,
  GetMessageInputSchema,
  GetThreadRepliesInputSchema,
  ListMessagesInputSchema,
  RemoveReactionInputSchema,
  SendMessageInputSchema,
  UpdateMessageInputSchema,
} from './tools/messages.js';
import {
  slackGetUserInfo,
  slackListUsers,
  GetUserInfoInputSchema,
  ListUsersInputSchema,
} from './tools/users.js';
import { normalizeAccessToken, validateTokenFormat } from './auth/token.js';
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

export class SlackMcpServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'slack',
      version: getServerVersion(),
    });
  }

  async initialize() {
    logger.info('[Server] Initializing Slack MCP Server');

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
          logger.error(
            '[Token] Invalid token format in notifications/token/update: expected xoxp-'
          );
          return;
        }

        process.env.accessToken = normalizedToken;
        logger.info('[Token] accessToken updated via notification');
      }
    );

    this.registerTools();
    logger.info('[Server] Slack MCP Server initialized');
  }

  private registerTools() {
    this.server.registerTool(
      'slackSendMessage',
      {
        title: 'Slack - Send Message',
        description: 'Send a Slack message to a channel or thread.',
        inputSchema: SendMessageInputSchema,
      },
      async (params) => slackSendMessage(params)
    );

    this.server.registerTool(
      'slackListChannels',
      {
        title: 'Slack - List Channels',
        description: 'List accessible Slack channels.',
        inputSchema: ListChannelsInputSchema,
      },
      async (params) => slackListChannels(params)
    );

    this.server.registerTool(
      'slackGetChannelInfo',
      {
        title: 'Slack - Get Channel Info',
        description: 'Get details for a Slack channel by ID.',
        inputSchema: GetChannelInfoInputSchema,
      },
      async (params) => slackGetChannelInfo(params)
    );

    this.server.registerTool(
      'slackListMessages',
      {
        title: 'Slack - List Messages',
        description: 'List messages from a Slack channel.',
        inputSchema: ListMessagesInputSchema,
      },
      async (params) => slackListMessages(params)
    );

    this.server.registerTool(
      'slackGetMessage',
      {
        title: 'Slack - Get Message',
        description: 'Get one message by timestamp in a channel.',
        inputSchema: GetMessageInputSchema,
      },
      async (params) => slackGetMessage(params)
    );

    this.server.registerTool(
      'slackGetThreadReplies',
      {
        title: 'Slack - Get Thread Replies',
        description: 'Get replies for one thread.',
        inputSchema: GetThreadRepliesInputSchema,
      },
      async (params) => slackGetThreadReplies(params)
    );

    this.server.registerTool(
      'slackUpdateMessage',
      {
        title: 'Slack - Update Message',
        description: 'Update an existing Slack message.',
        inputSchema: UpdateMessageInputSchema,
      },
      async (params) => slackUpdateMessage(params)
    );

    this.server.registerTool(
      'slackDeleteMessage',
      {
        title: 'Slack - Delete Message',
        description: 'Delete a Slack message.',
        inputSchema: DeleteMessageInputSchema,
      },
      async (params) => slackDeleteMessage(params)
    );

    this.server.registerTool(
      'slackAddReaction',
      {
        title: 'Slack - Add Reaction',
        description: 'Add an emoji reaction to a message.',
        inputSchema: AddReactionInputSchema,
      },
      async (params) => slackAddReaction(params)
    );

    this.server.registerTool(
      'slackRemoveReaction',
      {
        title: 'Slack - Remove Reaction',
        description: 'Remove an emoji reaction from a message.',
        inputSchema: RemoveReactionInputSchema,
      },
      async (params) => slackRemoveReaction(params)
    );

    this.server.registerTool(
      'slackListUsers',
      {
        title: 'Slack - List Users',
        description: 'List users in workspace.',
        inputSchema: ListUsersInputSchema,
      },
      async (params) => slackListUsers(params)
    );

    this.server.registerTool(
      'slackGetUserInfo',
      {
        title: 'Slack - Get User Info',
        description: 'Get user profile details by user ID.',
        inputSchema: GetUserInfoInputSchema,
      },
      async (params) => slackGetUserInfo(params)
    );

    this.server.registerTool(
      'slackSetChannelTopic',
      {
        title: 'Slack - Set Channel Topic',
        description: 'Set topic for a Slack channel.',
        inputSchema: SetChannelTopicInputSchema,
      },
      async (params) => slackSetChannelTopic(params)
    );

    this.server.registerTool(
      'slackInviteUserToChannel',
      {
        title: 'Slack - Invite User To Channel',
        description: 'Invite users to a Slack channel.',
        inputSchema: InviteUserToChannelInputSchema,
      },
      async (params) => slackInviteUserToChannel(params)
    );

    this.server.registerTool(
      'slackKickUserFromChannel',
      {
        title: 'Slack - Kick User From Channel',
        description: 'Remove a user from a Slack channel.',
        inputSchema: KickUserFromChannelInputSchema,
      },
      async (params) => slackKickUserFromChannel(params)
    );

    this.server.registerTool(
      'slackCreateChannel',
      {
        title: 'Slack - Create Channel',
        description: 'Create a new Slack channel.',
        inputSchema: CreateChannelInputSchema,
      },
      async (params) => slackCreateChannel(params)
    );

    this.server.registerTool(
      'slackArchiveChannel',
      {
        title: 'Slack - Archive Channel',
        description: 'Archive a Slack channel.',
        inputSchema: ArchiveChannelInputSchema,
      },
      async (params) => slackArchiveChannel(params)
    );

    logger.info('[Server] Registered 17 Slack tools');
  }

  async connect(transport: Transport) {
    await this.server.connect(transport);
  }

  async cleanup() {
    logger.info('[Server] Cleanup completed');
  }
}
