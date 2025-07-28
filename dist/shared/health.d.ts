/**
 * Health Service - Enterprise health monitoring
 */
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    services: Record<string, ServiceHealth>;
}
export interface ServiceHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    lastCheck: string;
    details?: Record<string, unknown>;
}
export declare class HealthService {
    private logger;
    private startTime;
    constructor();
    getHealthStatus(): Promise<HealthStatus>;
    private checkDatabaseHealth;
    private checkRedisHealth;
    private checkExternalServices;
    private determineOverallStatus;
}
//# sourceMappingURL=health.d.ts.map