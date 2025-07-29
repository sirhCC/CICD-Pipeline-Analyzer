/**
 * Optimization Integration Service - Coordinated Performance Management
 *
 * This service coordinates all optimization components and provides a unified
 * interface for managing performance improvements across the application.
 *
 * Features:
 * - Centralized optimization coordination
 * - Automatic service configuration synchronization
 * - Performance monitoring and alerting
 * - Health checks and diagnostics
 * - Graceful degradation management
 *
 * @author sirhCC
 * @version 1.0.0
 */
import { EventEmitter } from 'events';
import { OptimizationProfile } from './optimization-config.service';
export interface OptimizationStatus {
    overall: 'optimal' | 'good' | 'degraded' | 'critical';
    services: {
        memoization: ServiceStatus;
        batchProcessing: ServiceStatus;
        performanceMonitor: ServiceStatus;
        advancedCache: ServiceStatus;
        enhancedAnalytics: ServiceStatus;
    };
    metrics: {
        memoryUsage: number;
        cpuUsage: number;
        cacheHitRatio: number;
        averageResponseTime: number;
        throughput: number;
    };
    recommendations: string[];
}
export interface ServiceStatus {
    status: 'healthy' | 'warning' | 'error' | 'disabled';
    uptime: number;
    lastError?: Error;
    metrics?: Record<string, number>;
    configuredCorrectly: boolean;
}
export interface OptimizationReport {
    timestamp: Date;
    profile: string;
    status: OptimizationStatus;
    performanceTrend: {
        period: string;
        improvement: number;
        degradation: number;
    };
    resourceUtilization: {
        memory: {
            used: number;
            available: number;
            efficiency: number;
        };
        cpu: {
            usage: number;
            efficiency: number;
        };
        cache: {
            hitRatio: number;
            size: number;
            efficiency: number;
        };
    };
    recommendations: {
        immediate: string[];
        shortTerm: string[];
        longTerm: string[];
    };
}
export declare class OptimizationIntegrationService extends EventEmitter {
    private static instance;
    private logger;
    private isInitialized;
    private healthCheckInterval?;
    private configSyncInterval?;
    private lastOptimizationReport?;
    private constructor();
    static getInstance(): OptimizationIntegrationService;
    /**
     * Initialize all optimization services with coordinated configuration
     */
    initialize(): Promise<void>;
    /**
     * Apply optimization profile to all services
     */
    applyOptimizationProfile(profile: OptimizationProfile): Promise<void>;
    /**
     * Get comprehensive optimization status
     */
    getOptimizationStatus(): Promise<OptimizationStatus>;
    /**
     * Generate comprehensive optimization report
     */
    generateOptimizationReport(): Promise<OptimizationReport>;
    /**
     * Perform automatic optimization based on current conditions
     */
    performAutomaticOptimization(): Promise<{
        applied: boolean;
        changes: string[];
        newProfile?: string;
    }>;
    /**
     * Get last optimization report
     */
    getLastOptimizationReport(): OptimizationReport | undefined;
    /**
     * Force health check of all services
     */
    performHealthCheck(): Promise<OptimizationStatus>;
    private setupEventListeners;
    private startHealthMonitoring;
    private startConfigurationSync;
    private getServiceStatus;
    private calculateOverallStatus;
    private generateRecommendations;
    private generateShortTermRecommendations;
    private generateLongTermRecommendations;
    private applyServiceSpecificOptimizations;
    /**
     * Shutdown and cleanup
     */
    shutdown(): Promise<void>;
}
export declare const optimizationIntegrationService: OptimizationIntegrationService;
//# sourceMappingURL=optimization-integration.service.d.ts.map