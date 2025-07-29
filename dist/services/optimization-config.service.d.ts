/**
 * Optimization Configuration Service - Centralized Performance Settings
 *
 * Features:
 * - Centralized configuration management
 * - Environment-specific optimizations
 * - Runtime configuration updates
 * - Performance profiling integration
 * - Auto-tuning capabilities
 *
 * @author sirhCC
 * @version 1.0.0
 */
import { EventEmitter } from 'events';
export interface OptimizationProfile {
    name: string;
    description: string;
    memoization: {
        enabled: boolean;
        maxSize: number;
        defaultTtl: number;
        enableMetrics: boolean;
    };
    batchProcessing: {
        enabled: boolean;
        batchSize: number;
        maxConcurrency: number;
        memoryThreshold: number;
        enableParallelProcessing: boolean;
    };
    caching: {
        enabled: boolean;
        maxMemorySize: number;
        maxItems: number;
        defaultTtl: number;
        enablePredictive: boolean;
        enableAnalytics: boolean;
    };
    performance: {
        enabled: boolean;
        monitoringInterval: number;
        memoryWarningThreshold: number;
        cpuWarningThreshold: number;
        slowQueryThreshold: number;
    };
    math: {
        enableVectorization: boolean;
        enableParallelComputation: boolean;
        numericalPrecision: 'standard' | 'high' | 'extended';
        enableStatisticalCaching: boolean;
    };
    streaming: {
        enabled: boolean;
        highWaterMark: number;
        backpressureThreshold: number;
        enableCompression: boolean;
    };
}
export interface PerformanceMetrics {
    timestamp: Date;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    queryLatency: number;
    cacheHitRatio: number;
    throughput: number;
}
export interface AutoTuningConfig {
    enabled: boolean;
    analysisWindow: number;
    adjustmentThreshold: number;
    maxAdjustmentPercent: number;
    tuningInterval: number;
}
export declare class OptimizationConfigService extends EventEmitter {
    private static instance;
    private logger;
    private currentProfile;
    private profiles;
    private performanceHistory;
    private autoTuningConfig;
    private autoTuningTimer?;
    private constructor();
    static getInstance(): OptimizationConfigService;
    /**
     * Get current optimization profile
     */
    getCurrentProfile(): OptimizationProfile;
    /**
     * Switch to a different optimization profile
     */
    switchProfile(profileName: string): boolean;
    /**
     * Create a custom profile
     */
    createCustomProfile(name: string, baseProfile: string, overrides: Partial<OptimizationProfile>): boolean;
    /**
     * Update current profile settings
     */
    updateCurrentProfile(updates: Partial<OptimizationProfile>): void;
    /**
     * Get all available profiles
     */
    getAvailableProfiles(): string[];
    /**
     * Get profile by name
     */
    getProfile(name: string): OptimizationProfile | undefined;
    /**
     * Record performance metrics for auto-tuning
     */
    recordPerformanceMetrics(metrics: PerformanceMetrics): void;
    /**
     * Get performance trend analysis
     */
    getPerformanceTrend(minutes?: number): {
        memoryTrend: 'improving' | 'degrading' | 'stable';
        cpuTrend: 'improving' | 'degrading' | 'stable';
        latencyTrend: 'improving' | 'degrading' | 'stable';
        recommendations: string[];
    };
    /**
     * Auto-tune configuration based on performance metrics
     */
    performAutoTuning(): Promise<boolean>;
    /**
     * Export current configuration for backup
     */
    exportConfiguration(): {
        currentProfile: string;
        profiles: Record<string, OptimizationProfile>;
        autoTuningConfig: AutoTuningConfig;
    };
    /**
     * Import configuration from backup
     */
    importConfiguration(config: {
        currentProfile: string;
        profiles: Record<string, OptimizationProfile>;
        autoTuningConfig?: AutoTuningConfig;
    }): boolean;
    private initializeDefaultProfiles;
    private getDefaultProfile;
    private startAutoTuning;
    private calculateTrend;
    private generateRecommendations;
    private calculateOptimalAdjustments;
    /**
     * Stop auto-tuning and cleanup
     */
    destroy(): void;
}
export declare const optimizationConfigService: OptimizationConfigService;
//# sourceMappingURL=optimization-config.service.d.ts.map