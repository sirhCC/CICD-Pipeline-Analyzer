"use strict";
/**
 * User Entity - Represents system users with authentication and authorization
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.UserSession = exports.ApiKey = void 0;
const typeorm_1 = require("typeorm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const base_entity_1 = require("./base.entity");
const types_1 = require("../types");
/**
 * API Key Entity for programmatic access
 */
let ApiKey = class ApiKey extends base_entity_1.BaseEntity {
    name;
    key;
    description;
    permissions;
    scopes;
    isActive;
    lastUsedAt;
    expiresAt;
    lastUsedIp;
    usageCount;
    rateLimits;
    // Relations
    userId;
    user;
    /**
     * Check if API key is expired
     */
    isExpired() {
        if (!this.expiresAt) {
            return false;
        }
        return new Date() > this.expiresAt;
    }
    /**
     * Check if API key is valid for use
     */
    isValid() {
        return this.isActive && !this.isExpired();
    }
    /**
     * Record usage of the API key
     */
    recordUsage(ipAddress) {
        this.lastUsedAt = new Date();
        this.usageCount += 1;
        if (ipAddress) {
            this.lastUsedIp = ipAddress;
        }
    }
};
exports.ApiKey = ApiKey;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], ApiKey.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], ApiKey.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ApiKey.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], ApiKey.prototype, "permissions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], ApiKey.prototype, "scopes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], ApiKey.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], ApiKey.prototype, "lastUsedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], ApiKey.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], ApiKey.prototype, "lastUsedIp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ApiKey.prototype, "usageCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ApiKey.prototype, "rateLimits", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], ApiKey.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)('User', 'apiKeys', { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", Object)
], ApiKey.prototype, "user", void 0);
exports.ApiKey = ApiKey = __decorate([
    (0, typeorm_1.Entity)('api_keys'),
    (0, typeorm_1.Index)(['key'], { unique: true }),
    (0, typeorm_1.Index)(['userId']),
    (0, typeorm_1.Index)(['isActive'])
], ApiKey);
/**
 * User Session Entity for tracking active sessions
 */
let UserSession = class UserSession extends base_entity_1.BaseEntity {
    token;
    refreshToken;
    expiresAt;
    refreshExpiresAt;
    isActive;
    ipAddress;
    userAgent;
    lastActivityAt;
    metadata;
    // Relations
    userId;
    user;
    /**
     * Check if session is expired
     */
    isExpired() {
        return new Date() > this.expiresAt;
    }
    /**
     * Check if refresh token is expired
     */
    isRefreshExpired() {
        if (!this.refreshExpiresAt) {
            return true;
        }
        return new Date() > this.refreshExpiresAt;
    }
    /**
     * Check if session is valid
     */
    isValid() {
        return this.isActive && !this.isExpired();
    }
    /**
     * Update last activity timestamp
     */
    updateActivity() {
        this.lastActivityAt = new Date();
    }
    /**
     * Invalidate the session
     */
    invalidate() {
        this.isActive = false;
    }
};
exports.UserSession = UserSession;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, unique: true }),
    __metadata("design:type", String)
], UserSession.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], UserSession.prototype, "refreshToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], UserSession.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], UserSession.prototype, "refreshExpiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], UserSession.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], UserSession.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], UserSession.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], UserSession.prototype, "lastActivityAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], UserSession.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], UserSession.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)('User', 'sessions', { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", Object)
], UserSession.prototype, "user", void 0);
exports.UserSession = UserSession = __decorate([
    (0, typeorm_1.Entity)('user_sessions'),
    (0, typeorm_1.Index)(['token'], { unique: true }),
    (0, typeorm_1.Index)(['userId']),
    (0, typeorm_1.Index)(['isActive'])
], UserSession);
/**
 * User Entity for authentication and authorization
 */
