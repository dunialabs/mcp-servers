import { z } from 'zod';
import { callGraphApi, withTeamsRetry } from '../utils/graph-api.js';

const MAX_TOP = 100;

export const ListUsersInputSchema = {
  top: z.number().int().min(1).max(MAX_TOP).optional().describe('Page size, max 100'),
  skipToken: z.string().optional().describe('Skip token from previous response'),
};

export const SearchUsersInputSchema = {
  query: z.string().min(1).describe('Search query for displayName/mail/userPrincipalName'),
  top: z.number().int().min(1).max(MAX_TOP).optional().describe('Page size, max 100'),
  skipToken: z.string().optional().describe('Skip token from previous response'),
};

export interface ListUsersParams {
  top?: number;
  skipToken?: string;
}

export interface SearchUsersParams {
  query: string;
  top?: number;
  skipToken?: string;
}

interface GraphCollectionResponse<T> {
  value?: T[];
  '@odata.nextLink'?: string;
}

type UserShape = Record<string, unknown>;

function summarizeUser(user: UserShape) {
  return {
    id: user.id,
    displayName: user.displayName,
    givenName: user.givenName,
    surname: user.surname,
    mail: user.mail,
    userPrincipalName: user.userPrincipalName,
    jobTitle: user.jobTitle,
    mobilePhone: user.mobilePhone,
    officeLocation: user.officeLocation,
  };
}

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

export async function teamsListUsers(params: ListUsersParams) {
  const response = await withTeamsRetry(
    () =>
      callGraphApi<GraphCollectionResponse<UserShape>>('/users', {
        query: {
          $top: params.top ?? 50,
          $skiptoken: params.skipToken,
          $select:
            'id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,mobilePhone,officeLocation',
        },
      }),
    'teamsListUsers'
  );

  const users = response.value ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            count: users.length,
            nextLink: response['@odata.nextLink'],
            users: users.map((user) => summarizeUser(user)),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsSearchUsers(params: SearchUsersParams) {
  const queryValue = escapeODataValue(params.query);
  const filter =
    `startswith(displayName,'${queryValue}') or ` +
    `startswith(mail,'${queryValue}') or ` +
    `startswith(userPrincipalName,'${queryValue}')`;

  const response = await withTeamsRetry(
    () =>
      callGraphApi<GraphCollectionResponse<UserShape>>('/users', {
        query: {
          $top: params.top ?? 25,
          $skiptoken: params.skipToken,
          $count: true,
          $filter: filter,
          $select:
            'id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,mobilePhone,officeLocation',
        },
        headers: {
          ConsistencyLevel: 'eventual',
        },
      }),
    'teamsSearchUsers'
  );

  const users = response.value ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            query: params.query,
            count: users.length,
            nextLink: response['@odata.nextLink'],
            users: users.map((user) => summarizeUser(user)),
          },
          null,
          2
        ),
      },
    ],
  };
}
