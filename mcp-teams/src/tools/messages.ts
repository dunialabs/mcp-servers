import { z } from 'zod';
import { callGraphApi, summarizeMessage, withTeamsRetry } from '../utils/graph-api.js';
import { createMcpError, TeamsErrorCode } from '../utils/errors.js';

export const SendChannelMessageInputSchema = {
  teamId: z.string().min(1).describe('Microsoft Teams team ID'),
  channelId: z.string().min(1).describe('Microsoft Teams channel ID'),
  content: z.string().min(1).describe('Message content'),
  contentType: z.enum(['text', 'html']).optional().describe('Message body content type'),
  importance: z.enum(['normal', 'high', 'urgent']).optional().describe('Message importance'),
};

export const UpdateChannelMessageInputSchema = {
  teamId: z.string().min(1).describe('Microsoft Teams team ID'),
  channelId: z.string().min(1).describe('Microsoft Teams channel ID'),
  messageId: z.string().min(1).describe('Channel message ID'),
  content: z.string().min(1).describe('Updated message content'),
  contentType: z.enum(['text', 'html']).optional().describe('Message body content type'),
};

export const DeleteChannelMessageInputSchema = {
  teamId: z.string().min(1).describe('Microsoft Teams team ID'),
  channelId: z.string().min(1).describe('Microsoft Teams channel ID'),
  messageId: z.string().min(1).describe('Channel message ID'),
};

export const SetMessageReactionInputSchema = {
  targetType: z.enum(['chat', 'channel']).describe('Message target type'),
  reactionType: z.string().min(1).describe('Reaction type, e.g. like, angry, sad, heart, laugh, surprised'),
  chatId: z.string().optional().describe('Chat ID for chat message reactions'),
  teamId: z.string().optional().describe('Team ID for channel message reactions'),
  channelId: z.string().optional().describe('Channel ID for channel message reactions'),
  messageId: z.string().min(1).describe('Message ID'),
};

export const UnsetMessageReactionInputSchema = {
  targetType: z.enum(['chat', 'channel']).describe('Message target type'),
  reactionType: z.string().min(1).describe('Reaction type, e.g. like, angry, sad, heart, laugh, surprised'),
  chatId: z.string().optional().describe('Chat ID for chat message reactions'),
  teamId: z.string().optional().describe('Team ID for channel message reactions'),
  channelId: z.string().optional().describe('Channel ID for channel message reactions'),
  messageId: z.string().min(1).describe('Message ID'),
};

export const GetMessageInputSchema = {
  targetType: z.enum(['chat', 'channel']).describe('Message target type'),
  chatId: z.string().optional().describe('Chat ID for chat messages'),
  teamId: z.string().optional().describe('Team ID for channel messages'),
  channelId: z.string().optional().describe('Channel ID for channel messages'),
  messageId: z.string().min(1).describe('Message ID'),
};

export const GetMessageThreadInputSchema = {
  targetType: z.enum(['chat', 'channel']).describe('Thread target type'),
  chatId: z.string().optional().describe('Chat ID for chat messages'),
  teamId: z.string().optional().describe('Team ID for channel messages'),
  channelId: z.string().optional().describe('Channel ID for channel messages'),
  messageId: z.string().min(1).describe('Root message ID'),
  top: z.number().int().min(1).max(50).optional().describe('Page size for replies, max 50'),
};

export interface SendChannelMessageParams {
  teamId: string;
  channelId: string;
  content: string;
  contentType?: 'text' | 'html';
  importance?: 'normal' | 'high' | 'urgent';
}

export interface UpdateChannelMessageParams {
  teamId: string;
  channelId: string;
  messageId: string;
  content: string;
  contentType?: 'text' | 'html';
}

export interface DeleteChannelMessageParams {
  teamId: string;
  channelId: string;
  messageId: string;
}

interface MessageLocator {
  targetType: 'chat' | 'channel';
  messageId: string;
  chatId?: string;
  teamId?: string;
  channelId?: string;
}

export type SetMessageReactionParams = MessageLocator & { reactionType: string };
export type UnsetMessageReactionParams = MessageLocator & { reactionType: string };
export type GetMessageParams = MessageLocator;
export type GetMessageThreadParams = MessageLocator & { top?: number };

type MessageShape = Record<string, unknown>;

interface GraphCollectionResponse<T> {
  value?: T[];
  '@odata.nextLink'?: string;
}

