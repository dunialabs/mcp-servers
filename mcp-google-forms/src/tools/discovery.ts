import { z } from 'zod';
import { callDriveApi, extractFormIdFromUrl, withFormsRetry } from '../utils/forms-api.js';

export const ListFormsInputSchema = {
  pageSize: z.number().int().min(1).max(1000).optional().describe('Page size, max 1000'),
  pageToken: z.string().optional().describe('Next page token from previous response'),
  query: z.string().optional().describe('Extra Drive query condition'),
};

export const ExtractFormIdInputSchema = {
  url: z.string().url().describe('Google Form URL'),
};

export interface ListFormsParams {
  pageSize?: number;
  pageToken?: string;
  query?: string;
}

export interface ExtractFormIdParams {
  url: string;
}

interface DriveFileShape {
  id?: string;
  name?: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  owners?: Array<{ displayName?: string; emailAddress?: string }>;
}

interface DriveListResponse {
  files?: DriveFileShape[];
  nextPageToken?: string;
}

function summarizeFile(file: DriveFileShape) {
  return {
    formId: file.id,
    title: file.name,
    webViewLink: file.webViewLink,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    owners: file.owners,
  };
}

export async function formsListForms(params: ListFormsParams) {
  const baseQuery = "mimeType='application/vnd.google-apps.form' and trashed=false";
  const query = params.query ? `${baseQuery} and (${params.query})` : baseQuery;

  const response = await withFormsRetry(
    () =>
      callDriveApi<DriveListResponse>('/files', {
        query: {
          q: query,
          pageSize: params.pageSize ?? 100,
          pageToken: params.pageToken,
          fields:
            'nextPageToken,files(id,name,webViewLink,createdTime,modifiedTime,owners(displayName,emailAddress))',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        },
      }),
    'formsListForms'
  );

  const files = response.files ?? [];

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            count: files.length,
            nextPageToken: response.nextPageToken,
            forms: files.map((item) => summarizeFile(item)),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function formsExtractFormId(params: ExtractFormIdParams) {
  const extracted = extractFormIdFromUrl(params.url);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            url: params.url,
            formId: extracted.formId,
            warning: extracted.warning,
            found: extracted.formId !== null,
          },
          null,
          2
        ),
      },
    ],
  };
}
