/**
 * Standard API Response Types and Utilities
 * Ensures consistent response format across all endpoints
 */

import { apiVersionManager } from '../config/versioning';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
  timestamp: string;
  requestId?: string;
  version: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  stack?: string; // Only in development
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
  performance?: PerformanceMeta;
  warnings?: string[];
  deprecations?: string[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PerformanceMeta {
  executionTime: number; // milliseconds
  queries?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

export interface ListResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface CreateResponse<T> {
  item: T;
  created: boolean;
}

export interface UpdateResponse<T> {
  item: T;
  updated: boolean;
  changes?: Partial<T>;
}

export interface DeleteResponse {
  deleted: boolean;
  id: string;
}

export interface BulkResponse<T> {
  items: T[];
  successful: number;
  failed: number;
  errors?: Array<{ index: number; error: ApiError }>;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  details?: any;
}

// Standard HTTP status codes used in responses
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

// Standard error codes
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

/**
 * Response Builder Utility Class
 */
export class ResponseBuilder {
  /**
   * Create a successful response
   */
  static success<T>(
    data: T,
    meta?: ResponseMeta,
    requestId?: string,
    version?: string
  ): ApiResponse<T> {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      version: version || apiVersionManager.getCurrentVersion(),
    };

    if (meta) response.meta = meta;
    if (requestId) response.requestId = requestId;

    return response;
  }

  /**
   * Create an error response
   */
  static error(
    error: ApiError,
    meta?: ResponseMeta,
    requestId?: string,
    version?: string
  ): ApiResponse {
    const response: ApiResponse = {
      success: false,
      error,
      timestamp: new Date().toISOString(),
      version: version || apiVersionManager.getCurrentVersion(),
    };

    if (meta) response.meta = meta;
    if (requestId) response.requestId = requestId;

    return response;
  }

  /**
   * Create a paginated list response
   */
  static list<T>(
    items: T[],
    pagination: PaginationMeta,
    performance?: PerformanceMeta,
    requestId?: string,
    version?: string
  ): ApiResponse<ListResponse<T>> {
    const meta: ResponseMeta = { pagination };
    if (performance) meta.performance = performance;
    
    return this.success(
      { items, pagination },
      meta,
      requestId,
      version
    );
  }

  /**
   * Create a creation response
   */
  static created<T>(
    item: T,
    requestId?: string,
    version?: string
  ): ApiResponse<CreateResponse<T>> {
    return this.success(
      { item, created: true },
      undefined,
      requestId,
      version
    );
  }

  /**
   * Create an update response
   */
  static updated<T>(
    item: T,
    changes?: Partial<T>,
    requestId?: string,
    version?: string
  ): ApiResponse<UpdateResponse<T>> {
    const data: UpdateResponse<T> = { item, updated: true };
    if (changes) data.changes = changes;
    
    return this.success(data, undefined, requestId, version);
  }

  /**
   * Create a deletion response
   */
  static deleted(
    id: string,
    requestId?: string,
    version?: string
  ): ApiResponse<DeleteResponse> {
    return this.success(
      { deleted: true, id },
      undefined,
      requestId,
      version
    );
  }

  /**
   * Create a no content response (204)
   */
  static noContent(requestId?: string, version?: string): ApiResponse<null> {
    return this.success(null, undefined, requestId, version);
  }

  /**
   * Create a health check response
   */
  static health(
    status: 'healthy' | 'unhealthy' | 'degraded',
    checks: HealthCheck[],
    uptime: number,
    requestId?: string,
    version?: string
  ): ApiResponse<HealthResponse> {
    const apiVersion = version || apiVersionManager.getCurrentVersion();
    return this.success(
      {
        status,
        timestamp: new Date().toISOString(),
        version: apiVersion,
        uptime,
        checks,
      },
      undefined,
      requestId,
      apiVersion
    );
  }

  /**
   * Create bulk operation response
   */
  static bulk<T>(
    items: T[],
    successful: number,
    failed: number,
    errors?: Array<{ index: number; error: ApiError }>,
    requestId?: string,
    version?: string
  ): ApiResponse<BulkResponse<T>> {
    const data: BulkResponse<T> = { items, successful, failed };
    if (errors) data.errors = errors;
    
    return this.success(data, undefined, requestId, version);
  }

  /**
   * Create validation error response
   */
  static validationError(
    message: string,
    details?: any,
    field?: string,
    requestId?: string,
    version?: string
  ): ApiResponse {
    const error: ApiError = {
      code: ErrorCode.VALIDATION_ERROR,
      message,
    };
    
    if (details) error.details = details;
    if (field) error.field = field;
    
    return this.error(error, undefined, requestId, version);
  }

  /**
   * Create not found error response
   */
  static notFound(
    resource: string,
    id?: string,
    requestId?: string,
    version?: string
  ): ApiResponse {
    return this.error(
      {
        code: ErrorCode.NOT_FOUND_ERROR,
        message: `${resource}${id ? ` with id '${id}'` : ''} not found`,
        details: { resource, id },
      },
      undefined,
      requestId,
      version
    );
  }

  /**
   * Create unauthorized error response
   */
  static unauthorized(
    message = 'Authentication required',
    requestId?: string,
    version?: string
  ): ApiResponse {
    return this.error(
      {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message,
      },
      undefined,
      requestId,
      version
    );
  }

  /**
   * Create forbidden error response
   */
  static forbidden(
    message = 'Access denied',
    requestId?: string,
    version?: string
  ): ApiResponse {
    return this.error(
      {
        code: ErrorCode.AUTHORIZATION_ERROR,
        message,
      },
      undefined,
      requestId,
      version
    );
  }

  /**
   * Create rate limit error response
   */
  static rateLimited(
    retryAfter?: number,
    requestId?: string,
    version?: string
  ): ApiResponse {
    return this.error(
      {
        code: ErrorCode.RATE_LIMIT_ERROR,
        message: 'Rate limit exceeded',
        details: { retryAfter },
      },
      undefined,
      requestId,
      version
    );
  }

  /**
   * Create internal server error response
   */
  static internalError(
    message = 'Internal server error',
    details?: any,
    stack?: string,
    requestId?: string,
    version?: string
  ): ApiResponse {
    const error: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message,
      details,
    };

    // Only include stack trace in development
    if (process.env.NODE_ENV === 'development' && stack) {
      error.stack = stack;
    }

    return this.error(error, undefined, requestId, version);
  }
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Extract request ID from request headers
 */
export function getRequestId(req: any): string | undefined {
  return req.headers['x-request-id'] || req.id || undefined;
}
