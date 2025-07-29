/**
 * Statistical Cache Entity - Phase 3 Performance Optimization
 * Caches frequently accessed statistical computations and benchmark data
 */
export declare enum CacheType {
    BENCHMARK_DATA = "benchmark_data",
    AGGREGATED_METRICS = "aggregated_metrics",
    HISTORICAL_STATS = "historical_stats",
    BASELINE_VALUES = "baseline_values",
    THRESHOLD_CONFIG = "threshold_config"
}
export declare class StatisticalCache {
    id: string;
    cacheKey: string;
    cacheType: CacheType;
    pipelineId?: string;
    metric?: string;
    data: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    size: number;
    hitCount: number;
    expiresAt: Date;
    lastAccessed?: Date;
    createdAt: Date;
    updatedAt: Date;
    /**
     * Check if cache entry is expired
     */
    isExpired(): boolean;
    /**
     * Update hit count and last accessed time
     */
    recordHit(): void;
    /**
     * Generate cache key for specific parameters
     */
    static generateKey(type: CacheType, params: Record<string, any>): string;
}
//# sourceMappingURL=statistical-cache.entity.d.ts.map