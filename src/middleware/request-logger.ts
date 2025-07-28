/**
 * Request Logger Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { Logger } from '@/shared/logger';
import { v4 as uuidv4 } from 'uuid';

export class RequestLogger {
  private static logger = new Logger('HTTP');

  public static middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const requestId = uuidv4();
      const startTime = Date.now();

      // Add request ID to response locals for error handling
      res.locals.requestId = requestId;

      // Log incoming request
      RequestLogger.logger.info('Incoming request', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      // Override end method to log response
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any): Response {
        const duration = Date.now() - startTime;
        
        RequestLogger.logger.info('Request completed', {
          requestId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration,
        });

        return originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }
}
