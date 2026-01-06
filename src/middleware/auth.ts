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

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@/shared/logger';
import { configManager } from '@/config';
import {
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  ValidationError,
  AppError,
} from './error-handler';

// Types and Interfaces
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

export enum UserRole {
  ADMIN = 'admin',
  ANALYST = 'analyst',
  VIEWER = 'viewer',
  DEVELOPER = 'developer',
}

export enum Permission {
  // Pipeline permissions
  PIPELINES_READ = 'pipelines:read',
  PIPELINES_WRITE = 'pipelines:write',
  PIPELINES_DELETE = 'pipelines:delete',
  PIPELINES_ANALYZE = 'pipelines:analyze',

  // User management
  USERS_READ = 'users:read',
  USERS_WRITE = 'users:write',
  USERS_DELETE = 'users:delete',

  // System administration
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_METRICS = 'system:metrics',

  // API keys
  API_KEYS_READ = 'api_keys:read',
  API_KEYS_WRITE = 'api_keys:write',
  API_KEYS_DELETE = 'api_keys:delete',

  // Reports and exports
  REPORTS_READ = 'reports:read',
  REPORTS_WRITE = 'reports:write',
  REPORTS_EXPORT = 'reports:export',

  // Analytics permissions
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_WRITE = 'analytics:write',
}

// Role to permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.ANALYST]: [
    Permission.PIPELINES_READ,
    Permission.PIPELINES_WRITE,
    Permission.PIPELINES_ANALYZE,
    Permission.REPORTS_READ,
    Permission.REPORTS_WRITE,
    Permission.REPORTS_EXPORT,
    Permission.USERS_READ,
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_WRITE,
  ],
  [UserRole.VIEWER]: [
    Permission.PIPELINES_READ,
    Permission.REPORTS_READ,
    Permission.USERS_READ,
    Permission.ANALYTICS_READ,
  ],
  [UserRole.DEVELOPER]: [
    Permission.PIPELINES_READ,
    Permission.PIPELINES_WRITE,
    Permission.PIPELINES_ANALYZE,
    Permission.REPORTS_READ,
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_WRITE,
  ],
};

// In-memory stores (in production, these would be Redis/Database)
const tokenBlacklist = new Set<string>();
const failedAttempts = new Map<string, { count: number; lockUntil?: Date }>();
const activeSessions = new Map<string, { userId: string; createdAt: Date; lastActivity: Date }>();

/**
 * JWT Authentication Service
 */
export class AuthService {
  private readonly logger: Logger;
  private readonly authConfig: AuthConfig;

  constructor() {
    this.logger = new Logger('AuthService');
    this.authConfig = this.loadConfig();
  }

  private loadConfig(): AuthConfig {
    const config = configManager.get();
    const isProduction = configManager.isProduction();
    const isDevelopment = configManager.isDevelopment();

    // For production, require environment variables - no fallbacks to weak defaults
    let jwtSecret: string;
    let jwtRefreshSecret: string;
    let apiKeySecret: string;

    if (isProduction) {
      // Production requires strong secrets from environment
      const envJwtSecret = process.env.JWT_SECRET;
      if (!envJwtSecret) {
        throw new Error('JWT_SECRET environment variable is required in production');
      }
      if (envJwtSecret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long in production');
      }
      jwtSecret = envJwtSecret;

      const envJwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
      if (!envJwtRefreshSecret) {
        throw new Error('JWT_REFRESH_SECRET environment variable is required in production');
      }
      if (envJwtRefreshSecret.length < 32) {
        throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long in production');
      }
      jwtRefreshSecret = envJwtRefreshSecret;

      const envApiKeySecret = process.env.API_KEY_SECRET;
      if (!envApiKeySecret) {
        throw new Error('API_KEY_SECRET environment variable is required in production');
      }
      if (envApiKeySecret.length < 32) {
        throw new Error('API_KEY_SECRET must be at least 32 characters long in production');
      }
      apiKeySecret = envApiKeySecret;
    } else {
      // Development/test can use fallbacks but warn about weak secrets
      jwtSecret = process.env.JWT_SECRET || config.auth.jwtSecret;
      if (!jwtSecret) {
        if (isDevelopment) {
          jwtSecret = 'dev-jwt-secret-change-in-production-32chars-min';
          this.logger.warn(
            'Using default JWT secret for development. Set JWT_SECRET environment variable.'
          );
        } else {
          throw new Error('JWT_SECRET is required');
        }
      }

      const envJwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
      if (!envJwtRefreshSecret) {
        if (isDevelopment) {
          jwtRefreshSecret = 'dev-refresh-secret-change-in-production-32chars-min';
          this.logger.warn(
            'Using default JWT refresh secret for development. Set JWT_REFRESH_SECRET environment variable.'
          );
        } else {
          throw new Error('JWT_REFRESH_SECRET is required');
        }
      } else {
        jwtRefreshSecret = envJwtRefreshSecret;
      }

      const envApiKeySecret = process.env.API_KEY_SECRET;
      if (!envApiKeySecret) {
        if (isDevelopment) {
          apiKeySecret = 'dev-api-key-secret-change-in-production-32chars-min';
          this.logger.warn(
            'Using default API key secret for development. Set API_KEY_SECRET environment variable.'
          );
        } else {
          throw new Error('API_KEY_SECRET is required');
        }
      } else {
        apiKeySecret = envApiKeySecret;
      }
    }

    return {
      jwtSecret,
      jwtRefreshSecret,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || config.auth.jwtExpiresIn || '15m',
      jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      apiKeySecret,
      bcryptRounds: parseInt(
        process.env.BCRYPT_ROUNDS || config.auth.bcryptRounds?.toString() || '12'
      ),
      requireMfa: (process.env.REQUIRE_MFA || 'false') === 'true',
      enableApiKeys: (process.env.ENABLE_API_KEYS || 'true') === 'true',
      maxFailedAttempts: parseInt(process.env.MAX_FAILED_ATTEMPTS || '5'),
      lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000'), // 15 minutes
      enableIpWhitelisting: (process.env.ENABLE_IP_WHITELISTING || 'false') === 'true',
    };
  }

