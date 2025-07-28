/**
 * Global Error Handler Middleware
 * Enterprise-grade error handling with comprehensive logging and response formatting
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Custom error class for application-specific errors
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly code?: string;
    readonly details?: Record<string, unknown>;
    constructor(message: string, statusCode?: number, isOperational?: boolean, code?: string, details?: Record<string, unknown>);
}
/**
 * Validation error class for input validation failures
 */
export declare class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Authentication error class
 */
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
/**
 * Authorization error class
 */
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
/**
 * Not found error class
 */
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
/**
 * Rate limit error class
 */
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
/**
 * Database error class
 */
export declare class DatabaseError extends AppError {
    constructor(message: string, originalError?: Error);
}
/**
 * External service error class
 */
export declare class ExternalServiceError extends AppError {
    constructor(service: string, message: string, statusCode?: number);
}
/**
 * Global error handler middleware
 */
export declare const errorHandler: (error: Error, req: Request, res: Response, next: NextFunction) => void;
/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors and pass them to error middleware
 */
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * 404 Not Found handler
 */
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Unhandled promise rejection handler
 */
export declare const handleUnhandledRejection: (reason: any, promise: Promise<any>) => void;
/**
 * Uncaught exception handler
 */
export declare const handleUncaughtException: (error: Error) => void;
export default errorHandler;
//# sourceMappingURL=error-handler.d.ts.map