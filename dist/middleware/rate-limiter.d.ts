/**
 * Rate Limiter Middleware
 */
import type { Request, Response, NextFunction } from 'express';
export declare class RateLimiter {
    private static logger;
    static middleware(): (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=rate-limiter.d.ts.map