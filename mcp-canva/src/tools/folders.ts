/**
 * Folder Management Tools
 * Implements Canva Connect API folder endpoints
 */

import { canvaAPI } from '../utils/canva-api.js';
import { toMcpError } from '../utils/errors.js';
import type {
  CreateFolderRequest,
  UpdateFolderRequest,
  ListFolderItemsRequest,
  ListFolderItemsResponse,
  MoveFolderItemRequest,
  Folder,
} from '../types/index.js';

export async function createFolder(params: CreateFolderRequest): Promise<string> {
  try {
    const response = await canvaAPI.post<{ folder: Folder }>('/folders', params);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'createFolder');
  }
}

export async function getFolder(folderId: string): Promise<string> {
  try {
    const response = await canvaAPI.get<{ folder: Folder }>(`/folders/${folderId}`);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getFolder');
  }
}

export async function updateFolder(
  folderId: string,
  params: UpdateFolderRequest
): Promise<string> {
  try {
    await canvaAPI.patch(`/folders/${folderId}`, params);
    return JSON.stringify({ success: true, message: 'Folder updated successfully' });
  } catch (error) {
    throw toMcpError(error, 'updateFolder');
  }
}

export async function deleteFolder(folderId: string): Promise<string> {
  try {
    await canvaAPI.delete(`/folders/${folderId}`);
    return JSON.stringify({ success: true, message: 'Folder deleted successfully' });
  } catch (error) {
    throw toMcpError(error, 'deleteFolder');
  }
}

export async function listFolderItems(
  folderId: string,
  params?: ListFolderItemsRequest
): Promise<string> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.continuation) queryParams.set('continuation', params.continuation);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.item_types && params.item_types.length > 0) {
      queryParams.set('item_types', params.item_types.join(','));
    }
    if (params?.sort_by) queryParams.set('sort_by', params.sort_by);

    const endpoint = `/folders/${folderId}/items${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await canvaAPI.get<ListFolderItemsResponse>(endpoint);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'listFolderItems');
  }
}

export async function moveFolderItem(params: MoveFolderItemRequest): Promise<string> {
  try {
    await canvaAPI.post('/folders/items/move', params);
    return JSON.stringify({ success: true, message: 'Item moved successfully' });
  } catch (error) {
    throw toMcpError(error, 'moveFolderItem');
  }
}
