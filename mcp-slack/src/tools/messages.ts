import { z } from 'zod';
import { callSlackApi, withSlackRetry } from '../utils/slack-api.js';

const MAX_LIMIT = 1000;

export const SendMessageInputSchema = {
  channelId: z.string().min(1).describe('Slack channel ID'),
  text: z.string().min(1).describe('Message text'),
  threadTs: z.string().optional().describe('Reply to thread timestamp'),
};

export const ListMessagesInputSchema = {
  channelId: z.string().min(1).describe('Slack channel ID'),
  limit: z.number().int().min(1).max(MAX_LIMIT).optional().describe('Page size, max 1000'),
  cursor: z.string().optional().describe('Cursor from previous response'),
  oldest: z.string().optional().describe('Oldest timestamp boundary'),
  latest: z.string().optional().describe('Latest timestamp boundary'),
  inclusive: z.boolean().optional().describe('Include oldest/latest boundaries'),
};

export const GetMessageInputSchema = {
  channelId: z.string().min(1).describe('Slack channel ID'),
  ts: z.string().min(1).describe('Message timestamp'),
};

export const GetThreadRepliesInputSchema = {
  channelId: z.string().min(1).describe('Slack channel ID'),
  threadTs: z.string().min(1).describe('Thread root timestamp'),
  limit: z.number().int().min(1).max(MAX_LIMIT).optional().describe('Page size, max 1000'),
  cursor: z.string().optional().describe('Cursor from previous response'),
};

export const UpdateMessageInputSchema = {
  channelId: z.string().min(1).describe('Slack channel ID'),
  ts: z.string().min(1).describe('Message timestamp'),
  text: z.string().min(1).describe('Updated text'),
};

export const DeleteMessageInputSchema = {
  channelId: z.string().min(1).describe('Slack channel ID'),
  ts: z.string().min(1).describe('Message timestamp'),
};

export const AddReactionInputSchema = {
  channelId: z.string().min(1).describe('Slack channel ID'),
  ts: z.string().min(1).describe('Message timestamp'),
  name: z.string().min(1).describe('Reaction name without colons, e.g. thumbsup'),
};

export const RemoveReactionInputSchema = {
  channelId: z.string().min(1).describe('Slack channel ID'),
  ts: z.string().min(1).describe('Message timestamp'),
  name: z.string().min(1).describe('Reaction name without colons, e.g. thumbsup'),
};

export interface SendMessageParams {
  channelId: string;
  text: string;
  threadTs?: string;
}

export interface ListMessagesParams {
  channelId: string;
  limit?: number;
  cursor?: string;
  oldest?: string;
  latest?: string;
  inclusive?: boolean;
}

export interface GetMessageParams {
  channelId: string;
  ts: string;
}

export interface GetThreadRepliesParams {
  channelId: string;
  threadTs: string;
  limit?: number;
  cursor?: string;
}

export interface UpdateMessageParams {
  channelId: string;
  ts: string;
  text: string;
}

export interface DeleteMessageParams {
  channelId: string;
  ts: string;
}

export interface ReactionParams {
  channelId: string;
  ts: string;
  name: string;
}

type ConversationMessage = Record<string, unknown>;

type PostMessageResponse = {
  channel?: string;
  ts?: string;
  message?: ConversationMessage;
};

type HistoryResponse = {
  messages?: ConversationMessage[];
  has_more?: boolean;
  response_metadata?: { next_cursor?: string };
  pin_count?: number;
};

type RepliesResponse = {
  messages?: ConversationMessage[];
  has_more?: boolean;
  response_metadata?: { next_cursor?: string };
};

function summarizeMessage(message: ConversationMessage) {
  const replies = Array.isArray(message.replies) ? message.replies.length : 0;
  return {
    type: message.type,
    user: message.user,
    text: message.text,
    ts: message.ts,
    threadTs: message.thread_ts,
    replyCount: message.reply_count,
    repliesPreviewCount: replies,
    reactions: message.reactions,
  };
}

export async function slackSendMessage(params: SendMessageParams) {
  const response = await withSlackRetry(
    () =>
      callSlackApi<PostMessageResponse>('chat.postMessage', {
        channel: params.channelId,
        text: params.text,
        thread_ts: params.threadTs,
      }),
    'slackSendMessage'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            channelId: response.channel,
            ts: response.ts,
            message: response.message ? summarizeMessage(response.message) : null,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function slackListMessages(params: ListMessagesParams) {
  const response = await withSlackRetry(
    () =>
      callSlackApi<HistoryResponse>('conversations.history', {
        channel: params.channelId,
        limit: params.limit ?? 100,
        cursor: params.cursor,
        oldest: params.oldest,
        latest: params.latest,
        inclusive: params.inclusive,
      }),
    'slackListMessages'
  );

  const messages = response.messages ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            count: messages.length,
            hasMore: response.has_more,
            nextCursor: response.response_metadata?.next_cursor,
            messages: messages.map((message) => summarizeMessage(message)),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function slackGetMessage(params: GetMessageParams) {
  const response = await withSlackRetry(
    () =>
      callSlackApi<HistoryResponse>('conversations.history', {
        channel: params.channelId,
        latest: params.ts,
        inclusive: true,
        limit: 1,
      }),
    'slackGetMessage'
  );

  const message = response.messages?.find((item) => item.ts === params.ts);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            found: Boolean(message),
            message: message ? summarizeMessage(message) : null,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function slackGetThreadReplies(params: GetThreadRepliesParams) {
  const response = await withSlackRetry(
    () =>
      callSlackApi<RepliesResponse>('conversations.replies', {
        channel: params.channelId,
        ts: params.threadTs,
        limit: params.limit ?? 100,
        cursor: params.cursor,
      }),
    'slackGetThreadReplies'
  );

  const messages = response.messages ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            count: messages.length,
            hasMore: response.has_more,
            nextCursor: response.response_metadata?.next_cursor,
            messages: messages.map((message) => summarizeMessage(message)),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function slackUpdateMessage(params: UpdateMessageParams) {
  const response = await withSlackRetry(
    () =>
      callSlackApi<PostMessageResponse>('chat.update', {
        channel: params.channelId,
        ts: params.ts,
        text: params.text,
      }),
    'slackUpdateMessage'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            channelId: response.channel,
            ts: response.ts,
            message: response.message ? summarizeMessage(response.message) : null,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function slackDeleteMessage(params: DeleteMessageParams) {
  const response = await withSlackRetry(
    () =>
      callSlackApi<{ channel?: string; ts?: string }>('chat.delete', {
        channel: params.channelId,
        ts: params.ts,
      }),
    'slackDeleteMessage'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            channelId: response.channel ?? params.channelId,
            ts: response.ts ?? params.ts,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function slackAddReaction(params: ReactionParams) {
  await withSlackRetry(
    () =>
      callSlackApi('reactions.add', {
        channel: params.channelId,
        timestamp: params.ts,
        name: params.name,
      }),
    'slackAddReaction'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            channelId: params.channelId,
            ts: params.ts,
            name: params.name,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function slackRemoveReaction(params: ReactionParams) {
  await withSlackRetry(
    () =>
      callSlackApi('reactions.remove', {
        channel: params.channelId,
        timestamp: params.ts,
        name: params.name,
      }),
    'slackRemoveReaction'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            channelId: params.channelId,
            ts: params.ts,
            name: params.name,
          },
          null,
          2
        ),
      },
    ],
  };
}
