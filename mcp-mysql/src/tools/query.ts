/**
 * Query Execution Tools
 */

import mysql from 'mysql2/promise';
import { getDatabase } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import { handleUnknownError, createInvalidParamsError } from '../utils/errors.js';
import type { ProcessInfo } from '../types/index.js';

type ToolResult = { content: { type: 'text'; text: string }[] };

/**
 * Execute a SELECT query (read-only)
 */
export async function executeQuery(params: {
  query: string;
  parameters?: unknown[];
  maxRows?: number;
  timeout?: number;
}): Promise<ToolResult> {
  try {
    const defaultTimeout = process.env.MYSQL_QUERY_TIMEOUT
      ? parseInt(process.env.MYSQL_QUERY_TIMEOUT, 10)
      : 30000;
    const { query, parameters = [], maxRows = 1000, timeout = defaultTimeout } = params;

    logger.debug('[executeQuery] Executing query', { queryLength: query.length });

    const trimmed = query.trim().toUpperCase();
    if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) {
      throw createInvalidParamsError(
        'Only SELECT queries are allowed. Use mysqlExecuteWrite for INSERT/UPDATE/DELETE.'
      );
    }

    // Reject locking reads — they cannot be wrapped in a subquery and are unsafe for read-only use
    if (trimmed.includes('FOR UPDATE') || trimmed.includes('LOCK IN SHARE MODE')) {
      throw createInvalidParamsError(
        'FOR UPDATE and LOCK IN SHARE MODE are not allowed in mysqlExecuteQuery. Use mysqlExecuteWrite for locking operations.'
      );
    }

    const safeMaxRows = Math.floor(Math.abs(maxRows));
    if (!Number.isFinite(safeMaxRows) || safeMaxRows <= 0 || safeMaxRows > 10000) {
      throw createInvalidParamsError('maxRows must be between 1 and 10000');
    }

    // Strip trailing semicolons before wrapping — a subquery cannot contain a statement terminator
    const cleanQuery = query.trim().replace(/;+$/, '');

    // Inject MAX_EXECUTION_TIME hint into the outermost SELECT (MySQL 5.7.8+)
    const safeTimeout = Math.floor(Math.abs(timeout));
    const finalQuery = `SELECT /*+ MAX_EXECUTION_TIME(${safeTimeout}) */ * FROM (${cleanQuery}) AS _mcp_limit_wrapper LIMIT ${safeMaxRows}`;

    const db = getDatabase();
    const [rows, fields] = await db.execute<mysql.RowDataPacket[]>(finalQuery, parameters);

    if (rows.length === 0) {
      return {
        content: [{ type: 'text', text: 'Query executed successfully. No rows returned.' }],
      };
    }

    let output = `Query executed successfully\n`;
    output += `Rows returned: ${rows.length}`;
    if (rows.length === safeMaxRows) {
      output += ` (limited to maximum of ${safeMaxRows})`;
    }
    output += '\n\n';

    const columns = fields.map((f) => f.name);

    output += `| ${columns.join(' | ')} |\n`;
    output += `| ${columns.map(() => '---').join(' | ')} |\n`;

    rows.forEach((row) => {
      const values = columns.map((col) => {
        const val = (row as Record<string, unknown>)[col];
        if (val === null || val === undefined) return 'NULL';
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      });
      output += `| ${values.join(' | ')} |\n`;
    });

    if (rows.length === safeMaxRows) {
      output += `\nResult set limited to ${safeMaxRows} rows. Use a smaller maxRows if needed.`;
    }

    return { content: [{ type: 'text', text: output }] };
  } catch (error) {
    throw handleUnknownError(error, 'executeQuery');
  }
}

/**
 * Execute a write query (INSERT / UPDATE / DELETE / REPLACE / TRUNCATE)
 */
export async function executeWrite(params: {
  query: string;
  parameters?: unknown[];
  timeout?: number;
}): Promise<ToolResult> {
  try {
    const defaultTimeout = process.env.MYSQL_QUERY_TIMEOUT
      ? parseInt(process.env.MYSQL_QUERY_TIMEOUT, 10)
      : 30000;
    const { query, parameters = [], timeout = defaultTimeout } = params;

    logger.debug('[executeWrite] Executing write operation', { queryLength: query.length });

    const trimmed = query.trim().toUpperCase();
    const isWrite =
      trimmed.startsWith('INSERT') ||
      trimmed.startsWith('UPDATE') ||
      trimmed.startsWith('DELETE') ||
      trimmed.startsWith('REPLACE') ||
      trimmed.startsWith('TRUNCATE');

    if (!isWrite) {
      throw createInvalidParamsError(
        'This tool is for INSERT/UPDATE/DELETE/REPLACE/TRUNCATE only. Use mysqlExecuteQuery for SELECT.'
      );
    }

    const db = getDatabase();
    const safeTimeout = Math.floor(Math.abs(timeout));

    // Acquire a dedicated connection so SET SESSION max_execution_time is scoped
    // to this connection only, and we can restore it in finally regardless of outcome.
    const conn = await db.getConnection();
    let result: mysql.ResultSetHeader;
    try {
      await conn.execute(`SET SESSION max_execution_time = ${safeTimeout}`);
      [result] = await conn.execute<mysql.ResultSetHeader>(query, parameters);
    } finally {
      // Always restore to unlimited so the connection is clean when returned to pool
      await conn.execute('SET SESSION max_execution_time = 0').catch(() => undefined);
      conn.release();
    }

    let output = 'Write operation completed successfully\n\n';
    output += `Rows affected: ${result.affectedRows ?? 0}\n`;

    if (result.insertId && result.insertId > 0) {
      output += `Insert ID: ${result.insertId}\n`;
    }
    if ('changedRows' in result && result.changedRows > 0) {
      output += `Rows changed: ${result.changedRows}\n`;
    }

    return { content: [{ type: 'text', text: output }] };
  } catch (error) {
    throw handleUnknownError(error, 'executeWrite');
  }
}

