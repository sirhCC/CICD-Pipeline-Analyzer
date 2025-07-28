"use strict";
/**
 * User Repository - Database operations for User entities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const base_repository_1 = require("./base.repository");
const user_entity_1 = require("@/entities/user.entity");
class UserRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(user_entity_1.User);
    }
    /**
     * Find user by email
     */
    async findByEmail(email) {
        return this.findOne({ email: email.toLowerCase() });
    }
    /**
     * Find user by username
     */
    async findByUsername(username) {
        return this.findOne({ username: username.toLowerCase() });
    }
    /**
     * Find user by email or username
     */
    async findByEmailOrUsername(identifier) {
        const normalizedIdentifier = identifier.toLowerCase();
        const user = await this.repository
            .createQueryBuilder('user')
            .where('user.email = :identifier OR user.username = :identifier', {
            identifier: normalizedIdentifier
        })
            .getOne();
        return user;
    }
    /**
     * Search users with filters
     */
    async searchUsers(filters, pagination) {
        const where = {};
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
                    firstName: `%${filters.firstName}%`
                });
            }
            if (filters.lastName) {
                queryBuilder.andWhere('user.lastName ILIKE :lastName', {
                    lastName: `%${filters.lastName}%`
                });
            }
            // Apply other filters
            Object.keys(where).forEach(key => {
                queryBuilder.andWhere(`user.${key} = :${key}`, { [key]: where[key] });
            });
            const page = pagination?.page || 1;
            const limit = Math.min(pagination?.limit || 20, 100);
            const skip = (page - 1) * limit;
            queryBuilder.take(limit).skip(skip);
            if (pagination?.sortBy) {
                queryBuilder.orderBy(`user.${pagination.sortBy}`, pagination.sortOrder || 'ASC');
            }
            else {
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
                hasPrevious: page > 1
            };
        }
        return this.findWithPagination(where, pagination);
    }
    /**
     * Get user statistics
     */
    async getUserStats() {
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
        const [generalStats, roleStats] = await Promise.all([
            this.query(sql),
            this.query(byRoleSql)
        ]);
        const general = generalStats[0] || {};
        const byRole = {};
        roleStats.forEach((row) => {
            byRole[row.role] = parseInt(row.count, 10);
        });
        return {
            total: parseInt(general.total || '0', 10),
            active: parseInt(general.active || '0', 10),
            byRole: byRole,
            emailVerified: parseInt(general.email_verified || '0', 10),
            mfaEnabled: parseInt(general.mfa_enabled || '0', 10),
            lockedAccounts: parseInt(general.locked_accounts || '0', 10),
            recentLogins: parseInt(general.recent_logins || '0', 10)
        };
    }
    /**
     * Create user with hashed password
     */
    async createUser(userData) {
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
    async updatePassword(userId, newPassword) {
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
    async verifyEmail(token) {
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
    async generatePasswordResetToken(email) {
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
    async resetPassword(token, newPassword) {
        const user = await this.findOne({ passwordResetToken: token });
        if (!user || !user.verifyPasswordResetToken(token)) {
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
    async lockUser(userId, minutes = 15) {
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
    async unlockUser(userId) {
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
    async recordLogin(userId, ipAddress) {
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
    async incrementLoginAttempts(userId) {
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
    async findByRole(role) {
        return this.findMany({
            where: { role, isActive: true }
        });
    }
    /**
     * Get recently active users
     */
    async getRecentlyActive(hours = 24, limit = 50) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        return this.findMany({
            where: {
                lastLoginAt: { $gte: since },
                isActive: true
            },
            order: { lastLoginAt: 'DESC' },
            take: limit
        });
    }
    /**
     * Deactivate user
     */
    async deactivateUser(userId) {
        const updated = await this.updateById(userId, { isActive: false });
        return updated !== null;
    }
    /**
     * Activate user
     */
    async activateUser(userId) {
        const updated = await this.updateById(userId, { isActive: true });
        return updated !== null;
    }
    /**
     * Update user role
     */
    async updateUserRole(userId, role) {
        const updated = await this.updateById(userId, { role });
        return updated !== null;
    }
    /**
     * Add permission to user
     */
    async addPermission(userId, permission) {
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
    async removePermission(userId, permission) {
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
    async deleteInactiveUsers(inactiveDays) {
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
            cutoffDate
        });
        return result.affected || 0;
    }
}
exports.UserRepository = UserRepository;
exports.default = UserRepository;
//# sourceMappingURL=user.repository.js.map