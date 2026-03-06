import { z } from 'zod';
import { callSlackApi, summarizeUser, withSlackRetry } from '../utils/slack-api.js';

const MAX_LIMIT = 1000;

export const ListUsersInputSchema = {
  limit: z.number().int().min(1).max(MAX_LIMIT).optional().describe('Page size, max 1000'),
  cursor: z.string().optional().describe('Cursor from previous response'),
  includeLocale: z.boolean().optional().describe('Include locale fields from Slack user profile'),
};

export const GetUserInfoInputSchema = {
  userId: z.string().min(1).describe('Slack user ID'),
  includeLocale: z.boolean().optional().describe('Include locale fields from Slack user profile'),
};

export interface ListUsersParams {
  limit?: number;
  cursor?: string;
  includeLocale?: boolean;
}

export interface GetUserInfoParams {
  userId: string;
  includeLocale?: boolean;
}

type UsersListResponse = {
  members?: Array<Record<string, unknown>>;
  response_metadata?: { next_cursor?: string };
};

type UsersInfoResponse = {
  user?: Record<string, unknown>;
};

export async function slackListUsers(params: ListUsersParams) {
  const response = await withSlackRetry(
    () =>
      callSlackApi<UsersListResponse>('users.list', {
        limit: params.limit ?? 200,
        cursor: params.cursor,
        include_locale: params.includeLocale ?? false,
      }),
    'slackListUsers'
  );

  const members = response.members ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            count: members.length,
            nextCursor: response.response_metadata?.next_cursor,
            users: members.map((member) => summarizeUser(member)),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function slackGetUserInfo(params: GetUserInfoParams) {
  const response = await withSlackRetry(
    () =>
      callSlackApi<UsersInfoResponse>('users.info', {
        user: params.userId,
        include_locale: params.includeLocale ?? false,
      }),
    'slackGetUserInfo'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            user: response.user ? summarizeUser(response.user) : null,
          },
          null,
          2
        ),
      },
    ],
  };
}
