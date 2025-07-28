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
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@/shared/logger';
import { configManager } from '@/config';

// Types and Interfaces
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
  // Basic configuration
  enabled?: boolean;
  skipPaths?: string[];
  skipMethods?: string[];
  
  // Request/Response logging
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  logHeaders?: boolean;
  logQuery?: boolean;
  
  // Payload limits
  maxBodySize?: number;
  maxHeaderSize?: number;
  
  // Performance monitoring
  slowRequestThreshold?: number;
  enableMetrics?: boolean;
  
  // Security and compliance
  enableSecurityLogging?: boolean;
  enableAuditTrail?: boolean;
  maskSensitiveData?: boolean;
  sensitiveFields?: string[];
  
  // Filtering and sampling
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  samplingRate?: number;
  
  // Integration
  enableTracing?: boolean;
  enableCorrelation?: boolean;
  
  // Custom handlers
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

// Default configuration
const defaultOptions: RequestLoggerOptions = {
  enabled: true,
  skipPaths: ['/health', '/metrics', '/favicon.ico'],
  skipMethods: ['OPTIONS'],
  logRequestBody: true,
  logResponseBody: false,
  logHeaders: true,
  logQuery: true,
  maxBodySize: 10000, // 10KB
  maxHeaderSize: 2000, // 2KB
  slowRequestThreshold: 1000, // 1 second
  enableMetrics: true,
  enableSecurityLogging: true,
  enableAuditTrail: true,
  maskSensitiveData: true,
  sensitiveFields: ['password', 'token', 'authorization', 'cookie', 'x-api-key'],
  logLevel: 'info',
  samplingRate: 1.0, // Log 100% by default
  enableTracing: true,
  enableCorrelation: true
};

/**
 * Request Logger Service
 * Handles all request logging logic with enterprise-grade features
 */
export class RequestLoggerService {
  private logger: Logger;
  private options: RequestLoggerOptions;
  private metrics: RequestMetrics;
  private isEnabled: boolean;
  private startTime: number;

  constructor(options: RequestLoggerOptions = {}) {
    this.logger = new Logger('RequestLogger');
    this.options = { ...defaultOptions, ...options };
    this.isEnabled = this.options.enabled ?? true;
    this.startTime = Date.now();
    
    this.metrics = {
      totalRequests: 0,
      requestsByMethod: {},
      requestsByStatus: {},
      averageResponseTime: 0,
      slowRequests: 0,
      errorRate: 0,
      requestsPerSecond: 0,
      lastResetTime: Date.now()
    };
  }

  /**
   * Check if request should be logged
   */
  public shouldLogRequest(req: Request): boolean {
    if (!this.isEnabled) return false;

    // Check skip paths
    if (this.options.skipPaths?.some(path => req.path.includes(path))) {
      return false;
    }

    // Check skip methods
    if (this.options.skipMethods?.includes(req.method)) {
      return false;
    }

    // Check sampling rate
    if (this.options.samplingRate && Math.random() > this.options.samplingRate) {
      return false;
    }

    return true;
  }

  /**
   * Mask sensitive data in objects
   */
  private maskSensitiveData(data: any): any {
    if (!this.options.maskSensitiveData || !data || typeof data !== 'object') {
      return data;
    }

    const masked = Array.isArray(data) ? [...data] : { ...data };
    const sensitiveFields = this.options.sensitiveFields || [];

    for (const [key, value] of Object.entries(masked)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
        masked[key] = '[MASKED]';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskSensitiveData(value);
      }
    }

