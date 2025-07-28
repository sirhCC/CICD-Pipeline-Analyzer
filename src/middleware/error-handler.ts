/**
 * Global Error Handler Middleware
 * Enterprise-grade error handling with comprehensive logging and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../shared/logger';
import { configManager } from '../config';

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (code !== undefined) this.code = code;
    if (details !== undefined) this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Validation error class for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, true, 'VALIDATION_ERROR', details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND_ERROR');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, true, 'RATE_LIMIT_ERROR');
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Database error class
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 500, true, 'DATABASE_ERROR', {
      originalMessage: originalError?.message,
      originalStack: originalError?.stack,
    });
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * External service error class
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, statusCode: number = 502) {
    super(`External service error (${service}): ${message}`, statusCode, true, 'EXTERNAL_SERVICE_ERROR', {
      service,
    });
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId?: string;
    stack?: string;
  };
  success: false;
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const logger = new Logger('ErrorHandler');
  const isDevelopment = configManager.isDevelopment();
  const requestId = req.headers['x-request-id'] as string || 'unknown';

  // Log the error with context
  const errorContext = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString(),
  };

  // Handle different error types
  let statusCode: number;
  let message: string;
  let code: string | undefined;
  let details: Record<string, unknown> | undefined;

  if (error instanceof AppError) {
    // Our custom application errors
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    details = error.details;

    // Log based on severity
    if (error.statusCode >= 500) {
      logger.error('Application error (5xx)', error, errorContext);
    } else if (error.statusCode >= 400) {
      logger.warn('Client error (4xx)', { 
        message: error.message, 
        code: error.code,
        ...errorContext 
      });
    }
  } else if (error.name === 'ValidationError') {
    // Joi validation errors
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = { validationDetails: error.message };
    
    logger.warn('Validation error', { 
      validationError: error.message,
      ...errorContext 
    });
  } else if (error.name === 'CastError') {
    // Database casting errors (invalid ObjectId, etc.)
    statusCode = 400;
    message = 'Invalid data format';
    code = 'INVALID_DATA_FORMAT';
    
    logger.warn('Data format error', { 
      originalError: error.message,
      ...errorContext 
    });
  } else if (error.name === 'MongoError' || error.name === 'QueryFailedError') {
    // Database errors
    statusCode = 500;
    message = 'Database operation failed';
    code = 'DATABASE_ERROR';
    
    logger.error('Database error', error, errorContext);
  } else if (error.name === 'JsonWebTokenError') {
    // JWT errors
    statusCode = 401;
    message = 'Invalid authentication token';
    code = 'INVALID_TOKEN';
    
    logger.warn('JWT error', { 
      jwtError: error.message,
      ...errorContext 
    });
  } else if (error.name === 'TokenExpiredError') {
    // JWT expiration
    statusCode = 401;
    message = 'Authentication token has expired';
    code = 'TOKEN_EXPIRED';
    
    logger.warn('Token expired', { 
      tokenError: error.message,
      ...errorContext 
    });
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    // JSON parsing errors
    statusCode = 400;
    message = 'Invalid JSON format';
    code = 'INVALID_JSON';
    
    logger.warn('JSON syntax error', { 
      syntaxError: error.message,
      ...errorContext 
    });
  } else {
    // Unhandled errors
    statusCode = 500;
    message = isDevelopment ? error.message : 'Internal server error';
    code = 'INTERNAL_ERROR';
    
    logger.error('Unhandled error', error, errorContext);
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    error: {
      message,
      timestamp: new Date().toISOString(),
      requestId,
    },
    success: false,
  };

  // Add optional fields only if they exist
  if (code !== undefined) {
    errorResponse.error.code = code;
  }
  if (details !== undefined) {
    errorResponse.error.details = details;
  }

  // Include stack trace in development
  if (isDevelopment && error.stack) {
    errorResponse.error.stack = error.stack;
  }

  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  });

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors and pass them to error middleware
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`);
  next(error);
};

/**
 * Unhandled promise rejection handler
 */
export const handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
  const logger = new Logger('UnhandledRejection');
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString(),
  });
  
  // In production, we might want to gracefully shutdown
  if (configManager.isProduction()) {
    logger.error('Shutting down due to unhandled promise rejection');
    process.exit(1);
  }
};

/**
 * Uncaught exception handler
 */
export const handleUncaughtException = (error: Error): void => {
  const logger = new Logger('UncaughtException');
  logger.error('Uncaught exception', error);
  
  // Always exit on uncaught exceptions
  logger.error('Shutting down due to uncaught exception');
  process.exit(1);
};

export default errorHandler;
