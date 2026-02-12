/**
 * Type definitions for MySQL MCP Server
 */

export interface ServerConfig {
  name: string;
  version: string;
}

export interface MysqlConfig {
  uri?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean;
  maxConnections?: number;
  connectTimeout?: number;
}

export interface QueryConfig {
  maxRows: number;
  timeout: number;
}

export interface TableInfo {
  tableName: string;
  engine?: string;
  tableRows?: number;
  sizeMb?: number;
  tableComment?: string;
}

export interface ColumnInfo {
  columnName: string;
  dataType: string;
  columnType: string;
  isNullable: string;  // MySQL returns 'YES' | 'NO', not a boolean
  defaultValue?: string | null;
  extra?: string;
  columnComment?: string;
  characterMaximumLength?: number;
}

export interface IndexInfo {
  indexName: string;
  columns: string;     // GROUP_CONCAT returns a comma-separated string, not an array
  isUnique: number;    // MySQL returns 0 | 1 from boolean expression (non_unique = 0)
  indexType: string;
}

export interface ForeignKeyInfo {
  constraintName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  onUpdate: string;
  onDelete: string;
}

export interface DatabaseInfo {
  databaseName: string;
  tableCount: number;
  sizeMb: number;
}

export interface TableStats {
  tableRows: number;
  dataSizeMb: number;
  indexSizeMb: number;
  totalSizeMb: number;
  autoIncrement?: number;
  engine?: string;
  collation?: string;
  createTime?: string;
  updateTime?: string;
}

export interface ProcessInfo {
  id: number;
  user: string;
  host: string;
  db: string | null;
  command: string;
  time: number;
  state: string | null;
  info: string | null;
}
