/**
 * Enterprise-grade Request Logger Middleware
 *
 * Features:
 * - Structured request/response logging with correlation IDs
 * - Performance monitoring and metrics collection
 * - Security event logging and audit trails
 * - Request/response payload logging (configurable)
 * - Rate limiting and anomaly detection integration
 * - Health check and monitoring endpoint support
 * - Configurable log levels and filtering
 * - Integration with external monitoring systems
 * - Request tracing and distributed logging support
 * - Compliance and audit logging (GDPR, SOC2, etc.)
 *
 * @author sirhCC
 * @version 1.0.0
 */
import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
export interface RequestLogContext {
    requestId: string;
    userId?: string | undefined;
    sessionId?: string | undefined;
    userAgent?: string | undefined;
    ip: string;
    method: string;
    url: string;
    headers?: Record<string, string> | undefined;
    query?: Record<string, any> | undefined;
    body?: any;
    startTime: number;
    endTime?: number | undefined;
    duration?: number | undefined;
    statusCode?: number | undefined;
    responseSize?: number | undefined;
    error?: any;
    tags?: string[] | undefined;
    correlationId?: string | undefined;
    traceId?: string | undefined;
}
export interface RequestLoggerOptions {
    enabled?: boolean;
    skipPaths?: string[];
    skipMethods?: string[];
    logRequestBody?: boolean;
    logResponseBody?: boolean;
    logHeaders?: boolean;
    logQuery?: boolean;
    maxBodySize?: number;
    maxHeaderSize?: number;
    slowRequestThreshold?: number;
    enableMetrics?: boolean;
    enableSecurityLogging?: boolean;
    enableAuditTrail?: boolean;
    maskSensitiveData?: boolean;
    sensitiveFields?: string[];
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    samplingRate?: number;
    enableTracing?: boolean;
    enableCorrelation?: boolean;
    onRequest?: (context: RequestLogContext) => void;
    onResponse?: (context: RequestLogContext) => void;
    onError?: (context: RequestLogContext, error: any) => void;
}
export interface RequestMetrics {
    totalRequests: number;
    requestsByMethod: Record<string, number>;
    requestsByStatus: Record<number, number>;
    averageResponseTime: number;
    slowRequests: number;
    errorRate: number;
    requestsPerSecond: number;
    lastResetTime: number;
}
/**
 * Request Logger Service
 * Handles all request logging logic with enterprise-grade features
 */
export declare class RequestLoggerService {
    private logger;
    private options;
    private metrics;
    private isEnabled;
    private startTime;
    private promRegistry;
    private promHttpRequestsTotal;
    private promHttpRequestDuration;
    private promHttpRequestsInFlight;
    constructor(options?: RequestLoggerOptions);
    /**
     * Check if request should be logged
     */
    shouldLogRequest(req: Request): boolean;
    /**
     * Mask sensitive data in objects
     */
    private maskSensitiveData;
    /**
     * Truncate large payloads
     */
    private truncatePayload;
    /**
     * Extract request context
     */
    extractRequestContext(req: Request): RequestLogContext;
    /**
     * Update metrics
     */
    private updateMetrics;
    /**
     * Log request start
     */
    logRequestStart(context: RequestLogContext): void;
    /**
     * Log request completion
     */
    logRequestEnd(context: RequestLogContext, res: Response): void;
    /**
     * Log request error
     */
    logRequestError(context: RequestLogContext, error: any): void;
    /**
     * Log security events
     */
    private logSecurityEvents;
    /**
     * Log audit events for compliance
     */
    private logAuditEvent;
    /**
     * Get current metrics
     */
    getMetrics(): RequestMetrics;
    /**
     * Reset metrics
     */
    resetMetrics(): void;
    /**
     * Enable/disable logging
     */
    setEnabled(enabled: boolean): void;
    /**
     * Update options
     */
    updateOptions(options: Partial<RequestLoggerOptions>): void;
    /**
     * Expose Prometheus registry (read-only usage)
     */
    getPrometheusRegistry(): client.Registry;
}
export declare const requestLoggerService: RequestLoggerService;
/**
 * Request logger middleware factory
 */
export declare function createRequestLogger(options?: RequestLoggerOptions): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Health check endpoint for monitoring
 */
export declare function createHealthCheckEndpoint(): (req: Request, res: Response) => void;
/**
 * Metrics endpoint for monitoring
 */
export declare function createMetricsEndpoint(): (req: Request, res: Response) => void;
export declare function getPrometheusRegister(): client.Registry<"text/plain; version=0.0.4; charset=utf-8">;
/**
 * Pre-configured request loggers
 */
export declare const requestLoggers: {
    production: (req: Request, res: Response, next: NextFunction) => void;
    development: (req: Request, res: Response, next: NextFunction) => void;
    minimal: (req: Request, res: Response, next: NextFunction) => void;
    security: (req: Request, res: Response, next: NextFunction) => void;
};
export default requestLoggerService;
//# sourceMappingURL=request-logger.d.ts.map