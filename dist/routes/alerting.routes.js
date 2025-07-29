"use strict";
/**
 * Alerting System Routes - Advanced Alert Management API
 * Provides endpoints for alert configuration, management, and monitoring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertingRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const error_handler_1 = require("../middleware/error-handler");
const request_validation_1 = require("../middleware/request-validation");
const api_response_1 = require("../shared/api-response");
const logger_1 = require("../shared/logger");
const alerting_service_1 = require("../services/alerting.service");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
exports.alertingRoutes = router;
const logger = new logger_1.Logger('AlertingRoutes');
// Validation schemas
const alertConfigurationSchema = joi_1.default.object({
    name: joi_1.default.string().min(3).max(100).required(),
    description: joi_1.default.string().max(500).optional(),
    enabled: joi_1.default.boolean().default(true),
    type: joi_1.default.string().valid(...Object.values(alerting_service_1.AlertType)).required(),
    severity: joi_1.default.string().valid(...Object.values(alerting_service_1.AlertSeverity)).required(),
    thresholds: joi_1.default.object({
        anomaly: joi_1.default.object({
            zScoreThreshold: joi_1.default.number().min(1).max(5),
            percentileThreshold: joi_1.default.number().min(90).max(99.9),
            minDataPoints: joi_1.default.number().min(5).max(1000),
            triggerCount: joi_1.default.number().min(1).max(10)
        }).optional(),
        sla: joi_1.default.object({
            violationPercent: joi_1.default.number().min(0).max(100),
            durationMinutes: joi_1.default.number().min(1),
            frequency: joi_1.default.number().min(1),
            timePeriodHours: joi_1.default.number().min(1).max(168)
        }).optional(),
        cost: joi_1.default.object({
            absoluteThreshold: joi_1.default.number().min(0),
            percentageIncrease: joi_1.default.number().min(0).max(1000),
            budgetExceeded: joi_1.default.number().min(0),
            trendDetection: joi_1.default.boolean()
        }).optional(),
        performance: joi_1.default.object({
            durationMs: joi_1.default.number().min(0),
            errorRate: joi_1.default.number().min(0).max(100),
            successRate: joi_1.default.number().min(0).max(100),
            resourceUtilization: joi_1.default.number().min(0).max(100)
        }).optional()
    }).required(),
    channels: joi_1.default.array().items(joi_1.default.object({
        id: joi_1.default.string().required(),
        type: joi_1.default.string().valid(...Object.values(alerting_service_1.ChannelType)).required(),
        enabled: joi_1.default.boolean().default(true),
        config: joi_1.default.object().required(),
        filters: joi_1.default.object({
            severities: joi_1.default.array().items(joi_1.default.string().valid(...Object.values(alerting_service_1.AlertSeverity))),
            types: joi_1.default.array().items(joi_1.default.string().valid(...Object.values(alerting_service_1.AlertType))),
            pipelineIds: joi_1.default.array().items(joi_1.default.string()).optional(),
            timeWindows: joi_1.default.array().optional()
        }).required(),
        retryPolicy: joi_1.default.object({
            enabled: joi_1.default.boolean().default(true),
            maxRetries: joi_1.default.number().min(0).max(10).default(3),
            retryDelayMs: joi_1.default.number().min(1000).max(60000).default(5000),
            exponentialBackoff: joi_1.default.boolean().default(true),
            maxRetryDelayMs: joi_1.default.number().min(5000).max(300000).default(30000)
        }).default({})
    })).min(1).required(),
    escalation: joi_1.default.object({
        enabled: joi_1.default.boolean().default(false),
        stages: joi_1.default.array().items(joi_1.default.object({
            stage: joi_1.default.number().min(1).required(),
            delayMinutes: joi_1.default.number().min(1).max(1440).required(),
            channels: joi_1.default.array().items(joi_1.default.string()).required(),
            requiresAcknowledgment: joi_1.default.boolean().default(false),
            notifyRoles: joi_1.default.array().items(joi_1.default.string()).default([]),
            notifyUsers: joi_1.default.array().items(joi_1.default.string()).default([])
        })).optional().default([]),
        maxEscalations: joi_1.default.number().min(1).max(5).default(3),
        escalationTimeoutMinutes: joi_1.default.number().min(5).max(1440).default(60),
        autoResolve: joi_1.default.boolean().default(false),
        autoResolveTimeoutMinutes: joi_1.default.number().min(60).max(4320).default(240)
    }).default({}),
    filters: joi_1.default.object({
        pipelineIds: joi_1.default.array().items(joi_1.default.string()).optional(),
        environments: joi_1.default.array().items(joi_1.default.string()).optional(),
        tags: joi_1.default.array().items(joi_1.default.string()).optional(),
        timeWindows: joi_1.default.array().optional(),
        excludePatterns: joi_1.default.array().items(joi_1.default.string()).optional()
    }).default({}),
    rateLimit: joi_1.default.object({
        enabled: joi_1.default.boolean().default(true),
        maxAlertsPerHour: joi_1.default.number().min(1).max(100).default(10),
        maxAlertsPerDay: joi_1.default.number().min(1).max(1000).default(50),
        cooldownMinutes: joi_1.default.number().min(1).max(60).default(5),
        deduplicationWindow: joi_1.default.number().min(1).max(120).default(30)
    }).default({}),
    metadata: joi_1.default.object().default({})
});
const acknowledgeAlertSchema = joi_1.default.object({
    comment: joi_1.default.string().max(500).optional()
});
const resolveAlertSchema = joi_1.default.object({
    resolutionType: joi_1.default.string().valid(...Object.values(alerting_service_1.ResolutionType)).default(alerting_service_1.ResolutionType.MANUAL),
    comment: joi_1.default.string().max(500).optional(),
    rootCause: joi_1.default.string().max(500).optional(),
    actionsTaken: joi_1.default.array().items(joi_1.default.string().max(200)).default([])
});
/**
 * POST /alerts/configurations - Create new alert configuration
 */
