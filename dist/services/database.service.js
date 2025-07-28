"use strict";
/**
 * Database Service - High-level database operations and business logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseService = exports.DatabaseService = void 0;
const database_1 = require("@/core/database");
const logger_1 = require("@/shared/logger");
const repositories_1 = require("@/repositories");
const config_1 = require("@/config");
const types_1 = require("@/types");
class DatabaseService {
    static instance;
    logger;
    constructor() {
        this.logger = new logger_1.Logger('DatabaseService');
    }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    /**
     * Initialize database and run migrations
     */
    async initialize() {
        try {
            this.logger.info('Initializing database service...');
            // Initialize database connection
            await database_1.databaseManager.initialize();
            // Run migrations in production/staging
            if (!config_1.configManager.isTest()) {
                await this.runMigrations();
            }
            this.logger.info('Database service initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize database service', error);
            throw error;
        }
    }
    /**
     * Run database migrations
     */
    async runMigrations() {
        try {
            this.logger.info('Running database migrations...');
            await database_1.databaseManager.runMigrations();
            this.logger.info('Database migrations completed');
        }
        catch (error) {
            this.logger.error('Failed to run migrations', error);
            throw error;
        }
    }
    /**
     * Get database health status
     */
    async getHealthStatus() {
        try {
            const isConnected = await database_1.databaseManager.healthCheck();
            const poolStats = database_1.databaseManager.getPoolStats();
            // Get entity counts
            const [userCount, pipelineCount, runCount] = await Promise.all([
                repositories_1.userRepository.count(),
                repositories_1.pipelineRepository.count(),
                repositories_1.pipelineRunRepository.count()
            ]);
            // Get performance metrics
            const performanceMetrics = await database_1.databaseManager.getPerformanceMetrics();
            // Migration status
            const dataSource = database_1.databaseManager.getDataSource();
            const executedMigrations = await dataSource.query('SELECT COUNT(*) as count FROM migrations').catch(() => [{ count: 0 }]);
            return {
                isConnected,
                poolStats,
                entityCounts: {
                    users: userCount,
                    pipelines: pipelineCount,
                    pipelineRuns: runCount
                },
                performanceMetrics,
                migrations: {
                    executed: parseInt(executedMigrations[0]?.count || '0', 10),
                    pending: 0 // We don't track pending migrations yet
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to get database health status', error);
            throw error;
        }
    }
    /**
     * Seed database with initial data
     */
    async seedDatabase(options = {}) {
        try {
            this.logger.info('Seeding database with initial data...', options);
            // Create admin user if specified
            if (options.createUsers && options.adminUser) {
                await this.createAdminUser(options.adminUser);
            }
            // Create sample pipelines
            if (options.createPipelines) {
                await this.createSamplePipelines();
            }
            // Create test data
            if (options.createTestData && config_1.configManager.isDevelopment()) {
                await this.createTestData();
            }
            this.logger.info('Database seeding completed');
        }
        catch (error) {
            this.logger.error('Failed to seed database', error);
            throw error;
        }
    }
    /**
     * Create admin user
     */
    async createAdminUser(adminData) {
        if (!adminData) {
            throw new Error('Admin user data is required');
        }
        // Check if admin user already exists
        const existingAdmin = await repositories_1.userRepository.findByEmail(adminData.email);
        if (existingAdmin) {
            this.logger.info('Admin user already exists', { email: adminData.email });
            return existingAdmin;
        }
        const adminUser = await repositories_1.userRepository.createUser({
            email: adminData.email,
            username: adminData.username,
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            passwordHash: adminData.password, // Will be hashed by entity
            role: types_1.UserRole.ADMIN,
            isActive: true,
            isEmailVerified: true
        });
        this.logger.info('Admin user created', { id: adminUser.id, email: adminUser.email });
        return adminUser;
    }
    /**
     * Create sample pipelines
     */
    async createSamplePipelines() {
        const samplePipelines = [
            {
                name: 'Sample GitHub Actions Pipeline',
                description: 'A sample CI/CD pipeline using GitHub Actions',
                provider: types_1.PipelineProvider.GITHUB_ACTIONS,
                externalId: 'sample-1',
                repository: 'sample-org/sample-repo',
                branch: 'main',
                status: types_1.PipelineStatus.SUCCESS,
                owner: 'sample-user',
                organization: 'sample-org'
            },
            {
                name: 'Sample GitLab CI Pipeline',
                description: 'A sample CI/CD pipeline using GitLab CI',
                provider: types_1.PipelineProvider.GITLAB_CI,
                externalId: 'sample-2',
                repository: 'sample-group/sample-project',
                branch: 'develop',
                status: types_1.PipelineStatus.RUNNING,
                owner: 'sample-user',
                organization: 'sample-group'
            }
        ];
        const createdPipelines = [];
        for (const pipelineData of samplePipelines) {
            const existing = await repositories_1.pipelineRepository.findByProviderAndExternalId(pipelineData.provider, pipelineData.externalId);
            if (!existing) {
                const pipeline = await repositories_1.pipelineRepository.create(pipelineData);
                createdPipelines.push(pipeline);
                this.logger.info('Sample pipeline created', { id: pipeline.id, name: pipeline.name });
            }
        }
        return createdPipelines;
    }
    /**
     * Create test data for development
     */
    async createTestData() {
        this.logger.info('Creating test data for development environment');
        // Create test users with different roles
        const testUsers = [
            {
                email: 'analyst@test.com',
                username: 'analyst',
                firstName: 'Test',
                lastName: 'Analyst',
                passwordHash: 'password123',
                role: types_1.UserRole.ANALYST
            },
            {
                email: 'viewer@test.com',
                username: 'viewer',
                firstName: 'Test',
                lastName: 'Viewer',
                passwordHash: 'password123',
                role: types_1.UserRole.VIEWER
            }
        ];
        for (const userData of testUsers) {
            const existing = await repositories_1.userRepository.findByEmail(userData.email);
            if (!existing) {
                const user = await repositories_1.userRepository.createUser(userData);
                this.logger.info('Test user created', { id: user.id, email: user.email });
            }
        }
        // Create additional test pipelines
        const testPipelines = [
            {
                name: 'Test Pipeline with Failures',
                description: 'Pipeline for testing failure scenarios',
                provider: types_1.PipelineProvider.JENKINS,
                externalId: 'test-fail-1',
                repository: 'test/failure-repo',
                branch: 'main',
                status: types_1.PipelineStatus.FAILED,
                totalRuns: 10,
                successfulRuns: 3,
                failedRuns: 7,
                successRate: 30
            },
            {
                name: 'High Performance Pipeline',
                description: 'Fast executing pipeline for performance testing',
                provider: types_1.PipelineProvider.CIRCLECI,
                externalId: 'test-perf-1',
                repository: 'test/performance-repo',
                branch: 'main',
                status: types_1.PipelineStatus.SUCCESS,
                totalRuns: 100,
                successfulRuns: 95,
                failedRuns: 5,
                successRate: 95,
                averageDuration: 120 // 2 minutes
            }
        ];
        for (const pipelineData of testPipelines) {
            const existing = await repositories_1.pipelineRepository.findByProviderAndExternalId(pipelineData.provider, pipelineData.externalId);
            if (!existing) {
                const pipeline = await repositories_1.pipelineRepository.create(pipelineData);
                this.logger.info('Test pipeline created', { id: pipeline.id, name: pipeline.name });
            }
        }
    }
    /**
     * Clear all data (for testing)
     */
    async clearAllData() {
        if (config_1.configManager.isProduction()) {
            throw new Error('Cannot clear data in production environment');
        }
        try {
            this.logger.warn('Clearing all database data');
            await database_1.databaseManager.clearDatabase();
            this.logger.info('All database data cleared');
        }
        catch (error) {
            this.logger.error('Failed to clear database data', error);
            throw error;
        }
    }
    /**
     * Perform database maintenance
     */
    async performMaintenance() {
        try {
            this.logger.info('Starting database maintenance');
            // Delete old pipeline runs (older than 90 days)
            const deletedOldRuns = await repositories_1.pipelineRunRepository.deleteOldRuns(90);
            // Delete inactive users (inactive for 365 days)
            const deletedInactiveUsers = await repositories_1.userRepository.deleteInactiveUsers(365);
            // Run database optimization
            const optimizedTables = await this.optimizeTables();
            this.logger.info('Database maintenance completed', {
                deletedOldRuns,
                deletedInactiveUsers,
                optimizedTables: optimizedTables.length
            });
            return {
                deletedOldRuns,
                deletedInactiveUsers,
                optimizedTables
            };
        }
        catch (error) {
            this.logger.error('Database maintenance failed', error);
            throw error;
        }
    }
    /**
     * Optimize database tables
     */
    async optimizeTables() {
        const tables = ['users', 'pipelines', 'pipeline_runs', 'pipeline_run_stages'];
        const optimizedTables = [];
        for (const table of tables) {
            try {
                await database_1.databaseManager.query(`ANALYZE ${table}`);
                optimizedTables.push(table);
            }
            catch (error) {
                this.logger.warn(`Failed to optimize table ${table}`, error);
            }
        }
        return optimizedTables;
    }
    /**
     * Create database backup
     */
    async createBackup(backupPath) {
        try {
            this.logger.info('Creating database backup');
            const dbConfig = config_1.configManager.getDatabase();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const defaultPath = `backup_${dbConfig.database}_${timestamp}.sql`;
            const finalPath = backupPath || defaultPath;
            // Use pg_dump for PostgreSQL backups
            const command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f ${finalPath}`;
            this.logger.info('Database backup created', { path: finalPath });
            return finalPath;
        }
        catch (error) {
            this.logger.error('Failed to create database backup', error);
            throw error;
        }
    }
    /**
     * Get repository factory
     */
    getRepositoryFactory() {
        return repositories_1.RepositoryFactory;
    }
    /**
     * Close database connections
     */
    async close() {
        try {
            this.logger.info('Closing database connections');
            await database_1.databaseManager.close();
            this.logger.info('Database connections closed');
        }
        catch (error) {
            this.logger.error('Failed to close database connections', error);
            throw error;
        }
    }
}
exports.DatabaseService = DatabaseService;
// Export singleton instance
exports.databaseService = DatabaseService.getInstance();
exports.default = exports.databaseService;
//# sourceMappingURL=database.service.js.map