/**
 * Enhanced Database Service - Production-ready database layer
 * Integrates connection management, monitoring, and business logic
 */
export interface DatabaseHealthStatus {
    isConnected: boolean;
    connectionStats: any;
    entityCounts: {
        users: number;
        pipelines: number;
        pipelineRuns: number;
    };
    performanceMetrics: any;
    migrations: {
        executed: number;
        pending: number;
    };
    uptime: number;
    isHealthy: boolean;
    recommendations: string[];
    security: {
        metrics: any;
        recentEvents: any[];
        recommendations: string[];
        securityScore: number;
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
export declare class EnhancedDatabaseService {
    private static instance;
    private logger;
    private isInitialized;
    private constructor();
    static getInstance(): EnhancedDatabaseService;
    /**
     * Initialize database service with monitoring
     */
    initialize(): Promise<void>;
    /**
     * Setup database event listeners
     */
    private setupEventListeners;
    /**
     * Run database migrations
     */
    runMigrations(): Promise<void>;
    /**
     * Get comprehensive database health status
     */
    getHealthStatus(): Promise<DatabaseHealthStatus>;
    /**
     * Seed database with initial data
     */
    seedDatabase(options?: DatabaseSeedOptions): Promise<void>;
    /**
     * Create admin user with transaction
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
     * Execute database backup
     */
    createBackup(): Promise<string>;
    /**
     * Clean up old data
     */
    cleanupOldData(daysToKeep?: number): Promise<void>;
    /**
     * Get database statistics
     */
    getStatistics(): Promise<Record<string, unknown>>;
    /**
     * Shutdown database service
     */
    shutdown(): Promise<void>;
}
export declare const enhancedDatabaseService: EnhancedDatabaseService;
//# sourceMappingURL=database.enhanced.d.ts.map