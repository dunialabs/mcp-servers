import { z } from 'zod';
import { callGraphApi, withTeamsRetry } from '../utils/graph-api.js';

const MAX_TOP = 100;

export const ListJoinedTeamsInputSchema = {};

export const GetTeamInputSchema = {
  teamId: z.string().min(1).describe('Microsoft Teams team ID'),
};

export const ListTeamMembersInputSchema = {
  teamId: z.string().min(1).describe('Microsoft Teams team ID'),
  top: z.number().int().min(1).max(MAX_TOP).optional().describe('Page size, max 100'),
  skipToken: z.string().optional().describe('Skip token from previous response'),
};

export const ListTeamChannelsInputSchema = {
  teamId: z.string().min(1).describe('Microsoft Teams team ID'),
  top: z.number().int().min(1).max(MAX_TOP).optional().describe('Page size, max 100'),
  skipToken: z.string().optional().describe('Skip token from previous response'),
};

export interface ListJoinedTeamsParams {
  _?: never;
}

export interface GetTeamParams {
  teamId: string;
}

export interface ListTeamMembersParams {
  teamId: string;
  top?: number;
  skipToken?: string;
}

export interface ListTeamChannelsParams {
  teamId: string;
  top?: number;
  skipToken?: string;
}

interface GraphCollectionResponse<T> {
  value?: T[];
  '@odata.nextLink'?: string;
}

type TeamShape = Record<string, unknown>;
type TeamMemberShape = Record<string, unknown>;
type ChannelShape = Record<string, unknown>;

function summarizeTeam(team: TeamShape) {
  return {
    id: team.id,
    displayName: team.displayName,
    description: team.description,
    isArchived: team.isArchived,
    webUrl: team.webUrl,
  };
}

function summarizeMember(member: TeamMemberShape) {
  return {
    id: member.id,
    roles: member.roles,
    displayName: member.displayName,
    email: member.email,
    userId: member.userId,
  };
}

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

export async function teamsListJoinedTeams(params: ListJoinedTeamsParams) {
  void params;
  const response = await withTeamsRetry(
    () => callGraphApi<GraphCollectionResponse<TeamShape>>('/me/joinedTeams'),
    'teamsListJoinedTeams'
  );

  const teams = response.value ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            count: teams.length,
            nextLink: response['@odata.nextLink'],
            teams: teams.map((team) => summarizeTeam(team)),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsGetTeam(params: GetTeamParams) {
  const team = await withTeamsRetry(
    () => callGraphApi<TeamShape>(`/teams/${params.teamId}`),
    'teamsGetTeam'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            team: summarizeTeam(team),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsListTeamMembers(params: ListTeamMembersParams) {
  const response = await withTeamsRetry(
    () =>
      callGraphApi<GraphCollectionResponse<TeamMemberShape>>(`/teams/${params.teamId}/members`, {
        query: {
          $top: params.top ?? 50,
          $skiptoken: params.skipToken,
        },
      }),
    'teamsListTeamMembers'
  );

  const members = response.value ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            teamId: params.teamId,
            count: members.length,
            nextLink: response['@odata.nextLink'],
            members: members.map((member) => summarizeMember(member)),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function teamsListTeamChannels(params: ListTeamChannelsParams) {
  const response = await withTeamsRetry(
    () =>
      callGraphApi<GraphCollectionResponse<ChannelShape>>(`/teams/${params.teamId}/allChannels`, {
        query: {
          $top: params.top ?? 50,
          $skiptoken: params.skipToken,
        },
      }),
    'teamsListTeamChannels'
  );

  const channels = response.value ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            teamId: params.teamId,
            count: channels.length,
            nextLink: response['@odata.nextLink'],
            channels: channels.map((channel) => summarizeChannel(channel)),
          },
          null,
          2
        ),
      },
    ],
  };
}
