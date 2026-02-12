/**
 * Schema and Table Management Tools
 */

import mysql from 'mysql2/promise';
import { getDatabase } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import { handleUnknownError } from '../utils/errors.js';
import type { DatabaseInfo, TableInfo, ColumnInfo, IndexInfo, ForeignKeyInfo, TableStats } from '../types/index.js';

type ToolResult = { content: { type: 'text'; text: string }[] };

/**
 * List all user databases with table count and total size
 */
export async function listDatabases(): Promise<ToolResult> {
  try {
    logger.debug('[listDatabases] Fetching databases...');

    const db = getDatabase();
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT
        table_schema AS databaseName,
        COUNT(*) AS tableCount,
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS sizeMb
      FROM information_schema.TABLES
      WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
      GROUP BY table_schema
      ORDER BY table_schema`
    );

    if (rows.length === 0) {
      return { content: [{ type: 'text', text: 'No user databases found.' }] };
    }

    let output = 'MySQL Databases\n';
    output += '═══════════════════════════════════════════\n\n';

    (rows as DatabaseInfo[]).forEach((row) => {
      output += `• ${row.databaseName} — ${row.tableCount} tables, ${row.sizeMb ?? 0} MB\n`;
    });

    output += `\nTotal: ${rows.length} databases`;

    return { content: [{ type: 'text', text: output }] };
  } catch (error) {
    throw handleUnknownError(error, 'listDatabases');
  }
}

/**
 * List all tables in a database
 */
export async function listTables(params: { database: string }): Promise<ToolResult> {
  try {
    const { database } = params;
    logger.debug(`[listTables] Fetching tables from database: ${database}`);

    const db = getDatabase();
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT
        table_name AS tableName,
        engine,
        table_rows AS tableRows,
        ROUND((data_length + index_length) / 1024 / 1024, 2) AS sizeMb,
        table_comment AS tableComment
      FROM information_schema.TABLES
      WHERE table_schema = ?
        AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
      [database]
    );

    if (rows.length === 0) {
      return {
        content: [{ type: 'text', text: `No tables found in database "${database}".` }],
      };
    }

    let output = `Tables in database "${database}"\n`;
    output += '═══════════════════════════════════════════\n\n';

    (rows as TableInfo[]).forEach((row) => {
      const size = row.sizeMb ?? 0;
      const engine = row.engine ? ` [${row.engine}]` : '';
      const comment = row.tableComment ? ` — ${row.tableComment}` : '';
      output += `• ${row.tableName}${engine} (${size} MB)${comment}\n`;
    });

    output += `\nTotal: ${rows.length} tables`;

    return { content: [{ type: 'text', text: output }] };
  } catch (error) {
    throw handleUnknownError(error, 'listTables');
  }
}

/**
 * Describe table structure: columns, indexes, foreign keys
 */
export async function describeTable(params: {
  database: string;
  table: string;
}): Promise<ToolResult> {
  try {
    const { database, table } = params;
    logger.debug(`[describeTable] Describing table: ${database}.${table}`);

    const db = getDatabase();

    // 1. Columns
    const [columns] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT
        column_name AS columnName,
        data_type AS dataType,
        column_type AS columnType,
        is_nullable AS isNullable,
        column_default AS defaultValue,
        extra,
        column_comment AS columnComment,
        character_maximum_length AS characterMaximumLength
      FROM information_schema.COLUMNS
      WHERE table_schema = ? AND table_name = ?
      ORDER BY ordinal_position`,
      [database, table]
    );

    if (columns.length === 0) {
      return {
        content: [{ type: 'text', text: `Table "${database}.${table}" not found.` }],
      };
    }

    // 2. Indexes
    const [indexes] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT
        index_name AS indexName,
        GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns,
        (non_unique = 0) AS isUnique,
        index_type AS indexType
      FROM information_schema.STATISTICS
      WHERE table_schema = ? AND table_name = ?
      GROUP BY index_name, non_unique, index_type
      ORDER BY index_name`,
      [database, table]
    );

    // 3. Foreign keys
    const [foreignKeys] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT
        kcu.constraint_name AS constraintName,
        kcu.column_name AS columnName,
        kcu.referenced_table_name AS referencedTable,
        kcu.referenced_column_name AS referencedColumn,
        rc.update_rule AS onUpdate,
        rc.delete_rule AS onDelete
      FROM information_schema.KEY_COLUMN_USAGE kcu
      JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
        ON rc.constraint_name = kcu.constraint_name
        AND rc.constraint_schema = kcu.table_schema
      WHERE kcu.table_schema = ? AND kcu.table_name = ?
        AND kcu.referenced_table_name IS NOT NULL
      ORDER BY kcu.constraint_name, kcu.ordinal_position`,
      [database, table]
    );

    // Build output
    let output = `Table Structure: ${database}.${table}\n`;
    output += '═══════════════════════════════════════════\n\n';

    output += 'Columns:\n';
    (columns as ColumnInfo[]).forEach((col) => {
      const nullable = col.isNullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = col.defaultValue != null ? ` DEFAULT ${col.defaultValue}` : '';
      const extra = col.extra ? ` [${col.extra}]` : '';
      const comment = col.columnComment ? ` -- ${col.columnComment}` : '';
      output += `  • ${col.columnName}: ${col.columnType} ${nullable}${def}${extra}${comment}\n`;
    });

    if (indexes.length > 0) {
      output += '\nIndexes:\n';
      (indexes as IndexInfo[]).forEach((idx) => {
        const type = idx.indexName === 'PRIMARY'
          ? 'PRIMARY KEY'
          : idx.isUnique === 1
            ? 'UNIQUE'
            : 'INDEX';
        output += `  • ${idx.indexName} (${type}) — columns: ${idx.columns}\n`;
      });
    }

    if (foreignKeys.length > 0) {
      output += '\nForeign Keys:\n';
      (foreignKeys as ForeignKeyInfo[]).forEach((fk) => {
        output += `  • ${fk.constraintName}: ${fk.columnName} → ${fk.referencedTable}.${fk.referencedColumn}`;
        output += ` [ON UPDATE ${fk.onUpdate}, ON DELETE ${fk.onDelete}]\n`;
      });
    }

    return { content: [{ type: 'text', text: output }] };
  } catch (error) {
    throw handleUnknownError(error, 'describeTable');
  }
}

