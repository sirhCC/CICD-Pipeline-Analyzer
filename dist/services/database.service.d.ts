/**
 * Database Service - High-level database operations and business logic
 */
import { RepositoryFactory } from '@/repositories';
export interface DatabaseHealthStatus {
    isConnected: boolean;
    poolStats: Record<string, unknown>;
    entityCounts: {
        users: number;
        pipelines: number;
        pipelineRuns: number;
    };
    performanceMetrics: Record<string, unknown>;
    migrations: {
        executed: number;
        pending: number;
    };
}
export interface DatabaseSeedOptions {
    createUsers?: boolean;
    createPipelines?: boolean;
    createTestData?: boolean;
    adminUser?: {
        email: string;
        username: string;
        password: string;
        firstName: string;
        lastName: string;
    };
}
export declare class DatabaseService {
    private static instance;
    private logger;
    private constructor();
    static getInstance(): DatabaseService;
    /**
     * Initialize database and run migrations
     */
    initialize(): Promise<void>;
    /**
     * Run database migrations
     */
    runMigrations(): Promise<void>;
    /**
     * Get database health status
     */
    getHealthStatus(): Promise<DatabaseHealthStatus>;
    /**
     * Seed database with initial data
     */
    seedDatabase(options?: DatabaseSeedOptions): Promise<void>;
    /**
     * Create admin user
     */
    private createAdminUser;
    /**
     * Create sample pipelines
     */
    private createSamplePipelines;
    /**
     * Create test data for development
     */
    private createTestData;
    /**
     * Clear all data (for testing)
     */
    clearAllData(): Promise<void>;
    /**
     * Perform database maintenance
     */
    performMaintenance(): Promise<{
        deletedOldRuns: number;
        deletedInactiveUsers: number;
        optimizedTables: string[];
    }>;
    /**
     * Optimize database tables
     */
    private optimizeTables;
    /**
     * Create database backup
     */
    createBackup(backupPath?: string): Promise<string>;
    /**
     * Get repository factory
     */
    getRepositoryFactory(): typeof RepositoryFactory;
    /**
     * Close database connections
     */
    close(): Promise<void>;
}
export declare const databaseService: DatabaseService;
export default databaseService;
//# sourceMappingURL=database.service.d.ts.map