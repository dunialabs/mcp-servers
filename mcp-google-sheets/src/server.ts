import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import {
  gsheetsCreateSpreadsheet,
  gsheetsGetSpreadsheet,
  gsheetsListSpreadsheets,
  CreateSpreadsheetInputSchema,
  GetSpreadsheetInputSchema,
  ListSpreadsheetsInputSchema,
} from './tools/spreadsheets.js';
import {
  gsheetsAppendValues,
  gsheetsBatchReadValues,
  gsheetsClearValues,
  gsheetsReadValues,
  gsheetsUpdateValues,
  AppendValuesInputSchema,
  BatchReadValuesInputSchema,
  ClearValuesInputSchema,
  ReadValuesInputSchema,
  UpdateValuesInputSchema,
} from './tools/values.js';
import {
  gsheetsAddSheet,
  gsheetsDeleteSheet,
  gsheetsDuplicateSheet,
  AddSheetInputSchema,
  DeleteSheetInputSchema,
  DuplicateSheetInputSchema,
} from './tools/sheets.js';
import { validateTokenFormat } from './auth/token.js';
import { logger } from './utils/logger.js';

function getServerVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
    const raw = readFileSync(packageJsonPath, 'utf8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export class GoogleSheetsMcpServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'google-sheets',
      version: getServerVersion(),
    });
  }

  async initialize() {
    logger.info('[Server] Initializing Google Sheets MCP Server');

    const tokenUpdateSchema = z
      .object({
        method: z.literal('notifications/token/update'),
        params: z
          .object({
            accessToken: z.string().optional(),
            token: z.string().optional(),
            timestamp: z.number().optional(),
          })
          .catchall(z.unknown()),
      })
      .catchall(z.unknown());

    type TokenUpdateNotification = z.infer<typeof tokenUpdateSchema>;

    this.server.server.setNotificationHandler(tokenUpdateSchema, async (notification: TokenUpdateNotification) => {
      const newToken = notification?.params?.accessToken ?? notification?.params?.token;

      if (!newToken || typeof newToken !== 'string' || newToken.trim().length === 0) {
        logger.error('[Token] Invalid token in notifications/token/update');
        return;
      }

      if (!validateTokenFormat(newToken)) {
        logger.error('[Token] Invalid token format in notifications/token/update');
        return;
      }

      process.env.accessToken = newToken.startsWith('Bearer ')
        ? newToken.slice(7).trim()
        : newToken.trim();
      logger.info('[Token] accessToken updated via notification');
    });

    this.registerTools();
    logger.info('[Server] Google Sheets MCP Server initialized');
  }

  private registerTools() {
    this.server.registerTool(
      'gsheetsListSpreadsheets',
      {
        title: 'GSheets - List Spreadsheets',
        description: 'List accessible Google Sheets files and return spreadsheet IDs.',
        inputSchema: ListSpreadsheetsInputSchema,
      },
      async (params) => gsheetsListSpreadsheets(params)
    );

    this.server.registerTool(
      'gsheetsGetSpreadsheet',
      {
        title: 'GSheets - Get Spreadsheet',
        description: 'Get spreadsheet metadata and sheet list by spreadsheet ID.',
        inputSchema: GetSpreadsheetInputSchema,
      },
      async (params) => gsheetsGetSpreadsheet(params)
    );

    this.server.registerTool(
      'gsheetsCreateSpreadsheet',
      {
        title: 'GSheets - Create Spreadsheet',
        description: 'Create a new spreadsheet with title and optional locale/timezone.',
        inputSchema: CreateSpreadsheetInputSchema,
      },
      async (params) => gsheetsCreateSpreadsheet(params)
    );

    this.server.registerTool(
      'gsheetsReadValues',
      {
        title: 'GSheets - Read Values',
        description: 'Read values from one range in A1 notation.',
        inputSchema: ReadValuesInputSchema,
      },
      async (params) => gsheetsReadValues(params)
    );

    this.server.registerTool(
      'gsheetsBatchReadValues',
      {
        title: 'GSheets - Batch Read Values',
        description: 'Read values from multiple ranges in one request.',
        inputSchema: BatchReadValuesInputSchema,
      },
      async (params) => gsheetsBatchReadValues(params)
    );

    this.server.registerTool(
      'gsheetsUpdateValues',
      {
        title: 'GSheets - Update Values',
        description: 'Update values in a target range.',
        inputSchema: UpdateValuesInputSchema,
      },
      async (params) => gsheetsUpdateValues(params)
    );

    this.server.registerTool(
      'gsheetsAppendValues',
      {
        title: 'GSheets - Append Values',
        description: 'Append rows to a range or table.',
        inputSchema: AppendValuesInputSchema,
      },
      async (params) => gsheetsAppendValues(params)
    );

    this.server.registerTool(
      'gsheetsClearValues',
      {
        title: 'GSheets - Clear Values',
        description: 'Clear values in a range.',
        inputSchema: ClearValuesInputSchema,
      },
      async (params) => gsheetsClearValues(params)
    );

    this.server.registerTool(
      'gsheetsAddSheet',
      {
        title: 'GSheets - Add Sheet',
        description: 'Add a new sheet tab to a spreadsheet.',
        inputSchema: AddSheetInputSchema,
      },
      async (params) => gsheetsAddSheet(params)
    );

    this.server.registerTool(
      'gsheetsDeleteSheet',
      {
        title: 'GSheets - Delete Sheet',
        description: 'Delete a sheet tab by sheet ID.',
        inputSchema: DeleteSheetInputSchema,
      },
      async (params) => gsheetsDeleteSheet(params)
    );

    this.server.registerTool(
      'gsheetsDuplicateSheet',
      {
        title: 'GSheets - Duplicate Sheet',
        description: 'Duplicate an existing sheet tab.',
        inputSchema: DuplicateSheetInputSchema,
      },
      async (params) => gsheetsDuplicateSheet(params)
    );

    logger.info('[Server] Registered 11 Google Sheets tools');
  }

  async connect(transport: Transport) {
    await this.server.connect(transport);
  }

  async cleanup() {
    logger.info('[Server] Cleanup completed');
  }
}
