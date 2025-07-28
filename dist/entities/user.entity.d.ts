/**
 * User Entity - Represents system users with authentication and authorization
 */
import { BaseEntity } from './base.entity';
import { UserRole } from '../types';
/**
 * API Key Entity for programmatic access
 */
export declare class ApiKey extends BaseEntity {
    name: string;
    key: string;
    description?: string;
    permissions?: string[];
    scopes?: string[];
    isActive: boolean;
    lastUsedAt?: Date;
    expiresAt?: Date;
    lastUsedIp?: string;
    usageCount: number;
    rateLimits?: {
        requestsPerMinute: number;
        requestsPerHour: number;
        requestsPerDay: number;
    };
    userId: string;
    user: any;
    /**
     * Check if API key is expired
     */
    isExpired(): boolean;
    /**
     * Check if API key is valid for use
     */
    isValid(): boolean;
    /**
     * Record usage of the API key
     */
    recordUsage(ipAddress?: string): void;
}
/**
 * User Session Entity for tracking active sessions
 */
export declare class UserSession extends BaseEntity {
    token: string;
    refreshToken?: string;
    expiresAt: Date;
    refreshExpiresAt?: Date;
    isActive: boolean;
    ipAddress?: string;
    userAgent?: string;
    lastActivityAt?: Date;
    metadata?: Record<string, any>;
    userId: string;
    user: any;
    /**
     * Check if session is expired
     */
    isExpired(): boolean;
    /**
     * Check if refresh token is expired
     */
    isRefreshExpired(): boolean;
    /**
     * Check if session is valid
     */
    isValid(): boolean;
    /**
     * Update last activity timestamp
     */
    updateActivity(): void;
    /**
     * Invalidate the session
     */
    invalidate(): void;
}
/**
 * User Entity for authentication and authorization
 */
export declare class User extends BaseEntity {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    role: UserRole;
    isActive: boolean;
    isEmailVerified: boolean;
    isMfaEnabled: boolean;
    mfaSecret?: string;
    mfaBackupCodes?: string[];
    lastLoginAt?: Date;
    lastLoginIp?: string;
    loginAttempts: number;
    lockedUntil?: Date;
    emailVerificationToken?: string;
    passwordResetToken?: string;
    passwordResetExpiresAt?: Date;
    preferences?: {
        theme?: 'light' | 'dark';
        language?: string;
        timezone?: string;
        notifications?: {
            email?: boolean;
            push?: boolean;
            inApp?: boolean;
        };
    };
    permissions?: string[];
    metadata?: Record<string, any>;
    sessions: any[];
    apiKeys: any[];
    /**
     * Hash password before saving
     */
    hashPassword(): Promise<void>;
    /**
     * Verify password
     */
    verifyPassword(password: string): Promise<boolean>;
    /**
     * Get full name
     */
    getFullName(): string;
    /**
     * Check if user is locked
     */
    isLocked(): boolean;
    /**
     * Lock user account
     */
    lockAccount(minutes?: number): void;
    /**
     * Unlock user account
     */
    unlockAccount(): void;
    /**
     * Increment login attempts
     */
    incrementLoginAttempts(): void;
    /**
     * Reset login attempts
     */
    resetLoginAttempts(): void;
    /**
     * Record successful login
     */
    recordLogin(ipAddress?: string): void;
    /**
     * Check if user has permission
     */
    hasPermission(permission: string): boolean;
    /**
     * Add permission
     */
    addPermission(permission: string): void;
    /**
     * Remove permission
     */
    removePermission(permission: string): void;
    /**
     * Generate email verification token
     */
    generateEmailVerificationToken(): string;
    /**
     * Generate password reset token
     */
    generatePasswordResetToken(expirationHours?: number): string;
    /**
     * Verify email verification token
     */
    verifyEmailToken(token: string): boolean;
    /**
     * Verify password reset token
     */
    verifyPasswordResetToken(token: string): boolean;
    /**
     * Clear password reset token
     */
    clearPasswordResetToken(): void;
    /**
     * Verify email
     */
    verifyEmail(): void;
}
//# sourceMappingURL=user.entity.d.ts.map