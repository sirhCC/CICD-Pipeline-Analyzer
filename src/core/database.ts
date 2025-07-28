/**
 * Enterprise Database Manager - TypeORM with connection pooling
 * Production-ready database layer with migrations and monitoring
 */

import { DataSource, QueryRunner, EntityManager } from 'typeorm';
import { configManager } from '@/config';
import { Logger } from '@/shared/logger';

// Import all entities
import { Pipeline } from '@/entities/pipeline.entity';
import { PipelineRun, PipelineRunStage } from '@/entities/pipeline-run.entity';
import { User, UserSession, ApiKey } from '@/entities/user.entity';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private dataSource: DataSource | null = null;
  private logger: Logger;

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
      
      const dbConfig = configManager.getDatabase();
      
      this.dataSource = new DataSource({
        type: dbConfig.type,
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        username: dbConfig.username,
        password: dbConfig.password,
        ssl: dbConfig.ssl,
        
        // Connection Pool Configuration
        extra: {
          max: dbConfig.poolSize,
          min: 2,
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 2000,
        },

        // Entity Configuration
        entities: [
          Pipeline,
          PipelineRun,
          PipelineRunStage,
          User,
          UserSession,
          ApiKey
        ],
        
        // Migration Configuration
        migrations: ['src/migrations/**/*.ts'],
        migrationsRun: false, // We'll run migrations manually
        
        // Development Configuration
        synchronize: configManager.isDevelopment(), // Only in development
        logging: configManager.isDevelopment() ? 'all' : ['error'],
        
        // Production Configuration
        cache: {
          type: 'redis',
          options: {
            host: configManager.getRedis().host,
            port: configManager.getRedis().port,
            ...(configManager.getRedis().password && { 
              password: configManager.getRedis().password 
            }),
          },
        },
      });

      await this.dataSource.initialize();
      
      this.logger.info('Database connection established successfully');
      
      // Run health check
      await this.healthCheck();
      
    } catch (error) {
      this.logger.error('Failed to initialize database', error);
      throw error;
    }
  }

  /**
   * Get the data source instance
   */
  public getDataSource(): DataSource {
    if (!this.dataSource || !this.dataSource.isInitialized) {
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
  public async transaction<T>(
    operation: (manager: EntityManager) => Promise<T>
  ): Promise<T> {
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
   * Execute raw SQL query with logging
   */
  public async query<T = unknown>(sql: string, parameters?: unknown[]): Promise<T> {
    const timer = this.logger.startTimer('database_query');
    
    try {
      const result = await this.getDataSource().query(sql, parameters);
      timer();
      
      this.logger.logDatabaseQuery(sql, 0, { parameters });
      
      return result as T;
    } catch (error) {
      timer();
      this.logger.error('Database query failed', error, { sql, parameters });
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
    if (configManager.isProduction()) {
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
        queryCount: 'N/A',      // Would track query statistics
        averageQueryTime: 'N/A', // Would track query performance
        cacheHitRatio: 'N/A',    // Would track cache performance
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
