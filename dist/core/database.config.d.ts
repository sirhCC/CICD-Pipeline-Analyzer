/**
 * Database Configuration Management
 * Centralized database configuration with environment-specific settings
 */
import { DataSourceOptions } from 'typeorm';
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
export declare class DatabaseConfigManager {
    private static instance;
    private constructor();
    static getInstance(): DatabaseConfigManager;
    /**
     * Get database configuration based on environment
     */
    getDatabaseConfig(): DatabaseConfig;
    /**
     * Get SSL configuration based on environment
     */
    private getSSLConfig;
    /**
     * Get default pool size based on environment
     */
    private getDefaultPoolSize;
    /**
     * Get cache configuration
     */
    getCacheConfig(): CacheConfig;
    /**
     * Get migration configuration
     */
    getMigrationConfig(): MigrationConfig;
    /**
     * Create TypeORM DataSource configuration
     */
    createDataSourceConfig(): DataSourceOptions;
    /**
     * Get logging configuration based on environment
     */
    private getLoggingConfig;
    /**
     * Create cache configuration
     */
    private createCacheConfig;
    /**
     * Validate database configuration
     */
    validateConfig(): void;
    /**
     * Validate security configuration
     */
    private validateSecurity;
}
export declare const databaseConfigManager: DatabaseConfigManager;
//# sourceMappingURL=database.config.d.ts.map