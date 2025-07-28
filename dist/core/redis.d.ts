/**
 * Enterprise Redis Cache Manager
 * High-performance caching with intelligent invalidation and monitoring
 */
export interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: number;
    memoryUsage: number;
    keyCount: number;
}
export interface CacheOptions {
    ttl?: number;
    tags?: string[];
    namespace?: string;
}
export declare class RedisManager {
    private static instance;
    private client;
    private logger;
    private stats;
    private connected;
    private constructor();
    static getInstance(): RedisManager;
    /**
     * Initialize Redis connection
     */
    initialize(): Promise<void>;
    /**
     * Check if Redis is connected
     */
    isConnected(): boolean;
    /**
     * Get a value from cache
     */
    get<T = string>(key: string, namespace?: string): Promise<T | null>;
    /**
     * Set a value in cache
     */
    set(key: string, value: unknown, options?: CacheOptions): Promise<boolean>;
    /**
     * Delete a value from cache
     */
    del(key: string, namespace?: string): Promise<boolean>;
    /**
     * Check if a key exists
     */
    exists(key: string, namespace?: string): Promise<boolean>;
    /**
     * Set TTL for a key
     */
    expire(key: string, ttl: number, namespace?: string): Promise<boolean>;
    /**
     * Get multiple values at once
     */
    mget<T = string>(keys: string[], namespace?: string): Promise<(T | null)[]>;
    /**
     * Clear all cache entries (use with caution)
     */
    clear(namespace?: string): Promise<boolean>;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Reset cache statistics
     */
    resetStats(): void;
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
    /**
     * Close Redis connection
     */
    close(): Promise<void>;
    private buildKey;
    private addToTags;
    /**
     * Delete keys by tag
     */
    deleteByTag(tag: string): Promise<number>;
}
export declare const redisManager: RedisManager;
//# sourceMappingURL=redis.d.ts.map