/**
 * Enterprise Database Manager - TypeORM with connection pooling
 * Production-ready database layer with migrations and monitoring
 */
import { DataSource, QueryRunner, EntityManager } from 'typeorm';
export declare class DatabaseManager {
    private static instance;
    private dataSource;
    private logger;
    private connectionRetries;
    private maxRetries;
    private constructor();
    static getInstance(): DatabaseManager;
    /**
     * Initialize database connection
     */
    initialize(): Promise<void>;
    /**
     * Connect with retry logic
     */
    private connectWithRetry;
    /**
     * Get the data source instance
     */
    getDataSource(): DataSource;
    /**
     * Get entity manager
     */
    getEntityManager(): EntityManager;
    /**
     * Create a query runner for transactions
     */
    createQueryRunner(): QueryRunner;
    /**
     * Execute a transaction
     */
    transaction<T>(operation: (manager: EntityManager) => Promise<T>): Promise<T>;
    /**
     * Run database migrations
     */
    runMigrations(): Promise<void>;
    /**
     * Revert the last migration
     */
    revertLastMigration(): Promise<void>;
    /**
     * Database health check
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get connection pool statistics
     */
    getPoolStats(): Record<string, unknown>;
    /**
     * Execute raw SQL query with logging and security analysis
     */
    query<T = unknown>(sql: string, parameters?: unknown[]): Promise<T>;
    /**
     * Close database connection
     */
    close(): Promise<void>;
    /**
     * Clear all data (for testing)
     */
    clearDatabase(): Promise<void>;
    /**
     * Database performance monitoring
     */
    getPerformanceMetrics(): Promise<Record<string, unknown>>;
}
export declare const databaseManager: DatabaseManager;
//# sourceMappingURL=database.d.ts.map