/**
 * Error Handler Middleware - Enterprise error handling
 */
import type { Request, Response, NextFunction } from 'express';
export declare class ErrorHandler {
    private static logger;
    static middleware(): (error: Error, req: Request, res: Response, next: NextFunction) => void;
    private static formatError;
}
//# sourceMappingURL=error-handler.d.ts.map