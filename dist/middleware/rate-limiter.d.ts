import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
/**
 * Rate limiting strategies
 */
export declare enum RateLimitStrategy {
    FIXED_WINDOW = "fixed_window",
    SLIDING_WINDOW = "sliding_window",
    TOKEN_BUCKET = "token_bucket",
    LEAKY_BUCKET = "leaky_bucket"
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
export declare class RedisRateLimitStore implements RateLimitStore {
    private redis;
    private options;
    constructor(redis: Redis, options: RateLimitOptions);
    /**
     * Increment rate limit counter
     */
    incr(key: string): Promise<RateLimitInfo>;
    /**
     * Fixed window rate limiting
     */
    private fixedWindowIncr;
    /**
     * Sliding window rate limiting using sorted sets
     */
    private slidingWindowIncr;
    /**
     * Token bucket rate limiting
     */
    private tokenBucketIncr;
    /**
     * Leaky bucket rate limiting
     */
    private leakyBucketIncr;
    /**
     * Decrement rate limit counter
     */
    decrement(key: string): Promise<void>;
    /**
     * Reset rate limit for a key
     */
    resetKey(key: string): Promise<void>;
}
/**
 * Memory-based rate limit store (for testing/fallback)
 */
export declare class MemoryRateLimitStore implements RateLimitStore {
    private store;
    private options;
    constructor(options: RateLimitOptions);
    incr(key: string): Promise<RateLimitInfo>;
    decrement(key: string): Promise<void>;
    resetKey(key: string): Promise<void>;
}
/**
 * Rate limiter service
 */
export declare class RateLimiterService {
    private defaultOptions;
    /**
     * Create rate limiter middleware
     */
    createLimiter(options?: Partial<RateLimitOptions>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Global rate limiter (per IP)
     */
    globalLimiter(options?: Partial<RateLimitOptions>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * API rate limiter (per API key or user)
     */
    apiLimiter(options?: Partial<RateLimitOptions>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Authentication rate limiter (login attempts)
     */
    authLimiter(options?: Partial<RateLimitOptions>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Expensive operation rate limiter
     */
    expensiveLimiter(options?: Partial<RateLimitOptions>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Create Redis store
     */
    static createRedisStore(redis: Redis, options: RateLimitOptions): RedisRateLimitStore;
    /**
     * Create memory store
     */
    static createMemoryStore(options: RateLimitOptions): MemoryRateLimitStore;
}
export declare const rateLimiter: RateLimiterService;
export declare function createRateLimiter(options?: Partial<RateLimitOptions>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function globalRateLimiter(options?: Partial<RateLimitOptions>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function apiRateLimiter(options?: Partial<RateLimitOptions>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function authRateLimiter(options?: Partial<RateLimitOptions>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function expensiveRateLimiter(options?: Partial<RateLimitOptions>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=rate-limiter.d.ts.map