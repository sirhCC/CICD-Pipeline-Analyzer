/**
 * Error Handler Middleware - Enterprise error handling
 */

import type { Request, Response, NextFunction } from 'express';
import { Logger } from '@/shared/logger';

export class ErrorHandler {
  private static logger = new Logger('ErrorHandler');

  public static middleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction): void => {
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

  private static formatError(error: Error): any {
    // Default error response
    let status = 500;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An internal server error occurred';

    // Handle known error types
    if (error.name === 'ValidationError') {
      status = 400;
      code = 'VALIDATION_ERROR';
      message = error.message;
    } else if (error.name === 'UnauthorizedError') {
      status = 401;
      code = 'UNAUTHORIZED';
      message = 'Authentication required';
    } else if (error.name === 'ForbiddenError') {
      status = 403;
      code = 'FORBIDDEN';
      message = 'Access denied';
    } else if (error.name === 'NotFoundError') {
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
