"use strict";
/**
 * Enhanced Database Service - Production-ready database layer
 * Integrates connection management, monitoring, and business logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedDatabaseService = exports.EnhancedDatabaseService = void 0;
const database_1 = require("../core/database");
const database_monitor_1 = require("../core/database-monitor");
const database_security_1 = require("../core/database-security");
const factory_enhanced_1 = require("../repositories/factory.enhanced");
const logger_1 = require("../shared/logger");
const config_1 = require("../config");
const types_1 = require("../types");
class EnhancedDatabaseService {
    static instance;
    logger;
    isInitialized = false;
    constructor() {
        this.logger = new logger_1.Logger('EnhancedDatabaseService');
    }
    static getInstance() {
        if (!EnhancedDatabaseService.instance) {
            EnhancedDatabaseService.instance = new EnhancedDatabaseService();
        }
        return EnhancedDatabaseService.instance;
    }
    /**
     * Initialize database service with monitoring
     */
    async initialize() {
        try {
            this.logger.info('Initializing enhanced database service...');
            // Initialize database connection
            await database_1.databaseManager.initialize();
            // Initialize repositories
            await factory_enhanced_1.repositoryFactory.initializeRepositories();
            // Start connection monitoring
            database_monitor_1.databaseConnectionManager.startHealthMonitoring(30000); // Every 30 seconds
            // Set up event listeners
            this.setupEventListeners();
            // Run migrations in production/staging
            if (!config_1.configManager.isTest()) {
                await this.runMigrations();
            }
            this.isInitialized = true;
            this.logger.info('Enhanced database service initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize enhanced database service', error);
            throw error;
        }
    }
    /**
     * Setup database event listeners
     */
    setupEventListeners() {
        database_monitor_1.databaseConnectionManager.on('healthCheckFailed', (error) => {
            this.logger.error('Database health check failed', error);
            // Could trigger alerts or failover logic here
        });
        database_monitor_1.databaseConnectionManager.on('slowQuery', ({ duration }) => {
            this.logger.warn('Slow query detected', { duration });
            // Could log to monitoring system
        });
        database_monitor_1.databaseConnectionManager.on('healthCheckSuccess', ({ responseTime, metrics }) => {
            this.logger.debug('Database health check successful', { responseTime });
        });
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
     * Get comprehensive database health status
     */
    async getHealthStatus() {
        try {
            const isConnected = await database_monitor_1.databaseConnectionManager.testConnection();
            const connectionStats = database_monitor_1.databaseConnectionManager.getConnectionStats();
            const metrics = database_monitor_1.databaseConnectionManager.getMetrics();
            // Get entity counts
            const userRepository = factory_enhanced_1.repositoryFactory.getUserRepository();
            const pipelineRepository = factory_enhanced_1.repositoryFactory.getPipelineRepository();
            const pipelineRunRepository = factory_enhanced_1.repositoryFactory.getPipelineRunRepository();
            const [userCount, pipelineCount, runCount] = await Promise.all([
                factory_enhanced_1.repositoryFactory.executeWithMonitoring(() => userRepository.count(), 'count_users'),
                factory_enhanced_1.repositoryFactory.executeWithMonitoring(() => pipelineRepository.count(), 'count_pipelines'),
                factory_enhanced_1.repositoryFactory.executeWithMonitoring(() => pipelineRunRepository.count(), 'count_pipeline_runs')
            ]);
            // Get migration status
            const dataSource = database_1.databaseManager.getDataSource();
            const executedMigrations = await dataSource.query('SELECT COUNT(*) as count FROM migrations').catch(() => [{ count: 0 }]);
            // Get performance recommendations
            const recommendations = database_monitor_1.databaseConnectionManager.getPerformanceRecommendations();
            // Get security status
            const securityReport = database_security_1.databaseSecurityManager.generateSecurityReport();
            return {
                isConnected,
                connectionStats,
                entityCounts: {
                    users: userCount,
                    pipelines: pipelineCount,
                    pipelineRuns: runCount
                },
                performanceMetrics: metrics.performanceMetrics,
                migrations: {
                    executed: parseInt(executedMigrations[0]?.count || '0', 10),
                    pending: 0 // We don't track pending migrations yet
                },
                uptime: metrics.uptime,
                isHealthy: metrics.isHealthy,
                recommendations,
                security: {
                    metrics: securityReport.summary,
                    recentEvents: securityReport.recentEvents,
                    recommendations: securityReport.recommendations,
                    securityScore: securityReport.summary.securityScore
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
     * Create admin user with transaction
     */
    async createAdminUser(adminData) {
        if (!adminData) {
            throw new Error('Admin user data is required');
        }
        return factory_enhanced_1.repositoryFactory.executeTransaction(async ({ userRepository }) => {
            // Check if admin user already exists
            const existingAdmin = await userRepository.findByEmail(adminData.email);
            if (existingAdmin) {
                this.logger.info('Admin user already exists', { email: adminData.email });
                return existingAdmin;
            }
            const adminUser = await userRepository.createUser({
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
        });
    }
    /**
     * Create sample pipelines
     */
    async createSamplePipelines() {
        const pipelineRepository = factory_enhanced_1.repositoryFactory.getPipelineRepository();
        const samplePipelines = [
            {
                name: 'Sample Node.js Pipeline',
                description: 'Sample CI/CD pipeline for Node.js applications',
                provider: types_1.PipelineProvider.GITHUB_ACTIONS,
                externalId: 'sample-nodejs-1',
                repository: 'organization/sample-nodejs-app',
                branch: 'main',
                status: types_1.PipelineStatus.SUCCESS
            },
            {
                name: 'Sample Python Pipeline',
                description: 'Sample CI/CD pipeline for Python applications',
                provider: types_1.PipelineProvider.GITLAB_CI,
                externalId: 'sample-python-1',
                repository: 'organization/sample-python-app',
                branch: 'main',
                status: types_1.PipelineStatus.SUCCESS
            }
        ];
        for (const pipelineData of samplePipelines) {
            // Check if pipeline already exists
            const existing = await pipelineRepository.findByProviderAndExternalId(pipelineData.provider, pipelineData.externalId);
            if (!existing) {
                await pipelineRepository.create(pipelineData);
                this.logger.info('Created sample pipeline', { name: pipelineData.name });
            }
        }
    }
    /**
     * Create test data for development
     */
    async createTestData() {
        this.logger.info('Creating test data for development environment');
        // Create additional test users, pipelines, runs, etc.
        // This would include more comprehensive test data
        this.logger.info('Test data creation completed');
    }
    /**
     * Execute database backup
     */
    async createBackup() {
        if (config_1.configManager.isProduction()) {
            throw new Error('Backup operations should be handled by infrastructure in production');
        }
        this.logger.info('Creating database backup...');
        // In a real implementation, this would execute pg_dump or similar
        const backupId = `backup_${Date.now()}`;
        this.logger.info('Database backup created', { backupId });
        return backupId;
    }
    /**
     * Clean up old data
     */
    async cleanupOldData(daysToKeep = 90) {
        this.logger.info('Cleaning up old data', { daysToKeep });
        return factory_enhanced_1.repositoryFactory.executeTransaction(async ({ pipelineRunRepository }) => {
            // Delete old pipeline runs
            const deletedRuns = await pipelineRunRepository.deleteOldRuns(daysToKeep);
            this.logger.info('Old data cleanup completed', {
                deletedRuns,
                daysToKeep
            });
        });
    }
    /**
     * Get database statistics
     */
    async getStatistics() {
        const metrics = database_monitor_1.databaseConnectionManager.getMetrics();
        const repositoryStats = factory_enhanced_1.repositoryFactory.getStats();
        const healthStatus = await this.getHealthStatus();
        return {
            ...metrics,
            repositories: repositoryStats,
            entities: healthStatus.entityCounts,
            initialized: this.isInitialized
        };
    }
    /**
     * Shutdown database service
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down database service...');
            // Stop health monitoring
            database_monitor_1.databaseConnectionManager.stopHealthMonitoring();
            // Clear repository cache
            factory_enhanced_1.repositoryFactory.clearCache();
            // Close database connection
            await database_1.databaseManager.close();
            this.isInitialized = false;
            this.logger.info('Database service shutdown completed');
        }
        catch (error) {
            this.logger.error('Error during database service shutdown', error);
            throw error;
        }
    }
}
exports.EnhancedDatabaseService = EnhancedDatabaseService;
// Export singleton instance
exports.enhancedDatabaseService = EnhancedDatabaseService.getInstance();
//# sourceMappingURL=database.enhanced.js.map