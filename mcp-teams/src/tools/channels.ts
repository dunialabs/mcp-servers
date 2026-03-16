import { z } from 'zod';
import { callGraphApi, summarizeMessage, withTeamsRetry } from '../utils/graph-api.js';

const MAX_TOP = 50;

export const GetChannelInputSchema = {
  teamId: z.string().min(1).describe('Microsoft Teams team ID'),
  channelId: z.string().min(1).describe('Microsoft Teams channel ID'),
};

export const ListChannelMessagesInputSchema = {
  teamId: z.string().min(1).describe('Microsoft Teams team ID'),
  channelId: z.string().min(1).describe('Microsoft Teams channel ID'),
  top: z.number().int().min(1).max(MAX_TOP).optional().describe('Page size, max 50'),
  skipToken: z.string().optional().describe('Skip token from previous response'),
};

export const ListChannelMessageRepliesInputSchema = {
  teamId: z.string().min(1).describe('Microsoft Teams team ID'),
  channelId: z.string().min(1).describe('Microsoft Teams channel ID'),
  messageId: z.string().min(1).describe('Parent channel message ID'),
  top: z.number().int().min(1).max(MAX_TOP).optional().describe('Page size, max 50'),
};

export const ReplyToChannelMessageInputSchema = {
  teamId: z.string().min(1).describe('Microsoft Teams team ID'),
  channelId: z.string().min(1).describe('Microsoft Teams channel ID'),
  messageId: z.string().min(1).describe('Parent channel message ID'),
  content: z.string().min(1).describe('Reply content'),
  contentType: z.enum(['text', 'html']).optional().describe('Message body content type'),
  importance: z.enum(['normal', 'high', 'urgent']).optional().describe('Message importance'),
};

export interface GetChannelParams {
  teamId: string;
  channelId: string;
}

export interface ListChannelMessagesParams {
  teamId: string;
  channelId: string;
  top?: number;
  skipToken?: string;
}

export interface ListChannelMessageRepliesParams {
  teamId: string;
  channelId: string;
  messageId: string;
  top?: number;
}

export interface ReplyToChannelMessageParams {
  teamId: string;
  channelId: string;
  messageId: string;
  content: string;
  contentType?: 'text' | 'html';
  importance?: 'normal' | 'high' | 'urgent';
}

interface GraphCollectionResponse<T> {
  value?: T[];
  '@odata.nextLink'?: string;
}

type ChannelShape = Record<string, unknown>;
type MessageShape = Record<string, unknown>;

function summarizeChannel(channel: ChannelShape) {
  return {
    id: channel.id,
    displayName: channel.displayName,
    description: channel.description,
    membershipType: channel.membershipType,
    isArchived: channel.isArchived,
    webUrl: channel.webUrl,
  };
}

export async function teamsGetChannel(params: GetChannelParams) {
  const channel = await withTeamsRetry(
    () => callGraphApi<ChannelShape>(`/teams/${params.teamId}/channels/${params.channelId}`),
    'teamsGetChannel'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            channel: summarizeChannel(channel),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsListChannelMessages(params: ListChannelMessagesParams) {
  const response = await withTeamsRetry(
    () =>
      callGraphApi<GraphCollectionResponse<MessageShape>>(
        `/teams/${params.teamId}/channels/${params.channelId}/messages`,
        {
          query: {
            $top: params.top ?? 20,
            $skiptoken: params.skipToken,
          },
        }
      ),
    'teamsListChannelMessages'
  );

  const messages = response.value ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            teamId: params.teamId,
            channelId: params.channelId,
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

export async function teamsListChannelMessageReplies(params: ListChannelMessageRepliesParams) {
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
    'teamsListChannelMessageReplies'
  );

  const replies = response.value ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            teamId: params.teamId,
            channelId: params.channelId,
            messageId: params.messageId,
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

export async function teamsReplyToChannelMessage(params: ReplyToChannelMessageParams) {
  const message = await withTeamsRetry(
    () =>
      callGraphApi<MessageShape>(
        `/teams/${params.teamId}/channels/${params.channelId}/messages/${params.messageId}/replies`,
        {
          method: 'POST',
          body: {
            importance: params.importance,
            body: {
              contentType: params.contentType ?? 'text',
              content: params.content,
            },
          },
        }
      ),
    'teamsReplyToChannelMessage'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            reply: summarizeMessage(message),
          },
          null,
          2
        ),
      },
    ],
  };
}