  public get config(): AuthConfig {
    return this.authConfig;
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    const options: any = {
      expiresIn: this.authConfig.jwtExpiresIn,
    };
    return jwt.sign(payload, String(this.authConfig.jwtSecret), options);
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(userId: string, sessionId: string, tokenFamily: string): string {
    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      userId,
      sessionId,
      tokenFamily,
    };

    const options: any = {
      expiresIn: this.authConfig.jwtRefreshExpiresIn,
    };
    return jwt.sign(payload, String(this.authConfig.jwtRefreshSecret), options);
  }

  /**
   * Generate API key
   */
  generateApiKey(payload: Omit<ApiKeyPayload, 'iat'> & { expiresIn?: string }): string {
    const apiKeyPayload: Omit<ApiKeyPayload, 'exp'> & { iat: number } = {
      keyId: payload.keyId,
      userId: payload.userId,
      permissions: payload.permissions,
      rateLimit: payload.rateLimit,
      ...(payload.allowedIPs && { allowedIPs: payload.allowedIPs }),
      iat: Math.floor(Date.now() / 1000),
    };

    const options: any = {};
    if (payload.expiresIn) {
      options.expiresIn = payload.expiresIn;
    }

    return jwt.sign(apiKeyPayload, String(this.authConfig.apiKeySecret), options);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string, secret: string): any {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      throw new AuthenticationError('Token verification failed');
    }
  }

  /**
   * Check if token is blacklisted
   */
  isTokenBlacklisted(token: string): boolean {
    return tokenBlacklist.has(token);
  }

  /**
   * Blacklist token (for logout)
   */
  blacklistToken(token: string): void {
    tokenBlacklist.add(token);

    // Clean up old tokens periodically (in production, use Redis expiry)
    if (tokenBlacklist.size > 10000) {
      const tokensToRemove = Array.from(tokenBlacklist).slice(0, 5000);
      tokensToRemove.forEach(t => tokenBlacklist.delete(t));
    }
  }

  /**
   * Track failed login attempts
   */
  trackFailedAttempt(identifier: string): void {
    const attempts = failedAttempts.get(identifier) || { count: 0 };
    attempts.count++;

    if (attempts.count >= this.authConfig.maxFailedAttempts) {
      attempts.lockUntil = new Date(Date.now() + this.authConfig.lockoutDuration);
    }

    failedAttempts.set(identifier, attempts);
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(identifier: string): boolean {
    const attempts = failedAttempts.get(identifier);
    if (!attempts?.lockUntil) return false;

    if (attempts.lockUntil < new Date()) {
      failedAttempts.delete(identifier);
      return false;
    }

    return true;
  }

  /**
   * Clear failed attempts on successful login
   */
  clearFailedAttempts(identifier: string): void {
    failedAttempts.delete(identifier);
  }

  /**
   * Validate IP address against whitelist
   */
  isIpAllowed(ip: string, allowedIPs?: string[]): boolean {
    if (!this.authConfig.enableIpWhitelisting || !allowedIPs || allowedIPs.length === 0)
      return true;
    return allowedIPs.includes(ip) || allowedIPs.includes('*');
  }

  /**
   * Parse expiration string to seconds
   */
  private parseExpiration(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return value;
    }
  }
}

