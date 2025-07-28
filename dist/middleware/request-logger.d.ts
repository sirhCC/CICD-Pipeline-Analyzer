/**
 * Request Logger Middleware
 */
import type { Request, Response, NextFunction } from 'express';
export declare class RequestLogger {
    private static logger;
    static middleware(): (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=request-logger.d.ts.map