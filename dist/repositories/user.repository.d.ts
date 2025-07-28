/**
 * User Repository - Database operations for User entities
 */
import { BaseRepository, PaginationOptions, PaginationResult } from './base.repository';
import { User } from '@/entities/user.entity';
import { UserRole } from '@/types';
export interface UserSearchOptions {
    role?: UserRole;
    isActive?: boolean;
    isEmailVerified?: boolean;
    isMfaEnabled?: boolean;
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
}
export interface UserStatsResult {
    total: number;
    active: number;
    byRole: Record<UserRole, number>;
    emailVerified: number;
    mfaEnabled: number;
    lockedAccounts: number;
    recentLogins: number;
}
export declare class UserRepository extends BaseRepository<User> {
    constructor();
    /**
     * Find user by email
     */
    findByEmail(email: string): Promise<User | null>;
    /**
     * Find user by username
     */
    findByUsername(username: string): Promise<User | null>;
    /**
     * Find user by email or username
     */
    findByEmailOrUsername(identifier: string): Promise<User | null>;
    /**
     * Search users with filters
     */
    searchUsers(filters: UserSearchOptions, pagination?: PaginationOptions): Promise<PaginationResult<User>>;
    /**
     * Get user statistics
     */
    getUserStats(): Promise<UserStatsResult>;
    /**
     * Create user with hashed password
     */
    createUser(userData: Partial<User>): Promise<User>;
    /**
     * Update user password
     */
    updatePassword(userId: string, newPassword: string): Promise<boolean>;
    /**
     * Verify user email
     */
    verifyEmail(token: string): Promise<User | null>;
    /**
     * Generate password reset token
     */
    generatePasswordResetToken(email: string): Promise<string | null>;
    /**
     * Reset password with token
     */
    resetPassword(token: string, newPassword: string): Promise<boolean>;
    /**
     * Lock user account
     */
    lockUser(userId: string, minutes?: number): Promise<boolean>;
    /**
     * Unlock user account
     */
    unlockUser(userId: string): Promise<boolean>;
    /**
     * Record user login
     */
    recordLogin(userId: string, ipAddress?: string): Promise<boolean>;
    /**
     * Increment login attempts
     */
    incrementLoginAttempts(userId: string): Promise<boolean>;
    /**
     * Get users by role
     */
    findByRole(role: UserRole): Promise<User[]>;
    /**
     * Get recently active users
     */
    getRecentlyActive(hours?: number, limit?: number): Promise<User[]>;
    /**
     * Deactivate user
     */
    deactivateUser(userId: string): Promise<boolean>;
    /**
     * Activate user
     */
    activateUser(userId: string): Promise<boolean>;
    /**
     * Update user role
     */
    updateUserRole(userId: string, role: UserRole): Promise<boolean>;
    /**
     * Add permission to user
     */
    addPermission(userId: string, permission: string): Promise<boolean>;
    /**
     * Remove permission from user
     */
    removePermission(userId: string, permission: string): Promise<boolean>;
    /**
     * Delete inactive users (cleanup)
     */
    deleteInactiveUsers(inactiveDays: number): Promise<number>;
}
export default UserRepository;
//# sourceMappingURL=user.repository.d.ts.map