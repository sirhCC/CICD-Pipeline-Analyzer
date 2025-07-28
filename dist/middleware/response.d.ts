/**
 * API Response Middleware
 * Automatically wraps responses in standard format and adds metadata
 */
import { Request, Response, NextFunction } from 'express';
export interface ResponseEnhancement {
    startTime: number;
    queries?: number;
    cacheHits?: number;
    cacheMisses?: number;
}
declare global {
    namespace Express {
        interface Request {
            responseEnhancement?: ResponseEnhancement;
            apiVersion?: string;
            requestedVersion?: string | undefined;
        }
        interface Response {
            apiSuccess<T>(data: T, meta?: any): void;
            apiError(error: any, statusCode?: number): void;
            apiCreated<T>(data: T): void;
            apiNoContent(): void;
            apiNotFound(resource: string, id?: string): void;
            apiValidationError(message: string, details?: any, field?: string): void;
            apiUnauthorized(message?: string): void;
            apiForbidden(message?: string): void;
            apiRateLimited(retryAfter?: number): void;
            apiInternalError(message?: string, details?: any): void;
        }
    }
}
/**
 * Extract and validate API version from request
 */
export declare function extractApiVersion(req: Request, res: Response, next: NextFunction): void;
/**
 * Initialize response enhancement tracking
 */
export declare function initializeResponseTracking(req: Request, res: Response, next: NextFunction): void;
/**
 * Add API response helper methods to Express Response
 */
export declare function addResponseHelpers(req: Request, res: Response, next: NextFunction): void;
/**
 * Error response handler - catches errors and formats them
 */
export declare function errorResponseHandler(error: any, req: Request, res: Response, next: NextFunction): void;
/**
 * Not found handler - for unmatched routes
 */
export declare function notFoundHandler(req: Request, res: Response): void;
/**
 * Track database queries for performance metrics
 */
export declare function trackDatabaseQuery(req: Request): void;
/**
 * Track cache hits/misses for performance metrics
 */
export declare function trackCacheHit(req: Request, isHit: boolean): void;
/**
 * Complete response middleware setup
 */
export declare const responseMiddleware: (typeof extractApiVersion)[];
export default responseMiddleware;
//# sourceMappingURL=response.d.ts.map