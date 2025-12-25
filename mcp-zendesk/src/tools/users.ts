/**
 * Zendesk User Management Tools
 *
 * Provides MCP tools for managing Zendesk users
 */

import { z } from 'zod';
import { zendeskAPI } from '../utils/zendesk-api.js';
import { toMcpError } from '../utils/errors.js';
import type { ZendeskUserResponse, ZendeskUsersResponse } from '../types/index.js';

/**
 * List users
 */
export const listUsersSchema = z.object({
  role: z.enum(['end-user', 'agent', 'admin']).optional()
    .describe('Filter by user role'),
  limit: z.number().min(1).max(100).default(25)
    .describe('Number of users to return (1-100, default: 25)'),
});

export async function listUsers(args: z.infer<typeof listUsersSchema>) {
  try {
    let endpoint = `/users?per_page=${args.limit}`;

    if (args.role) {
      endpoint += `&role=${args.role}`;
    }

    const data = await zendeskAPI.get<ZendeskUsersResponse>(endpoint);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          users: data.users,
          count: data.count,
          has_more: !!data.next_page,
        }, null, 2),
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'list_users');
  }
}

/**
 * Get a single user
 */
export const getUserSchema = z.object({
  user_id: z.number().describe('User ID'),
});

export async function getUser(args: z.infer<typeof getUserSchema>) {
  try {
    const data = await zendeskAPI.get<ZendeskUserResponse>(`/users/${args.user_id}`);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(data.user, null, 2),
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'get_user');
  }
}

/**
 * Create a new user
 */
export const createUserSchema = z.object({
  name: z.string().describe('User name'),
  email: z.string().email().describe('User email address'),
  role: z.enum(['end-user', 'agent', 'admin']).default('end-user')
    .describe('User role (default: end-user)'),
  verified: z.boolean().optional()
    .describe('Whether the user is verified'),
  organization_id: z.number().optional()
    .describe('Organization ID to associate with user'),
  tags: z.array(z.string()).optional()
    .describe('User tags'),
});

export async function createUser(args: z.infer<typeof createUserSchema>) {
  try {
    const userData: Record<string, unknown> = {
      name: args.name,
      email: args.email,
      role: args.role,
    };

    if (args.verified !== undefined) userData.verified = args.verified;
    if (args.organization_id) userData.organization_id = args.organization_id;
    if (args.tags) userData.tags = args.tags;

    const data = await zendeskAPI.post<ZendeskUserResponse>('/users', {
      user: userData,
    });

    return {
      content: [{
        type: 'text' as const,
        text: `User created successfully!\n\n${JSON.stringify(data.user, null, 2)}`,
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'create_user');
  }
}

/**
 * Update a user
 */
export const updateUserSchema = z.object({
  user_id: z.number().describe('User ID'),
  name: z.string().optional()
    .describe('New name'),
  email: z.string().email().optional()
    .describe('New email address'),
  role: z.enum(['end-user', 'agent', 'admin']).optional()
    .describe('New role'),
  verified: z.boolean().optional()
    .describe('Whether the user is verified'),
  organization_id: z.number().optional()
    .describe('Organization ID'),
  tags: z.array(z.string()).optional()
    .describe('User tags'),
});

export async function updateUser(args: z.infer<typeof updateUserSchema>) {
  try {
    const userData: Record<string, unknown> = {};

    if (args.name) userData.name = args.name;
    if (args.email) userData.email = args.email;
    if (args.role) userData.role = args.role;
    if (args.verified !== undefined) userData.verified = args.verified;
    if (args.organization_id) userData.organization_id = args.organization_id;
    if (args.tags) userData.tags = args.tags;

    const data = await zendeskAPI.put<ZendeskUserResponse>(
      `/users/${args.user_id}`,
      { user: userData }
    );

    return {
      content: [{
        type: 'text' as const,
        text: `User updated successfully!\n\n${JSON.stringify(data.user, null, 2)}`,
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'update_user');
  }
}

/**
 * Delete a user
 */
export const deleteUserSchema = z.object({
  user_id: z.number().describe('User ID to delete'),
});

export async function deleteUser(args: z.infer<typeof deleteUserSchema>) {
  try {
    await zendeskAPI.delete(`/users/${args.user_id}`);

    return {
      content: [{
        type: 'text' as const,
        text: `User #${args.user_id} deleted successfully!`,
      }],
    };
  } catch (error) {
    throw toMcpError(error, 'delete_user');
  }
}