/**
 * Get table statistics: row count, sizes, engine, AUTO_INCREMENT
 */
export async function getTableStats(params: {
  database: string;
  table: string;
}): Promise<ToolResult> {
  try {
    const { database, table } = params;
    logger.debug(`[getTableStats] Getting stats for: ${database}.${table}`);

    const db = getDatabase();
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT
        table_rows AS tableRows,
        ROUND(data_length / 1024 / 1024, 2) AS dataSizeMb,
        ROUND(index_length / 1024 / 1024, 2) AS indexSizeMb,
        ROUND((data_length + index_length) / 1024 / 1024, 2) AS totalSizeMb,
        auto_increment AS autoIncrement,
        engine,
        table_collation AS collation,
        DATE_FORMAT(create_time, '%Y-%m-%d %H:%i:%s') AS createTime,
        DATE_FORMAT(update_time, '%Y-%m-%d %H:%i:%s') AS updateTime
      FROM information_schema.TABLES
      WHERE table_schema = ? AND table_name = ?`,
      [database, table]
    );

    if (rows.length === 0) {
      return {
        content: [{ type: 'text', text: `Table "${database}.${table}" not found.` }],
      };
    }

    const stats = rows[0] as TableStats & {
      engine?: string;
      collation?: string;
      createTime?: string;
      updateTime?: string;
      autoIncrement?: number;
    };

    let output = `Table Statistics: ${database}.${table}\n`;
    output += '═══════════════════════════════════════════\n\n';
    output += `Row Count (estimate): ${(stats.tableRows ?? 0).toLocaleString()}\n`;
    output += `Data Size: ${stats.dataSizeMb ?? 0} MB\n`;
    output += `Index Size: ${stats.indexSizeMb ?? 0} MB\n`;
    output += `Total Size: ${stats.totalSizeMb ?? 0} MB\n`;
    if (stats.autoIncrement != null) {
      output += `Next AUTO_INCREMENT: ${stats.autoIncrement}\n`;
    }
    if (stats.engine) output += `Engine: ${stats.engine}\n`;
    if (stats.collation) output += `Collation: ${stats.collation}\n`;
    if (stats.createTime) output += `Created At: ${stats.createTime}\n`;
    if (stats.updateTime) output += `Updated At: ${stats.updateTime}\n`;
    output += '\nNote: Row count is an estimate from information_schema. Use COUNT(*) for exact count.';

    return { content: [{ type: 'text', text: output }] };
  } catch (error) {
    throw handleUnknownError(error, 'getTableStats');
  }
}
