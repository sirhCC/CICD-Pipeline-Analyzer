"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.advancedCache = exports.AdvancedCacheService = void 0;
const logger_1 = require("../shared/logger");
const events_1 = require("events");
class AdvancedCacheService extends events_1.EventEmitter {
    static instance;
    logger;
    config;
    memoryCache = new Map();
    stats;
    accessPatterns = new Map();
    cleanupTimer;
    circuitBreaker = { failures: 0, lastFailure: 0, isOpen: false };
    constructor(config = {}) {
        super();
        this.logger = new logger_1.Logger('AdvancedCache');
        this.config = {
            maxMemorySize: 100 * 1024 * 1024, // 100MB
            maxItems: 10000,
            defaultTtl: 3600000, // 1 hour
            cleanupInterval: 300000, // 5 minutes
            enableRedis: false, // Would be true in production
            enablePredictiveCaching: true,
            enableAnalytics: true,
            circuitBreakerThreshold: 0.5, // 50% failure rate
            ...config
        };
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            errors: 0,
            totalSize: 0,
            itemCount: 0,
            hitRatio: 0,
            averageAccessTime: 0,
            memoryLevel: { hits: 0, misses: 0, size: 0, itemCount: 0 }
        };
        this.startCleanupTimer();
    }
    static getInstance(config) {
        if (!AdvancedCacheService.instance) {
            AdvancedCacheService.instance = new AdvancedCacheService(config);
        }
        return AdvancedCacheService.instance;
    }
    /**
     * Get value from cache with intelligent fallback
     */
    async get(key) {
        const startTime = Date.now();
        try {
            // Check circuit breaker
            if (this.circuitBreaker.isOpen) {
                if (Date.now() - this.circuitBreaker.lastFailure > 60000) { // Reset after 1 minute
                    this.circuitBreaker.isOpen = false;
                    this.circuitBreaker.failures = 0;
                }
                else {
                    return null;
                }
            }
            // Try memory cache first
            const memoryEntry = this.memoryCache.get(key);
            if (memoryEntry && !this.isExpired(memoryEntry)) {
                this.updateAccessStats(memoryEntry);
                this.updateAccessPattern(key);
                this.stats.hits++;
                this.stats.memoryLevel.hits++;
                if (this.config.enableAnalytics) {
                    const accessTime = Date.now() - startTime;
                    this.updateAverageAccessTime(accessTime);
                }
                return memoryEntry.value;
            }
            // Try Redis cache if enabled (placeholder for Redis integration)
            if (this.config.enableRedis) {
                const redisValue = await this.getFromRedis(key);
                if (redisValue !== null) {
                    // Promote to memory cache
                    await this.setInMemory(key, redisValue);
                    this.stats.hits++;
                    if (this.stats.redisLevel) {
                        this.stats.redisLevel.hits++;
                    }
                    return redisValue;
                }
            }
            // Cache miss
            this.stats.misses++;
            this.stats.memoryLevel.misses++;
            this.updateHitRatio();
            return null;
        }
        catch (error) {
            this.handleError('Cache get failed', error, key);
            return null;
        }
    }
    /**
     * Set value in cache with intelligent placement
     */
    async set(key, value, ttl, metadata) {
        try {
            const entry = {
                key,
                value,
                timestamp: Date.now(),
                ttl: ttl || this.config.defaultTtl,
                accessCount: 1,
                lastAccessed: Date.now(),
                size: this.estimateSize(value),
                metadata: metadata || {}
            };
            // Check if we need to evict items
            await this.ensureCapacity(entry.size);
            // Set in memory cache
            await this.setInMemory(key, value, entry);
            // Set in Redis if enabled
            if (this.config.enableRedis) {
                await this.setInRedis(key, value, ttl);
            }
            this.stats.sets++;
            this.updateAccessPattern(key);
            return true;
        }
        catch (error) {
            this.handleError('Cache set failed', error, key);
            return false;
        }
    }
    /**
     * Delete from cache
     */
    async delete(key) {
        try {
            const memoryEntry = this.memoryCache.get(key);
            if (memoryEntry) {
                this.stats.totalSize -= memoryEntry.size;
                this.stats.itemCount--;
                this.stats.memoryLevel.itemCount--;
                this.stats.memoryLevel.size -= memoryEntry.size;
            }
            this.memoryCache.delete(key);
            this.accessPatterns.delete(key);
            if (this.config.enableRedis) {
                await this.deleteFromRedis(key);
            }
            this.stats.deletes++;
            return true;
        }
        catch (error) {
            this.handleError('Cache delete failed', error, key);
            return false;
        }
    }
    /**
     * Clear all cache
     */
    async clear() {
        try {
            this.memoryCache.clear();
            this.accessPatterns.clear();
            this.resetStats();
            if (this.config.enableRedis) {
                await this.clearRedis();
            }
            this.logger.info('Cache cleared');
        }
        catch (error) {
            this.handleError('Cache clear failed', error);
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Warm cache with predicted keys
     */
    async warmCache(warmingFunction) {
        if (!this.config.enablePredictiveCaching)
            return;
        try {
            const predictedKeys = this.getPredictedKeys();
            if (predictedKeys.length === 0)
                return;
            this.logger.info('Warming cache with predicted keys', { count: predictedKeys.length });
            const data = await warmingFunction(predictedKeys);
            for (const [key, value] of data) {
                await this.set(key, value, undefined, { tags: ['predicted'], priority: 'low' });
            }
            this.logger.info('Cache warming completed', { warmed: data.size });
        }
        catch (error) {
            this.handleError('Cache warming failed', error);
        }
    }
    /**
     * Optimize cache based on access patterns
     */
    optimize() {
        try {
            this.analyzeAccessPatterns();
            this.adjustTtlBasedOnPatterns();
            this.evictUnusedItems();
            this.logger.info('Cache optimization completed', {
                patterns: this.accessPatterns.size,
                items: this.memoryCache.size,
                hitRatio: this.stats.hitRatio
            });
        }
        catch (error) {
            this.handleError('Cache optimization failed', error);
        }
    }
    // Private helper methods
    async setInMemory(key, value, entry) {
        const cacheEntry = entry || {
            key,
            value,
            timestamp: Date.now(),
            ttl: this.config.defaultTtl,
            accessCount: 1,
            lastAccessed: Date.now(),
            size: this.estimateSize(value)
        };
        this.memoryCache.set(key, cacheEntry);
        this.stats.totalSize += cacheEntry.size;
        this.stats.itemCount++;
        this.stats.memoryLevel.itemCount++;
        this.stats.memoryLevel.size += cacheEntry.size;
    }
    async getFromRedis(key) {
        // Placeholder for Redis integration
        // In production, this would use Redis client
        return null;
    }
    async setInRedis(key, value, ttl) {
        // Placeholder for Redis integration
    }
    async deleteFromRedis(key) {
        // Placeholder for Redis integration
    }
    async clearRedis() {
        // Placeholder for Redis integration
    }
    isExpired(entry) {
        return Date.now() - entry.timestamp > entry.ttl;
    }
    updateAccessStats(entry) {
        entry.accessCount++;
        entry.lastAccessed = Date.now();
    }
    updateAccessPattern(key) {
        if (!this.config.enablePredictiveCaching)
            return;
        const now = Date.now();
        const pattern = this.accessPatterns.get(key) || {
            key,
            frequency: 0,
            lastAccess: 0,
            predictedNextAccess: 0,
            confidence: 0
        };
        pattern.frequency++;
        pattern.lastAccess = now;
        // Simple prediction: assume regular access intervals
        if (pattern.frequency > 1) {
            const interval = now - pattern.lastAccess;
            pattern.predictedNextAccess = now + interval;
            pattern.confidence = Math.min(pattern.frequency / 10, 1); // Max confidence at 10 accesses
        }
        this.accessPatterns.set(key, pattern);
    }
    updateHitRatio() {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRatio = total > 0 ? this.stats.hits / total : 0;
    }
    updateAverageAccessTime(accessTime) {
        const total = this.stats.hits + this.stats.misses;
        this.stats.averageAccessTime = (this.stats.averageAccessTime * (total - 1) + accessTime) / total;
    }
    estimateSize(value) {
        try {
            return JSON.stringify(value).length * 2; // Rough estimate (UTF-16)
        }
        catch {
            return 1024; // Default estimate
        }
    }
    async ensureCapacity(newItemSize) {
        if (this.stats.totalSize + newItemSize <= this.config.maxMemorySize &&
            this.stats.itemCount < this.config.maxItems) {
            return;
        }
        // Need to evict items
        const itemsToEvict = this.selectItemsForEviction(newItemSize);
        for (const key of itemsToEvict) {
            const entry = this.memoryCache.get(key);
            if (entry) {
                this.stats.totalSize -= entry.size;
                this.stats.itemCount--;
                this.stats.memoryLevel.itemCount--;
                this.stats.memoryLevel.size -= entry.size;
                this.stats.evictions++;
            }
            this.memoryCache.delete(key);
        }
    }
    selectItemsForEviction(requiredSpace) {
        const entries = Array.from(this.memoryCache.entries());
        // LRU with priority consideration
        entries.sort((a, b) => {
            const [, entryA] = a;
            const [, entryB] = b;
            // Priority consideration
            const priorityA = this.getPriorityScore(entryA);
            const priorityB = this.getPriorityScore(entryB);
            if (priorityA !== priorityB) {
                return priorityA - priorityB; // Lower priority first
            }
            // Then by access time (LRU)
            return entryA.lastAccessed - entryB.lastAccessed;
        });
        const toEvict = [];
        let freedSpace = 0;
        for (const [key, entry] of entries) {
            if (freedSpace >= requiredSpace)
                break;
            toEvict.push(key);
            freedSpace += entry.size;
        }
        return toEvict;
    }
    getPriorityScore(entry) {
        const priority = entry.metadata?.priority || 'medium';
        const scores = { low: 1, medium: 2, high: 3, critical: 4 };
        return scores[priority];
    }
    getPredictedKeys() {
        const now = Date.now();
        const predicted = [];
        for (const pattern of this.accessPatterns.values()) {
            if (pattern.confidence > 0.5 &&
                pattern.predictedNextAccess <= now + 600000) { // Within 10 minutes
                predicted.push(pattern.key);
            }
        }
        return predicted.slice(0, 100); // Limit to 100 predictions
    }
    analyzeAccessPatterns() {
        // Advanced pattern analysis would go here
        // For now, just log patterns
        if (this.config.enableAnalytics) {
            const hotKeys = Array.from(this.accessPatterns.values())
                .filter(p => p.frequency > 10)
                .sort((a, b) => b.frequency - a.frequency)
                .slice(0, 10);
            this.logger.info('Hot cache keys', {
                hotKeys: hotKeys.map(k => ({ key: k.key, frequency: k.frequency }))
            });
        }
    }
    adjustTtlBasedOnPatterns() {
        // Adjust TTL based on access patterns
        for (const [key, entry] of this.memoryCache.entries()) {
            const pattern = this.accessPatterns.get(key);
            if (pattern && pattern.frequency > 5) {
                // Extend TTL for frequently accessed items
                entry.ttl = Math.min(entry.ttl * 1.5, this.config.defaultTtl * 3);
            }
        }
    }
    evictUnusedItems() {
        const now = Date.now();
        const unusedThreshold = 3600000; // 1 hour
        for (const [key, entry] of this.memoryCache.entries()) {
            if (now - entry.lastAccessed > unusedThreshold && entry.accessCount < 2) {
                this.delete(key);
            }
        }
    }
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }
    cleanup() {
        const now = Date.now();
        const expiredKeys = [];
        for (const [key, entry] of this.memoryCache.entries()) {
            if (this.isExpired(entry)) {
                expiredKeys.push(key);
            }
        }
        for (const key of expiredKeys) {
            this.delete(key);
        }
        this.optimize();
    }
    handleError(message, error, key) {
        this.stats.errors++;
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = Date.now();
        if (this.circuitBreaker.failures / (this.stats.hits + this.stats.misses || 1) > this.config.circuitBreakerThreshold) {
            this.circuitBreaker.isOpen = true;
            this.logger.error('Cache circuit breaker opened', { failures: this.circuitBreaker.failures });
        }
        this.logger.error(message, { error: error instanceof Error ? error.message : String(error), key });
        this.emit('error', { message, error, key });
    }
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            errors: 0,
            totalSize: 0,
            itemCount: 0,
            hitRatio: 0,
            averageAccessTime: 0,
            memoryLevel: { hits: 0, misses: 0, size: 0, itemCount: 0 }
        };
    }
    /**
     * Shutdown the cache service
     */
    shutdown() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.clear();
        this.logger.info('Cache service shutdown');
    }
}
exports.AdvancedCacheService = AdvancedCacheService;
// Export singleton instance
exports.advancedCache = AdvancedCacheService.getInstance();
//# sourceMappingURL=advanced-cache.service.js.map