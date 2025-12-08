/**
 * Query Execution Tools
 */

import { getDatabase } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import {
  handleUnknownError,
  createPermissionError,
  createInvalidParamsError,
} from '../utils/errors.js';

/**
 * Execute a SELECT query (readonly)
 */
export async function executeQuery(params: {
  query: string;
  parameters?: unknown[];
  maxRows?: number;
  timeout?: number;
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  try {
    const { query, parameters = [], maxRows = 1000, timeout = 30000 } = params;

    logger.debug('[executeQuery] Executing query', { queryLength: query.length });

    // Validate query is SELECT only
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select') && !trimmedQuery.startsWith('with')) {
      throw createInvalidParamsError(
        'Only SELECT queries are allowed. Use executeWrite for INSERT/UPDATE/DELETE.'
      );
    }

    const db = getDatabase();

    // Enforce row limit by wrapping query in subquery
    // This prevents LIMIT bypass via UNION, subqueries, or other techniques
    // Even if user specifies LIMIT, our outer LIMIT will enforce the maximum
    const safeMaxRows = Math.floor(Math.abs(maxRows));
    if (!Number.isFinite(safeMaxRows) || safeMaxRows <= 0 || safeMaxRows > 10000) {
      throw createInvalidParamsError('maxRows must be between 1 and 10000');
    }

    const finalQuery = `SELECT * FROM (${query.trim()}) AS _mcp_limit_wrapper LIMIT ${safeMaxRows}`;

    const result = await db.query(finalQuery, parameters, timeout);

    if (result.rows.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'Query executed successfully. No rows returned.',
          },
        ],
      };
    }

    // Format results as markdown table
    let output = `✅ Query executed successfully\n`;
    output += `Rows returned: ${result.rows.length}`;
    if (result.rows.length === safeMaxRows) {
      output += ` (limited to maximum of ${safeMaxRows})`;
    }
    output += '\n\n';

    // Get column names
    const columns = result.fields.map((f) => f.name);

    // Build markdown table
    output += `| ${columns.join(' | ')} |\n`;
    output += `| ${columns.map(() => '---').join(' | ')} |\n`;

    result.rows.forEach((row) => {
      const values = columns.map((col) => {
        const val = (row as Record<string, unknown>)[col];
        if (val === null) return 'NULL';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      });
      output += `| ${values.join(' | ')} |\n`;
    });

    if (result.rows.length === safeMaxRows) {
      output += `\n⚠️ Result set limited to ${safeMaxRows} rows. Specify a smaller maxRows parameter if needed.`;
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    throw handleUnknownError(error, 'executeQuery');
  }
}

/**
 * Execute a write query (INSERT/UPDATE/DELETE)
 */
export async function executeWrite(params: {
  query: string;
  parameters?: unknown[];
  timeout?: number;
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  try {
    const { query, parameters = [], timeout = 30000 } = params;

    logger.debug('[executeWrite] Executing write operation', { queryLength: query.length });

    // Check if write operations are allowed
    const db = getDatabase();
    if (!db.isWriteAllowed()) {
      throw createPermissionError(
        'Write operations are not allowed in readonly mode. Set ACCESS_MODE=readwrite to enable.'
      );
    }

    // Validate query is write operation
    const trimmedQuery = query.trim().toLowerCase();
    const isWrite =
      trimmedQuery.startsWith('insert') ||
      trimmedQuery.startsWith('update') ||
      trimmedQuery.startsWith('delete') ||
      trimmedQuery.startsWith('truncate');

    if (!isWrite) {
      throw createInvalidParamsError(
        'This tool is for INSERT/UPDATE/DELETE/TRUNCATE only. Use executeQuery for SELECT.'
      );
    }

    const result = await db.query(query, parameters, timeout);

    let output = '✅ Write operation completed successfully\n\n';
    output += `Rows affected: ${result.rowCount || 0}\n`;

    // If INSERT with RETURNING, show returned rows
    if (result.rows.length > 0) {
      output += '\nReturned data:\n';
      output += JSON.stringify(result.rows, null, 2);
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    throw handleUnknownError(error, 'executeWrite');
  }
}

/**
 * Get query execution plan (EXPLAIN)
 */
export async function explainQuery(params: {
  query: string;
  analyze?: boolean;
  verbose?: boolean;
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  try {
    const { query, analyze = false, verbose = false } = params;

    logger.debug('[explainQuery] Getting execution plan');

    const db = getDatabase();

    // Build EXPLAIN query
    let explainQuery = 'EXPLAIN';
    if (analyze) explainQuery += ' ANALYZE';
    if (verbose) explainQuery += ' VERBOSE';
    explainQuery += ` ${query}`;

    const result = await db.query<{ 'QUERY PLAN': string }>(explainQuery);

    let output = '📊 Query Execution Plan\n';
    output += '═══════════════════════════════════════════\n\n';

    result.rows.forEach((row) => {
      output += row['QUERY PLAN'] + '\n';
    });

    if (analyze) {
      output +=
        '\n💡 ANALYZE was used - the query was actually executed to gather timing information.';
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    throw handleUnknownError(error, 'explainQuery');
  }
}