router.post('/configurations', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ADMIN), (0, request_validation_1.validateRequest)({ body: alertConfigurationSchema }), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const configData = req.body;
    const userId = req.user?.userId;
    logger.info('Creating alert configuration', {
        name: configData.name,
        type: configData.type,
        severity: configData.severity,
        userId
    });
    try {
        const configId = await alerting_service_1.alertingService.createAlertConfiguration({
            ...configData,
            createdBy: userId || 'unknown'
        });
        res.status(201).json(api_response_1.ResponseBuilder.success({
            configurationId: configId,
            message: 'Alert configuration created successfully'
        }));
        return;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to create alert configuration', { error: errorMessage, userId });
        throw new error_handler_1.AppError('Failed to create alert configuration', 500);
    }
}));
/**
 * GET /alerts/configurations - Get all alert configurations
 */
router.get('/configurations', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.userId;
    logger.info('Fetching alert configurations', { userId });
    try {
        // In a real implementation, this would fetch from database
        // For now, return empty array as configurations are stored in memory
        const configurations = [];
        res.json(api_response_1.ResponseBuilder.success({
            configurations,
            total: configurations.length
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to fetch alert configurations', { error: errorMessage, userId });
        throw new error_handler_1.AppError('Failed to fetch alert configurations', 500);
    }
}));
/**
 * POST /alerts/trigger - Manually trigger an alert for testing
 */
router.post('/trigger', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ADMIN), (0, request_validation_1.validateRequest)({
    body: joi_1.default.object({
        type: joi_1.default.string().valid(...Object.values(alerting_service_1.AlertType)).required(),
        details: joi_1.default.object({
            triggerValue: joi_1.default.number().required(),
            threshold: joi_1.default.number().required(),
            metric: joi_1.default.string().required(),
            pipelineId: joi_1.default.string().optional(),
            runId: joi_1.default.string().optional(),
            source: joi_1.default.string().default('manual'),
            raw: joi_1.default.object().default({})
        }).required(),
        context: joi_1.default.object({
            environment: joi_1.default.string().default('test'),
            tags: joi_1.default.array().items(joi_1.default.string()).default([]),
            metadata: joi_1.default.object().default({}),
            relatedAlerts: joi_1.default.array().items(joi_1.default.string()).default([])
        }).default({})
    })
}), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { type, details, context } = req.body;
    const userId = req.user?.userId;
    logger.info('Manually triggering alert', {
        type,
        metric: details.metric,
        triggerValue: details.triggerValue,
        userId
    });
    try {
        const alertId = await alerting_service_1.alertingService.triggerAlert(type, details, context);
        if (!alertId) {
            return res.json(api_response_1.ResponseBuilder.success({
                triggered: false,
                message: 'Alert was not triggered (no matching configurations or rate limited)'
            }));
        }
        return res.json(api_response_1.ResponseBuilder.success({
            triggered: true,
            alertId,
            message: 'Alert triggered successfully'
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to trigger alert', { error: errorMessage, type, userId });
        throw new error_handler_1.AppError('Failed to trigger alert', 500);
    }
}));
/**
 * GET /alerts/active - Get all active alerts
 */
router.get('/active', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { type, severity, pipelineId, limit } = req.query;
    const userId = req.user?.userId;
    logger.info('Fetching active alerts', {
        type,
        severity,
        pipelineId,
        limit,
        userId
    });
    try {
        const filters = {
            ...(type && { type: type }),
            ...(severity && { severity: severity }),
            ...(pipelineId && { pipelineId: pipelineId }),
            ...(limit && { limit: parseInt(limit) })
        };
        const activeAlerts = alerting_service_1.alertingService.getActiveAlerts(filters);
        res.json(api_response_1.ResponseBuilder.success({
            alerts: activeAlerts,
            total: activeAlerts.length,
            filters
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to fetch active alerts', { error: errorMessage, userId });
        throw new error_handler_1.AppError('Failed to fetch active alerts', 500);
    }
}));
/**
 * GET /alerts/history - Get alert history
 */
router.get('/history', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { type, severity, status, startDate, endDate, limit } = req.query;
    const userId = req.user?.userId;
    logger.info('Fetching alert history', {
        type,
        severity,
        status,
        startDate,
        endDate,
        limit,
        userId
    });
    try {
        const filters = {
            ...(type && { type: type }),
            ...(severity && { severity: severity }),
            ...(status && { status: status }),
            ...(startDate && { startDate: new Date(startDate) }),
            ...(endDate && { endDate: new Date(endDate) }),
            ...(limit && { limit: parseInt(limit) })
        };
        const alertHistory = alerting_service_1.alertingService.getAlertHistory(filters);
        res.json(api_response_1.ResponseBuilder.success({
            alerts: alertHistory,
            total: alertHistory.length,
            filters
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to fetch alert history', { error: errorMessage, userId });
        throw new error_handler_1.AppError('Failed to fetch alert history', 500);
    }
}));
/**
 * POST /alerts/:alertId/acknowledge - Acknowledge an alert
 */
router.post('/:alertId/acknowledge', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_WRITE), (0, request_validation_1.validateRequest)({ body: acknowledgeAlertSchema }), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { alertId } = req.params;
    const { comment } = req.body;
    const userId = req.user?.userId;
    if (!alertId) {
        throw new error_handler_1.AppError('Alert ID is required', 400);
    }
    logger.info('Acknowledging alert', {
        alertId,
        userId,
        comment: comment ? 'provided' : 'none'
    });
    try {
        const resolvedUserId = userId || 'unknown';
        await alerting_service_1.alertingService.acknowledgeAlert(alertId, resolvedUserId, comment);
        return res.json(api_response_1.ResponseBuilder.success({
            acknowledged: true,
            message: 'Alert acknowledged successfully'
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to acknowledge alert', { error: errorMessage, alertId, userId });
        if (error instanceof error_handler_1.AppError) {
            throw error;
        }
        throw new error_handler_1.AppError('Failed to acknowledge alert', 500);
    }
}));
/**
 * POST /alerts/:alertId/resolve - Resolve an alert
 */
router.post('/:alertId/resolve', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_WRITE), (0, request_validation_1.validateRequest)({ body: resolveAlertSchema }), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { alertId } = req.params;
    const { resolutionType, comment, rootCause, actionsTaken } = req.body;
    const userId = req.user?.userId;
    if (!alertId) {
        throw new error_handler_1.AppError('Alert ID is required', 400);
    }
    logger.info('Resolving alert', {
        alertId,
        resolutionType,
        userId,
        rootCause: rootCause ? 'provided' : 'none'
    });
    try {
        const resolvedUserId = userId || 'unknown';
        await alerting_service_1.alertingService.resolveAlert(alertId, resolvedUserId, resolutionType, comment, rootCause, actionsTaken);
        return res.json(api_response_1.ResponseBuilder.success({
            resolved: true,
            message: 'Alert resolved successfully'
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to resolve alert', { error: errorMessage, alertId, userId });
        if (error instanceof error_handler_1.AppError) {
            throw error;
        }
        throw new error_handler_1.AppError('Failed to resolve alert', 500);
    }
}));
/**
 * GET /alerts/metrics - Get alerting system metrics
 */
router.get('/metrics', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.userId;
    logger.info('Fetching alerting metrics', { userId });
    try {
        const metrics = alerting_service_1.alertingService.getAlertingMetrics();
        res.json(api_response_1.ResponseBuilder.success({
            metrics,
            timestamp: new Date().toISOString()
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to fetch alerting metrics', { error: errorMessage, userId });
        throw new error_handler_1.AppError('Failed to fetch alerting metrics', 500);
    }
}));
/**
 * GET /alerts/health - Get alerting system health
 */
router.get('/health', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.userId;
    logger.info('Checking alerting system health', { userId });
    try {
        const health = {
            status: 'healthy',
            initialized: true,
            timestamp: new Date().toISOString(),
            metrics: alerting_service_1.alertingService.getAlertingMetrics()
        };
        res.json(api_response_1.ResponseBuilder.success({ health }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Alerting health check failed', { error: errorMessage, userId });
        res.json(api_response_1.ResponseBuilder.success({
            health: {
                status: 'unhealthy',
                error: errorMessage,
                timestamp: new Date().toISOString()
            }
        }));
    }
}));
//# sourceMappingURL=alerting.routes.js.map