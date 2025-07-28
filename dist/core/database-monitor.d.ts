/**
 * Enhanced Database Connection Manager
 * Handles connection pooling, health monitoring, and automatic reconnection
 */
import { EventEmitter } from 'events';
export interface ConnectionStats {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingConnections: number;
    totalQueries: number;
    averageQueryTime: number;
    slowQueries: number;
    errors: number;
}
export interface DatabaseMetrics {
    connectionStats: ConnectionStats;
    uptime: number;
    lastHealthCheck: Date;
    isHealthy: boolean;
    performanceMetrics: {
        queriesPerSecond: number;
        averageResponseTime: number;
        errorRate: number;
    };
}
export declare class DatabaseConnectionManager extends EventEmitter {
    private static instance;
    private logger;
    private healthCheckInterval;
    private metrics;
    private startTime;
    private queryStats;
    private constructor();
    static getInstance(): DatabaseConnectionManager;
    /**
     * Initialize metrics
     */
    private initializeMetrics;
    /**
     * Start health monitoring
     */
    startHealthMonitoring(intervalMs?: number): void;
    /**
     * Stop health monitoring
     */
    stopHealthMonitoring(): void;
    /**
     * Perform health check
     */
    private performHealthCheck;
    /**
     * Update connection metrics
     */
    private updateMetrics;
    /**
     * Record query statistics
     */
    recordQuery(duration: number, isError?: boolean): void;
    /**
     * Get current metrics
     */
    getMetrics(): DatabaseMetrics;
    /**
     * Get connection statistics
     */
    getConnectionStats(): ConnectionStats;
    /**
     * Test database connectivity
     */
    testConnection(): Promise<boolean>;
    /**
     * Execute query with monitoring
     */
    executeQuery<T = unknown>(sql: string, parameters?: unknown[]): Promise<T>;
    /**
     * Get performance recommendations
     */
    getPerformanceRecommendations(): string[];
    /**
     * Reset statistics
     */
    resetStats(): void;
}
export declare const databaseConnectionManager: DatabaseConnectionManager;
//# sourceMappingURL=database-monitor.d.ts.map