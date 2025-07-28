"use strict";
/**
 * Global Error Handler Middleware
 * Enterprise-grade error handling with comprehensive logging and response formatting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUncaughtException = exports.handleUnhandledRejection = exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.ExternalServiceError = exports.DatabaseError = exports.RateLimitError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
const logger_1 = require("../shared/logger");
const config_1 = require("../config");
/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
    statusCode;
    isOperational;
    code;
    details;
    constructor(message, statusCode = 500, isOperational = true, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        if (code !== undefined)
            this.code = code;
        if (details !== undefined)
            this.details = details;
        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);
        // Set the prototype explicitly for proper instanceof checks
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
/**
 * Validation error class for input validation failures
 */
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, true, 'VALIDATION_ERROR', details);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
exports.ValidationError = ValidationError;
/**
 * Authentication error class
 */
class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, true, 'AUTHENTICATION_ERROR');
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Authorization error class
 */
class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, true, 'AUTHORIZATION_ERROR');
        Object.setPrototypeOf(this, AuthorizationError.prototype);
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Not found error class
 */
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, true, 'NOT_FOUND_ERROR');
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Rate limit error class
 */
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, true, 'RATE_LIMIT_ERROR');
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}
exports.RateLimitError = RateLimitError;
/**
 * Database error class
 */
class DatabaseError extends AppError {
    constructor(message, originalError) {
        super(message, 500, true, 'DATABASE_ERROR', {
            originalMessage: originalError?.message,
            originalStack: originalError?.stack,
        });
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}
exports.DatabaseError = DatabaseError;
/**
 * External service error class
 */
class ExternalServiceError extends AppError {
    constructor(service, message, statusCode = 502) {
        super(`External service error (${service}): ${message}`, statusCode, true, 'EXTERNAL_SERVICE_ERROR', {
            service,
        });
        Object.setPrototypeOf(this, ExternalServiceError.prototype);
    }
}
exports.ExternalServiceError = ExternalServiceError;
/**
 * Global error handler middleware
 */
const errorHandler = (error, req, res, next) => {
    const logger = new logger_1.Logger('ErrorHandler');
    const isDevelopment = config_1.configManager.isDevelopment();
    const requestId = req.headers['x-request-id'] || 'unknown';
    // Log the error with context
    const errorContext = {
        requestId,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id,
        timestamp: new Date().toISOString(),
    };
    // Handle different error types
    let statusCode;
    let message;
    let code;
    let details;
    if (error instanceof AppError) {
        // Our custom application errors
        statusCode = error.statusCode;
        message = error.message;
        code = error.code;
        details = error.details;
        // Log based on severity
        if (error.statusCode >= 500) {
            logger.error('Application error (5xx)', error, errorContext);
        }
        else if (error.statusCode >= 400) {
            logger.warn('Client error (4xx)', {
                message: error.message,
                code: error.code,
                ...errorContext
            });
        }
    }
    else if (error.name === 'ValidationError') {
        // Joi validation errors
        statusCode = 400;
        message = 'Validation failed';
        code = 'VALIDATION_ERROR';
        details = { validationDetails: error.message };
        logger.warn('Validation error', {
            validationError: error.message,
            ...errorContext
        });
    }
    else if (error.name === 'CastError') {
        // Database casting errors (invalid ObjectId, etc.)
        statusCode = 400;
        message = 'Invalid data format';
        code = 'INVALID_DATA_FORMAT';
        logger.warn('Data format error', {
            originalError: error.message,
            ...errorContext
        });
    }
    else if (error.name === 'MongoError' || error.name === 'QueryFailedError') {
        // Database errors
        statusCode = 500;
        message = 'Database operation failed';
        code = 'DATABASE_ERROR';
        logger.error('Database error', error, errorContext);
    }
    else if (error.name === 'JsonWebTokenError') {
        // JWT errors
        statusCode = 401;
        message = 'Invalid authentication token';
        code = 'INVALID_TOKEN';
        logger.warn('JWT error', {
            jwtError: error.message,
            ...errorContext
        });
    }
    else if (error.name === 'TokenExpiredError') {
        // JWT expiration
        statusCode = 401;
        message = 'Authentication token has expired';
        code = 'TOKEN_EXPIRED';
        logger.warn('Token expired', {
            tokenError: error.message,
            ...errorContext
        });
    }
    else if (error.name === 'SyntaxError' && 'body' in error) {
        // JSON parsing errors
        statusCode = 400;
        message = 'Invalid JSON format';
        code = 'INVALID_JSON';
        logger.warn('JSON syntax error', {
            syntaxError: error.message,
            ...errorContext
        });
    }
    else {
        // Unhandled errors
        statusCode = 500;
        message = isDevelopment ? error.message : 'Internal server error';
        code = 'INTERNAL_ERROR';
        logger.error('Unhandled error', error, errorContext);
    }
    // Build error response
    const errorResponse = {
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
exports.errorHandler = errorHandler;
/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors and pass them to error middleware
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
/**
 * Unhandled promise rejection handler
 */
const handleUnhandledRejection = (reason, promise) => {
    const logger = new logger_1.Logger('UnhandledRejection');
    logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: promise.toString(),
    });
    // In production, we might want to gracefully shutdown
    if (config_1.configManager.isProduction()) {
        logger.error('Shutting down due to unhandled promise rejection');
        process.exit(1);
    }
};
exports.handleUnhandledRejection = handleUnhandledRejection;
/**
 * Uncaught exception handler
 */
const handleUncaughtException = (error) => {
    const logger = new logger_1.Logger('UncaughtException');
    logger.error('Uncaught exception', error);
    // Always exit on uncaught exceptions
    logger.error('Shutting down due to uncaught exception');
    process.exit(1);
};
exports.handleUncaughtException = handleUncaughtException;
exports.default = exports.errorHandler;
//# sourceMappingURL=error-handler.js.map