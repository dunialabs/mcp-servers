import { z } from 'zod';
import { getSheetsClient, withSheetsRetry } from '../utils/sheets-api.js';

const MAX_BATCH_RANGES = 50;
const MAX_WRITE_ROWS = 5000;
const MAX_WRITE_COLUMNS = 200;

const CellValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const ValueMatrixSchema = z
  .array(z.array(CellValueSchema).max(MAX_WRITE_COLUMNS))
  .min(1)
  .max(MAX_WRITE_ROWS);

export const ReadValuesInputSchema = {
  spreadsheetId: z.string().min(1).describe('Google Spreadsheet ID'),
  range: z.string().min(1).describe('A1 notation range, e.g. Sheet1!A1:C20'),
  majorDimension: z.enum(['ROWS', 'COLUMNS']).optional().describe('Return values by rows or columns'),
  valueRenderOption: z
    .enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'])
    .optional()
    .describe('How values should be represented'),
  dateTimeRenderOption: z
    .enum(['SERIAL_NUMBER', 'FORMATTED_STRING'])
    .optional()
    .describe('How dates/times should be represented'),
};

export const BatchReadValuesInputSchema = {
  spreadsheetId: z.string().min(1).describe('Google Spreadsheet ID'),
  ranges: z.array(z.string().min(1)).min(1).max(MAX_BATCH_RANGES).describe('A1 notation ranges'),
  majorDimension: z.enum(['ROWS', 'COLUMNS']).optional().describe('Return values by rows or columns'),
  valueRenderOption: z
    .enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'])
    .optional()
    .describe('How values should be represented'),
  dateTimeRenderOption: z
    .enum(['SERIAL_NUMBER', 'FORMATTED_STRING'])
    .optional()
    .describe('How dates/times should be represented'),
};

export const UpdateValuesInputSchema = {
  spreadsheetId: z.string().min(1).describe('Google Spreadsheet ID'),
  range: z.string().min(1).describe('Target A1 notation range'),
  values: ValueMatrixSchema.describe('2D array of cell values'),
  valueInputOption: z
    .enum(['RAW', 'USER_ENTERED'])
    .optional()
    .describe('How input values should be interpreted (default USER_ENTERED)'),
  majorDimension: z.enum(['ROWS', 'COLUMNS']).optional().describe('Input major dimension (default ROWS)'),
};

export const AppendValuesInputSchema = {
  spreadsheetId: z.string().min(1).describe('Google Spreadsheet ID'),
  range: z.string().min(1).describe('Table/range used to append values'),
  values: ValueMatrixSchema.describe('2D array of rows to append'),
  valueInputOption: z
    .enum(['RAW', 'USER_ENTERED'])
    .optional()
    .describe('How input values should be interpreted (default USER_ENTERED)'),
  insertDataOption: z
    .enum(['OVERWRITE', 'INSERT_ROWS'])
    .optional()
    .describe('How to insert new values (default INSERT_ROWS)'),
  majorDimension: z.enum(['ROWS', 'COLUMNS']).optional().describe('Input major dimension (default ROWS)'),
};

export const ClearValuesInputSchema = {
  spreadsheetId: z.string().min(1).describe('Google Spreadsheet ID'),
  range: z.string().min(1).describe('A1 notation range to clear'),
};

export interface ReadValuesParams {
  spreadsheetId: string;
  range: string;
  majorDimension?: 'ROWS' | 'COLUMNS';
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
  dateTimeRenderOption?: 'SERIAL_NUMBER' | 'FORMATTED_STRING';
}

export interface BatchReadValuesParams {
  spreadsheetId: string;
  ranges: string[];
  majorDimension?: 'ROWS' | 'COLUMNS';
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
  dateTimeRenderOption?: 'SERIAL_NUMBER' | 'FORMATTED_STRING';
}

export interface UpdateValuesParams {
  spreadsheetId: string;
  range: string;
  values: Array<Array<string | number | boolean | null>>;
  valueInputOption?: 'RAW' | 'USER_ENTERED';
  majorDimension?: 'ROWS' | 'COLUMNS';
}

