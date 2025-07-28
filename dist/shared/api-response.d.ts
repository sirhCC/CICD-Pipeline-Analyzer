/**
 * Standard API Response Types and Utilities
 * Ensures consistent response format across all endpoints
 */
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
    stack?: string;
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
    executionTime: number;
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
    errors?: Array<{
        index: number;
        error: ApiError;
    }>;
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
export declare enum HttpStatus {
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
    GATEWAY_TIMEOUT = 504
}
export declare enum ErrorCode {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
    NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
    CONFLICT_ERROR = "CONFLICT_ERROR",
    RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR"
}
/**
 * Response Builder Utility Class
 */
export declare class ResponseBuilder {
    private static readonly API_VERSION;
    /**
     * Create a successful response
     */
    static success<T>(data: T, meta?: ResponseMeta, requestId?: string): ApiResponse<T>;
    /**
     * Create an error response
     */
    static error(error: ApiError, meta?: ResponseMeta, requestId?: string): ApiResponse;
    /**
     * Create a paginated list response
     */
    static list<T>(items: T[], pagination: PaginationMeta, performance?: PerformanceMeta, requestId?: string): ApiResponse<ListResponse<T>>;
    /**
     * Create a creation response
     */
    static created<T>(item: T, requestId?: string): ApiResponse<CreateResponse<T>>;
    /**
     * Create an update response
     */
    static updated<T>(item: T, changes?: Partial<T>, requestId?: string): ApiResponse<UpdateResponse<T>>;
    /**
     * Create a deletion response
     */
    static deleted(id: string, requestId?: string): ApiResponse<DeleteResponse>;
    /**
     * Create a no content response (204)
     */
    static noContent(requestId?: string): ApiResponse<null>;
    /**
     * Create a health check response
     */
    static health(status: 'healthy' | 'unhealthy' | 'degraded', checks: HealthCheck[], uptime: number, requestId?: string): ApiResponse<HealthResponse>;
    /**
     * Create bulk operation response
     */
    static bulk<T>(items: T[], successful: number, failed: number, errors?: Array<{
        index: number;
        error: ApiError;
    }>, requestId?: string): ApiResponse<BulkResponse<T>>;
    /**
     * Create validation error response
     */
    static validationError(message: string, details?: any, field?: string, requestId?: string): ApiResponse;
    /**
     * Create not found error response
     */
    static notFound(resource: string, id?: string, requestId?: string): ApiResponse;
    /**
     * Create unauthorized error response
     */
    static unauthorized(message?: string, requestId?: string): ApiResponse;
    /**
     * Create forbidden error response
     */
    static forbidden(message?: string, requestId?: string): ApiResponse;
    /**
     * Create rate limit error response
     */
    static rateLimited(retryAfter?: number, requestId?: string): ApiResponse;
    /**
     * Create internal server error response
     */
    static internalError(message?: string, details?: any, stack?: string, requestId?: string): ApiResponse;
}
/**
 * Calculate pagination metadata
 */
export declare function calculatePagination(page: number, limit: number, total: number): PaginationMeta;
/**
 * Extract request ID from request headers
 */
export declare function getRequestId(req: any): string | undefined;
//# sourceMappingURL=api-response.d.ts.map