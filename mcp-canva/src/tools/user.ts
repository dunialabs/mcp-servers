/**
 * User Information Tools
 * Implements Canva Connect API user endpoints
 */

import { canvaAPI } from '../utils/canva-api.js';
import { toMcpError } from '../utils/errors.js';
import type {
  User,
  UserProfile,
  GetUserCapabilitiesResponse,
} from '../types/index.js';

export async function getUser(): Promise<string> {
  try {
    const response = await canvaAPI.get<User>('/users/me');
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getUser');
  }
}

export async function getUserProfile(): Promise<string> {
  try {
    const response = await canvaAPI.get<UserProfile>('/users/me/profile');
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getUserProfile');
  }
}

export async function getUserCapabilities(): Promise<string> {
  try {
    const response = await canvaAPI.get<GetUserCapabilitiesResponse>('/users/me/capabilities');
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getUserCapabilities');
  }
}
