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
  // Security enhancements
  enableSSLValidation: boolean;
  enableQueryLogging: boolean;
  enableConnectionAuditing: boolean;
  maxConnections: number;
  connectionAuditLog: boolean;
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
      retryDelay: 1000,
      // Security enhancements
      enableSSLValidation: configManager.isProduction(),
      enableQueryLogging: !configManager.isProduction(),
      enableConnectionAuditing: true,
      maxConnections: (config.poolSize || this.getDefaultPoolSize()) * 2,
      connectionAuditLog: true
    };
  }

  /**
   * Get SSL configuration based on environment
   */
  private getSSLConfig(): boolean | object {
    if (configManager.isProduction()) {
      const sslConfig: any = {
        // Enable certificate validation in production
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        
        // Certificate authority
        ...(process.env.DB_SSL_CA && { ca: process.env.DB_SSL_CA }),
        
        // Client certificate authentication
        ...(process.env.DB_SSL_CERT && { cert: process.env.DB_SSL_CERT }),
        ...(process.env.DB_SSL_KEY && { key: process.env.DB_SSL_KEY }),
        
        // Additional SSL options
        checkServerIdentity: process.env.DB_SSL_CHECK_SERVER_IDENTITY !== 'false',
        secureProtocol: 'TLSv1_2_method', // Force TLS 1.2+
        ciphers: 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS',
        honorCipherOrder: true
      };

      // Custom server identity check for cloud providers
      if (process.env.DB_SSL_CHECK_SERVER_IDENTITY === 'custom') {
        sslConfig.checkServerIdentity = (host: string, cert: any) => {
          // Custom validation logic for cloud databases
          const allowedHosts = process.env.DB_SSL_ALLOWED_HOSTS?.split(',') || [];
          if (allowedHosts.length > 0 && !allowedHosts.includes(host)) {
            throw new Error(`SSL: Host ${host} not in allowed hosts list`);
          }
          return undefined; // Valid
        };
      }

      logger.info('SSL enabled for production database', {
        rejectUnauthorized: sslConfig.rejectUnauthorized,
        hasCert: !!sslConfig.cert,
        hasKey: !!sslConfig.key,
        hasCA: !!sslConfig.ca
      });

      return sslConfig;
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
        
        // Security enhancements
        ...(dbConfig.maxConnections && { absoluteMaxSize: dbConfig.maxConnections }),
        
        // Additional PostgreSQL options
        application_name: 'cicd-pipeline-analyzer',
        statement_timeout: dbConfig.queryTimeout,
        idle_in_transaction_session_timeout: 30000,
        
        // Security settings
        ...(configManager.isProduction() && {
          // Production security options
          tcp_keepalives_idle: 600,
          tcp_keepalives_interval: 30,
          tcp_keepalives_count: 3,
          connect_timeout: 30
        })
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

    // Security validations
    this.validateSecurity();

    logger.info('Database configuration validated successfully');
  }

  /**
   * Validate security configuration
   */
  private validateSecurity(): void {
    const dbConfig = this.getDatabaseConfig();

    // Validate SSL in production
    if (configManager.isProduction()) {
      if (!dbConfig.ssl) {
        logger.warn('SSL is disabled in production - this is a security risk');
      } else if (dbConfig.enableSSLValidation && typeof dbConfig.ssl === 'object') {
        const sslConfig = dbConfig.ssl as any;
        if (sslConfig.rejectUnauthorized === false) {
          logger.warn('SSL certificate validation is disabled - this reduces security');
        }
      }
    }

    // Validate password strength (basic check)
    if (typeof dbConfig.password === 'string') {
      const minPasswordLength = configManager.isTest() ? 4 : 8; // Relaxed for tests
      
      if (dbConfig.password.length < minPasswordLength) {
        throw new Error(`Database password must be at least ${minPasswordLength} characters long`);
      }
      
      // Check for common weak passwords (skip in test environment)
      if (!configManager.isTest()) {
        const weakPasswords = ['password', '123456', 'admin', 'postgres'];
        if (weakPasswords.includes(dbConfig.password.toLowerCase())) {
          throw new Error('Database password is too weak - avoid common passwords');
        }
      }
    }

    // Validate host for production
    if (configManager.isProduction()) {
      if (dbConfig.host === 'localhost' || dbConfig.host === '127.0.0.1') {
        logger.warn('Using localhost in production - ensure this is intentional');
      }
    }

    // Validate connection limits
    if (dbConfig.maxConnections < dbConfig.poolSize) {
      throw new Error(`maxConnections (${dbConfig.maxConnections}) must be >= poolSize (${dbConfig.poolSize})`);
    }

    logger.info('Security validation completed', {
      sslEnabled: !!dbConfig.ssl,
      sslValidation: dbConfig.enableSSLValidation,
      auditingEnabled: dbConfig.enableConnectionAuditing,
      environment: process.env.NODE_ENV
    });
  }
}

// Export singleton instance
export const databaseConfigManager = DatabaseConfigManager.getInstance();
