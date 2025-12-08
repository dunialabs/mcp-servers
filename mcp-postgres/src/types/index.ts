/**
 * Type definitions for PostgreSQL MCP Server
 */

export interface ServerConfig {
  name: string;
  version: string;
}

export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface QueryConfig {
  maxRows: number;
  timeout: number;
}

export type AccessMode = 'readonly' | 'readwrite';

export interface TableInfo {
  schemaName: string;
  tableName: string;
  rowCount?: number;
  sizeBytes?: number;
}

export interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: string;
  characterMaximumLength?: number;
}

export interface IndexInfo {
  indexName: string;
  indexType: string;
  columns: string[];
  isUnique: boolean;
  isPrimaryKey: boolean;
}

export interface ConstraintInfo {
  constraintName: string;
  constraintType: string;
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
}
