"use strict";
/**
 * Performance Monitoring Service - Advanced Metrics Collection & Analysis
 *
 * Features:
 * - Real-time performance metrics collection
 * - Memory usage tracking and optimization
 * - API response time monitoring
 * - Database query performance analysis
 * - Resource utilization alerts
 * - Performance trend analysis
 *
 * @author sirhCC
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMonitor = exports.PerformanceMonitorService = void 0;
const logger_1 = require("../shared/logger");
const events_1 = require("events");
class PerformanceMonitorService extends events_1.EventEmitter {
    static instance;
    logger;
    metrics = [];
    isMonitoring = false;
    monitoringInterval;
    thresholds;
    requestMetrics = new Map();
    constructor() {
        super();
        this.logger = new logger_1.Logger('PerformanceMonitor');
        this.thresholds = {
            memory: { warning: 0.80, critical: 0.95 },
            cpu: { warning: 0.70, critical: 0.90 },
            responseTime: { warning: 1000, critical: 5000 },
            database: { connectionWarning: 0.80, queryTimeWarning: 1000 },
            cache: { hitRatioWarning: 0.70 }
        };
    }
    static getInstance() {
        if (!PerformanceMonitorService.instance) {
            PerformanceMonitorService.instance = new PerformanceMonitorService();
        }
        return PerformanceMonitorService.instance;
    }
    /**
     * Start performance monitoring
     */
    startMonitoring(intervalMs = 30000) {
        if (this.isMonitoring) {
            this.logger.warn('Performance monitoring already running');
            return;
        }
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, intervalMs);
        this.logger.info('Performance monitoring started', { intervalMs });
    }
    /**
     * Stop performance monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }
        this.isMonitoring = false;
        this.logger.info('Performance monitoring stopped');
    }
    /**
     * Collect current performance metrics
     */
    collectMetrics() {
        const metrics = {
            timestamp: new Date(),
            memory: this.getMemoryMetrics(),
            cpu: this.getCpuMetrics(),
            requests: this.getRequestMetrics(),
            database: this.getDatabaseMetrics(),
            cache: this.getCacheMetrics()
        };
        this.metrics.push(metrics);
        this.checkThresholds(metrics);
        // Keep only last 1000 metrics (about 8 hours at 30s intervals)
        if (this.metrics.length > 1000) {
            this.metrics = this.metrics.slice(-1000);
        }
        this.emit('metrics', metrics);
    }
    /**
     * Get memory usage metrics
     */
    getMemoryMetrics() {
        const usage = process.memoryUsage();
        return {
            used: usage.heapUsed,
            total: usage.heapTotal,
            heap: {
                used: usage.heapUsed,
                total: usage.heapTotal
            },
            external: usage.external
        };
    }
    /**
     * Get CPU usage metrics
     */
    getCpuMetrics() {
        const usage = process.cpuUsage();
        const loadAverage = process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0];
        return {
            usage: (usage.user + usage.system) / 1000000, // Convert to seconds
            loadAverage
        };
    }
    /**
     * Get request metrics
     */
    getRequestMetrics() {
        const activeRequests = this.requestMetrics.size;
        const completedRequests = Array.from(this.requestMetrics.values())
            .filter(req => req.endTime !== undefined);
        const averageResponseTime = completedRequests.length > 0
            ? completedRequests.reduce((sum, req) => sum + (req.endTime - req.startTime), 0) / completedRequests.length
            : 0;
        const slowQueries = completedRequests.filter(req => (req.endTime - req.startTime) > this.thresholds.responseTime.warning).length;
        return {
            total: completedRequests.length,
            active: activeRequests,
            averageResponseTime,
            slowQueries
        };
    }
    /**
     * Get database metrics (placeholder - would integrate with actual DB monitoring)
     */
    getDatabaseMetrics() {
        return {
            activeConnections: 5, // Would get from connection pool
            queryTime: 50, // Average query time
            slowQueries: 0
        };
    }
    /**
     * Get cache metrics (placeholder - would integrate with Redis/cache monitoring)
     */
    getCacheMetrics() {
        return {
            hitRatio: 0.85, // Would get from cache implementation
            size: 1024, // Cache size in entries
            evictions: 0
        };
    }
    /**
     * Check performance thresholds and emit alerts
     */
    checkThresholds(metrics) {
        // Memory threshold check
        const memoryUsage = metrics.memory.used / metrics.memory.total;
        if (memoryUsage > this.thresholds.memory.critical) {
            this.emitAlert('memory', 'critical', 'Critical memory usage detected', metrics, this.thresholds.memory.critical, memoryUsage);
        }
        else if (memoryUsage > this.thresholds.memory.warning) {
            this.emitAlert('memory', 'warning', 'High memory usage detected', metrics, this.thresholds.memory.warning, memoryUsage);
        }
        // Response time threshold check
        if (metrics.requests.averageResponseTime > this.thresholds.responseTime.critical) {
            this.emitAlert('response_time', 'critical', 'Critical response time detected', metrics, this.thresholds.responseTime.critical, metrics.requests.averageResponseTime);
        }
        else if (metrics.requests.averageResponseTime > this.thresholds.responseTime.warning) {
            this.emitAlert('response_time', 'warning', 'High response time detected', metrics, this.thresholds.responseTime.warning, metrics.requests.averageResponseTime);
        }
        // Cache hit ratio check
        if (metrics.cache.hitRatio < this.thresholds.cache.hitRatioWarning) {
            this.emitAlert('cache', 'warning', 'Low cache hit ratio detected', metrics, this.thresholds.cache.hitRatioWarning, metrics.cache.hitRatio);
        }
    }
    /**
     * Emit performance alert
     */
    emitAlert(type, severity, message, metrics, threshold, actual) {
        const alert = {
            type,
            severity,
            message,
            metrics,
            threshold,
            actual,
            timestamp: new Date()
        };
        this.emit('alert', alert);
        this.logger.warn('Performance alert', {
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            threshold: alert.threshold,
            actual: alert.actual
        });
    }
    /**
     * Track request start
     */
    trackRequestStart(requestId) {
        this.requestMetrics.set(requestId, { startTime: Date.now() });
    }
    /**
     * Track request end
     */
    trackRequestEnd(requestId) {
        const request = this.requestMetrics.get(requestId);
        if (request) {
            request.endTime = Date.now();
            const duration = request.endTime - request.startTime;
            // Clean up completed requests after a delay
            setTimeout(() => {
                this.requestMetrics.delete(requestId);
            }, 60000); // Clean up after 1 minute
            return duration;
        }
        return 0;
    }
    /**
     * Get current performance summary
     */
    getPerformanceSummary() {
        if (this.metrics.length === 0) {
            return {
                current: null,
                average: {},
                trends: { memory: 'stable', responseTime: 'stable' }
            };
        }
        const current = this.metrics[this.metrics.length - 1];
        if (!current) {
            return {
                current: null,
                average: {},
                trends: { memory: 'stable', responseTime: 'stable' }
            };
        }
        const recent = this.metrics.slice(-10); // Last 10 metrics
        const averageMemory = recent.reduce((sum, m) => sum + (m.memory.used / m.memory.total), 0) / recent.length;
        const averageResponseTime = recent.reduce((sum, m) => sum + m.requests.averageResponseTime, 0) / recent.length;
        // Simple trend analysis
        const oldMetrics = this.metrics.slice(-20, -10);
        const memoryTrend = oldMetrics.length > 0
            ? this.calculateTrend(oldMetrics.map(m => m.memory.used / m.memory.total), recent.map(m => m.memory.used / m.memory.total))
            : 'stable';
        const responseTimeTrend = oldMetrics.length > 0
            ? this.calculateTrend(oldMetrics.map(m => m.requests.averageResponseTime), recent.map(m => m.requests.averageResponseTime))
            : 'stable';
        return {
            current,
            average: {
                memory: { used: averageMemory * current.memory.total, total: current.memory.total },
                requests: { averageResponseTime }
            },
            trends: {
                memory: memoryTrend,
                responseTime: responseTimeTrend
            }
        };
    }
    /**
     * Calculate trend direction
     */
    calculateTrend(oldValues, newValues) {
        const oldAvg = oldValues.reduce((sum, val) => sum + val, 0) / oldValues.length;
        const newAvg = newValues.reduce((sum, val) => sum + val, 0) / newValues.length;
        const change = (newAvg - oldAvg) / oldAvg;
        if (change > 0.1)
            return 'increasing';
        if (change < -0.1)
            return 'decreasing';
        return 'stable';
    }
    /**
     * Get performance health score (0-100)
     */
    getHealthScore() {
        if (this.metrics.length === 0)
            return 100;
        const current = this.metrics[this.metrics.length - 1];
        if (!current)
            return 100;
        let score = 100;
        // Memory score
        const memoryUsage = current.memory.used / current.memory.total;
        if (memoryUsage > this.thresholds.memory.critical)
            score -= 30;
        else if (memoryUsage > this.thresholds.memory.warning)
            score -= 15;
        // Response time score
        if (current.requests.averageResponseTime > this.thresholds.responseTime.critical)
            score -= 30;
        else if (current.requests.averageResponseTime > this.thresholds.responseTime.warning)
            score -= 15;
        // Cache hit ratio score
        if (current.cache.hitRatio < this.thresholds.cache.hitRatioWarning)
            score -= 10;
        return Math.max(0, score);
    }
}
exports.PerformanceMonitorService = PerformanceMonitorService;
// Export singleton instance
exports.performanceMonitor = PerformanceMonitorService.getInstance();
//# sourceMappingURL=performance-monitor.service.js.map