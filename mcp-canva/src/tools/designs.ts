/**
 * Design Management Tools
 * Implements Canva Connect API design endpoints
 */

import { canvaAPI } from '../utils/canva-api.js';
import { toMcpError } from '../utils/errors.js';
import type {
  CreateDesignRequest,
  ListDesignsRequest,
  ListDesignsResponse,
  GetDesignResponse,
  ListDesignPagesResponse,
  GetExportFormatsResponse,
} from '../types/index.js';

export async function createDesign(params: CreateDesignRequest): Promise<string> {
  try {
    const response = await canvaAPI.post<GetDesignResponse>('/designs', params);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'createDesign');
  }
}

export async function listDesigns(params: ListDesignsRequest): Promise<string> {
  try {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.set('query', params.query);
    if (params.ownership) queryParams.set('ownership', params.ownership);
    if (params.sort_by) queryParams.set('sort_by', params.sort_by);
    if (params.continuation) queryParams.set('continuation', params.continuation);
    if (params.limit) queryParams.set('limit', params.limit.toString());

    const endpoint = `/designs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await canvaAPI.get<ListDesignsResponse>(endpoint);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'listDesigns');
  }
}

export async function getDesign(designId: string): Promise<string> {
  try {
    const response = await canvaAPI.get<GetDesignResponse>(`/designs/${designId}`);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getDesign');
  }
}

export async function getDesignPages(
  designId: string,
  params?: { offset?: number; limit?: number }
): Promise<string> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const endpoint = `/designs/${designId}/pages${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await canvaAPI.get<ListDesignPagesResponse>(endpoint);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getDesignPages');
  }
}

export async function getDesignExportFormats(designId: string): Promise<string> {
  try {
    const response = await canvaAPI.get<GetExportFormatsResponse>(
      `/designs/${designId}/export-formats`
    );
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getDesignExportFormats');
  }
}
