import { z } from 'zod';
import { getSheetsClient, withSheetsRetry } from '../utils/sheets-api.js';
import { createMcpError, SheetsErrorCode } from '../utils/errors.js';

export const AddSheetInputSchema = {
  spreadsheetId: z.string().min(1).describe('Google Spreadsheet ID'),
  title: z.string().min(1).describe('Title for the new sheet'),
  index: z.number().int().min(0).optional().describe('Optional position index'),
  rowCount: z.number().int().min(1).optional().describe('Optional initial row count'),
  columnCount: z.number().int().min(1).optional().describe('Optional initial column count'),
};

export const DeleteSheetInputSchema = {
  spreadsheetId: z.string().min(1).describe('Google Spreadsheet ID'),
  sheetId: z.number().int().min(0).describe('Sheet ID to delete'),
};

export const DuplicateSheetInputSchema = {
  spreadsheetId: z.string().min(1).describe('Google Spreadsheet ID'),
  sourceSheetId: z.number().int().min(0).describe('Source sheet ID to duplicate'),
  newSheetName: z.string().min(1).optional().describe('Optional new sheet title'),
  insertSheetIndex: z.number().int().min(0).optional().describe('Optional index for duplicated sheet'),
};

export interface AddSheetParams {
  spreadsheetId: string;
  title: string;
  index?: number;
  rowCount?: number;
  columnCount?: number;
}

export interface DeleteSheetParams {
  spreadsheetId: string;
  sheetId: number;
}

export interface DuplicateSheetParams {
  spreadsheetId: string;
  sourceSheetId: number;
  newSheetName?: string;
  insertSheetIndex?: number;
}

export async function gsheetsAddSheet(params: AddSheetParams) {
  const sheets = getSheetsClient();
  const hasExplicitGridSize = params.rowCount !== undefined || params.columnCount !== undefined;

  const response = await withSheetsRetry(
    () =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId: params.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: params.title,
                  index: params.index,
                  gridProperties:
                    hasExplicitGridSize
                      ? {
                          rowCount: params.rowCount,
                          columnCount: params.columnCount,
                        }
                      : undefined,
                },
              },
            },
          ],
          includeSpreadsheetInResponse: false,
        },
      }),
    'gsheetsAddSheet'
  );

  const addReply = response.data.replies?.[0]?.addSheet?.properties;

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            spreadsheetId: params.spreadsheetId,
            sheet: addReply
              ? {
                  sheetId: addReply.sheetId,
                  title: addReply.title,
                  index: addReply.index,
                  rowCount: addReply.gridProperties?.rowCount,
                  columnCount: addReply.gridProperties?.columnCount,
                }
              : null,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function gsheetsDeleteSheet(params: DeleteSheetParams) {
  const sheets = getSheetsClient();

  const spreadsheet = await withSheetsRetry(
    () =>
      sheets.spreadsheets.get({
        spreadsheetId: params.spreadsheetId,
        includeGridData: false,
        fields: 'sheets(properties(sheetId,title))',
      }),
    'gsheetsDeleteSheet.precheck'
  );

  const existingSheets = spreadsheet.data.sheets ?? [];
  if (existingSheets.length <= 1) {
    throw createMcpError(
      SheetsErrorCode.InvalidParams,
      'Cannot delete the last remaining sheet in a spreadsheet.'
    );
  }

  await withSheetsRetry(
    () =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId: params.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteSheet: {
                sheetId: params.sheetId,
              },
            },
          ],
          includeSpreadsheetInResponse: false,
        },
      }),
    'gsheetsDeleteSheet'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            spreadsheetId: params.spreadsheetId,
            sheetId: params.sheetId,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function gsheetsDuplicateSheet(params: DuplicateSheetParams) {
  const sheets = getSheetsClient();

  const response = await withSheetsRetry(
    () =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId: params.spreadsheetId,
        requestBody: {
          requests: [
            {
              duplicateSheet: {
                sourceSheetId: params.sourceSheetId,
                newSheetName: params.newSheetName,
                insertSheetIndex: params.insertSheetIndex,
              },
            },
          ],
          includeSpreadsheetInResponse: false,
        },
      }),
    'gsheetsDuplicateSheet'
  );

  const duplicateReply = response.data.replies?.[0]?.duplicateSheet?.properties;

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            spreadsheetId: params.spreadsheetId,
            sourceSheetId: params.sourceSheetId,
            duplicatedSheet: duplicateReply
              ? {
                  sheetId: duplicateReply.sheetId,
                  title: duplicateReply.title,
                  index: duplicateReply.index,
                }
              : null,
          },
          null,
          2
        ),
      },
    ],
  };
}
