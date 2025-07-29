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
const statistical_analytics_routes_1 = require("./statistical-analytics.routes");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
const logger = new logger_1.Logger('AnalyticsRoutes');
// Lazy initialization of analytics service to avoid database initialization issues
let analyticsService = null;
const getAnalyticsService = () => {
    if (!analyticsService) {
        analyticsService = new analytics_service_1.AnalyticsService({
            enableRealTimeAnalysis: false, // Disable in tests to prevent open handles
            metricRetentionDays: 90,
            alertThresholds: {
                failureRate: 0.15,
                avgDuration: 1800,
                errorSpike: 5
            },
            batchSize: 100,
            analysisInterval: 15
        });
    }
    return analyticsService;
};
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
    const startTime = Date.now();
    const { period, pipelineId } = req.query;
    logger.info('Analytics dashboard requested', {
        period,
        pipelineId,
        userId: req.user?.userId
    });
    const dashboard = await getAnalyticsService().generateDashboard({
        timeRange: period || 'daily',
        ...(pipelineId && { pipelineId })
    });
    res.json(api_response_1.ResponseBuilder.success(dashboard, {
        performance: { executionTime: Date.now() - startTime }
    }));
}));
/**
 * GET /analytics/pipelines/:pipelineId/metrics
 * Get detailed metrics for a specific pipeline
 */
router.get('/pipelines/:pipelineId/metrics', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_READ), (0, request_validation_1.validateRequest)(pipelineParamsValidation), (0, request_validation_1.validateRequest)(metricsQueryValidation), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    const { pipelineId } = req.params;
    const { period } = req.query;
    logger.info('Pipeline metrics requested', {
        pipelineId,
        period,
        userId: req.user?.userId
    });
    const metrics = await getAnalyticsService().calculateMetrics(pipelineId, period || 'daily');
    res.json(api_response_1.ResponseBuilder.success({
        pipelineId,
        period: period || 'daily',
        metrics
    }, {
        performance: { executionTime: Date.now() - startTime }
    }));
}));
/**
 * GET /analytics/pipelines/:pipelineId/patterns
 * Detect failure patterns for a specific pipeline
 */
router.get('/pipelines/:pipelineId/patterns', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_READ), (0, request_validation_1.validateRequest)(pipelineParamsValidation), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    const { pipelineId } = req.params;
    logger.info('Failure patterns requested', {
        pipelineId,
        userId: req.user?.userId
    });
    const patterns = await getAnalyticsService().detectFailurePatterns(pipelineId);
    res.json(api_response_1.ResponseBuilder.success(patterns, {
        performance: { executionTime: Date.now() - startTime }
    }));
}));
/**
 * GET /analytics/patterns
 * Get global failure patterns across all pipelines
 */
router.get('/patterns', (0, auth_1.requirePermission)(auth_1.Permission.SYSTEM_METRICS), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    logger.info('Global failure patterns requested', {
        userId: req.user?.userId
    });
    const patterns = await getAnalyticsService().detectFailurePatterns();
    res.json(api_response_1.ResponseBuilder.success(patterns, {
        performance: { executionTime: Date.now() - startTime }
    }));
}));
/**
 * GET /analytics/pipelines/:pipelineId/recommendations
 * Get optimization recommendations for a specific pipeline
 */
router.get('/pipelines/:pipelineId/recommendations', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_READ), (0, request_validation_1.validateRequest)(pipelineParamsValidation), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    const { pipelineId } = req.params;
    logger.info('Optimization recommendations requested', {
        pipelineId,
        userId: req.user?.userId
    });
    const recommendations = await getAnalyticsService().generateOptimizationRecommendations(pipelineId);
    res.json(api_response_1.ResponseBuilder.success(recommendations, {
        performance: { executionTime: Date.now() - startTime }
    }));
}));
/**
 * GET /analytics/alerts
 * Get analytics alerts
 */
router.get('/alerts', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_READ), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    logger.info('Analytics alerts requested', {
        userId: req.user?.userId
    });
    const alerts = await getAnalyticsService().generateAlerts();
    res.json(api_response_1.ResponseBuilder.success(alerts, {
        performance: { executionTime: Date.now() - startTime }
    }));
}));
/**
 * PUT /analytics/alerts/:alertId
 * Update alert status (acknowledge/resolve)
 */
router.put('/alerts/:alertId', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_WRITE), (0, request_validation_1.validateRequest)(alertParamsValidation), (0, request_validation_1.validateRequest)(alertUpdateValidation), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    const { alertId } = req.params;
    const { acknowledged, acknowledgedBy } = req.body;
    logger.info('Alert update requested', {
        alertId,
        acknowledged,
        acknowledgedBy,
        userId: req.user?.userId
    });
    const updateData = { acknowledged };
    if (acknowledgedBy) {
        updateData.acknowledgedBy = acknowledgedBy;
    }
    const updatedAlert = await getAnalyticsService().updateAlert(alertId, updateData);
    res.json(api_response_1.ResponseBuilder.success(updatedAlert, {
        performance: { executionTime: Date.now() - startTime }
    }));
}));
/**
 * POST /analytics/pipelines/:pipelineId/trigger
 * Trigger analytics analysis for a specific pipeline
 */
router.post('/pipelines/:pipelineId/trigger', (0, auth_1.requirePermission)(auth_1.Permission.PIPELINES_WRITE), (0, request_validation_1.validateRequest)(pipelineParamsValidation), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    const { pipelineId } = req.params;
    logger.info('Analytics trigger requested', {
        pipelineId,
        userId: req.user?.userId
    });
    // Start analysis in background
    getAnalyticsService().analyzeAsync(pipelineId).catch(error => {
        logger.error('Background analytics analysis failed', {
            pipelineId,
            error: error.message
        });
    });
    res.json(api_response_1.ResponseBuilder.success({
        pipelineId,
        status: 'triggered',
        message: 'Analytics analysis started in background'
    }, {
        performance: { executionTime: Date.now() - startTime }
    }));
}));
/**
 * GET /analytics/health
 * Health check for analytics service
 */
router.get('/health', (0, auth_1.requirePermission)(auth_1.Permission.SYSTEM_METRICS), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    logger.info('Analytics health check requested', {
        userId: req.user?.userId
    });
    // Simple health check - the service is available if it can respond
    const health = {
        status: 'healthy',
        service: 'analytics',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    };
    res.json(api_response_1.ResponseBuilder.success(health, {
        performance: { executionTime: Date.now() - startTime }
    }));
}));
// Mount statistical analytics routes
router.use('/statistical', statistical_analytics_routes_1.statisticalAnalyticsRoutes);
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map