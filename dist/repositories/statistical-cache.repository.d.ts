/**
 * Statistical Cache Repository - Phase 3 Performance Optimization
 * Handles cache operations for statistical computations
 */
import { DataSource } from 'typeorm';
import { StatisticalCache, CacheType } from '../entities/statistical-cache.entity';
export declare class StatisticalCacheRepository {
    private repository;
    private logger;
    constructor(dataSource: DataSource);
    /**
     * Get cached data by key
     */
    get(cacheKey: string): Promise<StatisticalCache | null>;
    /**
     * Set cache data
     */
    set(cacheKey: string, cacheType: CacheType, data: Record<string, unknown>, expirationMs: number, pipelineId?: string, metric?: string, metadata?: Record<string, unknown>): Promise<void>;
    /**
     * Delete cache entry
     */
    delete(cacheKey: string): Promise<void>;
    /**
     * Clean up expired cache entries
     */
    cleanupExpired(): Promise<number>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<{
        totalEntries: number;
        totalSize: number;
        totalHits: number;
        byType: Record<CacheType, number>;
        averageHits: number;
    }>;
    /**
     * Clear all cache entries
     */
    clear(): Promise<void>;
    /**
     * Clear cache by type
     */
    clearByType(cacheType: CacheType): Promise<number>;
}
//# sourceMappingURL=statistical-cache.repository.d.ts.map