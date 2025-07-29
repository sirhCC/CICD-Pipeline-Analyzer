"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_service_1 = require("../services/analytics.service");
const auth_1 = require("../middleware/auth");
const error_handler_1 = require("../middleware/error-handler");
const request_validation_1 = require("../middleware/request-validation");
const request_logger_1 = require("../middleware/request-logger");
const api_response_1 = require("../shared/api-response");
const logger_1 = require("../shared/logger");
const joi_1 = __importDefault(require("joi"));
const alerting_routes_1 = require("./alerting.routes");
const advanced_data_processing_routes_1 = __importDefault(require("./advanced-data-processing.routes"));
const router = (0, express_1.Router)();
const logger = new logger_1.Logger('AnalyticsRoutes');
// Initialize analytics service with configuration
const analyticsService = new analytics_service_1.AnalyticsService({
    enableRealTimeAnalysis: true,
    metricRetentionDays: 90,
    alertThresholds: {
        failureRate: 0.15,
        avgDuration: 1800,
        errorSpike: 5
    },
    batchSize: 100,
    analysisInterval: 15
});
// Apply middleware
router.use(request_logger_1.requestLoggers.production);
router.use(auth_1.authenticateJWT);
// Validation schemas
const pipelineParamsValidation = {
    params: joi_1.default.object({
        pipelineId: joi_1.default.string().uuid().required()
    })
};
const metricsQueryValidation = {
    query: joi_1.default.object({
        period: joi_1.default.string().valid('hourly', 'daily', 'weekly', 'monthly').default('daily'),
        limit: joi_1.default.number().integer().min(1).max(1000).default(100)
    })
};
const dashboardQueryValidation = {
    query: joi_1.default.object({
        period: joi_1.default.string().valid('hourly', 'daily', 'weekly', 'monthly').default('daily'),
        pipelineId: joi_1.default.string().uuid().optional()
    })
};
const alertParamsValidation = {
    params: joi_1.default.object({
        alertId: joi_1.default.string().uuid().required()
    })
};
const alertUpdateValidation = {
    body: joi_1.default.object({
        acknowledged: joi_1.default.boolean().required(),
        acknowledgedBy: joi_1.default.string().max(100).optional()
    })
};
/**
 * GET /analytics/dashboard
 * Get analytics dashboard data for overview
 */
router.get('/dashboard', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_READ), (0, request_validation_1.validateRequest)(dashboardQueryValidation), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { period, pipelineId } = req.query;
    logger.info('Analytics dashboard requested', {
        period,
        pipelineId,
        userId: req.user?.userId
    });
    const dashboard = await analyticsService.generateDashboard({
        timeRange: period,
        pipelineId: pipelineId
    });
    res.json(api_response_1.ResponseBuilder.success(dashboard, {
        performance: { executionTime: Date.now() - req.startTime }
    }));
}));
/**
 * GET /analytics/pipelines/:pipelineId/metrics
 * Get detailed metrics for a specific pipeline
 */
router.get('/pipelines/:pipelineId/metrics', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_READ), (0, request_validation_1.validateRequest)(pipelineParamsValidation), (0, request_validation_1.validateRequest)(metricsQueryValidation), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { pipelineId } = req.params;
    const { period, limit } = req.query;
    logger.info('Pipeline metrics requested', {
        pipelineId,
        period,
        limit,
        userId: req.user?.userId
    });
    const metrics = await analyticsService.calculateMetrics(pipelineId, period);
    res.json(api_response_1.ResponseBuilder.success(metrics, {
        performance: { executionTime: Date.now() - req.startTime }
    }));
}));
/**
 * GET /analytics/pipelines/:pipelineId/patterns
 * Detect failure patterns for a specific pipeline
 */
router.get('/pipelines/:pipelineId/patterns', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_READ), (0, request_validation_1.validateRequest)(pipelineParamsValidation), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { pipelineId } = req.params;
    logger.info('Failure patterns requested', {
        pipelineId,
        userId: req.user?.userId
    });
    const patterns = await analyticsService.detectFailurePatterns(pipelineId);
    res.json(api_response_1.ResponseBuilder.success(patterns, {
        performance: { executionTime: Date.now() - req.startTime }
    }));
}));
/**
 * GET /analytics/patterns
 * Get global failure patterns across all pipelines
 */
