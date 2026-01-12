/**
 * Asset Management Tools
 * Implements Canva Connect API asset endpoints
 */

import { canvaAPI } from '../utils/canva-api.js';
import { toMcpError } from '../utils/errors.js';
import type {
  AssetUploadJobResult,
  UrlAssetUploadRequest,
  Asset,
  UpdateAssetRequest,
} from '../types/index.js';

export async function uploadAssetFromUrl(params: UrlAssetUploadRequest): Promise<string> {
  try {
    const response = await canvaAPI.post<AssetUploadJobResult>(
      '/url-asset-uploads',
      params
    );
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'uploadAssetFromUrl');
  }
}

export async function getAssetUploadStatus(jobId: string): Promise<string> {
  try {
    const response = await canvaAPI.get<AssetUploadJobResult>(
      `/asset-uploads/${jobId}`
    );
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getAssetUploadStatus');
  }
}

export async function getUrlAssetUploadStatus(jobId: string): Promise<string> {
  try {
    const response = await canvaAPI.get<AssetUploadJobResult>(
      `/url-asset-uploads/${jobId}`
    );
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getUrlAssetUploadStatus');
  }
}

export async function getAsset(assetId: string): Promise<string> {
  try {
    const response = await canvaAPI.get<{ asset: Asset }>(`/assets/${assetId}`);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getAsset');
  }
}

export async function updateAsset(
  assetId: string,
  params: UpdateAssetRequest
): Promise<string> {
  try {
    await canvaAPI.patch(`/assets/${assetId}`, params);
    return JSON.stringify({ success: true, message: 'Asset updated successfully' });
  } catch (error) {
    throw toMcpError(error, 'updateAsset');
  }
}

export async function deleteAsset(assetId: string): Promise<string> {
  try {
    await canvaAPI.delete(`/assets/${assetId}`);
    return JSON.stringify({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    throw toMcpError(error, 'deleteAsset');
  }
}
