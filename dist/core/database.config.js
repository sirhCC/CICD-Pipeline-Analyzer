"use strict";
/**
 * Database Configuration Management
 * Centralized database configuration with environment-specific settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfigManager = exports.DatabaseConfigManager = void 0;
const config_1 = require("@/config");
const logger_1 = require("@/shared/logger");
// Import all entities
const pipeline_entity_1 = require("@/entities/pipeline.entity");
const pipeline_run_entity_1 = require("@/entities/pipeline-run.entity");
const user_entity_1 = require("@/entities/user.entity");
const logger = new logger_1.Logger('DatabaseConfig');
class DatabaseConfigManager {
    static instance;
    constructor() { }
    static getInstance() {
        if (!DatabaseConfigManager.instance) {
            DatabaseConfigManager.instance = new DatabaseConfigManager();
        }
        return DatabaseConfigManager.instance;
    }
    /**
     * Get database configuration based on environment
     */
    getDatabaseConfig() {
        const config = config_1.configManager.getDatabase();
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
    getSSLConfig() {
        if (config_1.configManager.isProduction()) {
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
    getDefaultPoolSize() {
        if (config_1.configManager.isProduction()) {
            return 20;
        }
        return 10; // Development/test
    }
    /**
     * Get cache configuration
     */
    getCacheConfig() {
        if (config_1.configManager.isTest()) {
            return {
                enabled: false,
                type: 'memory',
                duration: 60000
            };
        }
        const redisConfig = config_1.configManager.getRedis();
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
    getMigrationConfig() {
        return {
            enabled: !config_1.configManager.isTest(),
            directory: 'src/migrations',
            pattern: '**/*.ts',
            tableName: 'migrations',
            transactional: true
        };
    }
    /**
     * Create TypeORM DataSource configuration
     */
    createDataSourceConfig() {
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
        const config = {
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
                pipeline_entity_1.Pipeline,
                pipeline_run_entity_1.PipelineRun,
                pipeline_run_entity_1.PipelineRunStage,
                user_entity_1.User,
                user_entity_1.UserSession,
                user_entity_1.ApiKey
            ],
            // Migration Configuration
            migrations: migrationConfig.enabled ? [`${migrationConfig.directory}/${migrationConfig.pattern}`] : [],
            migrationsRun: false, // We handle migrations manually
            migrationsTableName: migrationConfig.tableName,
            migrationsTransactionMode: migrationConfig.transactional ? 'each' : 'none',
            // Synchronization - Only in development
            synchronize: config_1.configManager.isDevelopment() && !migrationConfig.enabled,
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
    getLoggingConfig() {
        if (config_1.configManager.isTest()) {
            return false;
        }
        if (config_1.configManager.isDevelopment()) {
            return ['query', 'error', 'schema', 'warn', 'info', 'log'];
        }
        // Production
        return ['error', 'migration'];
    }
    /**
     * Create cache configuration
     */
    createCacheConfig(cacheConfig) {
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
    validateConfig() {
        const dbConfig = this.getDatabaseConfig();
        const requiredFields = ['host', 'port', 'database', 'username', 'password'];
        const missingFields = requiredFields.filter(field => {
            const value = dbConfig[field];
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
exports.DatabaseConfigManager = DatabaseConfigManager;
// Export singleton instance
exports.databaseConfigManager = DatabaseConfigManager.getInstance();
//# sourceMappingURL=database.config.js.map