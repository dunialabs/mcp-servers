import { z } from 'zod';
import { callSlackApi, withSlackRetry } from '../utils/slack-api.js';

export const SetChannelTopicInputSchema = {
  channelId: z.string().min(1).describe('Slack channel ID'),
  topic: z.string().min(1).max(250).describe('Channel topic text'),
};

export const InviteUserToChannelInputSchema = {
  channelId: z.string().min(1).describe('Slack channel ID'),
  userIds: z.array(z.string().min(1)).min(1).max(30).describe('User IDs to invite'),
};

export const KickUserFromChannelInputSchema = {
  channelId: z.string().min(1).describe('Slack channel ID'),
  userId: z.string().min(1).describe('User ID to remove from channel'),
};

export const CreateChannelInputSchema = {
  name: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_-]+$/, 'Channel name must use lowercase letters, numbers, hyphen, underscore')
    .describe('New channel name (lowercase, numbers, hyphen, underscore)'),
  isPrivate: z.boolean().optional().describe('Create private channel if true'),
};

export const ArchiveChannelInputSchema = {
  channelId: z.string().min(1).describe('Slack channel ID'),
};

export interface SetChannelTopicParams {
  channelId: string;
  topic: string;
}

export interface InviteUserToChannelParams {
  channelId: string;
  userIds: string[];
}

export interface KickUserFromChannelParams {
  channelId: string;
  userId: string;
}

export interface CreateChannelParams {
  name: string;
  isPrivate?: boolean;
}

export interface ArchiveChannelParams {
  channelId: string;
}

type ChannelResult = {
  channel?: Record<string, unknown>;
};

export async function slackSetChannelTopic(params: SetChannelTopicParams) {
  const response = await withSlackRetry(
    () =>
      callSlackApi('conversations.setTopic', {
        channel: params.channelId,
        topic: params.topic,
      }),
    'slackSetChannelTopic'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            channelId: params.channelId,
            topic: response.topic ?? params.topic,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function slackInviteUserToChannel(params: InviteUserToChannelParams) {
  const response = await withSlackRetry(
    () =>
      callSlackApi<ChannelResult>('conversations.invite', {
        channel: params.channelId,
        users: params.userIds.join(','),
      }),
    'slackInviteUserToChannel'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            channelId: params.channelId,
            invitedUserIds: params.userIds,
            channel: response.channel,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function slackKickUserFromChannel(params: KickUserFromChannelParams) {
  await withSlackRetry(
    () =>
      callSlackApi('conversations.kick', {
        channel: params.channelId,
        user: params.userId,
      }),
    'slackKickUserFromChannel'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            channelId: params.channelId,
            userId: params.userId,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function slackCreateChannel(params: CreateChannelParams) {
  const response = await withSlackRetry(
    () =>
      callSlackApi<ChannelResult>('conversations.create', {
        name: params.name,
        is_private: params.isPrivate ?? false,
      }),
    'slackCreateChannel'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            channel: response.channel,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function slackArchiveChannel(params: ArchiveChannelParams) {
  await withSlackRetry(
    () =>
      callSlackApi('conversations.archive', {
        channel: params.channelId,
      }),
    'slackArchiveChannel'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            channelId: params.channelId,
          },
          null,
          2
        ),
      },
    ],
  };
}
