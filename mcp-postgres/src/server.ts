/**
 * PostgreSQL MCP Server
 *
 * A production-ready Model Context Protocol server for PostgreSQL database operations.
 * Provides intelligent database management tools for schema exploration, query execution,
 * and database introspection.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { handleUnknownError } from './utils/errors.js';
import { logger } from './utils/logger.js';

// Import all tool functions
import { listSchemas, listTables, describeTable, getTableStats } from './tools/schema.js';
import { executeQuery, executeWrite, explainQuery } from './tools/query.js';

// Read version from package.json (single source of truth)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);
const VERSION = packageJson.version;

/**
 * SERVER_INSTRUCTIONS
 *
 * This PostgreSQL MCP Server provides comprehensive database management capabilities:
 *
 * SCHEMA EXPLORATION:
 * - listSchemas: Discover all schemas in the database with table counts
 * - listTables: View all tables within a specific schema with size information
 * - describeTable: Get detailed table structure (columns, types, constraints, indexes)
 * - getTableStats: Retrieve table statistics (row count, size, indexes size)
 *
 * QUERY EXECUTION:
 * - executeQuery: Execute SELECT queries safely with automatic row limits
 * - executeWrite: Execute INSERT/UPDATE/DELETE operations (requires readwrite mode)
 * - explainQuery: Analyze query execution plans with EXPLAIN/EXPLAIN ANALYZE
 *
 * SAFETY FEATURES:
 * - Readonly mode by default (set ACCESS_MODE=readwrite for write operations)
 * - Automatic query timeouts to prevent long-running operations
 * - Row limits on SELECT queries to prevent overwhelming results
 * - Parameter binding support to prevent SQL injection
 *
 * BEST PRACTICES:
 * - Always explore schemas and tables before querying
 * - Use describeTable to understand table structure
 * - Use parameters array for dynamic values in queries
 * - Use explainQuery to optimize slow queries
 * - Check getTableStats before operations on large tables
 */

// Zod schemas for tool parameters
const ListTablesSchema = z.object({
  schema: z.string().optional().describe('Schema name (defaults to "public")'),
}).catchall(z.unknown());

const DescribeTableSchema = z.object({
  table: z.string().min(1).describe('Table name to describe'),
  schema: z.string().optional().describe('Schema name (defaults to "public")'),
}).catchall(z.unknown());

const GetTableStatsSchema = z.object({
  table: z.string().min(1).describe('Table name to get statistics for'),
  schema: z.string().optional().describe('Schema name (defaults to "public")'),
}).catchall(z.unknown());

// Zod schema for PostgreSQL query parameters
// PostgreSQL supports: strings, numbers, booleans, null, dates, buffers, and JSON objects
const QueryParameterSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.date(),
  z.record(z.unknown()), // JSON objects
  z.array(z.unknown()), // Arrays
]);

const ExecuteQuerySchema = z.object({
  query: z.string().min(1).describe('SQL SELECT query to execute'),
  parameters: z
    .array(QueryParameterSchema)
    .optional()
    .describe('Query parameters for parameterized queries (e.g., [$1, $2])'),
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
}).catchall(z.unknown());

const ExecuteWriteSchema = z.object({
  query: z.string().min(1).describe('SQL INSERT/UPDATE/DELETE query to execute'),
  parameters: z
    .array(QueryParameterSchema)
    .optional()
    .describe('Query parameters for parameterized queries (e.g., [$1, $2])'),
  timeout: z
    .number()
    .int()
    .positive()
    .max(300000)
    .optional()
    .describe('Query timeout in milliseconds (default: 30000, max: 300000)'),
}).catchall(z.unknown());

const ExplainQuerySchema = z.object({
  query: z.string().min(1).describe('SQL query to analyze'),
  analyze: z
    .boolean()
    .optional()
    .describe('Run EXPLAIN ANALYZE (executes query to get actual timing)'),
  verbose: z.boolean().optional().describe('Include verbose output with additional details'),
}).catchall(z.unknown());

