/**
 * Authentication Middleware
 */
import type { Request, Response, NextFunction } from 'express';
export declare class AuthMiddleware {
    private static logger;
    static optional(): (req: Request, res: Response, next: NextFunction) => void;
    static required(): (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=auth.d.ts.map