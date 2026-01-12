/**
 * Export Tools
 * Implements Canva Connect API export endpoints
 */

import { canvaAPI } from '../utils/canva-api.js';
import { toMcpError } from '../utils/errors.js';
import type {
  CreateExportRequest,
  GetExportResponse,
} from '../types/index.js';

export async function createExport(params: CreateExportRequest): Promise<string> {
  try {
    const response = await canvaAPI.post<GetExportResponse>('/exports', params);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'createExport');
  }
}

export async function getExportStatus(exportId: string): Promise<string> {
  try {
    const response = await canvaAPI.get<GetExportResponse>(`/exports/${exportId}`);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getExportStatus');
  }
}
