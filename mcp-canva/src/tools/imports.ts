/**
 * Import Tools
 * Implements Canva Connect API import endpoints
 */

import { canvaAPI } from '../utils/canva-api.js';
import { toMcpError } from '../utils/errors.js';
import type {
  UrlImportRequest,
  GetImportResponse,
} from '../types/index.js';

export async function importDesignFromUrl(params: UrlImportRequest): Promise<string> {
  try {
    const response = await canvaAPI.post<GetImportResponse>('/url-imports', params);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'importDesignFromUrl');
  }
}

export async function getImportStatus(jobId: string): Promise<string> {
  try {
    const response = await canvaAPI.get<GetImportResponse>(`/imports/${jobId}`);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getImportStatus');
  }
}

export async function getUrlImportStatus(jobId: string): Promise<string> {
  try {
    const response = await canvaAPI.get<GetImportResponse>(`/url-imports/${jobId}`);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getUrlImportStatus');
  }
}
