/**
 * Authentication Controller
 * Handles user authentication, registration, and session management
 */
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare const authController: {
    /**
     * User login with JWT token generation
     */
    login(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * User registration
     */
    register(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Refresh access token
     */
    refreshToken(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get user profile
     */
    getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Update user profile
     */
    updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * User logout
     */
    logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * List API keys for user
     */
    listApiKeys(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Create new API key
     */
    createApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Revoke API key
     */
    revokeApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * List all users (Admin only) - Simplified for Phase 1
     */
    listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Update user role (Admin only) - Simplified for Phase 1
     */
    updateUserRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=auth.controller.d.ts.map