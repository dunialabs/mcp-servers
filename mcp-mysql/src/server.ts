/**
 * MySQL MCP Server
 *
 * A production-ready Model Context Protocol server for MySQL database operations.
 * Provides database management tools for schema exploration, query execution,
 * and database introspection.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { handleUnknownError } from './utils/errors.js';
import { logger } from './utils/logger.js';

import { listDatabases, listTables, describeTable, getTableStats } from './tools/schema.js';
import {
  executeQuery,
  executeWrite,
  explainQuery,
  showCreateTable,
  showProcessList,
} from './tools/query.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const VERSION = packageJson.version as string;

// ==================== Zod Schemas ====================

const QueryParameterSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.record(z.unknown()),
  z.array(z.unknown()),
]);

const ListTablesSchema = z.object({
  database: z.string().min(1).describe('Database name to list tables from'),
});

const DescribeTableSchema = z.object({
  database: z.string().min(1).describe('Database name'),
  table: z.string().min(1).describe('Table name to describe'),
});

const GetTableStatsSchema = z.object({
  database: z.string().min(1).describe('Database name'),
  table: z.string().min(1).describe('Table name to get statistics for'),
});

const ExecuteQuerySchema = z.object({
  query: z.string().min(1).describe('SQL SELECT query to execute'),
  parameters: z
    .array(QueryParameterSchema)
    .optional()
    .describe('Query parameters for parameterized queries (use ? placeholders)'),
  maxRows: z
    .number()
    .int()
    .positive()
    .max(10000)
    .optional()
    .describe('Maximum number of rows to return (default: 1000, max: 10000)'),
  timeout: z
    .number()
    .int()
    .positive()
    .max(300000)
    .optional()
    .describe('Query timeout in milliseconds (default: 30000, max: 300000)'),
});

const ExecuteWriteSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe('SQL INSERT/UPDATE/DELETE/REPLACE/TRUNCATE query to execute'),
  parameters: z
    .array(QueryParameterSchema)
    .optional()
    .describe('Query parameters for parameterized queries (use ? placeholders)'),
  timeout: z
    .number()
    .int()
    .positive()
    .max(300000)
    .optional()
    .describe('Query timeout in milliseconds (default: 30000, max: 300000)'),
});

const ExplainQuerySchema = z.object({
  query: z.string().min(1).describe('SQL query to analyze'),
  analyze: z
    .boolean()
    .optional()
    .describe(
      'Run EXPLAIN ANALYZE to get actual execution timing (MySQL 8.0.18+). The query is actually executed.'
    ),
  format: z
    .enum(['TRADITIONAL', 'TREE', 'JSON'])
    .optional()
    .describe(
      'Output format: TREE (default, MySQL 8.0+), TRADITIONAL (all versions), JSON (verbose). Ignored when analyze=true.'
    ),
});

const ShowCreateTableSchema = z.object({
  database: z.string().min(1).describe('Database name'),
  table: z.string().min(1).describe('Table name to show CREATE TABLE DDL for'),
});

// ==================== Server ====================

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'mcp-mysql',
    version: VERSION,
  });

  logger.info('[Server] Registering MySQL tools...');

  // ========================================
  // SCHEMA EXPLORATION TOOLS
  // ========================================

  server.registerTool(
    'mysqlListDatabases',
    {
      title: 'MySQL - List Databases',
      description:
        'List all user databases with table count and total size. Excludes MySQL system databases (information_schema, mysql, performance_schema, sys).',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        logger.debug('[Tool] mysqlListDatabases called');
        return await listDatabases();
      } catch (error) {
        throw handleUnknownError(error, 'mysqlListDatabases tool');
      }
    }
  );

  server.registerTool(
    'mysqlListTables',
    {
      title: 'MySQL - List Tables in Database',
      description:
        'List all tables in a specified database with storage engine, estimated row count, size in MB, and table comments. Only lists BASE TABLEs (excludes views).',
      inputSchema: ListTablesSchema,
    },
    async (params) => {
      try {
        logger.debug('[Tool] mysqlListTables called', params);
        const validated = ListTablesSchema.parse(params);
        return await listTables(validated);
      } catch (error) {
        throw handleUnknownError(error, 'mysqlListTables tool');
      }
    }
  );

  server.registerTool(
    'mysqlDescribeTable',
    {
      title: 'MySQL - Describe Table Structure',
      description:
        'Get detailed information about a table structure including columns (with data types, nullability, defaults, AUTO_INCREMENT, comments), indexes (PRIMARY KEY, UNIQUE, INDEX), and foreign keys (with ON UPDATE/DELETE rules).',
      inputSchema: DescribeTableSchema,
    },
    async (params) => {
      try {
        logger.debug('[Tool] mysqlDescribeTable called', params);
        const validated = DescribeTableSchema.parse(params);
        return await describeTable(validated);
      } catch (error) {
        throw handleUnknownError(error, 'mysqlDescribeTable tool');
      }
    }
  );

  server.registerTool(
    'mysqlGetTableStats',
    {
      title: 'MySQL - Get Table Statistics',
      description:
        'Get statistical information about a table including estimated row count, data size, index size, total size, AUTO_INCREMENT value, storage engine, collation, and timestamps. Row count is an estimate — use COUNT(*) query for exact count.',
      inputSchema: GetTableStatsSchema,
    },
    async (params) => {
      try {
        logger.debug('[Tool] mysqlGetTableStats called', params);
        const validated = GetTableStatsSchema.parse(params);
        return await getTableStats(validated);
      } catch (error) {
        throw handleUnknownError(error, 'mysqlGetTableStats tool');
      }
    }
  );

  // ========================================
  // QUERY EXECUTION TOOLS
  // ========================================

  server.registerTool(
    'mysqlExecuteQuery',
    {
      title: 'MySQL - Execute SELECT Query',
      description:
        'Execute read-only SELECT queries and return results formatted as a markdown table. Only SELECT and WITH (CTE) queries are allowed. Supports parameterized queries (use ? placeholders) to prevent SQL injection. Automatic row limit applied (default: 1000, max: 10000). Query timeout enforced via MAX_EXECUTION_TIME hint (default: 30s, max: 5min).',
      inputSchema: ExecuteQuerySchema,
    },
    async (params) => {
      try {
        logger.debug('[Tool] mysqlExecuteQuery called', { queryLength: params.query?.length });
        const validated = ExecuteQuerySchema.parse(params);
        return await executeQuery(validated);
      } catch (error) {
        throw handleUnknownError(error, 'mysqlExecuteQuery tool');
      }
    }
  );

  server.registerTool(
    'mysqlExecuteWrite',
    {
      title: 'MySQL - Execute Write Operation',
      description:
        'Execute INSERT, UPDATE, DELETE, REPLACE, or TRUNCATE statements to modify database data. Supports parameterized queries (use ? placeholders) to prevent SQL injection. Returns rows affected, insert ID, and changed rows. Query timeout protection (default: 30s, max: 5min).',
      inputSchema: ExecuteWriteSchema,
    },
    async (params) => {
      try {
        logger.debug('[Tool] mysqlExecuteWrite called', { queryLength: params.query?.length });
        const validated = ExecuteWriteSchema.parse(params);
        return await executeWrite(validated);
      } catch (error) {
        throw handleUnknownError(error, 'mysqlExecuteWrite tool');
      }
    }
  );

  server.registerTool(
    'mysqlExplainQuery',
    {
      title: 'MySQL - Explain Query Execution Plan',
      description:
        'Analyze query execution plans. EXPLAIN shows the planned execution without running the query. EXPLAIN ANALYZE (MySQL 8.0.18+) executes the query and shows actual timing. Format options: TREE (default, readable hierarchy, MySQL 8.0+), TRADITIONAL (tabular, all versions), JSON (verbose, all versions). Useful for identifying slow queries and verifying index usage.',
      inputSchema: ExplainQuerySchema,
    },
    async (params) => {
      try {
        logger.debug('[Tool] mysqlExplainQuery called', { queryLength: params.query?.length });
        const validated = ExplainQuerySchema.parse(params);
        return await explainQuery(validated);
      } catch (error) {
        throw handleUnknownError(error, 'mysqlExplainQuery tool');
      }
    }
  );

  // ========================================
  // MYSQL-SPECIFIC TOOLS
  // ========================================

  server.registerTool(
    'mysqlShowCreateTable',
    {
      title: 'MySQL - Show CREATE TABLE DDL',
      description:
        'Output the full CREATE TABLE statement (DDL) for a table, including all column definitions, indexes, foreign keys, engine, charset, and collation. Useful for understanding the exact schema definition and for reproducing the table structure.',
      inputSchema: ShowCreateTableSchema,
    },
    async (params) => {
      try {
        logger.debug('[Tool] mysqlShowCreateTable called', params);
        const validated = ShowCreateTableSchema.parse(params);
        return await showCreateTable(validated);
      } catch (error) {
        throw handleUnknownError(error, 'mysqlShowCreateTable tool');
      }
    }
  );

  server.registerTool(
    'mysqlShowProcessList',
    {
      title: 'MySQL - Show Active Process List',
      description:
        'Show all active MySQL connections and currently running queries. Displays process ID, user, host, database, command type, execution time (seconds), state, and SQL text. Useful for diagnosing slow queries, lock contention, and connection issues.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        logger.debug('[Tool] mysqlShowProcessList called');
        return await showProcessList();
      } catch (error) {
        throw handleUnknownError(error, 'mysqlShowProcessList tool');
      }
    }
  );

  logger.info('[Server] All 9 tools registered successfully');
  return server;
}
