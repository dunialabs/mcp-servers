/**
 * MySQL Database Connection Management
 *
 * Handles connection pooling and lifecycle management using mysql2/promise.
 */

import mysql from 'mysql2/promise';
import type { MysqlConfig } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { createConnectionError } from '../utils/errors.js';

export class DatabaseConnection {
  private pool: mysql.Pool | null = null;
  private config: MysqlConfig;
  private isConnected = false;

  constructor(config: MysqlConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      logger.info('[Database] Connecting to MySQL...', {
        host: this.config.host || 'from connection string',
        database: this.config.database || 'from connection string',
      });

      const poolConfig: mysql.PoolOptions = this.config.uri
        ? {
            uri: this.config.uri,
            waitForConnections: true,
            connectionLimit: this.config.maxConnections || 5,
            queueLimit: 0,
            connectTimeout: this.config.connectTimeout || 10000,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
          }
        : {
            host: this.config.host,
            port: this.config.port || 3306,
            user: this.config.user,
            password: this.config.password,
            database: this.config.database,
            ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
            waitForConnections: true,
            connectionLimit: this.config.maxConnections || 5,
            queueLimit: 0,
            connectTimeout: this.config.connectTimeout || 10000,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
          };

      this.pool = mysql.createPool(poolConfig);

      // Handle pool errors
      this.pool.on('connection', (connection) => {
        logger.debug('[Database] New connection established', { threadId: connection.threadId });
      });

      // Test connection by acquiring a connection from the pool
      const conn = await this.pool.getConnection();
      await conn.ping();
      conn.release();

      this.isConnected = true;
      logger.info('[Database] Successfully connected to MySQL');
    } catch (error) {
      this.isConnected = false;
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Database] Connection failed:', message);
      throw createConnectionError(message, error);
    }
  }

  /**
   * Execute a parameterized query.
   * Uses execute() (prepared statements) to prevent SQL injection.
   * Returns [rows, fields] tuple from mysql2.
   */
  async execute<T extends mysql.RowDataPacket[] | mysql.ResultSetHeader>(
    sql: string,
    params?: unknown[]
  ): Promise<[T, mysql.FieldPacket[]]> {
    if (!this.pool || !this.isConnected) {
      throw createConnectionError('Database not connected');
    }
    return this.pool.execute<T>(sql, params);
  }

  /**
   * Execute a query using query() (for statements that don't support prepared statements,
   * e.g. SHOW PROCESSLIST, SHOW CREATE TABLE, EXPLAIN ANALYZE).
   */
  async query<T extends mysql.RowDataPacket[] | mysql.ResultSetHeader>(
    sql: string,
    params?: unknown[]
  ): Promise<[T, mysql.FieldPacket[]]> {
    if (!this.pool || !this.isConnected) {
      throw createConnectionError('Database not connected');
    }
    return this.pool.query<T>(sql, params);
  }

  /**
   * Acquire a dedicated connection from the pool.
   * Caller is responsible for calling conn.release() when done.
   * Use this when multiple statements must run on the same connection
   * (e.g. SET SESSION + execute + cleanup).
   */
  async getConnection(): Promise<mysql.PoolConnection> {
    if (!this.pool || !this.isConnected) {
      throw createConnectionError('Database not connected');
    }
    return this.pool.getConnection();
  }

  connected(): boolean {
    return this.isConnected;
  }

  async close(): Promise<void> {
    if (this.pool) {
      logger.info('[Database] Closing connection pool...');
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      logger.info('[Database] Connection pool closed');
    }
  }
}

// Singleton instance
let dbInstance: DatabaseConnection | null = null;

export async function initDatabase(config: MysqlConfig): Promise<DatabaseConnection> {
  if (dbInstance) {
    throw new Error('Database already initialized');
  }
  dbInstance = new DatabaseConnection(config);
  await dbInstance.connect();
  return dbInstance;
}

export function getDatabase(): DatabaseConnection {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}
