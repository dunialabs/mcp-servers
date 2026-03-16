import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { validateTokenFormat } from './auth/token.js';
import { logger } from './utils/logger.js';
import {
  GetTeamInputSchema,
  ListJoinedTeamsInputSchema,
  ListTeamChannelsInputSchema,
  ListTeamMembersInputSchema,
  teamsGetTeam,
  teamsListJoinedTeams,
  teamsListTeamChannels,
  teamsListTeamMembers,
} from './tools/teams.js';
import {
  GetChannelInputSchema,
  ListChannelMessageRepliesInputSchema,
  ListChannelMessagesInputSchema,
  ReplyToChannelMessageInputSchema,
  teamsGetChannel,
  teamsListChannelMessageReplies,
  teamsListChannelMessages,
  teamsReplyToChannelMessage,
} from './tools/channels.js';
import {
  CreateChatInputSchema,
  DeleteChatMessageInputSchema,
  GetChatInputSchema,
  ListChatMessagesInputSchema,
  ListChatsInputSchema,
  SendChatMessageInputSchema,
  UpdateChatMessageInputSchema,
  teamsCreateChat,
  teamsDeleteChatMessage,
  teamsGetChat,
  teamsListChatMessages,
  teamsListChats,
  teamsSendChatMessage,
  teamsUpdateChatMessage,
} from './tools/chats.js';
import {
  DeleteChannelMessageInputSchema,
  GetMessageInputSchema,
  GetMessageThreadInputSchema,
  SendChannelMessageInputSchema,
  SetMessageReactionInputSchema,
  UnsetMessageReactionInputSchema,
  UpdateChannelMessageInputSchema,
  teamsDeleteChannelMessage,
  teamsGetMessage,
  teamsGetMessageThread,
  teamsSendChannelMessage,
  teamsSetMessageReaction,
  teamsUnsetMessageReaction,
  teamsUpdateChannelMessage,
} from './tools/messages.js';
import {
  ListUsersInputSchema,
  SearchUsersInputSchema,
  teamsListUsers,
  teamsSearchUsers,
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

export class TeamsMcpServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'teams',
      version: getServerVersion(),
    });
  }

  async initialize() {
    logger.info('[Server] Initializing Teams MCP Server');

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
    logger.info('[Server] Teams MCP Server initialized');
  }

  private registerTools() {
    this.server.registerTool(
      'teamsListJoinedTeams',
      {
        title: 'Teams - List Joined Teams',
        description: 'List teams joined by current user.',
        inputSchema: ListJoinedTeamsInputSchema,
      },
      async (params) => teamsListJoinedTeams(params)
    );

    this.server.registerTool(
      'teamsGetTeam',
      {
        title: 'Teams - Get Team',
        description: 'Get team details by team ID.',
        inputSchema: GetTeamInputSchema,
      },
      async (params) => teamsGetTeam(params)
    );

    this.server.registerTool(
      'teamsListTeamMembers',
      {
        title: 'Teams - List Team Members',
        description: 'List members of a team.',
        inputSchema: ListTeamMembersInputSchema,
      },
      async (params) => teamsListTeamMembers(params)
    );

    this.server.registerTool(
      'teamsListTeamChannels',
      {
        title: 'Teams - List Team Channels',
        description: 'List channels in a team.',
        inputSchema: ListTeamChannelsInputSchema,
      },
      async (params) => teamsListTeamChannels(params)
    );

    this.server.registerTool(
      'teamsGetChannel',
      {
        title: 'Teams - Get Channel',
        description: 'Get channel details by team and channel ID.',
        inputSchema: GetChannelInputSchema,
      },
      async (params) => teamsGetChannel(params)
    );

    this.server.registerTool(
      'teamsListChannelMessages',
      {
        title: 'Teams - List Channel Messages',
        description: 'List messages in a channel.',
        inputSchema: ListChannelMessagesInputSchema,
      },
      async (params) => teamsListChannelMessages(params)
    );

    this.server.registerTool(
      'teamsListChannelMessageReplies',
      {
        title: 'Teams - List Channel Message Replies',
        description: 'List replies for one channel message.',
        inputSchema: ListChannelMessageRepliesInputSchema,
      },
      async (params) => teamsListChannelMessageReplies(params)
    );

    this.server.registerTool(
      'teamsReplyToChannelMessage',
      {
        title: 'Teams - Reply To Channel Message',
        description: 'Reply to a channel message thread.',
        inputSchema: ReplyToChannelMessageInputSchema,
      },
      async (params) => teamsReplyToChannelMessage(params)
    );

    this.server.registerTool(
      'teamsListChats',
      {
        title: 'Teams - List Chats',
        description: 'List chats visible to current user.',
        inputSchema: ListChatsInputSchema,
      },
      async (params) => teamsListChats(params)
    );

    this.server.registerTool(
      'teamsGetChat',
      {
        title: 'Teams - Get Chat',
        description: 'Get chat details by chat ID.',
        inputSchema: GetChatInputSchema,
      },
      async (params) => teamsGetChat(params)
    );

    this.server.registerTool(
      'teamsCreateChat',
      {
        title: 'Teams - Create Chat',
        description: 'Create oneOnOne or group chat with user IDs.',
        inputSchema: CreateChatInputSchema,
      },
      async (params) => teamsCreateChat(params)
    );

    this.server.registerTool(
      'teamsListChatMessages',
      {
        title: 'Teams - List Chat Messages',
        description: 'List messages in a chat.',
        inputSchema: ListChatMessagesInputSchema,
      },
      async (params) => teamsListChatMessages(params)
    );

    this.server.registerTool(
      'teamsSendChatMessage',
      {
        title: 'Teams - Send Chat Message',
        description: 'Send a message in a chat.',
        inputSchema: SendChatMessageInputSchema,
      },
      async (params) => teamsSendChatMessage(params)
    );

    this.server.registerTool(
      'teamsUpdateChatMessage',
      {
        title: 'Teams - Update Chat Message',
        description: 'Update an existing chat message.',
        inputSchema: UpdateChatMessageInputSchema,
      },
      async (params) => teamsUpdateChatMessage(params)
    );

    this.server.registerTool(
      'teamsDeleteChatMessage',
      {
        title: 'Teams - Delete Chat Message',
        description: 'Soft-delete a chat message.',
        inputSchema: DeleteChatMessageInputSchema,
      },
      async (params) => teamsDeleteChatMessage(params)
    );

    this.server.registerTool(
      'teamsSendChannelMessage',
      {
        title: 'Teams - Send Channel Message',
        description: 'Send a message to a channel.',
        inputSchema: SendChannelMessageInputSchema,
      },
      async (params) => teamsSendChannelMessage(params)
    );

    this.server.registerTool(
      'teamsUpdateChannelMessage',
      {
        title: 'Teams - Update Channel Message',
        description: 'Update a channel message.',
        inputSchema: UpdateChannelMessageInputSchema,
      },
      async (params) => teamsUpdateChannelMessage(params)
    );

    this.server.registerTool(
      'teamsDeleteChannelMessage',
      {
        title: 'Teams - Delete Channel Message',
        description: 'Soft-delete a channel message.',
        inputSchema: DeleteChannelMessageInputSchema,
      },
      async (params) => teamsDeleteChannelMessage(params)
    );

    this.server.registerTool(
      'teamsSetMessageReaction',
      {
        title: 'Teams - Set Message Reaction',
        description: 'Add reaction to chat/channel message.',
        inputSchema: SetMessageReactionInputSchema,
      },
      async (params) => teamsSetMessageReaction(params)
    );

    this.server.registerTool(
      'teamsUnsetMessageReaction',
      {
        title: 'Teams - Unset Message Reaction',
        description: 'Remove reaction from chat/channel message.',
        inputSchema: UnsetMessageReactionInputSchema,
      },
      async (params) => teamsUnsetMessageReaction(params)
    );

    this.server.registerTool(
      'teamsGetMessage',
      {
        title: 'Teams - Get Message',
        description: 'Get one chat/channel message by ID.',
        inputSchema: GetMessageInputSchema,
      },
      async (params) => teamsGetMessage(params)
    );

    this.server.registerTool(
      'teamsGetMessageThread',
      {
        title: 'Teams - Get Message Thread',
        description: 'Get channel message with replies, or chat message context.',
        inputSchema: GetMessageThreadInputSchema,
      },
      async (params) => teamsGetMessageThread(params)
    );

    this.server.registerTool(
      'teamsListUsers',
      {
        title: 'Teams - List Users',
        description: 'List users in directory.',
        inputSchema: ListUsersInputSchema,
      },
      async (params) => teamsListUsers(params)
    );

    this.server.registerTool(
      'teamsSearchUsers',
      {
        title: 'Teams - Search Users',
        description: 'Search users by displayName, mail or UPN prefix.',
        inputSchema: SearchUsersInputSchema,
      },
      async (params) => teamsSearchUsers(params)
    );

    logger.info('[Server] Registered 24 Teams tools');
  }

  async connect(transport: Transport) {
    await this.server.connect(transport);
  }

  async cleanup() {
    logger.info('[Server] Cleanup completed');
  }
}
