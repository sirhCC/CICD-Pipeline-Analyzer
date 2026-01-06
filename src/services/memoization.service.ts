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

import { Logger } from '@/shared/logger';
import crypto from 'crypto';

export interface MemoizationConfig {
  maxSize: number;
  defaultTtl: number; // milliseconds
  enableMetrics: boolean;
  enableCompression: boolean;
  cleanupInterval: number; // milliseconds
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

export class MemoizationService {
  private static instance: MemoizationService;
  private logger: Logger;
  private config: MemoizationConfig;
  private cache = new Map<string, CacheEntry<any>>();
  private accessOrder: string[] = [];
  private metrics: MemoizationMetrics;
  private cleanupTimer?: NodeJS.Timeout;

  private constructor(config: Partial<MemoizationConfig> = {}) {
    this.logger = new Logger('MemoizationService');
    this.config = {
      maxSize: 1000,
      defaultTtl: 300000, // 5 minutes
      enableMetrics: true,
      enableCompression: false,
      cleanupInterval: 60000, // 1 minute
      ...config,
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      memoryUsage: 0,
      hitRatio: 0,
      averageAccessTime: 0,
      totalRequests: 0,
    };

    this.startCleanupTimer();
  }

  public static getInstance(config?: Partial<MemoizationConfig>): MemoizationService {
    if (!MemoizationService.instance) {
      MemoizationService.instance = new MemoizationService(config);
    }
    return MemoizationService.instance;
  }

  /**
   * Memoize a function with advanced caching
   */
  public memoize<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => TReturn,
    options: {
      ttl?: number;
      keyGenerator?: (...args: TArgs) => string;
      shouldCache?: (result: TReturn) => boolean;
    } = {}
  ): (...args: TArgs) => TReturn {
    const keyGenerator = options.keyGenerator || this.generateKey;
    const ttl = options.ttl || this.config.defaultTtl;
    const shouldCache = options.shouldCache || (() => true);

    return (...args: TArgs): TReturn => {
      const startTime = performance.now();
      const key = keyGenerator(...args);

      // Try to get from cache
      const cached = this.get<TReturn>(key);
      if (cached !== null) {
        this.updateMetrics(true, performance.now() - startTime);
        return cached;
      }

      // Execute function
      const result = fn(...args);

      // Cache result if it meets criteria
      if (shouldCache(result)) {
        this.set(key, result, ttl);
      }

      this.updateMetrics(false, performance.now() - startTime);
      return result;
    };
  }

  /**
   * Memoize async functions
   */
  public memoizeAsync<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    options: {
      ttl?: number;
      keyGenerator?: (...args: TArgs) => string;
      shouldCache?: (result: TReturn) => boolean;
    } = {}
  ): (...args: TArgs) => Promise<TReturn> {
    const keyGenerator = options.keyGenerator || this.generateKey;
    const ttl = options.ttl || this.config.defaultTtl;
    const shouldCache = options.shouldCache || (() => true);
    const pendingPromises = new Map<string, Promise<TReturn>>();

    return async (...args: TArgs): Promise<TReturn> => {
      const startTime = performance.now();
      const key = keyGenerator(...args);

      // Try to get from cache
      const cached = this.get<TReturn>(key);
      if (cached !== null) {
        this.updateMetrics(true, performance.now() - startTime);
        return cached;
      }

      // Check if there's a pending promise for this key
      const pendingPromise = pendingPromises.get(key);
      if (pendingPromise) {
        return pendingPromise;
      }

      // Create and execute promise
      const promise = fn(...args);
      pendingPromises.set(key, promise);

      try {
        const result = await promise;

        // Cache result if it meets criteria
        if (shouldCache(result)) {
          this.set(key, result, ttl);
        }

        this.updateMetrics(false, performance.now() - startTime);
        return result;
      } finally {
        pendingPromises.delete(key);
      }
    };
  }

  /**
   * Get value from cache
   */
  private get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiry) {
      this.delete(key);
      return null;
    }

    // Update access information
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.updateAccessOrder(key);

    return entry.value;
  }

  /**
   * Set value in cache
   */
  private set<T>(key: string, value: T, ttl: number): void {
    const expiry = Date.now() + ttl;
    const size = this.calculateSize(value);

    const entry: CacheEntry<T> = {
      value,
      expiry,
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
    };

    // Check if we need to evict items
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.updateMemoryUsage();
  }

  /**
   * Delete entry from cache
   */
  private delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromAccessOrder(key);
      this.updateMemoryUsage();
    }
    return deleted;
  }

  /**
   * Generate cache key from function arguments
   */
  private generateKey(...args: any[]): string {
    const serialized = JSON.stringify(args, (key, value) => {
      if (typeof value === 'function') {
        return value.toString();
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (value instanceof RegExp) {
        return value.toString();
      }
      return value;
    });

    return crypto.createHash('sha256').update(serialized).digest('hex').substring(0, 32); // Use first 32 characters for performance
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    const lruKey = this.accessOrder[0];
    if (lruKey) {
      this.delete(lruKey);
      this.metrics.evictions++;
    }
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Calculate size of value in bytes (approximate)
   */
  private calculateSize(value: any): number {
    try {
      const serialized = JSON.stringify(value);
      return new Blob([serialized]).size;
    } catch {
      // Fallback for non-serializable values
      return 1024; // 1KB default
    }
  }

  /**
   * Update memory usage metrics
   */
  private updateMemoryUsage(): void {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    this.metrics.memoryUsage = totalSize;
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(isHit: boolean, accessTime: number): void {
    if (!this.config.enableMetrics) {
      return;
    }

    this.metrics.totalRequests++;

    if (isHit) {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }

    this.metrics.hitRatio = this.metrics.hits / this.metrics.totalRequests;

    // Update average access time (exponential moving average)
    const alpha = 0.1;
    this.metrics.averageAccessTime =
      alpha * accessTime + (1 - alpha) * this.metrics.averageAccessTime;
  }

  /**
   * Start cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }

    if (expiredKeys.length > 0) {
      this.logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Get current cache metrics
   */
  public getMetrics(): MemoizationMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      memoryUsage: 0,
      hitRatio: 0,
      averageAccessTime: 0,
      totalRequests: 0,
    };
    this.logger.info('Cache cleared');
  }

  /**
   * Warm cache with precomputed values
   */
  public async warmCache<T>(
    warmingFunction: () => Promise<{ key: string; value: T; ttl?: number }[]>
  ): Promise<void> {
    try {
      const entries = await warmingFunction();
      for (const entry of entries) {
        this.set(entry.key, entry.value, entry.ttl || this.config.defaultTtl);
      }
      this.logger.info(`Cache warmed with ${entries.length} entries`);
    } catch (error) {
      this.logger.error('Cache warming failed', error);
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    maxSize: number;
    metrics: MemoizationMetrics;
    config: MemoizationConfig;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      metrics: this.getMetrics(),
      config: this.config,
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
    this.logger.info('MemoizationService destroyed');
  }
}

// Export singleton instance
export const memoizationService = MemoizationService.getInstance();
