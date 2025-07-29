/**
 * Advanced Caching Service - High-Performance Intelligent Caching
 *
 * Features:
 * - Multi-level caching (Memory + Redis)
 * - LRU eviction with adaptive algorithms
 * - Predictive caching based on access patterns
 * - Cache warming and preloading
 * - Intelligent TTL management
 * - Performance analytics and optimization
 * - Circuit breaker for cache failures
 *
 * @author sirhCC
 * @version 1.0.0
 */
import { EventEmitter } from 'events';
export interface CacheEntry<T = any> {
    key: string;
    value: T;
    timestamp: number;
    ttl: number;
    accessCount: number;
    lastAccessed: number;
    size: number;
    metadata?: {
        tags?: string[];
        source?: string;
        priority?: 'low' | 'medium' | 'high' | 'critical';
    };
}
export interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    evictions: number;
    errors: number;
    totalSize: number;
    itemCount: number;
    hitRatio: number;
    averageAccessTime: number;
    memoryLevel: {
        hits: number;
        misses: number;
        size: number;
        itemCount: number;
    };
    redisLevel?: {
        hits: number;
        misses: number;
        size: number;
        itemCount: number;
    };
}
export interface CacheConfig {
    maxMemorySize: number;
    maxItems: number;
    defaultTtl: number;
    cleanupInterval: number;
    enableRedis: boolean;
    enablePredictiveCaching: boolean;
    enableAnalytics: boolean;
    circuitBreakerThreshold: number;
}
export interface AccessPattern {
    key: string;
    frequency: number;
    lastAccess: number;
    predictedNextAccess: number;
    confidence: number;
}
export declare class AdvancedCacheService extends EventEmitter {
    private static instance;
    private logger;
    private config;
    private memoryCache;
    private stats;
    private accessPatterns;
    private cleanupTimer?;
    private circuitBreaker;
    private constructor();
    static getInstance(config?: Partial<CacheConfig>): AdvancedCacheService;
    /**
     * Get value from cache with intelligent fallback
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set value in cache with intelligent placement
     */
    set<T>(key: string, value: T, ttl?: number, metadata?: CacheEntry['metadata']): Promise<boolean>;
    /**
     * Delete from cache
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clear all cache
     */
    clear(): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Warm cache with predicted keys
     */
    warmCache(warmingFunction: (keys: string[]) => Promise<Map<string, any>>): Promise<void>;
    /**
     * Optimize cache based on access patterns
     */
    optimize(): void;
    private setInMemory;
    private getFromRedis;
    private setInRedis;
    private deleteFromRedis;
    private clearRedis;
    private isExpired;
    private updateAccessStats;
    private updateAccessPattern;
    private updateHitRatio;
    private updateAverageAccessTime;
    private estimateSize;
    private ensureCapacity;
    private selectItemsForEviction;
    private getPriorityScore;
    private getPredictedKeys;
    private analyzeAccessPatterns;
    private adjustTtlBasedOnPatterns;
    private evictUnusedItems;
    private startCleanupTimer;
    private cleanup;
    private handleError;
    private resetStats;
    /**
     * Shutdown the cache service
     */
    shutdown(): void;
}
export declare const advancedCache: AdvancedCacheService;
//# sourceMappingURL=advanced-cache.service.d.ts.map