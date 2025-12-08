/**
 * PostgreSQL Database Connection Management
 *
 * Handles connection pooling and lifecycle management with proper signal handling
 */

import pg from 'pg';
import type { PostgresConfig, AccessMode } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { createConnectionError } from '../utils/errors.js';

const { Pool } = pg;

export class DatabaseConnection {
  private pool: pg.Pool | null = null;
  private config: PostgresConfig;
  private accessMode: AccessMode;
  private isConnected = false;

  constructor(config: PostgresConfig, accessMode: AccessMode = 'readonly') {
    this.config = config;
    this.accessMode = accessMode;
  }

  /**
   * Initialize database connection pool
   */
  async connect(): Promise<void> {
    try {
      logger.info('[Database] Connecting to PostgreSQL...', {
        host: this.config.host || 'from connection string',
        database: this.config.database || 'from connection string',
        mode: this.accessMode,
      });

      // Optimized pool configuration for MCP single-user scenario
      // MCP servers typically serve a single user (Claude Desktop), so we don't need
      // a large connection pool like traditional web servers. A smaller pool:
      // - Reduces database resource consumption
      // - Maintains 1 connection ready for immediate queries
      // - Allows up to 5 concurrent operations (more than enough for typical use)
      const poolConfig: pg.PoolConfig = this.config.connectionString
        ? {
            connectionString: this.config.connectionString,
            min: 1, // Keep at least 1 connection alive
            max: this.config.maxConnections || 5, // Reduced from 10 to 5
            idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
            connectionTimeoutMillis: this.config.connectionTimeoutMillis || 10000,
          }
        : {
            host: this.config.host,
            port: this.config.port || 5432,
            user: this.config.user,
            password: this.config.password,
            database: this.config.database,
            ssl: this.config.ssl,
            min: 1, // Keep at least 1 connection alive
            max: this.config.maxConnections || 5, // Reduced from 10 to 5
            idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
            connectionTimeoutMillis: this.config.connectionTimeoutMillis || 10000,
          };

      this.pool = new Pool(poolConfig);

      // Handle pool errors
      // When a client in the pool experiences an error (e.g., connection lost),
      // this handler is called to prevent unhandled error exceptions
      this.pool.on('error', (err) => {
        logger.error('[Database] Unexpected pool error:', err.message);

        // For fatal errors, trigger graceful shutdown
        // ECONNREFUSED: Connection refused (database down)
        // ECONNRESET: Connection reset (network issue)
        // ETIMEDOUT: Connection timeout
        // FATAL: PostgreSQL fatal errors
        const isFatalError =
          err.message.includes('ECONNREFUSED') ||
          err.message.includes('ECONNRESET') ||
          err.message.includes('ETIMEDOUT') ||
          err.message.includes('FATAL') ||
          err.message.includes('terminating connection');

        if (isFatalError) {
          logger.error(
            '[Database] Fatal error detected, initiating graceful shutdown...'
          );
          // Emit SIGTERM to trigger graceful shutdown in index.ts
          process.kill(process.pid, 'SIGTERM');
        }
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      logger.info('[Database] Successfully connected to PostgreSQL');
    } catch (error) {
      this.isConnected = false;
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Database] Connection failed:', message);
      throw createConnectionError(message, error);
    }
  }

  /**
   * Execute a query
   */
  async query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    sql: string,
    params?: unknown[],
    timeout?: number
  ): Promise<pg.QueryResult<T>> {
    if (!this.pool || !this.isConnected) {
      throw createConnectionError('Database not connected');
    }

    const client = await this.pool.connect();
    try {
      if (timeout) {
        // Validate timeout is a positive integer to prevent injection
        const safeTimeout = Math.floor(Math.abs(timeout));
        if (!Number.isFinite(safeTimeout) || safeTimeout <= 0) {
          throw new Error('Invalid timeout value');
        }
        // SET statement_timeout doesn't support parameterized queries
        // Use validated integer value directly (safe after validation)
        await client.query(`SET LOCAL statement_timeout = ${safeTimeout}`);
      }

      const result = await client.query<T>(sql, params);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Check if operation is allowed in current access mode
   */
  isWriteAllowed(): boolean {
    return this.accessMode === 'readwrite';
  }

  /**
   * Get access mode
   */
  getAccessMode(): AccessMode {
    return this.accessMode;
  }

  /**
   * Check if connected
   */
  connected(): boolean {
    return this.isConnected;
  }

  /**
   * Close database connection
   */
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

export async function initDatabase(
  config: PostgresConfig,
  accessMode: AccessMode
): Promise<DatabaseConnection> {
  if (dbInstance) {
    throw new Error('Database already initialized');
  }
  dbInstance = new DatabaseConnection(config, accessMode);
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
