"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoizationService = exports.MemoizationService = void 0;
const logger_1 = require("../shared/logger");
const crypto_1 = __importDefault(require("crypto"));
class MemoizationService {
    static instance;
    logger;
    config;
    cache = new Map();
    accessOrder = [];
    metrics;
    cleanupTimer;
    constructor(config = {}) {
        this.logger = new logger_1.Logger('MemoizationService');
        this.config = {
            maxSize: 1000,
            defaultTtl: 300000, // 5 minutes
            enableMetrics: true,
            enableCompression: false,
            cleanupInterval: 60000, // 1 minute
            ...config
        };
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0,
            memoryUsage: 0,
            hitRatio: 0,
            averageAccessTime: 0,
            totalRequests: 0
        };
        this.startCleanupTimer();
    }
    static getInstance(config) {
        if (!MemoizationService.instance) {
            MemoizationService.instance = new MemoizationService(config);
        }
        return MemoizationService.instance;
    }
    /**
     * Memoize a function with advanced caching
     */
    memoize(fn, options = {}) {
        const keyGenerator = options.keyGenerator || this.generateKey;
        const ttl = options.ttl || this.config.defaultTtl;
        const shouldCache = options.shouldCache || (() => true);
        return (...args) => {
            const startTime = performance.now();
            const key = keyGenerator(...args);
            // Try to get from cache
            const cached = this.get(key);
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
    memoizeAsync(fn, options = {}) {
        const keyGenerator = options.keyGenerator || this.generateKey;
        const ttl = options.ttl || this.config.defaultTtl;
        const shouldCache = options.shouldCache || (() => true);
        const pendingPromises = new Map();
        return async (...args) => {
            const startTime = performance.now();
            const key = keyGenerator(...args);
            // Try to get from cache
            const cached = this.get(key);
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
            }
            finally {
                pendingPromises.delete(key);
            }
        };
    }
    /**
     * Get value from cache
     */
    get(key) {
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
    set(key, value, ttl) {
        const expiry = Date.now() + ttl;
        const size = this.calculateSize(value);
        const entry = {
            value,
            expiry,
            accessCount: 1,
            lastAccessed: Date.now(),
            size
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
    delete(key) {
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
    generateKey(...args) {
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
        return crypto_1.default.createHash('sha256')
            .update(serialized)
            .digest('hex')
            .substring(0, 32); // Use first 32 characters for performance
    }
    /**
     * Evict least recently used item
     */
    evictLRU() {
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
    updateAccessOrder(key) {
        this.removeFromAccessOrder(key);
        this.accessOrder.push(key);
    }
    /**
     * Remove key from access order
     */
    removeFromAccessOrder(key) {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
    }
    /**
     * Calculate size of value in bytes (approximate)
     */
    calculateSize(value) {
        try {
            const serialized = JSON.stringify(value);
            return new Blob([serialized]).size;
        }
        catch {
            // Fallback for non-serializable values
            return 1024; // 1KB default
        }
    }
    /**
     * Update memory usage metrics
     */
    updateMemoryUsage() {
        let totalSize = 0;
        for (const entry of this.cache.values()) {
            totalSize += entry.size;
        }
        this.metrics.memoryUsage = totalSize;
    }
    /**
     * Update performance metrics
     */
    updateMetrics(isHit, accessTime) {
        if (!this.config.enableMetrics) {
            return;
        }
        this.metrics.totalRequests++;
        if (isHit) {
            this.metrics.hits++;
        }
        else {
            this.metrics.misses++;
        }
        this.metrics.hitRatio = this.metrics.hits / this.metrics.totalRequests;
        // Update average access time (exponential moving average)
        const alpha = 0.1;
        this.metrics.averageAccessTime =
            (alpha * accessTime) + ((1 - alpha) * this.metrics.averageAccessTime);
    }
    /**
     * Start cleanup timer for expired entries
     */
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredEntries();
        }, this.config.cleanupInterval);
    }
    /**
     * Clean up expired entries
     */
    cleanupExpiredEntries() {
        const now = Date.now();
        const expiredKeys = [];
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
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        this.accessOrder = [];
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0,
            memoryUsage: 0,
            hitRatio: 0,
            averageAccessTime: 0,
            totalRequests: 0
        };
        this.logger.info('Cache cleared');
    }
    /**
     * Warm cache with precomputed values
     */
    async warmCache(warmingFunction) {
        try {
            const entries = await warmingFunction();
            for (const entry of entries) {
                this.set(entry.key, entry.value, entry.ttl || this.config.defaultTtl);
            }
            this.logger.info(`Cache warmed with ${entries.length} entries`);
        }
        catch (error) {
            this.logger.error('Cache warming failed', error);
        }
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.config.maxSize,
            metrics: this.getMetrics(),
            config: this.config
        };
    }
    /**
     * Cleanup resources
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.clear();
        this.logger.info('MemoizationService destroyed');
    }
}
exports.MemoizationService = MemoizationService;
// Export singleton instance
exports.memoizationService = MemoizationService.getInstance();
//# sourceMappingURL=memoization.service.js.map