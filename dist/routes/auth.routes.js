"use strict";
/**
 * Authentication Routes
 * JWT-based authentication with registration, login, and API key management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const request_validation_1 = require("../middleware/request-validation");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
// Public routes
router.post('/login', request_validation_1.validation.login, auth_controller_1.authController.login);
router.post('/register', request_validation_1.validation.register, auth_controller_1.authController.register);
router.post('/refresh', auth_controller_1.authController.refreshToken);
// Protected routes
router.use(auth_1.authenticateJWT);
router.get('/profile', auth_controller_1.authController.getProfile);
router.put('/profile', auth_controller_1.authController.updateProfile);
router.post('/logout', auth_controller_1.authController.logout);
// API key management
router.get('/api-keys', auth_controller_1.authController.listApiKeys);
router.post('/api-keys', auth_controller_1.authController.createApiKey);
router.delete('/api-keys/:keyId', auth_controller_1.authController.revokeApiKey);
// Admin only routes
router.get('/users', (0, auth_1.requireRole)(auth_1.UserRole.ADMIN), auth_controller_1.authController.listUsers);
router.put('/users/:userId/role', (0, auth_1.requireRole)(auth_1.UserRole.ADMIN), auth_controller_1.authController.updateUserRole);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map