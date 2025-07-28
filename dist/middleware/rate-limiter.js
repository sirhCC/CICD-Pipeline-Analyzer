"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = exports.RateLimiterService = exports.MemoryRateLimitStore = exports.RedisRateLimitStore = exports.RateLimitStrategy = void 0;
exports.createRateLimiter = createRateLimiter;
exports.globalRateLimiter = globalRateLimiter;
exports.apiRateLimiter = apiRateLimiter;
exports.authRateLimiter = authRateLimiter;
exports.expensiveRateLimiter = expensiveRateLimiter;
const logger_1 = require("../shared/logger");
const error_handler_1 = require("./error-handler");
/**
 * Rate limiting strategies
 */
var RateLimitStrategy;
(function (RateLimitStrategy) {
    RateLimitStrategy["FIXED_WINDOW"] = "fixed_window";
    RateLimitStrategy["SLIDING_WINDOW"] = "sliding_window";
    RateLimitStrategy["TOKEN_BUCKET"] = "token_bucket";
    RateLimitStrategy["LEAKY_BUCKET"] = "leaky_bucket";
})(RateLimitStrategy || (exports.RateLimitStrategy = RateLimitStrategy = {}));
/**
 * Redis-based rate limit store
 */
class RedisRateLimitStore {
    redis;
    options;
    constructor(redis, options) {
        this.redis = redis;
        this.options = options;
    }
    /**
     * Increment rate limit counter
     */
    async incr(key) {
        const strategy = this.options.strategy || RateLimitStrategy.FIXED_WINDOW;
        switch (strategy) {
            case RateLimitStrategy.FIXED_WINDOW:
                return this.fixedWindowIncr(key);
            case RateLimitStrategy.SLIDING_WINDOW:
                return this.slidingWindowIncr(key);
            case RateLimitStrategy.TOKEN_BUCKET:
                return this.tokenBucketIncr(key);
            case RateLimitStrategy.LEAKY_BUCKET:
                return this.leakyBucketIncr(key);
            default:
                return this.fixedWindowIncr(key);
        }
    }
    /**
     * Fixed window rate limiting
     */
    async fixedWindowIncr(key) {
        const multi = this.redis.multi();
        const windowStart = Math.floor(Date.now() / this.options.windowMs) * this.options.windowMs;
        const windowKey = `${key}:${windowStart}`;
        multi.incr(windowKey);
        multi.expire(windowKey, Math.ceil(this.options.windowMs / 1000));
        const results = await multi.exec();
        const current = results?.[0]?.[1] || 0;
        return {
            limit: this.options.max,
            current,
            remaining: Math.max(0, this.options.max - current),
            resetTime: new Date(windowStart + this.options.windowMs),
            totalHits: current
        };
    }
    /**
     * Sliding window rate limiting using sorted sets
     */
    async slidingWindowIncr(key) {
        const now = Date.now();
        const windowStart = now - this.options.windowMs;
        const multi = this.redis.multi();
        // Remove old entries
        multi.zremrangebyscore(key, 0, windowStart);
        // Add current request
        multi.zadd(key, now, `${now}-${Math.random()}`);
        // Count current requests
        multi.zcard(key);
        // Set expiration
        multi.expire(key, Math.ceil(this.options.windowMs / 1000));
        const results = await multi.exec();
        const current = results?.[2]?.[1] || 0;
        return {
            limit: this.options.max,
            current,
            remaining: Math.max(0, this.options.max - current),
            resetTime: new Date(now + this.options.windowMs),
            totalHits: current
        };
    }
    /**
     * Token bucket rate limiting
     */
    async tokenBucketIncr(key) {
        const now = Date.now();
        const bucketKey = `bucket:${key}`;
        // Get current bucket state
        const bucket = await this.redis.hmget(bucketKey, 'tokens', 'lastRefill');
        let tokens = parseInt(bucket[0] || String(this.options.max));
        let lastRefill = parseInt(bucket[1] || String(now));
        // Calculate tokens to add based on time elapsed
        const timeDiff = now - lastRefill;
        const tokensToAdd = Math.floor(timeDiff / this.options.windowMs * this.options.max);
        if (tokensToAdd > 0) {
            tokens = Math.min(this.options.max, tokens + tokensToAdd);
            lastRefill = now;
        }
        if (tokens > 0) {
            tokens--;
            await this.redis.hmset(bucketKey, 'tokens', tokens, 'lastRefill', lastRefill);
            await this.redis.expire(bucketKey, Math.ceil(this.options.windowMs / 1000 * 2));
        }
        return {
            limit: this.options.max,
            current: this.options.max - tokens,
            remaining: tokens,
            resetTime: new Date(lastRefill + this.options.windowMs),
            totalHits: this.options.max - tokens
        };
    }
    /**
     * Leaky bucket rate limiting
     */
    async leakyBucketIncr(key) {
        const now = Date.now();
        const bucketKey = `leaky:${key}`;
        // Get current bucket state
        const bucket = await this.redis.hmget(bucketKey, 'volume', 'lastLeak');
        let volume = parseFloat(bucket[0] || '0');
        let lastLeak = parseInt(bucket[1] || String(now));
        // Calculate volume leaked since last check
        const timeDiff = now - lastLeak;
        const leakRate = this.options.max / this.options.windowMs; // requests per ms
        const volumeLeaked = timeDiff * leakRate;
        volume = Math.max(0, volume - volumeLeaked);
        // Add current request
        volume += 1;
        await this.redis.hmset(bucketKey, 'volume', volume, 'lastLeak', now);
        await this.redis.expire(bucketKey, Math.ceil(this.options.windowMs / 1000 * 2));
        const current = Math.floor(volume);
        return {
            limit: this.options.max,
            current,
            remaining: Math.max(0, this.options.max - current),
            resetTime: new Date(now + (volume / leakRate)),
            totalHits: current
        };
    }
    /**
     * Decrement rate limit counter
     */
    async decrement(key) {
        const strategy = this.options.strategy || RateLimitStrategy.FIXED_WINDOW;
        if (strategy === RateLimitStrategy.FIXED_WINDOW) {
            const windowStart = Math.floor(Date.now() / this.options.windowMs) * this.options.windowMs;
            const windowKey = `${key}:${windowStart}`;
            await this.redis.decr(windowKey);
        }
        else if (strategy === RateLimitStrategy.SLIDING_WINDOW) {
            // For sliding window, we don't decrement as entries naturally expire
            // This is a no-op for sliding window
        }
    }
    /**
     * Reset rate limit for a key
     */
    async resetKey(key) {
        const strategy = this.options.strategy || RateLimitStrategy.FIXED_WINDOW;
        switch (strategy) {
            case RateLimitStrategy.FIXED_WINDOW:
                const windowStart = Math.floor(Date.now() / this.options.windowMs) * this.options.windowMs;
                const windowKey = `${key}:${windowStart}`;
                await this.redis.del(windowKey);
                break;
            case RateLimitStrategy.SLIDING_WINDOW:
                await this.redis.del(key);
                break;
            case RateLimitStrategy.TOKEN_BUCKET:
                await this.redis.del(`bucket:${key}`);
                break;
            case RateLimitStrategy.LEAKY_BUCKET:
                await this.redis.del(`leaky:${key}`);
                break;
        }
    }
}
exports.RedisRateLimitStore = RedisRateLimitStore;
/**
 * Memory-based rate limit store (for testing/fallback)
 */
