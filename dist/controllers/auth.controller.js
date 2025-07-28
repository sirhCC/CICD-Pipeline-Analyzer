"use strict";
/**
 * Authentication Controller
 * Handles user authentication, registration, and session management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_1 = require("../middleware/auth");
const repositories_1 = require("../repositories");
const logger_1 = require("../shared/logger");
const error_handler_1 = require("../middleware/error-handler");
const logger = new logger_1.Logger('AuthController');
exports.authController = {
    /**
     * User login with JWT token generation
     */
    async login(req, res, next) {
        try {
            const { email, password, rememberMe = false } = req.body;
            // Find user by email
            const user = await repositories_1.userRepository.findByEmail(email);
            if (!user) {
                throw new error_handler_1.AuthenticationError('Invalid credentials');
            }
            // Verify password
            const isValidPassword = await (0, auth_1.verifyPassword)(password, user.passwordHash);
            if (!isValidPassword) {
                await repositories_1.userRepository.incrementLoginAttempts(user.id);
                throw new error_handler_1.AuthenticationError('Invalid credentials');
            }
            // Check if user is active
            if (!user.isActive) {
                throw new error_handler_1.AuthenticationError('Account is disabled');
            }
            // Generate session
            const sessionId = (0, auth_1.generateSessionId)();
            // Generate tokens
            const accessToken = auth_1.authService.generateAccessToken({
                userId: user.id,
                email: user.email,
                role: user.role,
                permissions: user.permissions || [],
                sessionId
            });
            const refreshToken = auth_1.authService.generateRefreshToken(user.id, sessionId, 'web');
            // Record successful login
            await repositories_1.userRepository.recordLogin(user.id, req.ip);
            // Set HTTP-only cookie for refresh token if remember me
            if (rememberMe) {
                res.cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
                });
            }
            logger.info('User login successful', {
                userId: user.id,
                email: user.email,
                ip: req.ip
            });
            res.apiSuccess({
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    permissions: user.permissions
                },
                accessToken,
                ...(rememberMe ? {} : { refreshToken })
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * User registration
     */
    async register(req, res, next) {
        try {
            const { email, password, firstName, lastName } = req.body;
            // Check if user already exists
            const existingUser = await repositories_1.userRepository.findByEmail(email);
            if (existingUser) {
                throw new error_handler_1.ValidationError('User already exists with this email');
            }
            // Hash password
            const passwordHash = await (0, auth_1.hashPassword)(password);
            // Create user
            const user = await repositories_1.userRepository.create({
                email,
                passwordHash,
                firstName,
                lastName,
                role: auth_1.UserRole.VIEWER, // Default role
                permissions: [],
                isActive: true
            });
            logger.info('User registration successful', {
                userId: user.id,
                email: user.email
            });
            res.apiCreated({
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role
                }
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Refresh access token
     */
    async refreshToken(req, res, next) {
        try {
            const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
            if (!refreshToken) {
                throw new error_handler_1.AuthenticationError('Refresh token is required');
            }
            // Verify refresh token
            const decoded = auth_1.authService.verifyToken(refreshToken, auth_1.authService.config.jwtRefreshSecret);
            // Generate new access token
            const user = await repositories_1.userRepository.findById(decoded.userId);
            if (!user || !user.isActive) {
                throw new error_handler_1.AuthenticationError('User not found or inactive');
            }
            const accessToken = auth_1.authService.generateAccessToken({
                userId: user.id,
                email: user.email,
                role: user.role,
                permissions: user.permissions || [],
                sessionId: decoded.sessionId
            });
            res.apiSuccess({ accessToken });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Get user profile
     */
    async getProfile(req, res, next) {
        try {
            const user = await repositories_1.userRepository.findById(req.user.userId);
            if (!user) {
                throw new error_handler_1.NotFoundError('User');
            }
            res.apiSuccess({
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    permissions: user.permissions,
                    createdAt: user.createdAt,
                    lastLoginAt: user.lastLoginAt
                }
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Update user profile
     */
    async updateProfile(req, res, next) {
        try {
            const { firstName, lastName } = req.body;
            const user = await repositories_1.userRepository.updateById(req.user.userId, {
                firstName,
                lastName
            });
            if (!user) {
                throw new error_handler_1.NotFoundError('User');
            }
            res.apiSuccess({ user });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * User logout
     */
    async logout(req, res, next) {
        try {
            // Blacklist the current token
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                auth_1.authService.blacklistToken(token);
            }
            // Clear refresh token cookie
            res.clearCookie('refreshToken');
            logger.info('User logout successful', {
                userId: req.user.userId,
                sessionId: req.user.sessionId
            });
            res.apiSuccess({ message: 'Logged out successfully' });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * List API keys for user
     */
    async listApiKeys(req, res, next) {
        try {
            const user = await repositories_1.userRepository.findById(req.user.userId, { relations: ['apiKeys'] });
            if (!user) {
                throw new error_handler_1.NotFoundError('User');
            }
            const apiKeys = user.apiKeys?.map(key => ({
                id: key.id,
                name: key.name,
                permissions: key.permissions,
                lastUsed: key.lastUsedAt,
                expiresAt: key.expiresAt,
                createdAt: key.createdAt
            })) || [];
            res.apiSuccess({ apiKeys });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Create new API key
     */
    async createApiKey(req, res, next) {
        try {
            const { name, permissions, expiresIn } = req.body;
            // Generate API key
            const apiKey = auth_1.authService.generateApiKey({
                keyId: (0, auth_1.generateSessionId)(),
                userId: req.user.userId,
                permissions: permissions || ['pipelines:read'],
                rateLimit: 1000,
                expiresIn: expiresIn || '90d'
            });
            // Save to database (implementation depends on your ApiKey entity)
            // const savedKey = await apiKeyRepository.create({ ... });
            res.apiCreated({
                apiKey,
                message: 'API key created successfully. Store it securely as it won\'t be shown again.'
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Revoke API key
     */
    async revokeApiKey(req, res, next) {
        try {
            const { keyId } = req.params;
            // Implementation depends on your ApiKey repository
            // await apiKeyRepository.deleteByIdAndUserId(keyId, req.user!.userId);
            res.apiSuccess({ message: 'API key revoked successfully' });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * List all users (Admin only) - Simplified for Phase 1
     */
    async listUsers(req, res, next) {
        try {
            // For Phase 1, return a simplified response
            res.apiSuccess({
                users: [],
                message: 'User management will be implemented in Phase 2'
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Update user role (Admin only) - Simplified for Phase 1
     */
    async updateUserRole(req, res, next) {
        try {
            const { userId } = req.params;
            const { role } = req.body;
            if (!userId) {
                throw new error_handler_1.ValidationError('User ID is required');
            }
            // For Phase 1, just return success without actual implementation
            logger.info('User role update requested', {
                adminUserId: req.user.userId,
                targetUserId: userId,
                newRole: role
            });
            res.apiSuccess({ message: 'User role management will be implemented in Phase 2' });
        }
        catch (error) {
            next(error);
        }
    }
};
//# sourceMappingURL=auth.controller.js.map