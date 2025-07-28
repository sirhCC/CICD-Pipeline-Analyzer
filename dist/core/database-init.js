"use strict";
/**
 * Database Initialization Script
 * Comprehensive database setup for production deployment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabaseForEnvironment = exports.databaseInitializer = exports.DatabaseInitializer = void 0;
const database_enhanced_1 = require("../services/database.enhanced");
const database_1 = require("../core/database");
const logger_1 = require("../shared/logger");
const config_1 = require("../config");
const logger = new logger_1.Logger('DatabaseInit');
class DatabaseInitializer {
    logger;
    constructor() {
        this.logger = new logger_1.Logger('DatabaseInitializer');
    }
    /**
     * Initialize database with comprehensive setup
     */
    async initialize(options = {}) {
        const startTime = Date.now();
        try {
            this.logger.info('Starting database initialization...', options);
            // Step 1: Initialize enhanced database service
            await this.initializeService(options);
            // Step 2: Run migrations if needed
            if (options.runMigrations !== false && !config_1.configManager.isTest()) {
                await this.runMigrations();
            }
            // Step 3: Seed data if requested
            if (options.seedData) {
                await this.seedData(options);
            }
            // Step 4: Run health check
            if (!options.skipHealthCheck) {
                await this.performHealthCheck();
            }
            // Step 5: Log completion
            const duration = Date.now() - startTime;
            this.logger.info('Database initialization completed successfully', {
                duration: `${duration}ms`,
                environment: process.env.NODE_ENV
            });
        }
        catch (error) {
            this.logger.error('Database initialization failed', error);
            throw error;
        }
    }
    /**
     * Initialize the enhanced database service
     */
    async initializeService(options) {
        this.logger.info('Initializing enhanced database service...');
        await database_enhanced_1.enhancedDatabaseService.initialize();
        this.logger.info('Enhanced database service initialized');
    }
    /**
     * Run database migrations
     */
    async runMigrations() {
        this.logger.info('Running database migrations...');
        try {
            await database_1.databaseManager.runMigrations();
            this.logger.info('Database migrations completed successfully');
        }
        catch (error) {
            this.logger.error('Database migration failed', error);
            throw error;
        }
    }
    /**
     * Seed database with initial data
     */
    async seedData(options) {
        this.logger.info('Seeding database with initial data...');
        const seedOptions = {
            createUsers: options.createAdminUser || false,
            createPipelines: true,
            createTestData: config_1.configManager.isDevelopment()
        };
        if (options.adminUser) {
            seedOptions.adminUser = options.adminUser;
        }
        await database_enhanced_1.enhancedDatabaseService.seedDatabase(seedOptions);
        this.logger.info('Database seeding completed');
    }
    /**
     * Perform comprehensive health check
     */
    async performHealthCheck() {
        this.logger.info('Performing database health check...');
        try {
            const healthStatus = await database_enhanced_1.enhancedDatabaseService.getHealthStatus();
            this.logger.info('Database health check completed', {
                isHealthy: healthStatus.isHealthy,
                isConnected: healthStatus.isConnected,
                entityCounts: healthStatus.entityCounts,
                uptime: healthStatus.uptime
            });
            if (!healthStatus.isHealthy) {
                this.logger.warn('Database health issues detected', {
                    recommendations: healthStatus.recommendations
                });
            }
            if (healthStatus.recommendations.length > 0) {
                this.logger.info('Performance recommendations:', {
                    recommendations: healthStatus.recommendations
                });
            }
        }
        catch (error) {
            this.logger.error('Database health check failed', error);
            throw error;
        }
    }
    /**
     * Quick initialization for development
     */
    async initializeDevelopment() {
        await this.initialize({
            runMigrations: false, // Use synchronize in development
            seedData: true,
            createAdminUser: true,
            adminUser: {
                email: 'admin@cicd-analyzer.local',
                username: 'admin',
                password: 'admin123456', // Should be changed in production
                firstName: 'Admin',
                lastName: 'User'
            },
            enableMonitoring: true,
            verbose: true
        });
    }
    /**
     * Production initialization
     */
    async initializeProduction() {
        const adminUser = {
            email: process.env.ADMIN_EMAIL || 'admin@example.com',
            username: process.env.ADMIN_USERNAME || 'admin',
            password: process.env.ADMIN_PASSWORD || 'changeme',
            firstName: process.env.ADMIN_FIRST_NAME || 'System',
            lastName: process.env.ADMIN_LAST_NAME || 'Administrator'
        };
        if (adminUser.password === 'changeme') {
            throw new Error('Admin password must be set via ADMIN_PASSWORD environment variable');
        }
        await this.initialize({
            runMigrations: true,
            seedData: true,
            createAdminUser: true,
            adminUser,
            enableMonitoring: true,
            skipHealthCheck: false,
            verbose: false
        });
    }
    /**
     * Test initialization (minimal setup)
     */
    async initializeTest() {
        await this.initialize({
            runMigrations: false,
            seedData: false,
            createAdminUser: false,
            enableMonitoring: false,
            skipHealthCheck: true,
            verbose: false
        });
    }
    /**
     * Get initialization status
     */
    async getStatus() {
        try {
            const healthStatus = await database_enhanced_1.enhancedDatabaseService.getHealthStatus();
            const statistics = await database_enhanced_1.enhancedDatabaseService.getStatistics();
            return {
                healthy: healthStatus.isHealthy,
                connected: healthStatus.isConnected,
                initialized: statistics.initialized,
                uptime: healthStatus.uptime,
                entityCounts: healthStatus.entityCounts,
                performance: healthStatus.performanceMetrics
            };
        }
        catch (error) {
            return {
                healthy: false,
                connected: false,
                initialized: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Shutdown database gracefully
     */
    async shutdown() {
        this.logger.info('Shutting down database...');
        try {
            await database_enhanced_1.enhancedDatabaseService.shutdown();
            this.logger.info('Database shutdown completed');
        }
        catch (error) {
            this.logger.error('Database shutdown failed', error);
            throw error;
        }
    }
}
exports.DatabaseInitializer = DatabaseInitializer;
// Export singleton instance
exports.databaseInitializer = new DatabaseInitializer();
// Convenience functions for different environments
const initializeDatabaseForEnvironment = async () => {
    if (config_1.configManager.isTest()) {
        await exports.databaseInitializer.initializeTest();
    }
    else if (config_1.configManager.isDevelopment()) {
        await exports.databaseInitializer.initializeDevelopment();
    }
    else {
        await exports.databaseInitializer.initializeProduction();
    }
};
exports.initializeDatabaseForEnvironment = initializeDatabaseForEnvironment;
// CLI script support
if (require.main === module) {
    const command = process.argv[2];
    switch (command) {
        case 'init':
            (0, exports.initializeDatabaseForEnvironment)()
                .then(() => {
                console.log('Database initialization completed successfully');
                process.exit(0);
            })
                .catch((error) => {
                console.error('Database initialization failed:', error);
                process.exit(1);
            });
            break;
        case 'status':
            exports.databaseInitializer.getStatus()
                .then((status) => {
                console.log('Database Status:', JSON.stringify(status, null, 2));
                process.exit(0);
            })
                .catch((error) => {
                console.error('Failed to get database status:', error);
                process.exit(1);
            });
            break;
        default:
            console.log('Usage: node database-init.js [init|status]');
            process.exit(1);
    }
}
//# sourceMappingURL=database-init.js.map