"use strict";
/**
 * Enterprise Redis Cache Manager
 * High-performance caching with intelligent invalidation and monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisManager = exports.RedisManager = void 0;
const redis_1 = require("redis");
const config_1 = require("../config");
const logger_1 = require("../shared/logger");
class RedisManager {
    static instance;
    client = null;
    logger;
    stats;
    connected = false;
    constructor() {
        this.logger = new logger_1.Logger('RedisManager');
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            hitRate: 0,
            memoryUsage: 0,
            keyCount: 0,
        };
    }
    static getInstance() {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }
        return RedisManager.instance;
    }
    /**
     * Initialize Redis connection
     */
    async initialize() {
        try {
            this.logger.info('Initializing Redis connection...');
            const redisConfig = config_1.configManager.getRedis();
            this.client = (0, redis_1.createClient)({
                url: `redis://${redisConfig.host}:${redisConfig.port}`,
                ...(redisConfig.password && { password: redisConfig.password }),
                database: redisConfig.db,
                // Connection configuration
                socket: {
                    connectTimeout: 10000,
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            this.logger.error('Redis reconnection failed after 10 attempts');
                            return false;
                        }
                        return Math.min(retries * 100, 3000);
                    },
                },
                // Performance configuration
                commandsQueueMaxLength: 1000,
            });
            // Event handlers
            this.client.on('connect', () => {
                this.logger.info('Redis connected');
                this.connected = true;
            });
            this.client.on('disconnect', () => {
                this.logger.warn('Redis disconnected');
                this.connected = false;
            });
            this.client.on('error', (error) => {
                this.logger.error('Redis error', error);
                this.connected = false;
            });
            this.client.on('reconnecting', () => {
                this.logger.info('Redis reconnecting...');
            });
            await this.client.connect();
            // Test connection
            await this.client.ping();
            this.logger.info('Redis connection established successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Redis', error);
            // Don't throw error - allow application to run without Redis
            this.connected = false;
        }
    }
    /**
     * Check if Redis is connected
     */
    isConnected() {
        return this.connected && this.client?.isReady === true;
    }
    /**
     * Get a value from cache
     */
    async get(key, namespace) {
        if (!this.isConnected()) {
            this.logger.debug('Redis not connected, cache miss');
            this.stats.misses++;
            return null;
        }
        try {
            const fullKey = this.buildKey(key, namespace);
            const value = await this.client.get(fullKey);
            if (value === null) {
                this.stats.misses++;
                this.logger.logCacheOperation('miss', fullKey);
                return null;
            }
            this.stats.hits++;
            this.logger.logCacheOperation('hit', fullKey);
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        }
        catch (error) {
            this.logger.error('Cache get error', error, { key, namespace });
            this.stats.misses++;
            return null;
        }
    }
    /**
     * Set a value in cache
     */
    async set(key, value, options = {}) {
        if (!this.isConnected()) {
            this.logger.debug('Redis not connected, cache set skipped');
            return false;
        }
        try {
            const fullKey = this.buildKey(key, options.namespace);
            const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
            const ttl = options.ttl || config_1.configManager.getRedis().ttl;
            if (ttl > 0) {
                await this.client.setEx(fullKey, ttl, serializedValue);
            }
            else {
                await this.client.set(fullKey, serializedValue);
            }
            // Handle tags if provided
            if (options.tags && options.tags.length > 0) {
                await this.addToTags(fullKey, options.tags);
            }
            this.stats.sets++;
            this.logger.logCacheOperation('set', fullKey, { ttl, tags: options.tags });
            return true;
        }
        catch (error) {
            this.logger.error('Cache set error', error, { key, options });
            return false;
        }
    }
    /**
     * Delete a value from cache
     */
    async del(key, namespace) {
        if (!this.isConnected()) {
            this.logger.debug('Redis not connected, cache delete skipped');
            return false;
        }
        try {
            const fullKey = this.buildKey(key, namespace);
            const result = await this.client.del(fullKey);
            this.stats.deletes++;
            this.logger.logCacheOperation('del', fullKey);
            return result > 0;
        }
        catch (error) {
            this.logger.error('Cache delete error', error, { key, namespace });
            return false;
        }
    }
    /**
     * Check if a key exists
     */
    async exists(key, namespace) {
        if (!this.isConnected()) {
            return false;
        }
        try {
            const fullKey = this.buildKey(key, namespace);
            const result = await this.client.exists(fullKey);
            return result > 0;
        }
        catch (error) {
            this.logger.error('Cache exists error', error, { key, namespace });
            return false;
        }
    }
    /**
     * Set TTL for a key
     */
    async expire(key, ttl, namespace) {
        if (!this.isConnected()) {
            return false;
        }
        try {
            const fullKey = this.buildKey(key, namespace);
            const result = await this.client.expire(fullKey, ttl);
            return result;
        }
        catch (error) {
            this.logger.error('Cache expire error', error, { key, ttl, namespace });
            return false;
        }
    }
    /**
     * Get multiple values at once
     */
    async mget(keys, namespace) {
        if (!this.isConnected() || keys.length === 0) {
            return keys.map(() => null);
        }
        try {
            const fullKeys = keys.map(key => this.buildKey(key, namespace));
            const values = await this.client.mGet(fullKeys);
            return values.map((value, index) => {
                if (value === null) {
                    this.stats.misses++;
                    this.logger.logCacheOperation('miss', fullKeys[index] || '');
                    return null;
                }
                this.stats.hits++;
                this.logger.logCacheOperation('hit', fullKeys[index] || '');
                try {
                    return JSON.parse(value);
                }
                catch {
                    return value;
                }
            });
        }
        catch (error) {
            this.logger.error('Cache mget error', error, { keys, namespace });
            return keys.map(() => null);
        }
    }
    /**
     * Clear all cache entries (use with caution)
     */
    async clear(namespace) {
        if (!this.isConnected()) {
            return false;
        }
        try {
            if (namespace) {
                // Clear only keys in the namespace
                const pattern = this.buildKey('*', namespace);
                const keys = await this.client.keys(pattern);
                if (keys.length > 0) {
                    await this.client.del(keys);
                }
                this.logger.info(`Cleared ${keys.length} cache entries in namespace: ${namespace}`);
            }
            else {
                // Clear all cache
                await this.client.flushDb();
                this.logger.warn('Cleared entire Redis database');
            }
            return true;
        }
        catch (error) {
            this.logger.error('Cache clear error', error, { namespace });
            return false;
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        this.stats.hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
        return { ...this.stats };
    }
    /**
     * Reset cache statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            hitRate: 0,
            memoryUsage: 0,
            keyCount: 0,
        };
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            if (!this.isConnected()) {
                this.logger.logHealthCheck('redis', 'unhealthy', undefined, { reason: 'not_connected' });
                return false;
            }
            const startTime = Date.now();
            await this.client.ping();
            const responseTime = Date.now() - startTime;
            this.logger.logHealthCheck('redis', 'healthy', responseTime);
            return true;
        }
        catch (error) {
            this.logger.logHealthCheck('redis', 'unhealthy', undefined, { error });
            return false;
        }
    }
    /**
     * Close Redis connection
     */
    async close() {
        try {
            if (this.client && this.client.isReady) {
                this.logger.info('Closing Redis connection...');
                await this.client.quit();
                this.connected = false;
                this.logger.info('Redis connection closed successfully');
            }
        }
        catch (error) {
            this.logger.error('Error closing Redis connection', error);
        }
    }
    // === Private Helper Methods ===
    buildKey(key, namespace) {
        const prefix = 'cicd-analyzer';
        return namespace ? `${prefix}:${namespace}:${key}` : `${prefix}:${key}`;
    }
    async addToTags(key, tags) {
        if (!this.isConnected())
            return;
        try {
            const multi = this.client.multi();
            for (const tag of tags) {
                const tagKey = this.buildKey(`tag:${tag}`, 'tags');
                multi.sAdd(tagKey, key);
                multi.expire(tagKey, config_1.configManager.getRedis().ttl);
            }
            await multi.exec();
        }
        catch (error) {
            this.logger.error('Error adding tags', error, { key, tags });
        }
    }
    /**
     * Delete keys by tag
     */
    async deleteByTag(tag) {
        if (!this.isConnected()) {
            return 0;
        }
        try {
            const tagKey = this.buildKey(`tag:${tag}`, 'tags');
            const keys = await this.client.sMembers(tagKey);
            if (keys.length === 0) {
                return 0;
            }
            await this.client.del(keys);
            await this.client.del(tagKey);
            this.logger.info(`Deleted ${keys.length} cache entries with tag: ${tag}`);
            return keys.length;
        }
        catch (error) {
            this.logger.error('Error deleting by tag', error, { tag });
            return 0;
        }
    }
}
exports.RedisManager = RedisManager;
// Export singleton instance
exports.redisManager = RedisManager.getInstance();
//# sourceMappingURL=redis.js.map