class MemoryRateLimitStore {
    store = new Map();
    options;
    constructor(options) {
        this.options = options;
    }
    async incr(key) {
        const now = Date.now();
        const windowStart = Math.floor(now / this.options.windowMs) * this.options.windowMs;
        const resetTime = windowStart + this.options.windowMs;
        let record = this.store.get(key);
        if (!record || record.resetTime <= now) {
            record = { count: 0, resetTime, requests: [] };
        }
        // Clean up old requests for sliding window
        if (this.options.strategy === RateLimitStrategy.SLIDING_WINDOW) {
            record.requests = record.requests.filter(req => req > now - this.options.windowMs);
            record.count = record.requests.length;
        }
        record.count++;
        if (this.options.strategy === RateLimitStrategy.SLIDING_WINDOW) {
            record.requests.push(now);
        }
        this.store.set(key, record);
        return {
            limit: this.options.max,
            current: record.count,
            remaining: Math.max(0, this.options.max - record.count),
            resetTime: new Date(record.resetTime),
            totalHits: record.count
        };
    }
    async decrement(key) {
        const record = this.store.get(key);
        if (record && record.count > 0) {
            record.count--;
            this.store.set(key, record);
        }
    }
    async resetKey(key) {
        this.store.delete(key);
    }
}
exports.MemoryRateLimitStore = MemoryRateLimitStore;
/**
 * Rate limiter service
 */
