/**
 * Database Initialization Script
 * Comprehensive database setup for production deployment
 */
export interface InitializationOptions {
    runMigrations?: boolean;
    seedData?: boolean;
    createAdminUser?: boolean;
    adminUser?: {
        email: string;
        username: string;
        password: string;
        firstName: string;
        lastName: string;
    };
    enableMonitoring?: boolean;
    skipHealthCheck?: boolean;
    verbose?: boolean;
}
export declare class DatabaseInitializer {
    private logger;
    constructor();
    /**
     * Initialize database with comprehensive setup
     */
    initialize(options?: InitializationOptions): Promise<void>;
    /**
     * Initialize the enhanced database service
     */
    private initializeService;
    /**
     * Run database migrations
     */
    private runMigrations;
    /**
     * Seed database with initial data
     */
    private seedData;
    /**
     * Perform comprehensive health check
     */
    private performHealthCheck;
    /**
     * Quick initialization for development
     */
    initializeDevelopment(): Promise<void>;
    /**
     * Production initialization
     */
    initializeProduction(): Promise<void>;
    /**
     * Test initialization (minimal setup)
     */
    initializeTest(): Promise<void>;
    /**
     * Get initialization status
     */
    getStatus(): Promise<Record<string, unknown>>;
    /**
     * Shutdown database gracefully
     */
    shutdown(): Promise<void>;
}
export declare const databaseInitializer: DatabaseInitializer;
export declare const initializeDatabaseForEnvironment: () => Promise<void>;
//# sourceMappingURL=database-init.d.ts.map