export interface AppendValuesParams {
  spreadsheetId: string;
  range: string;
  values: Array<Array<string | number | boolean | null>>;
  valueInputOption?: 'RAW' | 'USER_ENTERED';
  insertDataOption?: 'OVERWRITE' | 'INSERT_ROWS';
  majorDimension?: 'ROWS' | 'COLUMNS';
}

export interface ClearValuesParams {
  spreadsheetId: string;
  range: string;
}

export async function gsheetsReadValues(params: ReadValuesParams) {
  const sheets = getSheetsClient();

  const response = await withSheetsRetry(
    () =>
      sheets.spreadsheets.values.get({
        spreadsheetId: params.spreadsheetId,
        range: params.range,
        majorDimension: params.majorDimension,
        valueRenderOption: params.valueRenderOption,
        dateTimeRenderOption: params.dateTimeRenderOption,
      }),
    'gsheetsReadValues'
  );

  const values = response.data.values ?? [];
  const rowCount = values.length;
  const columnCount = values.reduce((max, row) => Math.max(max, row.length), 0);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            spreadsheetId: params.spreadsheetId,
            range: response.data.range,
            majorDimension: response.data.majorDimension,
            values,
          },
          null,
          2
        ),
      },
    ],
    structuredContent: {
      kind: 'gsheets-range',
      spreadsheetId: params.spreadsheetId,
      range: response.data.range ?? params.range,
      majorDimension: response.data.majorDimension ?? params.majorDimension ?? 'ROWS',
      rowCount,
      columnCount,
      values,
    },
  };
}

export async function gsheetsBatchReadValues(params: BatchReadValuesParams) {
  const sheets = getSheetsClient();

  const response = await withSheetsRetry(
    () =>
      sheets.spreadsheets.values.batchGet({
        spreadsheetId: params.spreadsheetId,
        ranges: params.ranges,
        majorDimension: params.majorDimension,
        valueRenderOption: params.valueRenderOption,
        dateTimeRenderOption: params.dateTimeRenderOption,
      }),
    'gsheetsBatchReadValues'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            spreadsheetId: response.data.spreadsheetId,
            valueRanges: response.data.valueRanges ?? [],
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function gsheetsUpdateValues(params: UpdateValuesParams) {
  const sheets = getSheetsClient();

  const response = await withSheetsRetry(
    () =>
      sheets.spreadsheets.values.update({
        spreadsheetId: params.spreadsheetId,
        range: params.range,
        valueInputOption: params.valueInputOption ?? 'USER_ENTERED',
        requestBody: {
          range: params.range,
          majorDimension: params.majorDimension ?? 'ROWS',
          values: params.values,
        },
      }),
    'gsheetsUpdateValues'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            spreadsheetId: response.data.spreadsheetId,
            updatedRange: response.data.updatedRange,
            updatedRows: response.data.updatedRows,
            updatedColumns: response.data.updatedColumns,
            updatedCells: response.data.updatedCells,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function gsheetsAppendValues(params: AppendValuesParams) {
  const sheets = getSheetsClient();

  const response = await withSheetsRetry(
    () =>
      sheets.spreadsheets.values.append({
        spreadsheetId: params.spreadsheetId,
        range: params.range,
        valueInputOption: params.valueInputOption ?? 'USER_ENTERED',
        insertDataOption: params.insertDataOption ?? 'INSERT_ROWS',
        requestBody: {
          majorDimension: params.majorDimension ?? 'ROWS',
          values: params.values,
        },
      }),
    'gsheetsAppendValues'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            spreadsheetId: response.data.spreadsheetId,
            tableRange: response.data.tableRange,
            updates: response.data.updates,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function gsheetsClearValues(params: ClearValuesParams) {
  const sheets = getSheetsClient();

  const response = await withSheetsRetry(
    () =>
      sheets.spreadsheets.values.clear({
        spreadsheetId: params.spreadsheetId,
        range: params.range,
      }),
    'gsheetsClearValues'
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            success: true,
            spreadsheetId: params.spreadsheetId,
            clearedRange: response.data.clearedRange,
          },
          null,
          2
        ),
      },
    ],
  };
}
