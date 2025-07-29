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
import { EventEmitter } from 'events';
export interface PerformanceMetrics {
    timestamp: Date;
    memory: {
        used: number;
        total: number;
        heap: {
            used: number;
            total: number;
        };
        external: number;
    };
    cpu: {
        usage: number;
        loadAverage: number[];
    };
    requests: {
        total: number;
        active: number;
        averageResponseTime: number;
        slowQueries: number;
    };
    database: {
        activeConnections: number;
        queryTime: number;
        slowQueries: number;
    };
    cache: {
        hitRatio: number;
        size: number;
        evictions: number;
    };
}
export interface PerformanceAlert {
    type: 'memory' | 'cpu' | 'response_time' | 'database' | 'cache';
    severity: 'warning' | 'critical';
    message: string;
    metrics: Partial<PerformanceMetrics>;
    threshold: number;
    actual: number;
    timestamp: Date;
}
export interface PerformanceThresholds {
    memory: {
        warning: number;
        critical: number;
    };
    cpu: {
        warning: number;
        critical: number;
    };
    responseTime: {
        warning: number;
        critical: number;
    };
    database: {
        connectionWarning: number;
        queryTimeWarning: number;
    };
    cache: {
        hitRatioWarning: number;
    };
}
export declare class PerformanceMonitorService extends EventEmitter {
    private static instance;
    private logger;
    private metrics;
    private isMonitoring;
    private monitoringInterval;
    private thresholds;
    private requestMetrics;
    private constructor();
    static getInstance(): PerformanceMonitorService;
    /**
     * Start performance monitoring
     */
    startMonitoring(intervalMs?: number): void;
    /**
     * Stop performance monitoring
     */
    stopMonitoring(): void;
    /**
     * Collect current performance metrics
     */
    private collectMetrics;
    /**
     * Get memory usage metrics
     */
    private getMemoryMetrics;
    /**
     * Get CPU usage metrics
     */
    private getCpuMetrics;
    /**
     * Get request metrics
     */
    private getRequestMetrics;
    /**
     * Get database metrics (placeholder - would integrate with actual DB monitoring)
     */
    private getDatabaseMetrics;
    /**
     * Get cache metrics (placeholder - would integrate with Redis/cache monitoring)
     */
    private getCacheMetrics;
    /**
     * Check performance thresholds and emit alerts
     */
    private checkThresholds;
    /**
     * Emit performance alert
     */
    private emitAlert;
    /**
     * Track request start
     */
    trackRequestStart(requestId: string): void;
    /**
     * Track request end
     */
    trackRequestEnd(requestId: string): number;
    /**
     * Get current performance summary
     */
    getPerformanceSummary(): {
        current: PerformanceMetrics | null;
        average: Partial<PerformanceMetrics>;
        trends: {
            memory: 'increasing' | 'decreasing' | 'stable';
            responseTime: 'increasing' | 'decreasing' | 'stable';
        };
    };
    /**
     * Calculate trend direction
     */
    private calculateTrend;
    /**
     * Get performance health score (0-100)
     */
    getHealthScore(): number;
}
export declare const performanceMonitor: PerformanceMonitorService;
//# sourceMappingURL=performance-monitor.service.d.ts.map