    return masked;
  }

  /**
   * Truncate large payloads
   */
  private truncatePayload(data: any, maxSize: number): any {
    if (!data) return data;

    const jsonString = JSON.stringify(data);
    if (jsonString.length <= maxSize) {
      return data;
    }

    const truncated = jsonString.substring(0, maxSize);
    try {
      return JSON.parse(truncated + '"}');
    } catch {
      return { 
        _truncated: true, 
        _originalSize: jsonString.length,
        _preview: truncated 
      };
    }
  }

  /**
   * Extract request context
   */
  public extractRequestContext(req: Request): RequestLogContext {
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    const correlationId = req.headers['x-correlation-id'] as string;
    const traceId = req.headers['x-trace-id'] as string;

    // Attach request ID to request for downstream use
    (req as any).requestId = requestId;

    const context: RequestLogContext = {
      requestId,
      correlationId,
      traceId,
      userId: (req as any).user?.userId,
      sessionId: (req as any).user?.sessionId,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      method: req.method,
      url: req.originalUrl || req.url,
      startTime: Date.now()
    };

    // Add headers if enabled
    if (this.options.logHeaders) {
      const headers = { ...req.headers };
      context.headers = this.maskSensitiveData(
        this.truncatePayload(headers, this.options.maxHeaderSize!)
      );
    }

    // Add query parameters if enabled
    if (this.options.logQuery && Object.keys(req.query).length > 0) {
      context.query = this.maskSensitiveData(req.query);
    }

    // Add request body if enabled
    if (this.options.logRequestBody && req.body) {
      context.body = this.maskSensitiveData(
        this.truncatePayload(req.body, this.options.maxBodySize!)
      );
    }

    return context;
  }

  /**
   * Update metrics
   */
  private updateMetrics(context: RequestLogContext): void {
    if (!this.options.enableMetrics) return;

    this.metrics.totalRequests++;
    
    // Update method stats
    this.metrics.requestsByMethod[context.method] = 
      (this.metrics.requestsByMethod[context.method] || 0) + 1;
    
    // Update status stats
    if (context.statusCode) {
      this.metrics.requestsByStatus[context.statusCode] = 
        (this.metrics.requestsByStatus[context.statusCode] || 0) + 1;
    }

    // Update response time stats
    if (context.duration) {
      const currentAvg = this.metrics.averageResponseTime;
      const total = this.metrics.totalRequests;
      this.metrics.averageResponseTime = 
        (currentAvg * (total - 1) + context.duration) / total;

      // Check for slow requests
      if (context.duration > this.options.slowRequestThreshold!) {
        this.metrics.slowRequests++;
      }
    }

    // Calculate error rate
    const errorRequests = Object.entries(this.metrics.requestsByStatus)
      .filter(([status]) => parseInt(status) >= 400)
      .reduce((sum, [, count]) => sum + count, 0);
    
    this.metrics.errorRate = (errorRequests / this.metrics.totalRequests) * 100;

    // Calculate requests per second
    const timeElapsed = (Date.now() - this.metrics.lastResetTime) / 1000;
    this.metrics.requestsPerSecond = this.metrics.totalRequests / timeElapsed;
  }

  /**
   * Log request start
   */
  public logRequestStart(context: RequestLogContext): void {
    const logContext: any = {
      requestId: context.requestId
    };
    
    // Only add defined values
    if (context.correlationId) logContext.correlationId = context.correlationId;
    if (context.traceId) logContext.traceId = context.traceId;
    if (context.userId) logContext.userId = context.userId;
    if (context.sessionId) logContext.sessionId = context.sessionId;

    this.logger.child(logContext).info(`Request started: ${context.method} ${context.url}`, {
      method: context.method,
      url: context.url,
      ip: context.ip,
      userAgent: context.userAgent,
      headers: context.headers,
      query: context.query,
      body: context.body,
      timestamp: new Date(context.startTime).toISOString(),
      type: 'request_start'
    });

    // Custom handler
    if (this.options.onRequest) {
      try {
        this.options.onRequest(context);
      } catch (error) {
        this.logger.error('Error in custom request handler', error);
      }
    }
  }

  /**
   * Log request completion
   */
  public logRequestEnd(context: RequestLogContext, res: Response): void {
    context.endTime = Date.now();
    context.duration = context.endTime - context.startTime;
    context.statusCode = res.statusCode;
    context.responseSize = parseInt(res.get('Content-Length') || '0', 10);

    const logContext: any = {
      requestId: context.requestId
    };
    
    // Only add defined values
    if (context.correlationId) logContext.correlationId = context.correlationId;
    if (context.traceId) logContext.traceId = context.traceId;
    if (context.userId) logContext.userId = context.userId;
    if (context.sessionId) logContext.sessionId = context.sessionId;

    const logLevel = context.statusCode >= 400 ? 'warn' : 'info';
    const message = `Request completed: ${context.method} ${context.url} ${context.statusCode}`;

    const logData: any = {
      method: context.method,
      url: context.url,
      statusCode: context.statusCode,
      duration: context.duration,
      responseSize: context.responseSize,
      ip: context.ip,
      userAgent: context.userAgent,
      timestamp: new Date(context.endTime).toISOString(),
      type: 'request_end'
    };

    // Add response body if enabled
    if (this.options.logResponseBody && res.locals.body) {
      logData.responseBody = this.maskSensitiveData(
        this.truncatePayload(res.locals.body, this.options.maxBodySize!)
      );
    }

    // Security logging for suspicious requests
    if (this.options.enableSecurityLogging) {
      this.logSecurityEvents(context);
    }

    // Audit trail logging
    if (this.options.enableAuditTrail) {
      this.logAuditEvent(context);
    }

    this.logger.child(logContext)[logLevel](message, logData);

    // Update metrics
    this.updateMetrics(context);

    // Custom handler
    if (this.options.onResponse) {
      try {
        this.options.onResponse(context);
      } catch (error) {
        this.logger.error('Error in custom response handler', error);
      }
    }
  }

  /**
   * Log request error
   */
  public logRequestError(context: RequestLogContext, error: any): void {
    context.endTime = Date.now();
    context.duration = context.endTime - context.startTime;
    context.error = error;

    const logContext: any = {
      requestId: context.requestId
    };
    
    // Only add defined values
    if (context.correlationId) logContext.correlationId = context.correlationId;
    if (context.traceId) logContext.traceId = context.traceId;
    if (context.userId) logContext.userId = context.userId;
    if (context.sessionId) logContext.sessionId = context.sessionId;

    this.logger.child(logContext).error(`Request error: ${context.method} ${context.url}`, {
      method: context.method,
      url: context.url,
      duration: context.duration,
      ip: context.ip,
      userAgent: context.userAgent,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date(context.endTime).toISOString(),
      type: 'request_error'
    });

    // Security logging for errors
    if (this.options.enableSecurityLogging) {
      this.logSecurityEvents(context, error);
    }

    // Custom handler
    if (this.options.onError) {
      try {
        this.options.onError(context, error);
      } catch (handlerError) {
        this.logger.error('Error in custom error handler', handlerError);
      }
    }
  }

  /**
   * Log security events
   */
  private logSecurityEvents(context: RequestLogContext, error?: any): void {
    const suspiciousPatterns = [
      /\.\.\//,  // Path traversal
      /script|javascript|vbscript/i,  // XSS
      /union|select|insert|update|delete|drop/i,  // SQL injection
      /\x00/,  // Null bytes
    ];

    const url = context.url || '';
    const body = JSON.stringify(context.body || {});
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url) || pattern.test(body)) {
        this.logger.logSecurityEvent(
          'Suspicious request pattern detected',
          'medium',
          {
            requestId: context.requestId,
            pattern: pattern.toString(),
            url: context.url,
            ip: context.ip,
            userAgent: context.userAgent,
            type: 'security_alert'
          }
        );
        break;
      }
    }

    // Log failed authentication attempts
    if (context.statusCode === 401 || error?.name === 'AuthenticationError') {
      this.logger.logSecurityEvent(
        'Authentication failure',
        'medium',
        {
          requestId: context.requestId,
          url: context.url,
          ip: context.ip,
          userAgent: context.userAgent,
          type: 'auth_failure'
        }
      );
    }

    // Log access denied events
    if (context.statusCode === 403 || error?.name === 'AuthorizationError') {
      this.logger.logSecurityEvent(
        'Access denied',
        'medium',
        {
          requestId: context.requestId,
          url: context.url,
          ip: context.ip,
          userId: context.userId,
          type: 'access_denied'
        }
      );
    }
  }

  /**
   * Log audit events for compliance
   */
  private logAuditEvent(context: RequestLogContext): void {
    // Log data access events
    if (context.method === 'GET' && context.url.includes('/api/')) {
      this.logger.info('Data access event', {
        requestId: context.requestId,
        userId: context.userId,
        resource: context.url,
        action: 'read',
        ip: context.ip,
        timestamp: new Date().toISOString(),
        type: 'audit_trail'
      });
    }

    // Log data modification events
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(context.method)) {
      this.logger.info('Data modification event', {
        requestId: context.requestId,
        userId: context.userId,
        resource: context.url,
        action: context.method.toLowerCase(),
        ip: context.ip,
        timestamp: new Date().toISOString(),
        type: 'audit_trail'
      });
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics(): RequestMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      requestsByMethod: {},
      requestsByStatus: {},
      averageResponseTime: 0,
      slowRequests: 0,
      errorRate: 0,
      requestsPerSecond: 0,
      lastResetTime: Date.now()
    };
  }

  /**
   * Enable/disable logging
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Update options
   */
  public updateOptions(options: Partial<RequestLoggerOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

// Global service instance
export const requestLoggerService = new RequestLoggerService();

/**
 * Request logger middleware factory
 */
export function createRequestLogger(options: RequestLoggerOptions = {}) {
  const service = new RequestLoggerService(options);

  return (req: Request, res: Response, next: NextFunction) => {
    // Check if request should be logged
    if (!service.shouldLogRequest(req)) {
      return next();
    }

    // Extract request context
    const context = service.extractRequestContext(req);

    // Set request ID header
    res.setHeader('X-Request-ID', context.requestId);

    // Log request start
    service.logRequestStart(context);

    // Store context in request for downstream use
    (req as any).logContext = context;

    // Capture response body if enabled
    if (options.logResponseBody) {
      const originalSend = res.send;
      res.send = function(body: any) {
        res.locals.body = body;
        return originalSend.call(this, body);
      };
    }

    // Handle response completion
    const cleanup = () => {
      service.logRequestEnd(context, res);
    };

    // Handle errors
    const errorHandler = (error: any) => {
      service.logRequestError(context, error);
    };

    // Set up event listeners
    res.on('finish', cleanup);
    res.on('close', cleanup);
    res.on('error', errorHandler);

    // Continue to next middleware
    next();
  };
}

/**
 * Health check endpoint for monitoring
 */
export function createHealthCheckEndpoint() {
  return (req: Request, res: Response) => {
    const metrics = requestLoggerService.getMetrics();
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime)}s`,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      requests: {
        total: metrics.totalRequests,
        requestsPerSecond: Math.round(metrics.requestsPerSecond * 100) / 100,
        averageResponseTime: Math.round(metrics.averageResponseTime * 100) / 100,
        errorRate: Math.round(metrics.errorRate * 100) / 100,
        slowRequests: metrics.slowRequests
      }
    };

    res.json(healthData);
  };
}

/**
 * Metrics endpoint for monitoring
 */
export function createMetricsEndpoint() {
  return (req: Request, res: Response) => {
    const metrics = requestLoggerService.getMetrics();
    res.json(metrics);
  };
}

/**
 * Pre-configured request loggers
 */
export const requestLoggers = {
  // Production logger with full features
  production: createRequestLogger({
    logRequestBody: false,
    logResponseBody: false,
    logHeaders: false,
    enableMetrics: true,
    enableSecurityLogging: true,
    enableAuditTrail: true,
    slowRequestThreshold: 500
  }),

  // Development logger with verbose output
  development: createRequestLogger({
    logRequestBody: true,
    logResponseBody: true,
    logHeaders: true,
    enableMetrics: true,
    enableSecurityLogging: true,
    enableAuditTrail: false,
    logLevel: 'debug'
  }),

  // Minimal logger for high-traffic scenarios
  minimal: createRequestLogger({
    logRequestBody: false,
    logResponseBody: false,
    logHeaders: false,
    enableMetrics: true,
    enableSecurityLogging: false,
    enableAuditTrail: false,
    samplingRate: 0.1 // Only log 10% of requests
  }),

  // Security-focused logger
  security: createRequestLogger({
    logRequestBody: true,
    logResponseBody: false,
    enableSecurityLogging: true,
    enableAuditTrail: true,
    maskSensitiveData: true,
    sensitiveFields: [
      'password', 'token', 'authorization', 'cookie', 'x-api-key',
      'secret', 'private', 'credentials', 'auth', 'session'
    ]
  })
};

// Export service and utilities
export default requestLoggerService;