function resolveMessagePath(params: MessageLocator): string {
  if (params.targetType === 'chat') {
    if (!params.chatId) {
      throw createMcpError(TeamsErrorCode.InvalidParams, 'chatId is required when targetType=chat');
    }
    return `/chats/${params.chatId}/messages/${params.messageId}`;
  }

  if (!params.teamId || !params.channelId) {
    throw createMcpError(
      TeamsErrorCode.InvalidParams,
      'teamId and channelId are required when targetType=channel'
    );
  }

  return `/teams/${params.teamId}/channels/${params.channelId}/messages/${params.messageId}`;
}

export async function teamsSendChannelMessage(params: SendChannelMessageParams) {
  const message = await withTeamsRetry(
    () =>
      callGraphApi<MessageShape>(`/teams/${params.teamId}/channels/${params.channelId}/messages`, {
        method: 'POST',
        body: {
          importance: params.importance,
          body: {
            contentType: params.contentType ?? 'text',
            content: params.content,
          },
        },
      }),
    'teamsSendChannelMessage'
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

export async function teamsUpdateChannelMessage(params: UpdateChannelMessageParams) {
  await withTeamsRetry(
    () =>
      callGraphApi<Record<string, unknown>>(
        `/teams/${params.teamId}/channels/${params.channelId}/messages/${params.messageId}`,
        {
          method: 'PATCH',
          body: {
            body: {
              contentType: params.contentType ?? 'text',
              content: params.content,
            },
          },
        }
      ),
    'teamsUpdateChannelMessage'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            teamId: params.teamId,
            channelId: params.channelId,
            messageId: params.messageId,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsDeleteChannelMessage(params: DeleteChannelMessageParams) {
  await withTeamsRetry(
    () =>
      callGraphApi<Record<string, unknown>>(
        `/teams/${params.teamId}/channels/${params.channelId}/messages/${params.messageId}/softDelete`,
        {
          method: 'POST',
          body: {},
        }
      ),
    'teamsDeleteChannelMessage'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            teamId: params.teamId,
            channelId: params.channelId,
            messageId: params.messageId,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsSetMessageReaction(params: SetMessageReactionParams) {
  const path = `${resolveMessagePath(params)}/setReaction`;

  await withTeamsRetry(
    () =>
      callGraphApi<Record<string, unknown>>(path, {
        method: 'POST',
        body: {
          reactionType: params.reactionType,
        },
      }),
    'teamsSetMessageReaction'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            targetType: params.targetType,
            messageId: params.messageId,
            reactionType: params.reactionType,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsUnsetMessageReaction(params: UnsetMessageReactionParams) {
  const path = `${resolveMessagePath(params)}/unsetReaction`;

  await withTeamsRetry(
    () =>
      callGraphApi<Record<string, unknown>>(path, {
        method: 'POST',
        body: {
          reactionType: params.reactionType,
        },
      }),
    'teamsUnsetMessageReaction'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            targetType: params.targetType,
            messageId: params.messageId,
            reactionType: params.reactionType,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsGetMessage(params: GetMessageParams) {
  const message = await withTeamsRetry(
    () => callGraphApi<MessageShape>(resolveMessagePath(params)),
    'teamsGetMessage'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            targetType: params.targetType,
            message: summarizeMessage(message),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsGetMessageThread(params: GetMessageThreadParams) {
  const rootMessage = await withTeamsRetry(
    () => callGraphApi<MessageShape>(resolveMessagePath(params)),
    'teamsGetMessageThread.root'
  );

  if (params.targetType === 'chat') {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              targetType: 'chat',
              messageId: params.messageId,
              root: summarizeMessage(rootMessage),
              replies: [],
              note: 'Chat messages do not expose channel-style thread replies via this tool.',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const response = await withTeamsRetry(
    () =>
      callGraphApi<GraphCollectionResponse<MessageShape>>(
        `/teams/${params.teamId}/channels/${params.channelId}/messages/${params.messageId}/replies`,
        {
          query: {
            $top: params.top ?? 20,
          },
        }
      ),
    'teamsGetMessageThread.replies'
  );

  const replies = response.value ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            targetType: 'channel',
            teamId: params.teamId,
            channelId: params.channelId,
            messageId: params.messageId,
            root: summarizeMessage(rootMessage),
            count: replies.length,
            nextLink: response['@odata.nextLink'],
            replies: replies.map((reply) => summarizeMessage(reply)),
          },
          null,
          2
        ),
      },
    ],
  };
}
