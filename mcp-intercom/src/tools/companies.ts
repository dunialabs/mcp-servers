/**
 * Company Management Tools
 * Implements Intercom API company endpoints
 */

import { intercomAPI } from '../utils/intercom-api.js';
import { toMcpError } from '../utils/errors.js';
import type { Company, CompanyList } from '../types/index.js';

/**
 * List all companies with pagination
 */
export async function listCompanies(params: {
  per_page?: number;
  page?: number;
  order?: 'asc' | 'desc';
}): Promise<string> {
  try {
    const queryParams = new URLSearchParams();
    if (params.per_page) queryParams.set('per_page', params.per_page.toString());
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.order) queryParams.set('order', params.order);

    const endpoint = `/companies${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await intercomAPI.get<CompanyList>(endpoint);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'listCompanies');
  }
}

/**
 * Get a single company by ID
 */
export async function getCompany(companyId: string): Promise<string> {
  try {
    const response = await intercomAPI.get<Company>(`/companies/${companyId}`);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toMcpError(error, 'getCompany');
  }
}
