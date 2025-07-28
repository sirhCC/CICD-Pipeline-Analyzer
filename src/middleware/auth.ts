/**
 * Authentication Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { Logger } from '@/shared/logger';

export class AuthMiddleware {
  private static logger = new Logger('Auth');

  public static optional() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // TODO: Implement JWT authentication
      // For now, just pass through
      next();
    };
  }

  public static required() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // TODO: Implement required authentication
      next();
    };
  }
}
