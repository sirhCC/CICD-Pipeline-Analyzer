/**
 * User Repository - Database operations for User entities
 */

import type { FindOptionsWhere } from 'typeorm';
import type { PaginationOptions, PaginationResult } from './base.repository';
import { BaseRepository } from './base.repository';
import { User, UserSession, ApiKey } from '@/entities/user.entity';
import type { UserRole } from '@/types';

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

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(User);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.findOne({ username: username.toLowerCase() });
  }

  /**
   * Find user by email or username
   */
  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    const normalizedIdentifier = identifier.toLowerCase();

    const user = await this.repository
      .createQueryBuilder('user')
      .where('user.email = :identifier OR user.username = :identifier', {
        identifier: normalizedIdentifier,
      })
      .getOne();

    return user;
  }

  /**
   * Search users with filters
   */
  async searchUsers(
    filters: UserSearchOptions,
    pagination?: PaginationOptions
  ): Promise<PaginationResult<User>> {
    const where: FindOptionsWhere<User> = {};

    if (filters.role) {
      where.role = filters.role;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.isEmailVerified !== undefined) {
      where.isEmailVerified = filters.isEmailVerified;
    }
    if (filters.isMfaEnabled !== undefined) {
      where.isMfaEnabled = filters.isMfaEnabled;
    }
    if (filters.email) {
      where.email = filters.email.toLowerCase();
    }
    if (filters.username) {
      where.username = filters.username.toLowerCase();
    }

    // For partial matches on names, we'll use query builder
    if (filters.firstName || filters.lastName) {
      const queryBuilder = this.repository.createQueryBuilder('user');

      if (filters.firstName) {
        queryBuilder.andWhere('user.firstName ILIKE :firstName', {
          firstName: `%${filters.firstName}%`,
        });
      }
      if (filters.lastName) {
        queryBuilder.andWhere('user.lastName ILIKE :lastName', {
          lastName: `%${filters.lastName}%`,
        });
      }

      // Apply other filters
      Object.keys(where).forEach(key => {
        queryBuilder.andWhere(`user.${key} = :${key}`, { [key]: (where as any)[key] });
      });

      const page = pagination?.page || 1;
      const limit = Math.min(pagination?.limit || 20, 100);
      const skip = (page - 1) * limit;

      queryBuilder.take(limit).skip(skip);

      if (pagination?.sortBy) {
        queryBuilder.orderBy(`user.${pagination.sortBy}`, pagination.sortOrder || 'ASC');
      } else {
        queryBuilder.orderBy('user.createdAt', 'DESC');
      }

      const [data, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };
    }

    return this.findWithPagination(where, pagination);
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStatsResult> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_email_verified = true THEN 1 ELSE 0 END) as email_verified,
        SUM(CASE WHEN is_mfa_enabled = true THEN 1 ELSE 0 END) as mfa_enabled,
        SUM(CASE WHEN locked_until IS NOT NULL AND locked_until > NOW() THEN 1 ELSE 0 END) as locked_accounts,
        SUM(CASE WHEN last_login_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as recent_logins
      FROM users 
      WHERE is_deleted = false
    `;

    const byRoleSql = `
      SELECT role, COUNT(*) as count
      FROM users 
      WHERE is_deleted = false
      GROUP BY role
    `;

    const [generalStats, roleStats] = await Promise.all([this.query(sql), this.query(byRoleSql)]);

    const general = generalStats[0] || {};

    const byRole: Record<string, number> = {};
    roleStats.forEach((row: any) => {
      byRole[row.role] = parseInt(row.count, 10);
    });

    return {
      total: parseInt(general.total || '0', 10),
      active: parseInt(general.active || '0', 10),
      byRole: byRole as Record<UserRole, number>,
      emailVerified: parseInt(general.email_verified || '0', 10),
      mfaEnabled: parseInt(general.mfa_enabled || '0', 10),
      lockedAccounts: parseInt(general.locked_accounts || '0', 10),
      recentLogins: parseInt(general.recent_logins || '0', 10),
    };
  }

  /**
   * Create user with hashed password
   */
  async createUser(userData: Partial<User>): Promise<User> {
    if (!userData.email || !userData.username) {
      throw new Error('Email and username are required');
    }

    // Check for existing user
    const existingUser = await this.findByEmailOrUsername(userData.email);
    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Email and username will be normalized in the entity
    return this.create(userData);
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    user.passwordHash = newPassword; // Will be hashed by entity hook
    await this.save(user);
    return true;
  }

  /**
   * Verify user email
   */
  async verifyEmail(token: string): Promise<User | null> {
    const user = await this.findOne({ emailVerificationToken: token });
    if (!user) {
      return null;
    }

    user.verifyEmail();
    return this.save(user);
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const token = user.generatePasswordResetToken();
    await this.save(user);
    return token;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const user = await this.findOne({ passwordResetToken: token });
    if (!user?.verifyPasswordResetToken(token)) {
      return false;
    }

    user.passwordHash = newPassword; // Will be hashed by entity hook
    user.clearPasswordResetToken();
    await this.save(user);
    return true;
  }

  /**
   * Lock user account
   */
  async lockUser(userId: string, minutes: number = 15): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    user.lockAccount(minutes);
    await this.save(user);
    return true;
  }

  /**
   * Unlock user account
   */
  async unlockUser(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    user.unlockAccount();
    await this.save(user);
    return true;
  }

  /**
   * Record user login
   */
  async recordLogin(userId: string, ipAddress?: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    user.recordLogin(ipAddress);
    await this.save(user);
    return true;
  }

  /**
   * Increment login attempts
   */
  async incrementLoginAttempts(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    user.incrementLoginAttempts();
    await this.save(user);
    return true;
  }

  /**
   * Get users by role
   */
  async findByRole(role: UserRole): Promise<User[]> {
    return this.findMany({
      where: { role, isActive: true },
    });
  }

  /**
   * Get recently active users
   */
  async getRecentlyActive(hours: number = 24, limit: number = 50): Promise<User[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.findMany({
      where: {
        lastLoginAt: { $gte: since } as any,
        isActive: true,
      },
      order: { lastLoginAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<boolean> {
    const updated = await this.updateById(userId, { isActive: false });
    return updated !== null;
  }

  /**
   * Activate user
   */
  async activateUser(userId: string): Promise<boolean> {
    const updated = await this.updateById(userId, { isActive: true });
    return updated !== null;
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole): Promise<boolean> {
    const updated = await this.updateById(userId, { role });
    return updated !== null;
  }

  /**
   * Add permission to user
   */
  async addPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    user.addPermission(permission);
    await this.save(user);
    return true;
  }

  /**
   * Remove permission from user
   */
  async removePermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    user.removePermission(permission);
    await this.save(user);
    return true;
  }

  /**
   * Delete inactive users (cleanup)
   */
  async deleteInactiveUsers(inactiveDays: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('is_active = false')
      .andWhere('last_login_at < :cutoffDate OR last_login_at IS NULL', { cutoffDate })
      .andWhere('created_at < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.info(`Deleted ${result.affected} inactive users`, {
      inactiveDays,
      cutoffDate,
    });

    return result.affected || 0;
  }
}

export default UserRepository;
