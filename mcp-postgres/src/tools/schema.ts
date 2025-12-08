/**
 * Schema and Table Management Tools
 */

import { getDatabase } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import { handleUnknownError } from '../utils/errors.js';
import type { TableInfo, ColumnInfo, IndexInfo } from '../types/index.js';

/**
 * List all schemas in the database
 */
export async function listSchemas(): Promise<{ content: { type: 'text'; text: string }[] }> {
  try {
    logger.debug('[listSchemas] Fetching schemas...');

    const db = getDatabase();
    const result = await db.query<{ schema_name: string; table_count: number }>(
      `SELECT
        table_schema as schema_name,
        COUNT(table_name)::int as table_count
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      GROUP BY table_schema
      ORDER BY table_schema`
    );

    if (result.rows.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No user schemas found in the database.',
          },
        ],
      };
    }

    let output = '📊 Database Schemas\n';
    output += '═══════════════════════════════════════════\n\n';

    result.rows.forEach((row) => {
      output += `• ${row.schema_name} (${row.table_count} tables)\n`;
    });

    output += `\nTotal: ${result.rows.length} schemas`;

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    throw handleUnknownError(error, 'listSchemas');
  }
}

/**
 * List all tables in a schema
 */
export async function listTables(params: {
  schema?: string;
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  try {
    const { schema = 'public' } = params;
    logger.debug(`[listTables] Fetching tables from schema: ${schema}`);

    const db = getDatabase();
    // Optimized query: JOIN with pg_class to get sizes in a single query
    // This avoids calling pg_total_relation_size for each table individually
    const result = await db.query<TableInfo>(
      `SELECT
        t.table_schema as "schemaName",
        t.table_name as "tableName",
        COALESCE(pg_total_relation_size(c.oid), 0)::bigint as "sizeBytes"
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
        AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = t.table_schema)
      WHERE t.table_schema = $1
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name`,
      [schema]
    );

    if (result.rows.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No tables found in schema "${schema}".`,
          },
        ],
      };
    }

    let output = `📋 Tables in schema "${schema}"\n`;
    output += '═══════════════════════════════════════════\n\n';

    result.rows.forEach((row) => {
      const sizeMB = row.sizeBytes ? (row.sizeBytes / (1024 * 1024)).toFixed(2) : '0.00';
      output += `• ${row.tableName} (${sizeMB} MB)\n`;
    });

    output += `\nTotal: ${result.rows.length} tables`;

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    throw handleUnknownError(error, 'listTables');
  }
}

/**
 * Describe table structure (columns, indexes, constraints)
 */
export async function describeTable(params: {
  table: string;
  schema?: string;
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  try {
    const { table, schema = 'public' } = params;
    logger.debug(`[describeTable] Describing table: ${schema}.${table}`);

    const db = getDatabase();

    // Get columns
    const columnsResult = await db.query<ColumnInfo>(
      `SELECT
        column_name as "columnName",
        data_type as "dataType",
        is_nullable = 'YES' as "isNullable",
        column_default as "defaultValue",
        character_maximum_length as "characterMaximumLength"
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position`,
      [schema, table]
    );

    if (columnsResult.rows.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `Table "${schema}.${table}" not found.`,
          },
        ],
      };
    }

    // Get indexes
    const indexesResult = await db.query<IndexInfo>(
      `SELECT
        i.indexname as "indexName",
        i.indexdef as index_def,
        ix.indisunique as "isUnique",
        ix.indisprimary as "isPrimaryKey"
      FROM pg_indexes i
      JOIN pg_class c ON c.relname = i.tablename
      JOIN pg_index ix ON ix.indexrelid = (i.schemaname || '.' || i.indexname)::regclass
      WHERE i.schemaname = $1 AND i.tablename = $2`,
      [schema, table]
    );

    // Get constraints
    const constraintsResult = await db.query<{
      constraint_name: string;
      constraint_type: string;
    }>(
      `SELECT
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY constraint_type, constraint_name`,
      [schema, table]
    );

    // Build output
    let output = `📊 Table Structure: ${schema}.${table}\n`;
    output += '═══════════════════════════════════════════\n\n';

    // Columns section
    output += '📋 Columns:\n';
    columnsResult.rows.forEach((col) => {
      const nullable = col.isNullable ? 'NULL' : 'NOT NULL';
      const maxLen = col.characterMaximumLength ? `(${col.characterMaximumLength})` : '';
      const defaultVal = col.defaultValue ? ` DEFAULT ${col.defaultValue}` : '';
      output += `  • ${col.columnName}: ${col.dataType}${maxLen} ${nullable}${defaultVal}\n`;
    });

    // Indexes section
    if (indexesResult.rows.length > 0) {
      output += '\n🔍 Indexes:\n';
      indexesResult.rows.forEach((idx) => {
        const type = idx.isPrimaryKey ? 'PRIMARY KEY' : idx.isUnique ? 'UNIQUE' : 'INDEX';
        output += `  • ${idx.indexName} (${type})\n`;
      });
    }

    // Constraints section
    if (constraintsResult.rows.length > 0) {
      output += '\n🔒 Constraints:\n';
      constraintsResult.rows.forEach((cons) => {
        output += `  • ${cons.constraint_name} (${cons.constraint_type})\n`;
      });
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
    throw handleUnknownError(error, 'describeTable');
  }
}

/**
 * Get table statistics (row count, size, etc.)
 */
export async function getTableStats(params: {
  table: string;
  schema?: string;
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  try {
    const { table, schema = 'public' } = params;
    logger.debug(`[getTableStats] Getting stats for: ${schema}.${table}`);

    const db = getDatabase();

    // Use regclass to safely validate table existence and prevent SQL injection
    const fullTableName = `"${schema}"."${table}"`;

    const result = await db.query<{
      row_count: number;
      total_size: string;
      table_size: string;
      indexes_size: string;
      toast_size: string;
    }>(
      `SELECT
        (SELECT reltuples::bigint FROM pg_class WHERE oid = $1::regclass) as row_count,
        pg_size_pretty(pg_total_relation_size($1::regclass)) as total_size,
        pg_size_pretty(pg_relation_size($1::regclass)) as table_size,
        pg_size_pretty(pg_indexes_size($1::regclass)) as indexes_size,
        pg_size_pretty(COALESCE(pg_total_relation_size(reltoastrelid), 0)) as toast_size
      FROM pg_class
      WHERE oid = $1::regclass`,
      [fullTableName]
    );

    if (result.rows.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `Table "${schema}.${table}" not found.`,
          },
        ],
      };
    }

    const stats = result.rows[0];
    let output = `📈 Table Statistics: ${schema}.${table}\n`;
    output += '═══════════════════════════════════════════\n\n';
    output += `Row Count: ${stats.row_count.toLocaleString()}\n`;
    output += `Total Size: ${stats.total_size}\n`;
    output += `Table Size: ${stats.table_size}\n`;
    output += `Indexes Size: ${stats.indexes_size}\n`;
    output += `TOAST Size: ${stats.toast_size}\n`;

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    throw handleUnknownError(error, 'getTableStats');
  }
}
