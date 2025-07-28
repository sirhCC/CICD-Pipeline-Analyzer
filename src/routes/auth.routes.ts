/**
 * Authentication Routes
 * JWT-based authentication with registration, login, and API key management
 */

import { Router } from 'express';
import { authenticateJWT, requireRole, UserRole } from '../middleware/auth';
import { validation } from '../middleware/request-validation';
import { authController } from '../controllers/auth.controller';

const router = Router();

// Public routes
router.post('/login', validation.login, authController.login);
router.post('/register', validation.register, authController.register);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.use(authenticateJWT);
router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.post('/logout', authController.logout);

// API key management
router.get('/api-keys', authController.listApiKeys);
router.post('/api-keys', authController.createApiKey);
router.delete('/api-keys/:keyId', authController.revokeApiKey);

// Admin only routes
router.get('/users', requireRole(UserRole.ADMIN), authController.listUsers);
router.put('/users/:userId/role', requireRole(UserRole.ADMIN), authController.updateUserRole);

export default router;