let User = class User extends base_entity_1.BaseEntity {
    email;
    username;
    firstName;
    lastName;
    passwordHash;
    role;
    isActive;
    isEmailVerified;
    isMfaEnabled;
    mfaSecret;
    mfaBackupCodes;
    lastLoginAt;
    lastLoginIp;
    loginAttempts;
    lockedUntil;
    emailVerificationToken;
    passwordResetToken;
    passwordResetExpiresAt;
    preferences;
    permissions;
    metadata;
    // Relations
    sessions;
    apiKeys;
    /**
     * Hash password before saving
     */
    async hashPassword() {
        if (this.passwordHash && !this.passwordHash.startsWith('$2')) {
            // Only hash if it's not already hashed
            this.passwordHash = await bcryptjs_1.default.hash(this.passwordHash, 12);
        }
    }
    /**
     * Verify password
     */
    async verifyPassword(password) {
        return bcryptjs_1.default.compare(password, this.passwordHash);
    }
    /**
     * Get full name
     */
    getFullName() {
        return `${this.firstName} ${this.lastName}`.trim();
    }
    /**
     * Check if user is locked
     */
    isLocked() {
        return this.lockedUntil ? new Date() < this.lockedUntil : false;
    }
    /**
     * Lock user account
     */
    lockAccount(minutes = 15) {
        this.lockedUntil = new Date(Date.now() + minutes * 60 * 1000);
    }
    /**
     * Unlock user account
     */
    unlockAccount() {
        delete this.lockedUntil;
        this.loginAttempts = 0;
    }
    /**
     * Increment login attempts
     */
    incrementLoginAttempts() {
        this.loginAttempts += 1;
        // Lock account after 5 failed attempts
        if (this.loginAttempts >= 5) {
            this.lockAccount();
        }
    }
    /**
     * Reset login attempts
     */
    resetLoginAttempts() {
        this.loginAttempts = 0;
        delete this.lockedUntil;
    }
    /**
     * Record successful login
     */
    recordLogin(ipAddress) {
        this.lastLoginAt = new Date();
        if (ipAddress !== undefined) {
            this.lastLoginIp = ipAddress;
        }
        this.resetLoginAttempts();
    }
    /**
     * Check if user has permission
     */
    hasPermission(permission) {
        if (!this.permissions) {
            return false;
        }
        return this.permissions.includes(permission);
    }
    /**
     * Add permission
     */
    addPermission(permission) {
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
    removePermission(permission) {
        if (this.permissions) {
            this.permissions = this.permissions.filter(p => p !== permission);
        }
    }
    /**
     * Generate email verification token
     */
    generateEmailVerificationToken() {
        const token = Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
        this.emailVerificationToken = token;
        return token;
    }
    /**
     * Generate password reset token
     */
    generatePasswordResetToken(expirationHours = 1) {
        const token = Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
        this.passwordResetToken = token;
        this.passwordResetExpiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
        return token;
    }
    /**
     * Verify email verification token
     */
    verifyEmailToken(token) {
        return this.emailVerificationToken === token;
    }
    /**
     * Verify password reset token
     */
    verifyPasswordResetToken(token) {
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
    clearPasswordResetToken() {
        delete this.passwordResetToken;
        delete this.passwordResetExpiresAt;
    }
    /**
     * Verify email
     */
    verifyEmail() {
        this.isEmailVerified = true;
        delete this.emailVerificationToken;
    }
};
exports.User = User;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: types_1.UserRole,
        enumName: 'user_role_enum',
        default: types_1.UserRole.VIEWER
    }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isEmailVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isMfaEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "mfaSecret", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], User.prototype, "mfaBackupCodes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "lastLoginAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "lastLoginIp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "loginAttempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "lockedUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "emailVerificationToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "passwordResetToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "passwordResetExpiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "preferences", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], User.prototype, "permissions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.OneToMany)('UserSession', 'user', { cascade: true }),
    __metadata("design:type", Array)
], User.prototype, "sessions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)('ApiKey', 'user', { cascade: true }),
    __metadata("design:type", Array)
], User.prototype, "apiKeys", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], User.prototype, "hashPassword", null);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users'),
    (0, typeorm_1.Index)(['email'], { unique: true }),
    (0, typeorm_1.Index)(['username'], { unique: true }),
    (0, typeorm_1.Index)(['role']),
    (0, typeorm_1.Index)(['isActive'])
], User);
//# sourceMappingURL=user.entity.js.map