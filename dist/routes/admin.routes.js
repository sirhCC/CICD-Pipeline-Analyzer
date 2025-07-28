"use strict";
/**
 * Admin Routes - Security and System Management
 * Provides endpoints for system administration and security monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const error_handler_1 = require("../middleware/error-handler");
const database_service_1 = require("../services/database.service");
const database_security_1 = require("../core/database-security");
const database_monitor_1 = require("../core/database-monitor");
const api_response_1 = require("../shared/api-response");
const logger_1 = require("../shared/logger");
const router = (0, express_1.Router)();
exports.adminRoutes = router;
const logger = new logger_1.Logger('AdminRoutes');
/**
 * Get database health status including security metrics
 */
router.get('/health', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ADMIN), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const healthStatus = await database_service_1.databaseService.getHealthStatus();
    res.json(api_response_1.ResponseBuilder.success(healthStatus));
}));
/**
 * Get security metrics and recent events
 */
router.get('/security/metrics', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ADMIN), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const securityMetrics = database_security_1.databaseSecurityManager.getSecurityMetrics();
    const recentEvents = database_security_1.databaseSecurityManager.getRecentEvents(50);
    res.json(api_response_1.ResponseBuilder.success({
        metrics: securityMetrics,
        recentEvents
    }));
}));
/**
 * Get comprehensive security report
 */
router.get('/security/report', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ADMIN), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const securityReport = database_security_1.databaseSecurityManager.generateSecurityReport();
    res.json(api_response_1.ResponseBuilder.success(securityReport));
}));
/**
 * Get database connection metrics
 */
router.get('/database/metrics', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ADMIN), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const connectionStats = database_monitor_1.databaseConnectionManager.getConnectionStats();
    const metrics = database_monitor_1.databaseConnectionManager.getMetrics();
    const recommendations = database_monitor_1.databaseConnectionManager.getPerformanceRecommendations();
    res.json(api_response_1.ResponseBuilder.success({
        connectionStats,
        metrics,
        recommendations
    }));
}));
/**
 * Reset security metrics (for testing/maintenance)
 */
router.post('/security/reset', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ADMIN), (0, error_handler_1.asyncHandler)(async (req, res) => {
    database_security_1.databaseSecurityManager.resetMetrics();
    logger.info('Security metrics reset by admin', {
        userId: req.user?.userId,
        email: req.user?.email
    });
    res.json(api_response_1.ResponseBuilder.success({ message: 'Security metrics reset successfully' }));
}));
/**
 * Test database connection
 */
router.get('/database/test-connection', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ADMIN), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const isConnected = await database_monitor_1.databaseConnectionManager.testConnection();
    res.json(api_response_1.ResponseBuilder.success({
        isConnected,
        timestamp: new Date().toISOString(),
        message: `Database connection ${isConnected ? 'successful' : 'failed'}`
    }));
}));
/**
 * Get system information
 */
router.get('/system/info', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ADMIN), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const systemInfo = {
        node: {
            version: process.version,
            platform: process.platform,
            arch: process.arch,
            uptime: process.uptime()
        },
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    };
    res.json(api_response_1.ResponseBuilder.success(systemInfo));
}));
//# sourceMappingURL=admin.routes.js.map