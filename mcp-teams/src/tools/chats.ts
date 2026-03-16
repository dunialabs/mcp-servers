import { z } from 'zod';
import { callGraphApi, summarizeMessage, withTeamsRetry } from '../utils/graph-api.js';
import { createMcpError, TeamsErrorCode } from '../utils/errors.js';

const MAX_TOP = 50;

export const ListChatsInputSchema = {
  top: z.number().int().min(1).max(MAX_TOP).optional().describe('Page size, max 50'),
  skipToken: z.string().optional().describe('Skip token from previous response'),
};

export const GetChatInputSchema = {
  chatId: z.string().min(1).describe('Microsoft Teams chat ID'),
};

export const CreateChatInputSchema = {
  chatType: z.enum(['oneOnOne', 'group']).describe('Chat type'),
  userIds: z.array(z.string().min(1)).min(2).max(25).describe('Participant user IDs'),
  topic: z.string().optional().describe('Chat topic, used for group chat'),
};

export const ListChatMessagesInputSchema = {
  chatId: z.string().min(1).describe('Microsoft Teams chat ID'),
  top: z.number().int().min(1).max(MAX_TOP).optional().describe('Page size, max 50'),
  skipToken: z.string().optional().describe('Skip token from previous response'),
};

export const SendChatMessageInputSchema = {
  chatId: z.string().min(1).describe('Microsoft Teams chat ID'),
  content: z.string().min(1).describe('Message content'),
  contentType: z.enum(['text', 'html']).optional().describe('Message body content type'),
  importance: z.enum(['normal', 'high', 'urgent']).optional().describe('Message importance'),
};

export const UpdateChatMessageInputSchema = {
  chatId: z.string().min(1).describe('Microsoft Teams chat ID'),
  messageId: z.string().min(1).describe('Chat message ID'),
  content: z.string().min(1).describe('Updated message content'),
  contentType: z.enum(['text', 'html']).optional().describe('Message body content type'),
};

export const DeleteChatMessageInputSchema = {
  chatId: z.string().min(1).describe('Microsoft Teams chat ID'),
  messageId: z.string().min(1).describe('Chat message ID'),
};

export interface ListChatsParams {
  top?: number;
  skipToken?: string;
}

export interface GetChatParams {
  chatId: string;
}

export interface CreateChatParams {
  chatType: 'oneOnOne' | 'group';
  userIds: string[];
  topic?: string;
}

export interface ListChatMessagesParams {
  chatId: string;
  top?: number;
  skipToken?: string;
}

export interface SendChatMessageParams {
  chatId: string;
  content: string;
  contentType?: 'text' | 'html';
  importance?: 'normal' | 'high' | 'urgent';
}

export interface UpdateChatMessageParams {
  chatId: string;
  messageId: string;
  content: string;
  contentType?: 'text' | 'html';
}

export interface DeleteChatMessageParams {
  chatId: string;
  messageId: string;
}

interface GraphCollectionResponse<T> {
  value?: T[];
  '@odata.nextLink'?: string;
}

type ChatShape = Record<string, unknown>;
type MessageShape = Record<string, unknown>;

function summarizeChat(chat: ChatShape) {
  return {
    id: chat.id,
    topic: chat.topic,
    chatType: chat.chatType,
    webUrl: chat.webUrl,
    createdDateTime: chat.createdDateTime,
    lastUpdatedDateTime: chat.lastUpdatedDateTime,
    tenantId: chat.tenantId,
  };
}

function toMemberBinding(userId: string): Record<string, unknown> {
  return {
    '@odata.type': '#microsoft.graph.aadUserConversationMember',
    roles: ['owner'],
    'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`,
  };
}

export async function teamsListChats(params: ListChatsParams) {
  const response = await withTeamsRetry(
    () =>
      callGraphApi<GraphCollectionResponse<ChatShape>>('/me/chats', {
        query: {
          $top: params.top ?? 20,
          $skiptoken: params.skipToken,
        },
      }),
    'teamsListChats'
  );

  const chats = response.value ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            count: chats.length,
            nextLink: response['@odata.nextLink'],
            chats: chats.map((chat) => summarizeChat(chat)),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsGetChat(params: GetChatParams) {
  const chat = await withTeamsRetry(
    () => callGraphApi<ChatShape>(`/chats/${params.chatId}`),
    'teamsGetChat'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            chat: summarizeChat(chat),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsCreateChat(params: CreateChatParams) {
  if (params.chatType === 'oneOnOne' && params.userIds.length !== 2) {
    throw createMcpError(
      TeamsErrorCode.InvalidParams,
      'oneOnOne chat requires exactly 2 userIds'
    );
  }

  const chat = await withTeamsRetry(
    () =>
      callGraphApi<ChatShape>('/chats', {
        method: 'POST',
        body: {
          chatType: params.chatType,
          topic: params.topic,
          members: params.userIds.map((userId) => toMemberBinding(userId)),
        },
      }),
    'teamsCreateChat'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            chat: summarizeChat(chat),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsListChatMessages(params: ListChatMessagesParams) {
  const response = await withTeamsRetry(
    () =>
      callGraphApi<GraphCollectionResponse<MessageShape>>(`/chats/${params.chatId}/messages`, {
        query: {
          $top: params.top ?? 20,
          $skiptoken: params.skipToken,
        },
      }),
    'teamsListChatMessages'
  );

  const messages = response.value ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            chatId: params.chatId,
            count: messages.length,
            nextLink: response['@odata.nextLink'],
            messages: messages.map((message) => summarizeMessage(message)),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsSendChatMessage(params: SendChatMessageParams) {
  const message = await withTeamsRetry(
    () =>
      callGraphApi<MessageShape>(`/chats/${params.chatId}/messages`, {
        method: 'POST',
        body: {
          importance: params.importance,
          body: {
            contentType: params.contentType ?? 'text',
            content: params.content,
          },
        },
      }),
    'teamsSendChatMessage'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            message: summarizeMessage(message),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsUpdateChatMessage(params: UpdateChatMessageParams) {
  await withTeamsRetry(
    () =>
      callGraphApi<Record<string, unknown>>(`/chats/${params.chatId}/messages/${params.messageId}`, {
        method: 'PATCH',
        body: {
          body: {
            contentType: params.contentType ?? 'text',
            content: params.content,
          },
        },
      }),
    'teamsUpdateChatMessage'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            chatId: params.chatId,
            messageId: params.messageId,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsDeleteChatMessage(params: DeleteChatMessageParams) {
  await withTeamsRetry(
    () =>
      callGraphApi<Record<string, unknown>>(
        `/chats/${params.chatId}/messages/${params.messageId}/softDelete`,
        {
          method: 'POST',
          body: {},
        }
      ),
    'teamsDeleteChatMessage'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            chatId: params.chatId,
            messageId: params.messageId,
          },
          null,
          2
        ),
      },
    ],
  };
}