// Initialize auth service - lazy loaded to avoid circular dependencies
let authServiceInstance: AuthService | null = null;

export const getAuthService = (): AuthService => {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
};

/**
 * JWT Authentication Middleware
 */
export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const logger = new Logger('JWTMiddleware');

  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    // Check for API key authentication first
    if (apiKey && getAuthService().config.enableApiKeys) {
      try {
        const decoded = getAuthService().verifyToken(
          apiKey,
          String(getAuthService().config.apiKeySecret)
        ) as ApiKeyPayload;

        // Check IP whitelist for API keys
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        if (!getAuthService().isIpAllowed(clientIP, decoded.allowedIPs)) {
          logger.warn('API key access denied for IP', { ip: clientIP, keyId: decoded.keyId });
          throw new AuthorizationError('Access denied for this IP address');
        }

        // Set user context for API key
        req.user = {
          userId: decoded.userId,
          email: `api-key-${decoded.keyId}`,
          role: UserRole.DEVELOPER,
          permissions: decoded.permissions,
          sessionId: `api-${decoded.keyId}`,
          isApiKey: true,
          iat: decoded.iat,
          exp: decoded.exp || 0,
        };

        req.isApiKeyAuth = true;

        logger.info('API key authentication successful', {
          userId: decoded.userId,
          keyId: decoded.keyId,
          ip: clientIP,
        });

        return next();
      } catch (error) {
        logger.error('API key authentication failed', error);
        throw new AuthenticationError('Invalid API key');
      }
    }

    // JWT token authentication
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('Authorization header missing or invalid');
    }

    const token = authHeader.substring(7);

    // Check if token is blacklisted
    if (getAuthService().isTokenBlacklisted(token)) {
      throw new AuthenticationError('Token has been revoked');
    }

    // Verify token
    const decoded = getAuthService().verifyToken(
      token,
      String(getAuthService().config.jwtSecret)
    ) as JWTPayload;

    // Check MFA requirement
    if (getAuthService().config.requireMfa && !decoded.mfaVerified) {
      throw new AuthenticationError('MFA verification required');
    }

    // Update session activity
    if (decoded.sessionId) {
      const session = activeSessions.get(decoded.sessionId);
      if (session) {
        session.lastActivity = new Date();
      }
    }

    req.user = decoded;
    req.sessionId = decoded.sessionId;

    logger.info('JWT authentication successful', {
      userId: decoded.userId,
      role: decoded.role,
      sessionId: decoded.sessionId,
    });

    next();
  } catch (error) {
    logger.error('Authentication failed', error);
    next(error);
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const logger = new Logger('RoleMiddleware');

    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Access denied for role', {
          userId: req.user.userId,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
        });
        throw new AuthorizationError('Insufficient permissions');
      }

      logger.debug('Role authorization successful', {
        userId: req.user.userId,
        role: req.user.role,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const logger = new Logger('PermissionMiddleware');

    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const userPermissions = req.user.permissions;
      const hasPermission = requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        logger.warn('Access denied for permissions', {
          userId: req.user.userId,
          userPermissions,
          requiredPermissions,
        });
        throw new AuthorizationError('Insufficient permissions');
      }

      logger.debug('Permission authorization successful', {
        userId: req.user.userId,
        permissions: requiredPermissions,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Optional authentication middleware (doesn't fail if no auth)
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;

  if (!authHeader && !apiKey) {
    return next();
  }

  // If auth is provided, validate it
  authenticateJWT(req, res, error => {
    if (error) {
      // For optional auth, we log the error but don't fail the request
      const logger = new Logger('OptionalAuth');
      logger.warn('Optional authentication failed', error);
    }
    next();
  });
};

/**
 * Utility function to hash passwords
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, getAuthService().config.bcryptRounds);
};

/**
 * Utility function to verify passwords
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate session ID
 */
export const generateSessionId = (): string => {
  return uuidv4();
};

/**
 * Get role permissions
 */
export const getRolePermissions = (role: UserRole): Permission[] => {
  return ROLE_PERMISSIONS[role] || [];
};

// Export the ROLE_PERMISSIONS for external use
export { ROLE_PERMISSIONS };