class RateLimiterService {
    defaultOptions = {
        max: 100,
        windowMs: 15 * 60 * 1000, // 15 minutes
        strategy: RateLimitStrategy.SLIDING_WINDOW,
        message: 'Too many requests, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
    };
    /**
     * Create rate limiter middleware
     */
    createLimiter(options = {}) {
        const config = { ...this.defaultOptions, ...options };
        // Default key generator
        if (!config.keyGenerator) {
            config.keyGenerator = (req) => {
                const user = req.user;
                const apiKey = req.headers['x-api-key'];
                const ip = req.ip || req.connection.remoteAddress || 'unknown';
                if (user) {
                    return `user:${user.id}`;
                }
                else if (apiKey) {
                    return `api:${apiKey}`;
                }
                else {
                    return `ip:${ip}`;
                }
            };
        }
        // Default store (memory fallback)
        if (!config.store) {
            config.store = new MemoryRateLimitStore(config);
        }
        return async (req, res, next) => {
            try {
                // Skip if skip function returns true
                if (config.skip && config.skip(req)) {
                    return next();
                }
                const key = config.keyGenerator(req);
                const rateLimitInfo = await config.store.incr(key);
                // Add headers
                if (config.standardHeaders) {
                    res.set({
                        'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
                        'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
                        'X-RateLimit-Reset': Math.ceil(rateLimitInfo.resetTime.getTime() / 1000).toString()
                    });
                }
                if (config.legacyHeaders) {
                    res.set({
                        'X-Rate-Limit-Limit': rateLimitInfo.limit.toString(),
                        'X-Rate-Limit-Remaining': rateLimitInfo.remaining.toString(),
                        'X-Rate-Limit-Reset': Math.ceil(rateLimitInfo.resetTime.getTime() / 1000).toString()
                    });
                }
                // Check if rate limit exceeded
                if (rateLimitInfo.current > rateLimitInfo.limit) {
                    // Decrement counter if we should skip failed requests
                    if (config.skipFailedRequests) {
                        await config.store.decrement(key);
                    }
                    if (config.handler) {
                        return config.handler(req, res, next);
                    }
                    logger_1.log.warn('Rate limit exceeded', {
                        module: 'RateLimiter',
                        key,
                        limit: rateLimitInfo.limit,
                        current: rateLimitInfo.current,
                        ip: req.ip,
                        userAgent: req.get('User-Agent')
                    });
                    throw new error_handler_1.RateLimitError(config.message || 'Rate limit exceeded');
                }
                // Store rate limit info for potential use by other middleware
                req.rateLimit = rateLimitInfo;
                next();
            }
            catch (error) {
                if (error instanceof error_handler_1.RateLimitError) {
                    throw error;
                }
                logger_1.log.error('Rate limiter error', error, {
                    module: 'RateLimiter'
                });
                // If rate limiter fails, allow request to proceed
                next();
            }
        };
    }
    /**
     * Global rate limiter (per IP)
     */
    globalLimiter(options = {}) {
        return this.createLimiter({
            max: 1000,
            windowMs: 15 * 60 * 1000, // 15 minutes
            keyGenerator: (req) => `global:${req.ip}`,
            message: 'Too many requests from this IP, please try again later',
            ...options
        });
    }
    /**
     * API rate limiter (per API key or user)
     */
    apiLimiter(options = {}) {
        return this.createLimiter({
            max: 100,
            windowMs: 60 * 1000, // 1 minute
            keyGenerator: (req) => {
                const user = req.user;
                const apiKey = req.headers['x-api-key'];
                if (user) {
                    return `api:user:${user.id}`;
                }
                else if (apiKey) {
                    return `api:key:${apiKey}`;
                }
                else {
                    return `api:ip:${req.ip}`;
                }
            },
            message: 'API rate limit exceeded',
            ...options
        });
    }
    /**
     * Authentication rate limiter (login attempts)
     */
    authLimiter(options = {}) {
        return this.createLimiter({
            max: 5,
            windowMs: 15 * 60 * 1000, // 15 minutes
            keyGenerator: (req) => `auth:${req.ip}`,
            message: 'Too many authentication attempts, please try again later',
            skipSuccessfulRequests: true,
            ...options
        });
    }
    /**
     * Expensive operation rate limiter
     */
    expensiveLimiter(options = {}) {
        return this.createLimiter({
            max: 10,
            windowMs: 60 * 60 * 1000, // 1 hour
            strategy: RateLimitStrategy.TOKEN_BUCKET,
            keyGenerator: (req) => {
                const user = req.user;
                return user ? `expensive:user:${user.id}` : `expensive:ip:${req.ip}`;
            },
            message: 'Rate limit exceeded for expensive operations',
            ...options
        });
    }
    /**
     * Create Redis store
     */
    static createRedisStore(redis, options) {
        return new RedisRateLimitStore(redis, options);
    }
    /**
     * Create memory store
     */
    static createMemoryStore(options) {
        return new MemoryRateLimitStore(options);
    }
}
exports.RateLimiterService = RateLimiterService;
// Export singleton instance
exports.rateLimiter = new RateLimiterService();
// Export convenience functions
function createRateLimiter(options = {}) {
    return exports.rateLimiter.createLimiter(options);
}
function globalRateLimiter(options = {}) {
    return exports.rateLimiter.globalLimiter(options);
}
function apiRateLimiter(options = {}) {
    return exports.rateLimiter.apiLimiter(options);
}
function authRateLimiter(options = {}) {
    return exports.rateLimiter.authLimiter(options);
}
function expensiveRateLimiter(options = {}) {
    return exports.rateLimiter.expensiveLimiter(options);
}
//# sourceMappingURL=rate-limiter.js.map