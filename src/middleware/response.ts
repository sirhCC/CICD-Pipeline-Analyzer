/**
 * API Response Middleware
 * Automatically wraps responses in standard format and adds metadata
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ResponseBuilder, PerformanceMeta, getRequestId } from '../shared/api-response';
import { Logger } from '../shared/logger';

const logger = new Logger('ResponseMiddleware');

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
 * Initialize response enhancement tracking
 */
export function initializeResponseTracking(req: Request, res: Response, next: NextFunction): void {
  req.responseEnhancement = {
    startTime: Date.now(),
    queries: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  // Track performance metrics
  const originalJson = res.json;
  res.json = function(body: any) {
    if (req.responseEnhancement) {
      const executionTime = Date.now() - req.responseEnhancement.startTime;
      
      // Add performance metadata if response has meta object
      if (body && typeof body === 'object' && body.meta) {
        body.meta.performance = {
          executionTime,
          queries: req.responseEnhancement.queries,
          cacheHits: req.responseEnhancement.cacheHits,
          cacheMisses: req.responseEnhancement.cacheMisses,
        } as PerformanceMeta;
      }
    }

    return originalJson.call(this, body);
  };

  next();
}

/**
 * Add API response helper methods to Express Response
 */
export function addResponseHelpers(req: Request, res: Response, next: NextFunction): void {
  const requestId = getRequestId(req);

  // Success response
  res.apiSuccess = function<T>(data: T, meta?: any) {
    const response = ResponseBuilder.success(data, meta, requestId);
    return this.status(200).json(response);
  };

  // Error response
  res.apiError = function(error: any, statusCode = 500) {
    let response: ApiResponse;
    
    if (error?.code && error?.message) {
      // Already formatted error
      response = ResponseBuilder.error(error, undefined, requestId);
    } else if (error instanceof Error) {
      // Standard error object
      response = ResponseBuilder.internalError(
        error.message,
        undefined,
        process.env.NODE_ENV === 'development' ? error.stack : undefined,
        requestId
      );
    } else {
      // Unknown error format
      response = ResponseBuilder.internalError(
        typeof error === 'string' ? error : 'Unknown error',
        error,
        undefined,
        requestId
      );
    }

    return this.status(statusCode).json(response);
  };

  // Created response (201)
  res.apiCreated = function<T>(data: T) {
    const response = ResponseBuilder.created(data, requestId);
    return this.status(201).json(response);
  };

  // No content response (204)
  res.apiNoContent = function() {
    const response = ResponseBuilder.noContent(requestId);
    return this.status(204).json(response);
  };

  // Not found response (404)
  res.apiNotFound = function(resource: string, id?: string) {
    const response = ResponseBuilder.notFound(resource, id, requestId);
    return this.status(404).json(response);
  };

  // Validation error response (422)
  res.apiValidationError = function(message: string, details?: any, field?: string) {
    const response = ResponseBuilder.validationError(message, details, field, requestId);
    return this.status(422).json(response);
  };

  // Unauthorized response (401)
  res.apiUnauthorized = function(message?: string) {
    const response = ResponseBuilder.unauthorized(message, requestId);
    return this.status(401).json(response);
  };

  // Forbidden response (403)
  res.apiForbidden = function(message?: string) {
    const response = ResponseBuilder.forbidden(message, requestId);
    return this.status(403).json(response);
  };

  // Rate limited response (429)
  res.apiRateLimited = function(retryAfter?: number) {
    const response = ResponseBuilder.rateLimited(retryAfter, requestId);
    const headers: any = {};
    if (retryAfter) headers['Retry-After'] = retryAfter;
    return this.status(429).set(headers).json(response);
  };

  // Internal server error response (500)
  res.apiInternalError = function(message?: string, details?: any) {
    const response = ResponseBuilder.internalError(message, details, undefined, requestId);
    return this.status(500).json(response);
  };

  next();
}

/**
 * Error response handler - catches errors and formats them
 */
export function errorResponseHandler(error: any, req: Request, res: Response, next: NextFunction): void {
  const requestId = getRequestId(req);
  
  logger.error('Unhandled API error', {
    error: error.message,
    stack: error.stack,
    requestId,
    url: req.url,
    method: req.method,
    userId: (req as any).user?.userId,
  });

  // If response already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(error);
  }

  // Determine status code
  let statusCode = 500;
  if (error.status || error.statusCode) {
    statusCode = error.status || error.statusCode;
  }

  // Use helper method if available
  if (res.apiError) {
    return res.apiError(error, statusCode);
  }

  // Fallback response
  const response = ResponseBuilder.internalError(
    error.message || 'Internal server error',
    undefined,
    process.env.NODE_ENV === 'development' ? error.stack : undefined,
    requestId
  );

  res.status(statusCode).json(response);
}

/**
 * Not found handler - for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const response = ResponseBuilder.notFound('Route', req.originalUrl, getRequestId(req));
  res.status(404).json(response);
}

/**
 * Track database queries for performance metrics
 */
export function trackDatabaseQuery(req: Request): void {
  if (req.responseEnhancement) {
    req.responseEnhancement.queries = (req.responseEnhancement.queries || 0) + 1;
  }
}

/**
 * Track cache hits/misses for performance metrics
 */
export function trackCacheHit(req: Request, isHit: boolean): void {
  if (req.responseEnhancement) {
    if (isHit) {
      req.responseEnhancement.cacheHits = (req.responseEnhancement.cacheHits || 0) + 1;
    } else {
      req.responseEnhancement.cacheMisses = (req.responseEnhancement.cacheMisses || 0) + 1;
    }
  }
}

/**
 * Complete response middleware setup
 */
export const responseMiddleware = [
  initializeResponseTracking,
  addResponseHelpers,
];

export default responseMiddleware;
