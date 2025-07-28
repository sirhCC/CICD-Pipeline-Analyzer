"use strict";
/**
 * Error Handler Middleware - Enterprise error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
const logger_1 = require("../shared/logger");
class ErrorHandler {
    static logger = new logger_1.Logger('ErrorHandler');
    static middleware() {
        return (error, req, res, next) => {
            // Log the error
            ErrorHandler.logger.error('Request error', error, {
                method: req.method,
                url: req.originalUrl,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
            });
            // Determine error response
            const errorResponse = ErrorHandler.formatError(error);
            res.status(errorResponse.status).json({
                success: false,
                error: errorResponse,
                requestId: res.locals.requestId || 'unknown',
            });
        };
    }
    static formatError(error) {
        // Default error response
        let status = 500;
        let code = 'INTERNAL_SERVER_ERROR';
        let message = 'An internal server error occurred';
        // Handle known error types
        if (error.name === 'ValidationError') {
            status = 400;
            code = 'VALIDATION_ERROR';
            message = error.message;
        }
        else if (error.name === 'UnauthorizedError') {
            status = 401;
            code = 'UNAUTHORIZED';
            message = 'Authentication required';
        }
        else if (error.name === 'ForbiddenError') {
            status = 403;
            code = 'FORBIDDEN';
            message = 'Access denied';
        }
        else if (error.name === 'NotFoundError') {
            status = 404;
            code = 'NOT_FOUND';
            message = error.message;
        }
        return {
            status,
            code,
            message,
            timestamp: new Date().toISOString(),
        };
    }
}
exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=error-handler.js.map