/**
 * Advanced Memoization Service - High-Performance Function Caching
 *
 * Features:
 * - LRU cache with configurable size limits
 * - Time-based expiration (TTL)
 * - Weak references for automatic cleanup
 * - Hash-based key generation for complex objects
 * - Performance metrics and analytics
 * - Memory-efficient storage with compression
 * - Cache warming and preloading capabilities
 *
 * @author sirhCC
 * @version 1.0.0
 */
export interface MemoizationConfig {
    maxSize: number;
    defaultTtl: number;
    enableMetrics: boolean;
    enableCompression: boolean;
    cleanupInterval: number;
}
export interface MemoizationMetrics {
    hits: number;
    misses: number;
    evictions: number;
    memoryUsage: number;
    hitRatio: number;
    averageAccessTime: number;
    totalRequests: number;
}
export interface CacheEntry<T> {
    value: T;
    expiry: number;
    accessCount: number;
    lastAccessed: number;
    size: number;
}
export declare class MemoizationService {
    private static instance;
    private logger;
    private config;
    private cache;
    private accessOrder;
    private metrics;
    private cleanupTimer?;
    private constructor();
    static getInstance(config?: Partial<MemoizationConfig>): MemoizationService;
    /**
     * Memoize a function with advanced caching
     */
    memoize<TArgs extends any[], TReturn>(fn: (...args: TArgs) => TReturn, options?: {
        ttl?: number;
        keyGenerator?: (...args: TArgs) => string;
        shouldCache?: (result: TReturn) => boolean;
    }): (...args: TArgs) => TReturn;
    /**
     * Memoize async functions
     */
    memoizeAsync<TArgs extends any[], TReturn>(fn: (...args: TArgs) => Promise<TReturn>, options?: {
        ttl?: number;
        keyGenerator?: (...args: TArgs) => string;
        shouldCache?: (result: TReturn) => boolean;
    }): (...args: TArgs) => Promise<TReturn>;
    /**
     * Get value from cache
     */
    private get;
    /**
     * Set value in cache
     */
    private set;
    /**
     * Delete entry from cache
     */
    private delete;
    /**
     * Generate cache key from function arguments
     */
    private generateKey;
    /**
     * Evict least recently used item
     */
    private evictLRU;
    /**
     * Update access order for LRU tracking
     */
    private updateAccessOrder;
    /**
     * Remove key from access order
     */
    private removeFromAccessOrder;
    /**
     * Calculate size of value in bytes (approximate)
     */
    private calculateSize;
    /**
     * Update memory usage metrics
     */
    private updateMemoryUsage;
    /**
     * Update performance metrics
     */
    private updateMetrics;
    /**
     * Start cleanup timer for expired entries
     */
    private startCleanupTimer;
    /**
     * Clean up expired entries
     */
    private cleanupExpiredEntries;
    /**
     * Get current cache metrics
     */
    getMetrics(): MemoizationMetrics;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Warm cache with precomputed values
     */
    warmCache<T>(warmingFunction: () => Promise<{
        key: string;
        value: T;
        ttl?: number;
    }[]>): Promise<void>;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
        metrics: MemoizationMetrics;
        config: MemoizationConfig;
    };
    /**
     * Cleanup resources
     */
    destroy(): void;
}
export declare const memoizationService: MemoizationService;
//# sourceMappingURL=memoization.service.d.ts.map