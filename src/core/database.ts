/**
 * Enterprise Database Manager - TypeORM with connection pooling
 * Production-ready database layer with migrations and monitoring
 */

import type { QueryRunner, EntityManager } from 'typeorm';
import { DataSource } from 'typeorm';
import { databaseConfigManager } from './database.config';
import { databaseSecurityManager } from './database-security';
import { Logger } from '@/shared/logger';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private dataSource: DataSource | null = null;
  private logger: Logger;
  private connectionRetries = 0;
  private maxRetries = 3;

  private constructor() {
    this.logger = new Logger('DatabaseManager');
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize database connection
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing database connection...');

      // Validate configuration
      databaseConfigManager.validateConfig();

      // Create data source
      const config = databaseConfigManager.createDataSourceConfig();
      this.dataSource = new DataSource(config);

      await this.connectWithRetry();

      this.logger.info('Database connection established successfully');

      // Run health check
      await this.healthCheck();
    } catch (error) {
      this.logger.error('Failed to initialize database', error);
      throw error;
    }
  }

  /**
   * Connect with retry logic
   */
  private async connectWithRetry(): Promise<void> {
    while (this.connectionRetries < this.maxRetries) {
      try {
        await this.dataSource!.initialize();
        this.connectionRetries = 0; // Reset on success

        // Log successful connection
        const options = this.dataSource!.options as any;
        databaseSecurityManager.logConnectionAttempt(true, {
          database: options.database || 'unknown',
          host: options.host || 'unknown',
        });

        return;
      } catch (error) {
        this.connectionRetries++;

        // Log failed connection attempt
        const options = this.dataSource!.options as any;
        databaseSecurityManager.logConnectionAttempt(false, {
          database: options.database || 'unknown',
          host: options.host || 'unknown',
          error: error instanceof Error ? error.message : String(error),
        });

        if (this.connectionRetries >= this.maxRetries) {
          this.logger.error('Max connection retries reached', error);
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, this.connectionRetries), 10000);
        this.logger.warn(`Database connection failed, retrying in ${delay}ms...`, {
          attempt: this.connectionRetries,
          maxRetries: this.maxRetries,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  /**
   * Get the data source instance
   */
  public getDataSource(): DataSource {
    if (!this.dataSource?.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.dataSource;
  }

  /**
   * Get entity manager
   */
  public getEntityManager(): EntityManager {
    return this.getDataSource().manager;
  }

  /**
   * Create a query runner for transactions
   */
  public createQueryRunner(): QueryRunner {
    return this.getDataSource().createQueryRunner();
  }

  /**
   * Execute a transaction
   */
  public async transaction<T>(operation: (manager: EntityManager) => Promise<T>): Promise<T> {
    const queryRunner = this.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const result = await operation(queryRunner.manager);

      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Transaction failed, rolling back', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Run database migrations
   */
  public async runMigrations(): Promise<void> {
    try {
      this.logger.info('Running database migrations...');

      const migrations = await this.getDataSource().runMigrations();

      if (migrations.length > 0) {
        this.logger.info(`Applied ${migrations.length} migrations:`, {
          migrations: migrations.map(m => m.name),
        });
      } else {
        this.logger.info('No pending migrations found');
      }
    } catch (error) {
      this.logger.error('Migration failed', error);
      throw error;
    }
  }

  /**
   * Revert the last migration
   */
  public async revertLastMigration(): Promise<void> {
    try {
      this.logger.info('Reverting last migration...');

      await this.getDataSource().undoLastMigration();

      this.logger.info('Successfully reverted last migration');
    } catch (error) {
      this.logger.error('Failed to revert migration', error);
      throw error;
    }
  }

  /**
   * Database health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const startTime = Date.now();

      // Simple query to test connection
      await this.getDataSource().query('SELECT 1');

      const responseTime = Date.now() - startTime;

      this.logger.logHealthCheck('database', 'healthy', responseTime);

      return true;
    } catch (error) {
      this.logger.logHealthCheck('database', 'unhealthy', undefined, { error });
      return false;
    }
  }

  /**
   * Get connection pool statistics
   */
  public getPoolStats(): Record<string, unknown> {
    const dataSource = this.getDataSource();

    if (!(dataSource.driver as any).pool) {
      return { available: false };
    }

    // TypeORM doesn't expose detailed pool stats directly
    // This is a simplified version
    return {
      available: true,
      isConnected: dataSource.isInitialized,
      // Additional pool metrics would go here if available
    };
  }

  /**
   * Execute raw SQL query with logging and security analysis
   */
  public async query<T = unknown>(sql: string, parameters?: unknown[]): Promise<T> {
    // Analyze query for security issues
    databaseSecurityManager.analyzeQuery(sql, {
      host: 'internal',
      user: 'system',
    });

    const timer = this.logger.startTimer('database_query');

    try {
      const result = await this.getDataSource().query(sql, parameters);
      timer();

      this.logger.logDatabaseQuery(sql, 0, { parameters });

      return result as T;
    } catch (error) {
      timer();
      this.logger.error('Database query failed', error, { sql, parameters });

      // Log potential security errors
      if (error instanceof Error) {
        databaseSecurityManager.logSecurityEvent({
          type: 'error',
          severity: 'medium',
          message: 'Database query execution failed',
          details: {
            query: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
            error: error.message,
          },
        });
      }

      throw error;
    }
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    try {
      if (this.dataSource && this.dataSource.isInitialized) {
        this.logger.info('Closing database connection...');
        await this.dataSource.destroy();
        this.logger.info('Database connection closed successfully');
      }
    } catch (error) {
      this.logger.error('Error closing database connection', error);
      throw error;
    }
  }

  /**
   * Clear all data (for testing)
   */
  public async clearDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear database in production environment');
    }

    try {
      this.logger.warn('Clearing database - this should only be used in testing');

      const entities = this.getDataSource().entityMetadatas;

      for (const entity of entities) {
        const repository = this.getDataSource().getRepository(entity.name);
        await repository.delete({});
      }

      this.logger.info('Database cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear database', error);
      throw error;
    }
  }

  /**
   * Database performance monitoring
   */
  public async getPerformanceMetrics(): Promise<Record<string, unknown>> {
    try {
      // This would include various database performance metrics
      const metrics = {
        connectionCount: 'N/A', // Would be implemented with actual pool stats
        queryCount: 'N/A', // Would track query statistics
        averageQueryTime: 'N/A', // Would track query performance
        cacheHitRatio: 'N/A', // Would track cache performance
      };

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get performance metrics', error);
      return {};
    }
  }
}

// Export singleton instance
export const databaseManager = DatabaseManager.getInstance();
