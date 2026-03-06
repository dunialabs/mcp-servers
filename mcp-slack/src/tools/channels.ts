import { z } from 'zod';
import { callSlackApi, summarizeChannel, withSlackRetry } from '../utils/slack-api.js';

const MAX_LIMIT = 1000;

export const ListChannelsInputSchema = {
  types: z
    .array(z.enum(['public_channel', 'private_channel']))
    .min(1)
    .optional()
    .describe('Channel types to include. Default: public+private'),
  limit: z.number().int().min(1).max(MAX_LIMIT).optional().describe('Page size, max 1000'),
  cursor: z.string().optional().describe('Cursor from previous response'),
  excludeArchived: z.boolean().optional().describe('Exclude archived channels (default true)'),
};

export const GetChannelInfoInputSchema = {
  channelId: z.string().min(1).describe('Slack channel ID, e.g. C123... or G123...'),
};

export interface ListChannelsParams {
  types?: Array<'public_channel' | 'private_channel'>;
  limit?: number;
  cursor?: string;
  excludeArchived?: boolean;
}

export interface GetChannelInfoParams {
  channelId: string;
}

type ConversationsListResponse = {
  channels?: Array<Record<string, unknown>>;
  response_metadata?: { next_cursor?: string };
};

type ConversationsInfoResponse = {
  channel?: Record<string, unknown>;
};

export async function slackListChannels(params: ListChannelsParams) {
  const response = await withSlackRetry(
    () =>
      callSlackApi<ConversationsListResponse>('conversations.list', {
        types: (params.types ?? ['public_channel', 'private_channel']).join(','),
        limit: params.limit ?? 200,
        cursor: params.cursor,
        exclude_archived: params.excludeArchived ?? true,
      }),
    'slackListChannels'
  );

  const channels = response.channels ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            count: channels.length,
            nextCursor: response.response_metadata?.next_cursor,
            channels: channels.map((channel) => summarizeChannel(channel)),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function slackGetChannelInfo(params: GetChannelInfoParams) {
  const response = await withSlackRetry(
    () =>
      callSlackApi<ConversationsInfoResponse>('conversations.info', {
        channel: params.channelId,
      }),
    'slackGetChannelInfo'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            channel: response.channel ? summarizeChannel(response.channel) : null,
          },
          null,
          2
        ),
      },
    ],
  };
}
