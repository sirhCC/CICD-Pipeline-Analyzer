/**
 * Enterprise-grade JWT Authentication Middleware
 *
 * Features:
 * - JWT token validation with refresh token support
 * - Role-based access control (RBAC)
 * - API key authentication for programmatic access
 * - Rate limiting per user/API key
 * - Security headers and best practices
 * - Comprehensive audit logging
 * - Token blacklist support for logout
 * - Multi-factor authentication (MFA) validation
 * - IP allowlisting for sensitive operations
 *
 * @author sirhCC
 * @version 1.0.0
 */
import { Request, Response, NextFunction } from 'express';
export interface JWTPayload {
    userId: string;
    email: string;
    role: UserRole;
    permissions: string[];
    sessionId: string;
    mfaVerified?: boolean;
    isApiKey?: boolean;
    iat: number;
    exp: number;
}
export interface AuthenticatedRequest extends Request {
    user?: JWTPayload;
    sessionId?: string;
    isApiKeyAuth?: boolean;
}
export interface RefreshTokenPayload {
    userId: string;
    sessionId: string;
    tokenFamily: string;
    iat: number;
    exp: number;
}
export interface ApiKeyPayload {
    keyId: string;
    userId: string;
    permissions: string[];
    rateLimit: number;
    allowedIPs?: string[];
    iat: number;
    exp?: number;
}
export interface AuthConfig {
    jwtSecret: string;
    jwtRefreshSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
    apiKeySecret: string;
    bcryptRounds: number;
    requireMfa: boolean;
    enableApiKeys: boolean;
    maxFailedAttempts: number;
    lockoutDuration: number;
    enableIpWhitelisting: boolean;
}
export declare enum UserRole {
    ADMIN = "admin",
    ANALYST = "analyst",
    VIEWER = "viewer",
    DEVELOPER = "developer"
}
export declare enum Permission {
    PIPELINES_READ = "pipelines:read",
    PIPELINES_WRITE = "pipelines:write",
    PIPELINES_DELETE = "pipelines:delete",
    PIPELINES_ANALYZE = "pipelines:analyze",
    USERS_READ = "users:read",
    USERS_WRITE = "users:write",
    USERS_DELETE = "users:delete",
    SYSTEM_CONFIG = "system:config",
    SYSTEM_LOGS = "system:logs",
    SYSTEM_METRICS = "system:metrics",
    API_KEYS_READ = "api_keys:read",
    API_KEYS_WRITE = "api_keys:write",
    API_KEYS_DELETE = "api_keys:delete",
    REPORTS_READ = "reports:read",
    REPORTS_WRITE = "reports:write",
    REPORTS_EXPORT = "reports:export",
    ANALYTICS_READ = "analytics:read",
    ANALYTICS_WRITE = "analytics:write"
}
declare const ROLE_PERMISSIONS: Record<UserRole, Permission[]>;
/**
 * JWT Authentication Service
 */
export declare class AuthService {
    private readonly logger;
    private readonly authConfig;
    constructor();
    private loadConfig;
    get config(): AuthConfig;
    /**
     * Generate JWT access token
     */
    generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string;
    /**
     * Generate JWT refresh token
     */
    generateRefreshToken(userId: string, sessionId: string, tokenFamily: string): string;
    /**
     * Generate API key
     */
    generateApiKey(payload: Omit<ApiKeyPayload, 'iat'> & {
        expiresIn?: string;
    }): string;
    /**
     * Verify JWT token
     */
    verifyToken(token: string, secret: string): any;
    /**
     * Check if token is blacklisted
     */
    isTokenBlacklisted(token: string): boolean;
    /**
     * Blacklist token (for logout)
     */
    blacklistToken(token: string): void;
    /**
     * Track failed login attempts
     */
    trackFailedAttempt(identifier: string): void;
    /**
     * Check if account is locked
     */
    isAccountLocked(identifier: string): boolean;
    /**
     * Clear failed attempts on successful login
     */
    clearFailedAttempts(identifier: string): void;
    /**
     * Validate IP address against whitelist
     */
    isIpAllowed(ip: string, allowedIPs?: string[]): boolean;
    /**
     * Parse expiration string to seconds
     */
    private parseExpiration;
}
export declare const getAuthService: () => AuthService;
/**
 * JWT Authentication Middleware
 */
export declare const authenticateJWT: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Role-based authorization middleware
 */
export declare const requireRole: (...allowedRoles: UserRole[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Permission-based authorization middleware
 */
export declare const requirePermission: (...requiredPermissions: Permission[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Optional authentication middleware (doesn't fail if no auth)
 */
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Utility function to hash passwords
 */
export declare const hashPassword: (password: string) => Promise<string>;
/**
 * Utility function to verify passwords
 */
export declare const verifyPassword: (password: string, hash: string) => Promise<boolean>;
/**
 * Generate session ID
 */
export declare const generateSessionId: () => string;
/**
 * Get role permissions
 */
export declare const getRolePermissions: (role: UserRole) => Permission[];
export { ROLE_PERMISSIONS };
//# sourceMappingURL=auth.d.ts.map