router.get('/patterns', (0, auth_1.requirePermission)(auth_1.Permission.SYSTEM_METRICS), (0, error_handler_1.asyncHandler)(async (req, res) => {
    logger.info('Global failure patterns requested', {
        userId: req.user?.userId
    });
    const patterns = await analyticsService.detectFailurePatterns();
    res.json(api_response_1.ResponseBuilder.success(patterns, {
        performance: { executionTime: Date.now() - req.startTime }
    }));
}));
/**
 * GET /analytics/pipelines/:pipelineId/recommendations
 * Get optimization recommendations for a specific pipeline
 */
router.get('/pipelines/:pipelineId/recommendations', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_READ), (0, request_validation_1.validateRequest)(pipelineParamsValidation), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { pipelineId } = req.params;
    logger.info('Optimization recommendations requested', {
        pipelineId,
        userId: req.user?.userId
    });
    const recommendations = await analyticsService.generateOptimizationRecommendations(pipelineId);
    res.json(api_response_1.ResponseBuilder.success(recommendations, {
        performance: { executionTime: Date.now() - req.startTime }
    }));
}));
/**
 * GET /analytics/alerts
 * Get analytics alerts
 */
router.get('/alerts', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_READ), (0, error_handler_1.asyncHandler)(async (req, res) => {
    logger.info('Analytics alerts requested', {
        userId: req.user?.userId
    });
    const alerts = await analyticsService.generateAlerts();
    res.json(api_response_1.ResponseBuilder.success(alerts, {
        performance: { executionTime: Date.now() - req.startTime }
    }));
}));
/**
 * PUT /analytics/alerts/:alertId
 * Update alert status (acknowledge/resolve)
 */
router.put('/alerts/:alertId', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_WRITE), (0, request_validation_1.validateRequest)(alertParamsValidation), (0, request_validation_1.validateRequest)(alertUpdateValidation), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { alertId } = req.params;
    const { acknowledged, acknowledgedBy } = req.body;
    logger.info('Alert update requested', {
        alertId,
        acknowledged,
        acknowledgedBy,
        userId: req.user?.userId
    });
    const updatedAlert = await analyticsService.updateAlert(alertId, {
        acknowledged,
        acknowledgedBy
    });
    res.json(api_response_1.ResponseBuilder.success(updatedAlert));
}));
/**
 * POST /analytics/pipelines/:pipelineId/trigger
 * Trigger analytics analysis for a specific pipeline
 */
router.post('/pipelines/:pipelineId/trigger', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_WRITE), (0, request_validation_1.validateRequest)(pipelineParamsValidation), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { pipelineId } = req.params;
    logger.info('Analytics trigger requested', {
        pipelineId,
        userId: req.user?.userId
    });
    // Start analysis in background
    analyticsService.analyzeAsync(pipelineId).catch(error => {
        logger.error('Background analytics analysis failed', {
            pipelineId,
            error: error.message
        });
    });
    res.json(api_response_1.ResponseBuilder.success({
        pipelineId,
        status: 'triggered',
        message: 'Analytics analysis started in background'
    }));
}));
/**
 * GET /analytics/health
 * Health check for analytics service
 */
router.get('/health', (0, auth_1.requirePermission)(auth_1.Permission.SYSTEM_METRICS), (0, error_handler_1.asyncHandler)(async (req, res) => {
    logger.info('Analytics health check requested', {
        userId: req.user?.userId
    });
    const health = await analyticsService.healthCheck();
    const isHealthy = health.status === 'healthy';
    res.status(isHealthy ? 200 : 503).json(api_response_1.ResponseBuilder.success(health, {
        performance: { executionTime: Date.now() - req.startTime }
    }));
}));
// Mount alerting routes
router.use('/alerts', alerting_routes_1.alertingRoutes);
// Mount advanced data processing routes
router.use('/advanced', advanced_data_processing_routes_1.default);
exports.default = router;
//# sourceMappingURL=analytics.routes.new.js.map