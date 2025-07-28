/**
 * Database Configuration Management
 * Centralized database configuration with environment-specific settings
 */

import { DataSourceOptions } from 'typeorm';
import { configManager } from '@/config';
import { Logger } from '@/shared/logger';

// Import all entities
import { Pipeline } from '@/entities/pipeline.entity';
import { PipelineRun, PipelineRunStage } from '@/entities/pipeline-run.entity';
import { User, UserSession, ApiKey } from '@/entities/user.entity';

const logger = new Logger('DatabaseConfig');

export interface DatabaseConfig {
  type: 'postgres';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean | object;
  poolSize: number;
  connectionTimeout: number;
  queryTimeout: number;
  idleTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

export interface CacheConfig {
  enabled: boolean;
  type: 'redis' | 'memory';
  duration: number;
  options?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
}

export interface MigrationConfig {
  enabled: boolean;
  directory: string;
  pattern: string;
  tableName: string;
  transactional: boolean;
}

export class DatabaseConfigManager {
  private static instance: DatabaseConfigManager;

  private constructor() {}

  public static getInstance(): DatabaseConfigManager {
    if (!DatabaseConfigManager.instance) {
      DatabaseConfigManager.instance = new DatabaseConfigManager();
    }
    return DatabaseConfigManager.instance;
  }

  /**
   * Get database configuration based on environment
   */
  public getDatabaseConfig(): DatabaseConfig {
    const config = configManager.getDatabase();
    
    return {
      type: 'postgres',
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password,
      ssl: this.getSSLConfig(),
      poolSize: config.poolSize || this.getDefaultPoolSize(),
      connectionTimeout: 30000,
      queryTimeout: 60000,
      idleTimeout: 300000, // 5 minutes
      maxRetries: 3,
      retryDelay: 1000
    };
  }

  /**
   * Get SSL configuration based on environment
   */
  private getSSLConfig(): boolean | object {
    if (configManager.isProduction()) {
      return {
        rejectUnauthorized: false, // For cloud databases
        requestCert: false,
        agent: false
      };
    }
    
    return false; // Development/test
  }

  /**
   * Get default pool size based on environment
   */
  private getDefaultPoolSize(): number {
    if (configManager.isProduction()) {
      return 20;
    }
    return 10; // Development/test
  }

  /**
   * Get cache configuration
   */
  public getCacheConfig(): CacheConfig {
    if (configManager.isTest()) {
      return {
        enabled: false,
        type: 'memory',
        duration: 60000
      };
    }

    const redisConfig = configManager.getRedis();
    
    return {
      enabled: true,
      type: 'redis',
      duration: 300000, // 5 minutes
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        ...(redisConfig.password && { password: redisConfig.password }),
        db: redisConfig.db
      }
    };
  }

  /**
   * Get migration configuration
   */
  public getMigrationConfig(): MigrationConfig {
    return {
      enabled: !configManager.isTest(),
      directory: 'src/migrations',
      pattern: '**/*.ts',
      tableName: 'migrations',
      transactional: true
    };
  }

  /**
   * Create TypeORM DataSource configuration
   */
  public createDataSourceConfig(): DataSourceOptions {
    const dbConfig = this.getDatabaseConfig();
    const cacheConfig = this.getCacheConfig();
    const migrationConfig = this.getMigrationConfig();

    logger.info('Creating database configuration', {
      environment: process.env.NODE_ENV,
      host: dbConfig.host,
      database: dbConfig.database,
      poolSize: dbConfig.poolSize,
      ssl: !!dbConfig.ssl,
      cache: cacheConfig.enabled
    });

    const config: DataSourceOptions = {
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
        min: Math.max(1, Math.floor(dbConfig.poolSize / 4)),
        acquireTimeoutMillis: dbConfig.connectionTimeout,
        createTimeoutMillis: dbConfig.connectionTimeout,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: dbConfig.idleTimeout,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: dbConfig.retryDelay,
        
        // Connection validation
        testOnBorrow: true,
        
        // Additional PostgreSQL options
        application_name: 'cicd-pipeline-analyzer',
        statement_timeout: dbConfig.queryTimeout,
        idle_in_transaction_session_timeout: 30000
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
      migrations: migrationConfig.enabled ? [`${migrationConfig.directory}/${migrationConfig.pattern}`] : [],
      migrationsRun: false, // We handle migrations manually
      migrationsTableName: migrationConfig.tableName,
      migrationsTransactionMode: migrationConfig.transactional ? 'each' : 'none',

      // Synchronization - Only in development
      synchronize: configManager.isDevelopment() && !migrationConfig.enabled,
      dropSchema: false,

      // Logging Configuration
      logging: this.getLoggingConfig(),
      logger: 'advanced-console',

      // Cache Configuration
      cache: cacheConfig.enabled ? this.createCacheConfig(cacheConfig) : false,

      // Subscriber Configuration
      subscribers: [],
      
      // Schema Configuration
      schema: 'public'
      
      // Naming Strategy - use default
    };

    return config;
  }

  /**
   * Get logging configuration based on environment
   */
  private getLoggingConfig(): boolean | ("query" | "error" | "schema" | "warn" | "info" | "log" | "migration")[] {
    if (configManager.isTest()) {
      return false;
    }

    if (configManager.isDevelopment()) {
      return ['query', 'error', 'schema', 'warn', 'info', 'log'];
    }

    // Production
    return ['error', 'migration'];
  }

  /**
   * Create cache configuration
   */
  private createCacheConfig(cacheConfig: CacheConfig): object {
    if (cacheConfig.type === 'redis' && cacheConfig.options) {
      return {
        type: 'redis',
        options: {
          host: cacheConfig.options.host,
          port: cacheConfig.options.port,
          password: cacheConfig.options.password,
          db: cacheConfig.options.db || 0,
          keyPrefix: 'cicd:typeorm:',
          // Redis cache options
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          connectTimeout: 10000,
          commandTimeout: 5000
        },
        duration: cacheConfig.duration,
        ignoreErrors: true // Don't fail queries if cache fails
      };
    }

    return {
      type: 'database',
      duration: cacheConfig.duration
    };
  }

  /**
   * Validate database configuration
   */
  public validateConfig(): void {
    const dbConfig = this.getDatabaseConfig();
    
    const requiredFields = ['host', 'port', 'database', 'username', 'password'];
    const missingFields = requiredFields.filter(field => {
      const value = (dbConfig as any)[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      throw new Error(`Missing required database configuration fields: ${missingFields.join(', ')}`);
    }

    if (dbConfig.port < 1 || dbConfig.port > 65535) {
      throw new Error(`Invalid database port: ${dbConfig.port}`);
    }

    if (dbConfig.poolSize < 1 || dbConfig.poolSize > 100) {
      throw new Error(`Invalid pool size: ${dbConfig.poolSize}. Must be between 1 and 100.`);
    }

    logger.info('Database configuration validated successfully');
  }
}

// Export singleton instance
export const databaseConfigManager = DatabaseConfigManager.getInstance();
