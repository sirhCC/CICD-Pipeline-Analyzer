"use strict";
/**
 * Enhanced Database Connection Manager
 * Handles connection pooling, health monitoring, and automatic reconnection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConnectionManager = exports.DatabaseConnectionManager = void 0;
const events_1 = require("events");
const database_1 = require("./database");
const logger_1 = require("@/shared/logger");
class DatabaseConnectionManager extends events_1.EventEmitter {
    static instance;
    logger;
    healthCheckInterval = null;
    metrics;
    startTime;
    queryStats = {
        total: 0,
        totalTime: 0,
        slowQueries: 0,
        errors: 0
    };
    constructor() {
        super();
        this.logger = new logger_1.Logger('DatabaseConnectionManager');
        this.startTime = new Date();
        this.metrics = this.initializeMetrics();
    }
    static getInstance() {
        if (!DatabaseConnectionManager.instance) {
            DatabaseConnectionManager.instance = new DatabaseConnectionManager();
        }
        return DatabaseConnectionManager.instance;
    }
    /**
     * Initialize metrics
     */
    initializeMetrics() {
        return {
            connectionStats: {
                totalConnections: 0,
                activeConnections: 0,
                idleConnections: 0,
                waitingConnections: 0,
                totalQueries: 0,
                averageQueryTime: 0,
                slowQueries: 0,
                errors: 0
            },
            uptime: 0,
            lastHealthCheck: new Date(),
            isHealthy: false,
            performanceMetrics: {
                queriesPerSecond: 0,
                averageResponseTime: 0,
                errorRate: 0
            }
        };
    }
    /**
     * Start health monitoring
     */
    startHealthMonitoring(intervalMs = 30000) {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthCheck();
            }
            catch (error) {
                this.logger.error('Health check failed', error);
                this.emit('healthCheckFailed', error);
            }
        }, intervalMs);
        this.logger.info('Database health monitoring started', { intervalMs });
    }
    /**
     * Stop health monitoring
     */
    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
            this.logger.info('Database health monitoring stopped');
        }
    }
    /**
     * Perform health check
     */
    async performHealthCheck() {
        const startTime = Date.now();
        try {
            // Test basic connectivity
            await database_1.databaseManager.healthCheck();
            // Update metrics
            this.updateMetrics();
            const responseTime = Date.now() - startTime;
            this.metrics.lastHealthCheck = new Date();
            this.metrics.isHealthy = true;
            this.emit('healthCheckSuccess', {
                responseTime,
                metrics: this.metrics
            });
        }
        catch (error) {
            this.metrics.isHealthy = false;
            this.emit('healthCheckFailed', error);
            throw error;
        }
    }
    /**
     * Update connection metrics
     */
    updateMetrics() {
        const poolStats = database_1.databaseManager.getPoolStats();
        const uptime = Date.now() - this.startTime.getTime();
        this.metrics.uptime = uptime;
        this.metrics.connectionStats.totalQueries = this.queryStats.total;
        this.metrics.connectionStats.averageQueryTime =
            this.queryStats.total > 0 ? this.queryStats.totalTime / this.queryStats.total : 0;
        this.metrics.connectionStats.slowQueries = this.queryStats.slowQueries;
        this.metrics.connectionStats.errors = this.queryStats.errors;
        // Calculate performance metrics
        const uptimeSeconds = uptime / 1000;
        this.metrics.performanceMetrics.queriesPerSecond =
            uptimeSeconds > 0 ? this.queryStats.total / uptimeSeconds : 0;
        this.metrics.performanceMetrics.averageResponseTime =
            this.metrics.connectionStats.averageQueryTime;
        this.metrics.performanceMetrics.errorRate =
            this.queryStats.total > 0 ? (this.queryStats.errors / this.queryStats.total) * 100 : 0;
    }
    /**
     * Record query statistics
     */
    recordQuery(duration, isError = false) {
        this.queryStats.total++;
        this.queryStats.totalTime += duration;
        if (isError) {
            this.queryStats.errors++;
        }
        // Consider queries over 1 second as slow
        if (duration > 1000) {
            this.queryStats.slowQueries++;
            this.logger.warn('Slow query detected', { duration });
            this.emit('slowQuery', { duration });
        }
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        this.updateMetrics();
        return { ...this.metrics };
    }
    /**
     * Get connection statistics
     */
    getConnectionStats() {
        this.updateMetrics();
        return { ...this.metrics.connectionStats };
    }
    /**
     * Test database connectivity
     */
    async testConnection() {
        try {
            const startTime = Date.now();
            await database_1.databaseManager.healthCheck();
            const duration = Date.now() - startTime;
            this.logger.info('Database connection test successful', { duration });
            return true;
        }
        catch (error) {
            this.logger.error('Database connection test failed', error);
            return false;
        }
    }
    /**
     * Execute query with monitoring
     */
    async executeQuery(sql, parameters) {
        const startTime = Date.now();
        let isError = false;
        try {
            const result = await database_1.databaseManager.query(sql, parameters);
            return result;
        }
        catch (error) {
            isError = true;
            throw error;
        }
        finally {
            const duration = Date.now() - startTime;
            this.recordQuery(duration, isError);
        }
    }
    /**
     * Get performance recommendations
     */
    getPerformanceRecommendations() {
        const recommendations = [];
        const metrics = this.getMetrics();
        if (metrics.performanceMetrics.averageResponseTime > 500) {
            recommendations.push('Consider optimizing slow queries or adding database indexes');
        }
        if (metrics.performanceMetrics.errorRate > 5) {
            recommendations.push('High error rate detected - investigate database connectivity or query issues');
        }
        if (metrics.connectionStats.slowQueries > 10) {
            recommendations.push('Multiple slow queries detected - consider query optimization');
        }
        return recommendations;
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.queryStats = {
            total: 0,
            totalTime: 0,
            slowQueries: 0,
            errors: 0
        };
        this.startTime = new Date();
        this.logger.info('Database statistics reset');
    }
}
exports.DatabaseConnectionManager = DatabaseConnectionManager;
// Export singleton instance
exports.databaseConnectionManager = DatabaseConnectionManager.getInstance();
//# sourceMappingURL=database-monitor.js.map