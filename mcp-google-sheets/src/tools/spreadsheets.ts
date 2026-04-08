import { z } from 'zod';
import { google } from 'googleapis';
import { getSheetsClient, summarizeSpreadsheet, withSheetsRetry } from '../utils/sheets-api.js';
import { getCurrentToken } from '../auth/token.js';

const MAX_LIST_PAGE_SIZE = 100;

export const GetSpreadsheetInputSchema = {
  spreadsheetId: z.string().min(1).describe('Google Spreadsheet ID'),
};

export const CreateSpreadsheetInputSchema = {
  title: z.string().min(1).describe('Spreadsheet title'),
  locale: z.string().optional().describe('Optional locale, e.g. en_US'),
  timeZone: z.string().optional().describe('Optional IANA timezone, e.g. America/Los_Angeles'),
};

export const ListSpreadsheetsInputSchema = {
  query: z.string().optional().describe('Optional title keyword search'),
  pageSize: z.number().int().min(1).max(MAX_LIST_PAGE_SIZE).optional().describe('Number of spreadsheets to return (max 100)'),
  pageToken: z.string().optional().describe('Pagination token from previous response'),
};

export interface GetSpreadsheetParams {
  spreadsheetId: string;
}

export interface CreateSpreadsheetParams {
  title: string;
  locale?: string;
  timeZone?: string;
}

export interface ListSpreadsheetsParams {
  query?: string;
  pageSize?: number;
  pageToken?: string;
}

function getDriveClient() {
  const token = getCurrentToken();
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  return google.drive({ version: 'v3', auth });
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export async function gsheetsGetSpreadsheet(params: GetSpreadsheetParams) {
  const sheets = getSheetsClient();

  const response = await withSheetsRetry(
    () =>
      sheets.spreadsheets.get({
        spreadsheetId: params.spreadsheetId,
        includeGridData: false,
        fields:
          'spreadsheetId,spreadsheetUrl,properties(title,locale,timeZone),sheets(properties(sheetId,title,index,sheetType,gridProperties(rowCount,columnCount)))',
      }),
    'gsheetsGetSpreadsheet'
  );

  const summary = summarizeSpreadsheet(response.data);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(summary, null, 2),
      },
    ],
    structuredContent: {
      kind: 'gsheets-spreadsheet-metadata',
      spreadsheet: summary,
    },
  };
}

export async function gsheetsCreateSpreadsheet(params: CreateSpreadsheetParams) {
  const sheets = getSheetsClient();

  const response = await withSheetsRetry(
    () =>
      sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: params.title,
            locale: params.locale,
            timeZone: params.timeZone,
          },
        },
        fields:
          'spreadsheetId,spreadsheetUrl,properties(title,locale,timeZone),sheets(properties(sheetId,title,index,sheetType,gridProperties(rowCount,columnCount)))',
      }),
    'gsheetsCreateSpreadsheet'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            ...summarizeSpreadsheet(response.data),
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function gsheetsListSpreadsheets(params: ListSpreadsheetsParams) {
  const drive = getDriveClient();
  const baseQuery = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  const keyword = params.query?.trim();
  const fullQuery =
    keyword && keyword.length > 0
      ? `${baseQuery} and name contains '${escapeDriveQueryValue(keyword)}'`
      : baseQuery;

  const response = await withSheetsRetry(
    () =>
      drive.files.list({
        q: fullQuery,
        spaces: 'drive',
        pageSize: params.pageSize ?? 20,
        pageToken: params.pageToken,
        orderBy: 'modifiedTime desc',
        fields: 'nextPageToken,files(id,name,webViewLink,modifiedTime,owners(displayName,emailAddress))',
      }),
    'gsheetsListSpreadsheets'
  );

  const files = response.data.files ?? [];
  const spreadsheets = files.map((file) => ({
    spreadsheetId: file.id,
    title: file.name,
    spreadsheetUrl: file.webViewLink,
    modifiedTime: file.modifiedTime,
    owners: (file.owners ?? []).map((owner) => ({
      displayName: owner.displayName,
      emailAddress: owner.emailAddress,
    })),
  }));

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            count: files.length,
            nextPageToken: response.data.nextPageToken,
            spreadsheets,
          },
          null,
          2
        ),
      },
    ],
    structuredContent: {
      kind: 'gsheets-spreadsheet-browser',
      query: params.query?.trim() || null,
      pageSize: params.pageSize ?? 20,
      totalResults: files.length,
      nextPageToken: response.data.nextPageToken ?? null,
      spreadsheets,
    },
  };
}
