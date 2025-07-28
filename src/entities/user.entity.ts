/**
 * User Entity - Represents system users with authentication and authorization
 */

import { Entity, Column, Index, OneToMany, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import bcrypt from 'bcryptjs';
import { BaseEntity } from './base.entity';
import { UserRole } from '../types';

/**
 * API Key Entity for programmatic access
 */
@Entity('api_keys')
@Index(['key'], { unique: true })
@Index(['userId'])
@Index(['isActive'])
export class ApiKey extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  key!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  permissions?: string[];

  @Column({ type: 'json', nullable: true })
  scopes?: string[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastUsedIp?: string;

  @Column({ type: 'int', default: 0 })
  usageCount!: number;

  @Column({ type: 'json', nullable: true })
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };

  // Relations
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User', 'apiKeys', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: any;

  /**
   * Check if API key is expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    return new Date() > this.expiresAt;
  }

  /**
   * Check if API key is valid for use
   */
  isValid(): boolean {
    return this.isActive && !this.isExpired();
  }

  /**
   * Record usage of the API key
   */
  recordUsage(ipAddress?: string): void {
    this.lastUsedAt = new Date();
    this.usageCount += 1;
    if (ipAddress) {
      this.lastUsedIp = ipAddress;
    }
  }
}

/**
 * User Session Entity for tracking active sessions
 */
@Entity('user_sessions')
@Index(['token'], { unique: true })
@Index(['userId'])
@Index(['isActive'])
export class UserSession extends BaseEntity {
  @Column({ type: 'varchar', length: 500, unique: true })
  token!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  refreshToken?: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  refreshExpiresAt?: Date;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastActivityAt?: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  // Relations
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User', 'sessions', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: any;

  /**
   * Check if session is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if refresh token is expired
   */
  isRefreshExpired(): boolean {
    if (!this.refreshExpiresAt) {
      return true;
    }
    return new Date() > this.refreshExpiresAt;
  }

  /**
   * Check if session is valid
   */
  isValid(): boolean {
    return this.isActive && !this.isExpired();
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(): void {
    this.lastActivityAt = new Date();
  }

  /**
   * Invalidate the session
   */
  invalidate(): void {
    this.isActive = false;
  }
}

/**
 * User Entity for authentication and authorization
 */
@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
@Index(['role'])
@Index(['isActive'])
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255 })
  firstName!: string;

  @Column({ type: 'varchar', length: 255 })
  lastName!: string;

  @Column({ type: 'varchar', length: 500 })
  passwordHash!: string;

  @Column({ 
    type: 'enum', 
    enum: UserRole,
    enumName: 'user_role_enum',
    default: UserRole.VIEWER
  })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @Column({ type: 'boolean', default: false })
  isMfaEnabled!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mfaSecret?: string;

  @Column({ type: 'json', nullable: true })
  mfaBackupCodes?: string[];

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastLoginIp?: string;

  @Column({ type: 'int', default: 0 })
  loginAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailVerificationToken?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken?: string;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetExpiresAt?: Date;

  @Column({ type: 'json', nullable: true })
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

  @Column({ type: 'json', nullable: true })
  permissions?: string[];

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  // Relations
  @OneToMany('UserSession', 'user', { cascade: true })
  sessions!: any[];

  @OneToMany('ApiKey', 'user', { cascade: true })
  apiKeys!: any[];

  /**
   * Hash password before saving
   */
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.passwordHash && !this.passwordHash.startsWith('$2')) {
      // Only hash if it's not already hashed
      this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  /**
   * Get full name
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /**
   * Check if user is locked
   */
  isLocked(): boolean {
    return this.lockedUntil ? new Date() < this.lockedUntil : false;
  }

  /**
   * Lock user account
   */
  lockAccount(minutes: number = 15): void {
    this.lockedUntil = new Date(Date.now() + minutes * 60 * 1000);
  }

  /**
   * Unlock user account
   */
  unlockAccount(): void {
    delete (this as any).lockedUntil;
    this.loginAttempts = 0;
  }

  /**
   * Increment login attempts
   */
  incrementLoginAttempts(): void {
    this.loginAttempts += 1;
    
    // Lock account after 5 failed attempts
    if (this.loginAttempts >= 5) {
      this.lockAccount();
    }
  }

  /**
   * Reset login attempts
   */
  resetLoginAttempts(): void {
    this.loginAttempts = 0;
    delete (this as any).lockedUntil;
  }

  /**
   * Record successful login
   */
  recordLogin(ipAddress?: string): void {
    this.lastLoginAt = new Date();
    if (ipAddress !== undefined) {
      this.lastLoginIp = ipAddress;
    }
    this.resetLoginAttempts();
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: string): boolean {
    if (!this.permissions) {
      return false;
    }
    return this.permissions.includes(permission);
  }

  /**
   * Add permission
   */
  addPermission(permission: string): void {
    if (!this.permissions) {
      this.permissions = [];
    }
    if (!this.permissions.includes(permission)) {
      this.permissions.push(permission);
    }
  }

  /**
   * Remove permission
   */
  removePermission(permission: string): void {
    if (this.permissions) {
      this.permissions = this.permissions.filter(p => p !== permission);
    }
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(): string {
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    this.emailVerificationToken = token;
    return token;
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(expirationHours: number = 1): string {
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    this.passwordResetToken = token;
    this.passwordResetExpiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
    return token;
  }

  /**
   * Verify email verification token
   */
  verifyEmailToken(token: string): boolean {
    return this.emailVerificationToken === token;
  }

  /**
   * Verify password reset token
   */
  verifyPasswordResetToken(token: string): boolean {
    if (!this.passwordResetToken || !this.passwordResetExpiresAt) {
      return false;
    }
    
    const isValidToken = this.passwordResetToken === token;
    const isNotExpired = new Date() < this.passwordResetExpiresAt;
    
    return isValidToken && isNotExpired;
  }

  /**
   * Clear password reset token
   */
  clearPasswordResetToken(): void {
    delete (this as any).passwordResetToken;
    delete (this as any).passwordResetExpiresAt;
  }

  /**
   * Verify email
   */
  verifyEmail(): void {
    this.isEmailVerified = true;
    delete (this as any).emailVerificationToken;
  }
}
