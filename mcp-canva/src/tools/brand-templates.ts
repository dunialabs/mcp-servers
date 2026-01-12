/**
 * Brand Template and Autofill Tools
 * Implements Canva Connect API brand template endpoints
 */

import { canvaAPI } from '../utils/canva-api.js';
import { toMcpError } from '../utils/errors.js';
import type {
  ListBrandTemplatesRequest,
  ListBrandTemplatesResponse,
  BrandTemplate,
  GetBrandTemplateDatasetResponse,
  AutofillRequest,
  GetAutofillResponse,
} from '../types/index.js';

export async function listBrandTemplates(params: ListBrandTemplatesRequest): Promise<string> {
  try {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.set('query', params.query);
    if (params.ownership) queryParams.set('ownership', params.ownership);
    if (params.sort_by) queryParams.set('sort_by', params.sort_by);
    if (params.continuation) queryParams.set('continuation', params.continuation);
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.dataset) queryParams.set('dataset', params.dataset);

    const endpoint = `/brand-templates${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await canvaAPI.get<ListBrandTemplatesResponse>(endpoint);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'listBrandTemplates');
  }
}

export async function getBrandTemplate(templateId: string): Promise<string> {
  try {
    const response = await canvaAPI.get<{ brand_template: BrandTemplate }>(
      `/brand-templates/${templateId}`
    );
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getBrandTemplate');
  }
}

export async function getBrandTemplateDataset(templateId: string): Promise<string> {
  try {
    const response = await canvaAPI.get<GetBrandTemplateDatasetResponse>(
      `/brand-templates/${templateId}/dataset`
    );
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getBrandTemplateDataset');
  }
}

export async function createAutofill(params: AutofillRequest): Promise<string> {
  try {
    const response = await canvaAPI.post<GetAutofillResponse>('/autofills', params);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'createAutofill');
  }
}

export async function getAutofillStatus(jobId: string): Promise<string> {
  try {
    const response = await canvaAPI.get<GetAutofillResponse>(`/autofills/${jobId}`);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getAutofillStatus');
  }
}
