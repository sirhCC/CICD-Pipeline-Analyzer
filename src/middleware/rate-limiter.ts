import type { Request, Response, NextFunction } from 'express';
import type { Redis } from 'ioredis';
import { log } from '../shared/logger';
import { AuthenticationError, RateLimitError } from './error-handler';

/**
 * Rate limiting strategies
 */
export enum RateLimitStrategy {
  FIXED_WINDOW = 'fixed_window',
  SLIDING_WINDOW = 'sliding_window',
  TOKEN_BUCKET = 'token_bucket',
  LEAKY_BUCKET = 'leaky_bucket',
}

/**
 * Rate limit configuration options
 */
export interface RateLimitOptions {
  /** Maximum number of requests allowed */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Rate limiting strategy */
  strategy?: RateLimitStrategy;
  /** Custom message for rate limit exceeded */
  message?: string;
  /** Skip function to bypass rate limiting */
  skip?: (req: Request) => boolean;
  /** Key generator function */
  keyGenerator?: (req: Request) => string;
  /** Custom headers to include in response */
  standardHeaders?: boolean;
  /** Legacy headers support */
  legacyHeaders?: boolean;
  /** Skip successful requests in counting */
  skipSuccessfulRequests?: boolean;
  /** Skip failed requests in counting */
  skipFailedRequests?: boolean;
  /** Custom rate limit handler */
  handler?: (req: Request, res: Response, next: NextFunction) => void;
  /** Store configuration */
  store?: RateLimitStore;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  totalHits: number;
}

/**
 * Rate limit store interface
 */
export interface RateLimitStore {
  incr(key: string): Promise<RateLimitInfo>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
}

/**
 * Redis-based rate limit store
 */
export class RedisRateLimitStore implements RateLimitStore {
  private redis: Redis;
  private options: RateLimitOptions;

  constructor(redis: Redis, options: RateLimitOptions) {
    this.redis = redis;
    this.options = options;
  }