/**
 * Create and configure the MCP server with all PostgreSQL tools
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'mcp-postgres',
    version: VERSION,
  });

  logger.info('[Server] Registering PostgreSQL tools...');

  // ========================================
  // SCHEMA EXPLORATION TOOLS
  // ========================================

  /**
   * Tool: postgresListSchemas
   *
   * Lists all user-defined schemas in the PostgreSQL database with table counts.
   */
  server.registerTool(
    'postgresListSchemas',
    {
      title: 'Postgres - List Database Schemas',
      description:
        'List all user-defined schemas in the PostgreSQL database with table counts. System schemas like pg_catalog and information_schema are excluded.',
      inputSchema: {},
    },
    async () => {
      try {
        logger.debug('[Tool] listSchemas called');
        return await listSchemas();
      } catch (error) {
        throw handleUnknownError(error, 'listSchemas tool');
      }
    }
  );

  /**
   * Tool: postgresListTables
   *
   * Lists all tables in a specific schema with size information.
   */
  server.registerTool(
    'postgresListTables',
    {
      title: 'Postgres - List Tables in Schema',
      description:
        'List all tables in a specified schema with size information in MB. Defaults to "public" schema if not specified. Only lists BASE TABLEs, excluding views and system tables.',
      inputSchema: ListTablesSchema,
    },
    async (params) => {
      try {
        logger.debug('[Tool] listTables called', params);
        const validated = ListTablesSchema.parse(params);
        return await listTables(validated);
      } catch (error) {
        throw handleUnknownError(error, 'listTables tool');
      }
    }
  );

  /**
   * Tool: postgresDescribeTable
   *
   * Get detailed information about a table's structure including columns, indexes, and constraints.
   */
  server.registerTool(
    'postgresDescribeTable',
    {
      title: 'Postgres - Describe Table Structure',
      description:
        'Get detailed information about a table structure including columns (with data types, nullability, defaults), indexes, and constraints (PRIMARY KEY, FOREIGN KEY, CHECK, UNIQUE). Defaults to "public" schema if not specified.',
      inputSchema: DescribeTableSchema,
    },
    async (params) => {
      try {
        logger.debug('[Tool] describeTable called', params);
        const validated = DescribeTableSchema.parse(params) as {
          table: string;
          schema?: string;
        };
        return await describeTable(validated);
      } catch (error) {
        throw handleUnknownError(error, 'describeTable tool');
      }
    }
  );

  /**
   * Tool: postgresGetTableStats
   *
   * Get statistical information about a table (row count, sizes, etc.).
   */
  server.registerTool(
    'postgresGetTableStats',
    {
      title: 'Postgres - Get Table Statistics',
      description:
        'Get statistical information about a table including estimated row count (from pg_class.reltuples), total size, table size, indexes size, and TOAST size. Sizes are shown in human-readable format (KB, MB, GB). Row count is an estimate for performance - use COUNT(*) query for exact count. Defaults to "public" schema if not specified.',
      inputSchema: GetTableStatsSchema,
    },
    async (params) => {
      try {
        logger.debug('[Tool] getTableStats called', params);
        const validated = GetTableStatsSchema.parse(params) as {
          table: string;
          schema?: string;
        };
        return await getTableStats(validated);
      } catch (error) {
        throw handleUnknownError(error, 'getTableStats tool');
      }
    }
  );

  // ========================================
  // QUERY EXECUTION TOOLS
  // ========================================

  /**
   * Tool: postgresExecuteQuery
   *
   * Execute a SELECT query and return results.
   */
  server.registerTool(
    'postgresExecuteQuery',
    {
      title: 'Postgres - Execute SELECT Query',
      description:
        'Execute read-only SELECT queries and return results formatted as markdown tables. Only SELECT and WITH (CTE) queries are allowed. Supports parameterized queries ($1, $2, etc.) to prevent SQL injection. Automatic row limit applied (default: 1000, max: 10000) and query timeout protection (default: 30s, max: 5min).',
      inputSchema: ExecuteQuerySchema,
    },
    async (params) => {
      try {
        logger.debug('[Tool] executeQuery called', {
          queryLength: params.query?.length,
        });
        const validated = ExecuteQuerySchema.parse(params) as {
          query: string;
          parameters?: unknown[];
          maxRows?: number;
          timeout?: number;
        };
        return await executeQuery(validated);
      } catch (error) {
        throw handleUnknownError(error, 'executeQuery tool');
      }
    }
  );

  /**
   * Tool: postgresExecuteWrite
   *
   * Execute INSERT, UPDATE, DELETE, or TRUNCATE queries.
   */
  server.registerTool(
    'postgresExecuteWrite',
    {
      title: 'Postgres - Execute Write Operation',
      description:
        'Execute INSERT, UPDATE, DELETE, or TRUNCATE statements to modify database data. REQUIRES ACCESS_MODE=readwrite (fails in readonly mode). Supports parameterized queries ($1, $2, etc.) to prevent SQL injection. Returns the number of affected rows. Supports RETURNING clause. Query timeout protection (default: 30s, max: 5min).',
      inputSchema: ExecuteWriteSchema,
    },
    async (params) => {
      try {
        logger.debug('[Tool] executeWrite called', {
          queryLength: params.query?.length,
        });
        const validated = ExecuteWriteSchema.parse(params) as {
          query: string;
          parameters?: unknown[];
          timeout?: number;
        };
        return await executeWrite(validated);
      } catch (error) {
        throw handleUnknownError(error, 'executeWrite tool');
      }
    }
  );

  /**
   * Tool: postgresExplainQuery
   *
   * Get query execution plan using EXPLAIN or EXPLAIN ANALYZE.
   */
  server.registerTool(
    'postgresExplainQuery',
    {
      title: 'Postgres - Explain Query Execution Plan',
      description:
        'Analyze query execution plans using EXPLAIN or EXPLAIN ANALYZE. EXPLAIN shows the planned execution without running the query. EXPLAIN ANALYZE actually executes the query and shows real timing data. Use verbose mode for additional details like column names and output. Useful for identifying slow queries, verifying index usage, and optimizing query performance.',
      inputSchema: ExplainQuerySchema,
    },
    async (params) => {
      try {
        logger.debug('[Tool] explainQuery called', {
          queryLength: params.query?.length,
        });
        const validated = ExplainQuerySchema.parse(params) as {
          query: string;
          analyze?: boolean;
          verbose?: boolean;
        };
        return await explainQuery(validated);
      } catch (error) {
        throw handleUnknownError(error, 'explainQuery tool');
      }
    }
  );

  logger.info('[Server] All tools registered successfully');
  return server;
}
