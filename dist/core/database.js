"use strict";
/**
 * Enterprise Database Manager - TypeORM with connection pooling
 * Production-ready database layer with migrations and monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseManager = exports.DatabaseManager = void 0;
const typeorm_1 = require("typeorm");
const database_config_1 = require("./database.config");
const logger_1 = require("@/shared/logger");
class DatabaseManager {
    static instance;
    dataSource = null;
    logger;
    connectionRetries = 0;
    maxRetries = 3;
    constructor() {
        this.logger = new logger_1.Logger('DatabaseManager');
    }
    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }
    /**
     * Initialize database connection
     */
    async initialize() {
        try {
            this.logger.info('Initializing database connection...');
            // Validate configuration
            database_config_1.databaseConfigManager.validateConfig();
            // Create data source
            const config = database_config_1.databaseConfigManager.createDataSourceConfig();
            this.dataSource = new typeorm_1.DataSource(config);
            await this.connectWithRetry();
            this.logger.info('Database connection established successfully');
            // Run health check
            await this.healthCheck();
        }
        catch (error) {
            this.logger.error('Failed to initialize database', error);
            throw error;
        }
    }
    /**
     * Connect with retry logic
     */
    async connectWithRetry() {
        while (this.connectionRetries < this.maxRetries) {
            try {
                await this.dataSource.initialize();
                this.connectionRetries = 0; // Reset on success
                return;
            }
            catch (error) {
                this.connectionRetries++;
                if (this.connectionRetries >= this.maxRetries) {
                    this.logger.error('Max connection retries reached', error);
                    throw error;
                }
                const delay = Math.min(1000 * Math.pow(2, this.connectionRetries), 10000);
                this.logger.warn(`Database connection failed, retrying in ${delay}ms...`, {
                    attempt: this.connectionRetries,
                    maxRetries: this.maxRetries
                });
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    /**
     * Get the data source instance
     */
    getDataSource() {
        if (!this.dataSource || !this.dataSource.isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.dataSource;
    }
    /**
     * Get entity manager
     */
    getEntityManager() {
        return this.getDataSource().manager;
    }
    /**
     * Create a query runner for transactions
     */
    createQueryRunner() {
        return this.getDataSource().createQueryRunner();
    }
    /**
     * Execute a transaction
     */
    async transaction(operation) {
        const queryRunner = this.createQueryRunner();
        try {
            await queryRunner.connect();
            await queryRunner.startTransaction();
            const result = await operation(queryRunner.manager);
            await queryRunner.commitTransaction();
            return result;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Transaction failed, rolling back', error);
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Run database migrations
     */
    async runMigrations() {
        try {
            this.logger.info('Running database migrations...');
            const migrations = await this.getDataSource().runMigrations();
            if (migrations.length > 0) {
                this.logger.info(`Applied ${migrations.length} migrations:`, {
                    migrations: migrations.map(m => m.name),
                });
            }
            else {
                this.logger.info('No pending migrations found');
            }
        }
        catch (error) {
            this.logger.error('Migration failed', error);
            throw error;
        }
    }
    /**
     * Revert the last migration
     */
    async revertLastMigration() {
        try {
            this.logger.info('Reverting last migration...');
            await this.getDataSource().undoLastMigration();
            this.logger.info('Successfully reverted last migration');
        }
        catch (error) {
            this.logger.error('Failed to revert migration', error);
            throw error;
        }
    }
    /**
     * Database health check
     */
    async healthCheck() {
        try {
            const startTime = Date.now();
            // Simple query to test connection
            await this.getDataSource().query('SELECT 1');
            const responseTime = Date.now() - startTime;
            this.logger.logHealthCheck('database', 'healthy', responseTime);
            return true;
        }
        catch (error) {
            this.logger.logHealthCheck('database', 'unhealthy', undefined, { error });
            return false;
        }
    }
    /**
     * Get connection pool statistics
     */
    getPoolStats() {
        const dataSource = this.getDataSource();
        if (!dataSource.driver.pool) {
            return { available: false };
        }
        // TypeORM doesn't expose detailed pool stats directly
        // This is a simplified version
        return {
            available: true,
            isConnected: dataSource.isInitialized,
            // Additional pool metrics would go here if available
        };
    }
    /**
     * Execute raw SQL query with logging
     */
    async query(sql, parameters) {
        const timer = this.logger.startTimer('database_query');
        try {
            const result = await this.getDataSource().query(sql, parameters);
            timer();
            this.logger.logDatabaseQuery(sql, 0, { parameters });
            return result;
        }
        catch (error) {
            timer();
            this.logger.error('Database query failed', error, { sql, parameters });
            throw error;
        }
    }
    /**
     * Close database connection
     */
    async close() {
        try {
            if (this.dataSource && this.dataSource.isInitialized) {
                this.logger.info('Closing database connection...');
                await this.dataSource.destroy();
                this.logger.info('Database connection closed successfully');
            }
        }
        catch (error) {
            this.logger.error('Error closing database connection', error);
            throw error;
        }
    }
    /**
     * Clear all data (for testing)
     */
    async clearDatabase() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Cannot clear database in production environment');
        }
        try {
            this.logger.warn('Clearing database - this should only be used in testing');
            const entities = this.getDataSource().entityMetadatas;
            for (const entity of entities) {
                const repository = this.getDataSource().getRepository(entity.name);
                await repository.delete({});
            }
            this.logger.info('Database cleared successfully');
        }
        catch (error) {
            this.logger.error('Failed to clear database', error);
            throw error;
        }
    }
    /**
     * Database performance monitoring
     */
    async getPerformanceMetrics() {
        try {
            // This would include various database performance metrics
            const metrics = {
                connectionCount: 'N/A', // Would be implemented with actual pool stats
                queryCount: 'N/A', // Would track query statistics
                averageQueryTime: 'N/A', // Would track query performance
                cacheHitRatio: 'N/A', // Would track cache performance
            };
            return metrics;
        }
        catch (error) {
            this.logger.error('Failed to get performance metrics', error);
            return {};
        }
    }
}
exports.DatabaseManager = DatabaseManager;
// Export singleton instance
exports.databaseManager = DatabaseManager.getInstance();
//# sourceMappingURL=database.js.map