  /**
   * Increment rate limit counter
   */
  async incr(key: string): Promise<RateLimitInfo> {
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
  private async fixedWindowIncr(key: string): Promise<RateLimitInfo> {
    const multi = this.redis.multi();
    const windowStart = Math.floor(Date.now() / this.options.windowMs) * this.options.windowMs;
    const windowKey = `${key}:${windowStart}`;

    multi.incr(windowKey);
    multi.expire(windowKey, Math.ceil(this.options.windowMs / 1000));

    const results = await multi.exec();
    const current = (results?.[0]?.[1] as number) || 0;

    return {
      limit: this.options.max,
      current,
      remaining: Math.max(0, this.options.max - current),
      resetTime: new Date(windowStart + this.options.windowMs),
      totalHits: current,
    };
  }

  /**
   * Sliding window rate limiting using sorted sets
   */
  private async slidingWindowIncr(key: string): Promise<RateLimitInfo> {
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
    const current = (results?.[2]?.[1] as number) || 0;

    return {
      limit: this.options.max,
      current,
      remaining: Math.max(0, this.options.max - current),
      resetTime: new Date(now + this.options.windowMs),
      totalHits: current,
    };
  }

  /**
   * Token bucket rate limiting
   */
  private async tokenBucketIncr(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const bucketKey = `bucket:${key}`;

    // Get current bucket state
    const bucket = await this.redis.hmget(bucketKey, 'tokens', 'lastRefill');
    let tokens = parseInt(bucket[0] || String(this.options.max));
    let lastRefill = parseInt(bucket[1] || String(now));

    // Calculate tokens to add based on time elapsed
    const timeDiff = now - lastRefill;
    const tokensToAdd = Math.floor((timeDiff / this.options.windowMs) * this.options.max);

    if (tokensToAdd > 0) {
      tokens = Math.min(this.options.max, tokens + tokensToAdd);
      lastRefill = now;
    }

    if (tokens > 0) {
      tokens--;
      await this.redis.hmset(bucketKey, 'tokens', tokens, 'lastRefill', lastRefill);
      await this.redis.expire(bucketKey, Math.ceil((this.options.windowMs / 1000) * 2));
    }

    return {
      limit: this.options.max,
      current: this.options.max - tokens,
      remaining: tokens,
      resetTime: new Date(lastRefill + this.options.windowMs),
      totalHits: this.options.max - tokens,
    };
  }

  /**
   * Leaky bucket rate limiting
   */
  private async leakyBucketIncr(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const bucketKey = `leaky:${key}`;

    // Get current bucket state
    const bucket = await this.redis.hmget(bucketKey, 'volume', 'lastLeak');
    let volume = parseFloat(bucket[0] || '0');
    const lastLeak = parseInt(bucket[1] || String(now));

    // Calculate volume leaked since last check
    const timeDiff = now - lastLeak;
    const leakRate = this.options.max / this.options.windowMs; // requests per ms
    const volumeLeaked = timeDiff * leakRate;

    volume = Math.max(0, volume - volumeLeaked);

    // Add current request
    volume += 1;

    await this.redis.hmset(bucketKey, 'volume', volume, 'lastLeak', now);
    await this.redis.expire(bucketKey, Math.ceil((this.options.windowMs / 1000) * 2));

    const current = Math.floor(volume);

    return {
      limit: this.options.max,
      current,
      remaining: Math.max(0, this.options.max - current),
      resetTime: new Date(now + volume / leakRate),
      totalHits: current,
    };
  }

  /**
   * Decrement rate limit counter
   */
  async decrement(key: string): Promise<void> {
    const strategy = this.options.strategy || RateLimitStrategy.FIXED_WINDOW;

    if (strategy === RateLimitStrategy.FIXED_WINDOW) {
      const windowStart = Math.floor(Date.now() / this.options.windowMs) * this.options.windowMs;
      const windowKey = `${key}:${windowStart}`;
      await this.redis.decr(windowKey);
    } else if (strategy === RateLimitStrategy.SLIDING_WINDOW) {
      // For sliding window, we don't decrement as entries naturally expire
      // This is a no-op for sliding window
    }
  }

  /**
   * Reset rate limit for a key
   */
  async resetKey(key: string): Promise<void> {
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

/**
 * Memory-based rate limit store (for testing/fallback)
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number; requests: number[] }>();
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = options;
  }

  async incr(key: string): Promise<RateLimitInfo> {
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
      totalHits: record.count,
    };
  }

  async decrement(key: string): Promise<void> {
    const record = this.store.get(key);
    if (record && record.count > 0) {
      record.count--;
      this.store.set(key, record);
    }
  }

  async resetKey(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * Rate limiter service
 */
export class RateLimiterService {
  private defaultOptions: RateLimitOptions = {
    max: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    strategy: RateLimitStrategy.SLIDING_WINDOW,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  };

  /**
   * Create rate limiter middleware
   */
  createLimiter(
    options: Partial<RateLimitOptions> = {}
  ): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    const config = { ...this.defaultOptions, ...options };

    // Default key generator
    if (!config.keyGenerator) {
      config.keyGenerator = (req: Request) => {
        const user = (req as any).user;
        const apiKey = req.headers['x-api-key'];
        const ip = req.ip || req.connection.remoteAddress || 'unknown';

        if (user) {
          return `user:${user.id}`;
        } else if (apiKey) {
          return `api:${apiKey}`;
        } else {
          return `ip:${ip}`;
        }
      };
    }

    // Default store (memory fallback)
    if (!config.store) {
      config.store = new MemoryRateLimitStore(config);
    }

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip if skip function returns true
        if (config.skip?.(req)) {
          return next();
        }

        const key = config.keyGenerator!(req);
        const rateLimitInfo = await config.store!.incr(key);

        // Add headers
        if (config.standardHeaders) {
          res.set({
            'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
            'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitInfo.resetTime.getTime() / 1000).toString(),
          });
        }

        if (config.legacyHeaders) {
          res.set({
            'X-Rate-Limit-Limit': rateLimitInfo.limit.toString(),
            'X-Rate-Limit-Remaining': rateLimitInfo.remaining.toString(),
            'X-Rate-Limit-Reset': Math.ceil(rateLimitInfo.resetTime.getTime() / 1000).toString(),
          });
        }

        // Check if rate limit exceeded
        if (rateLimitInfo.current > rateLimitInfo.limit) {
          // Decrement counter if we should skip failed requests
          if (config.skipFailedRequests) {
            await config.store!.decrement(key);
          }

          if (config.handler) {
            return config.handler(req, res, next);
          }

          log.warn('Rate limit exceeded', {
            module: 'RateLimiter',
            key,
            limit: rateLimitInfo.limit,
            current: rateLimitInfo.current,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
          });

          throw new RateLimitError(config.message || 'Rate limit exceeded');
        }

        // Store rate limit info for potential use by other middleware
        (req as any).rateLimit = rateLimitInfo;

        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          throw error;
        }

        log.error('Rate limiter error', error, {
          module: 'RateLimiter',
        });

        // If rate limiter fails, allow request to proceed
        next();
      }
    };
  }

  /**
   * Global rate limiter (per IP)
   */
  globalLimiter(options: Partial<RateLimitOptions> = {}) {
    return this.createLimiter({
      max: 1000,
      windowMs: 15 * 60 * 1000, // 15 minutes
      keyGenerator: req => `global:${req.ip}`,
      message: 'Too many requests from this IP, please try again later',
      ...options,
    });
  }

  /**
   * API rate limiter (per API key or user)
   */
  apiLimiter(options: Partial<RateLimitOptions> = {}) {
    return this.createLimiter({
      max: 100,
      windowMs: 60 * 1000, // 1 minute
      keyGenerator: req => {
        const user = (req as any).user;
        const apiKey = req.headers['x-api-key'];

        if (user) {
          return `api:user:${user.id}`;
        } else if (apiKey) {
          return `api:key:${apiKey}`;
        } else {
          return `api:ip:${req.ip}`;
        }
      },
      message: 'API rate limit exceeded',
      ...options,
    });
  }

  /**
   * Authentication rate limiter (login attempts)
   */
  authLimiter(options: Partial<RateLimitOptions> = {}) {
    return this.createLimiter({
      max: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      keyGenerator: req => `auth:${req.ip}`,
      message: 'Too many authentication attempts, please try again later',
      skipSuccessfulRequests: true,
      ...options,
    });
  }

  /**
   * Expensive operation rate limiter
   */
  expensiveLimiter(options: Partial<RateLimitOptions> = {}) {
    return this.createLimiter({
      max: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
      strategy: RateLimitStrategy.TOKEN_BUCKET,
      keyGenerator: req => {
        const user = (req as any).user;
        return user ? `expensive:user:${user.id}` : `expensive:ip:${req.ip}`;
      },
      message: 'Rate limit exceeded for expensive operations',
      ...options,
    });
  }

  /**
   * Create Redis store
   */
  static createRedisStore(redis: Redis, options: RateLimitOptions): RedisRateLimitStore {
    return new RedisRateLimitStore(redis, options);
  }

  /**
   * Create memory store
   */
  static createMemoryStore(options: RateLimitOptions): MemoryRateLimitStore {
    return new MemoryRateLimitStore(options);
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiterService();

// Export convenience functions
export function createRateLimiter(options: Partial<RateLimitOptions> = {}) {
  return rateLimiter.createLimiter(options);
}

export function globalRateLimiter(options: Partial<RateLimitOptions> = {}) {
  return rateLimiter.globalLimiter(options);
}

export function apiRateLimiter(options: Partial<RateLimitOptions> = {}) {
  return rateLimiter.apiLimiter(options);
}

export function authRateLimiter(options: Partial<RateLimitOptions> = {}) {
  return rateLimiter.authLimiter(options);
}

export function expensiveRateLimiter(options: Partial<RateLimitOptions> = {}) {
  return rateLimiter.expensiveLimiter(options);
}