/**
 * Get query execution plan via EXPLAIN
 */
export async function explainQuery(params: {
  query: string;
  analyze?: boolean;
  format?: 'TRADITIONAL' | 'TREE' | 'JSON';
}): Promise<ToolResult> {
  try {
    const { query, analyze = false, format = 'TREE' } = params;

    logger.debug('[explainQuery] Getting execution plan');

    const db = getDatabase();

    let explainSql: string;
    let rows: mysql.RowDataPacket[];

    if (analyze) {
      // EXPLAIN ANALYZE: MySQL 8.0.18+, always outputs TREE format
      explainSql = `EXPLAIN ANALYZE ${query}`;
      try {
        [rows] = await db.query<mysql.RowDataPacket[]>(explainSql);
      } catch (err) {
        // Fallback for MySQL < 8.0.18
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('syntax') || msg.includes('ANALYZE')) {
          logger.warn('[explainQuery] EXPLAIN ANALYZE not supported, falling back to EXPLAIN');
          [rows] = await db.query<mysql.RowDataPacket[]>(`EXPLAIN ${query}`);
        } else {
          throw err;
        }
      }
    } else {
      // EXPLAIN FORMAT=TREE/JSON/TRADITIONAL
      if (format === 'TRADITIONAL') {
        explainSql = `EXPLAIN ${query}`;
      } else {
        explainSql = `EXPLAIN FORMAT=${format} ${query}`;
      }
      try {
        [rows] = await db.query<mysql.RowDataPacket[]>(explainSql);
      } catch (err) {
        // Fallback to TRADITIONAL if FORMAT not supported (MySQL 5.7)
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('syntax') || msg.includes('FORMAT')) {
          logger.warn('[explainQuery] FORMAT not supported, falling back to EXPLAIN');
          [rows] = await db.query<mysql.RowDataPacket[]>(`EXPLAIN ${query}`);
        } else {
          throw err;
        }
      }
    }

    let output = 'Query Execution Plan\n';
    output += '═══════════════════════════════════════════\n\n';

    if (rows.length === 1 && rows[0]['EXPLAIN'] !== undefined) {
      // TREE / ANALYZE format returns a single row with 'EXPLAIN' column
      output += String(rows[0]['EXPLAIN']);
    } else {
      // TRADITIONAL format returns multiple rows (one per table access)
      const columns = Object.keys(rows[0]);
      output += `| ${columns.join(' | ')} |\n`;
      output += `| ${columns.map(() => '---').join(' | ')} |\n`;
      rows.forEach((row) => {
        const values = columns.map((col) => {
          const val = (row as Record<string, unknown>)[col];
          return val == null ? 'NULL' : String(val);
        });
        output += `| ${values.join(' | ')} |\n`;
      });
    }

    if (analyze) {
      output += '\nNote: EXPLAIN ANALYZE executes the query to collect actual timing data.';
    }

    return { content: [{ type: 'text', text: output }] };
  } catch (error) {
    throw handleUnknownError(error, 'explainQuery');
  }
}

/**
 * Show full CREATE TABLE DDL
 */
export async function showCreateTable(params: {
  database: string;
  table: string;
}): Promise<ToolResult> {
  try {
    const { database, table } = params;
    logger.debug(`[showCreateTable] Fetching DDL for: ${database}.${table}`);

    // Validate identifiers to prevent injection: only allow alphanumeric, underscore, hyphen, dot
    const identifierPattern = /^[a-zA-Z0-9_$-]+$/;
    if (!identifierPattern.test(database) || !identifierPattern.test(table)) {
      throw createInvalidParamsError(
        'Database and table names must contain only alphanumeric characters, underscores, hyphens, or dollar signs.'
      );
    }

    const db = getDatabase();
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `SHOW CREATE TABLE \`${database}\`.\`${table}\``
    );

    if (rows.length === 0) {
      return {
        content: [{ type: 'text', text: `Table "${database}.${table}" not found.` }],
      };
    }

    const ddl = (rows[0]['Create Table'] as string) || '';

    let output = `CREATE TABLE DDL: ${database}.${table}\n`;
    output += '═══════════════════════════════════════════\n\n';
    output += '```sql\n';
    output += ddl;
    output += '\n```';

    return { content: [{ type: 'text', text: output }] };
  } catch (error) {
    throw handleUnknownError(error, 'showCreateTable');
  }
}

/**
 * Show active connections and running queries (SHOW FULL PROCESSLIST)
 */
export async function showProcessList(): Promise<ToolResult> {
  try {
    logger.debug('[showProcessList] Fetching process list');

    const db = getDatabase();
    const [rows] = await db.query<mysql.RowDataPacket[]>('SHOW FULL PROCESSLIST');

    if (rows.length === 0) {
      return { content: [{ type: 'text', text: 'No active processes.' }] };
    }

    let output = 'Active MySQL Processes\n';
    output += '═══════════════════════════════════════════\n\n';

    (rows as ProcessInfo[]).forEach((proc) => {
      output += `[${proc.id}] ${proc.user}@${proc.host}`;
      if (proc.db) output += ` / ${proc.db}`;
      output += ` — ${proc.command} (${proc.time}s)`;
      if (proc.state) output += ` [${proc.state}]`;
      if (proc.info) output += `\n       SQL: ${proc.info.substring(0, 200)}`;
      output += '\n';
    });

    output += `\nTotal: ${rows.length} processes`;

    return { content: [{ type: 'text', text: output }] };
  } catch (error) {
    throw handleUnknownError(error, 'showProcessList');
  }
}
