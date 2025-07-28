"use strict";
/**
 * Statistical Analytics Routes - Phase 3 Mathematical Analysis API
 * Provides endpoints for advanced statistical analysis and mathematical insights
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statisticalAnalyticsRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const error_handler_1 = require("../middleware/error-handler");
const request_validation_1 = require("../middleware/request-validation");
const api_response_1 = require("../shared/api-response");
const logger_1 = require("../shared/logger");
const statistical_analytics_service_1 = require("../services/statistical-analytics.service");
const background_job_service_1 = require("../services/background-job.service");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
exports.statisticalAnalyticsRoutes = router;
const logger = new logger_1.Logger('StatisticalAnalyticsRoutes');
// Validation schemas
const dataPointSchema = joi_1.default.object({
    timestamp: joi_1.default.date().required(),
    value: joi_1.default.number().required(),
    metadata: joi_1.default.object().optional()
});
const anomalyDetectionSchema = joi_1.default.object({
    data: joi_1.default.array().items(dataPointSchema).min(10).required(),
    method: joi_1.default.string().valid('z-score', 'percentile', 'iqr', 'all').default('all')
});
const trendAnalysisSchema = joi_1.default.object({
    data: joi_1.default.array().items(dataPointSchema).min(5).required()
});
const benchmarkSchema = joi_1.default.object({
    currentValue: joi_1.default.number().required(),
    historicalData: joi_1.default.array().items(dataPointSchema).min(5).required(),
    category: joi_1.default.string().optional().default('general')
});
const slaMonitoringSchema = joi_1.default.object({
    currentValue: joi_1.default.number().required(),
    slaTarget: joi_1.default.number().required(),
    historicalData: joi_1.default.array().items(dataPointSchema).required(),
    violationType: joi_1.default.string().valid('threshold', 'availability', 'performance', 'quality').default('performance')
});
const costAnalysisSchema = joi_1.default.object({
    executionTimeMinutes: joi_1.default.number().min(0).required(),
    resourceUsage: joi_1.default.object({
        cpu: joi_1.default.number().min(0).max(100).required(),
        memory: joi_1.default.number().min(0).max(100).required(),
        storage: joi_1.default.number().min(0).max(100).required(),
        network: joi_1.default.number().min(0).max(100).required()
    }).required(),
    historicalCostData: joi_1.default.array().items(dataPointSchema).optional().default([])
});
/**
 * POST /analytics/statistical/anomalies
 * Detect anomalies in time series data
 */
router.post('/anomalies', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_WRITE), (0, request_validation_1.validateRequest)({ body: anomalyDetectionSchema }), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { data, method } = req.body;
    logger.info('Anomaly detection requested', {
        dataPoints: data.length,
        method,
        userId: req.user?.userId
    });
    const results = statistical_analytics_service_1.statisticalAnalyticsService.detectAnomalies(data, method);
    logger.info('Anomaly detection completed', {
        anomaliesFound: results.length,
        method,
        userId: req.user?.userId
    });
    res.json(api_response_1.ResponseBuilder.success({
        anomalies: results,
        summary: {
            totalDataPoints: data.length,
            anomaliesDetected: results.length,
            anomalyRate: (results.length / data.length) * 100,
            method,
            criticalAnomalies: results.filter(a => a.severity === 'critical').length,
            highSeverityAnomalies: results.filter(a => a.severity === 'high').length
        }
    }));
}));
/**
 * POST /analytics/statistical/trends
 * Analyze trends in time series data using regression analysis
 */
router.post('/trends', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, request_validation_1.validateRequest)({ body: trendAnalysisSchema }), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { data } = req.body;
    logger.info('Trend analysis requested', {
        dataPoints: data.length,
        userId: req.user?.userId
    });
    const result = statistical_analytics_service_1.statisticalAnalyticsService.analyzeTrend(data);
    logger.info('Trend analysis completed', {
        trend: result.trend,
        correlation: result.correlation,
        userId: req.user?.userId
    });
    res.json(api_response_1.ResponseBuilder.success({
        trend: result,
        interpretation: {
            direction: result.trend,
            strength: result.correlation > 0.8 ? 'strong' : result.correlation > 0.5 ? 'moderate' : 'weak',
            reliability: result.rSquared > 0.8 ? 'high' : result.rSquared > 0.5 ? 'medium' : 'low',
            significance: Math.abs(result.slope) > 0.1 ? 'significant' : 'minimal'
        }
    }));
}));
/**
 * POST /analytics/statistical/benchmark
 * Compare current performance against historical benchmarks
 */
router.post('/benchmark', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, request_validation_1.validateRequest)({ body: benchmarkSchema }), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { currentValue, historicalData, category } = req.body;
    logger.info('Benchmark analysis requested', {
        currentValue,
        historicalDataPoints: historicalData.length,
        category,
        userId: req.user?.userId
    });
    const result = statistical_analytics_service_1.statisticalAnalyticsService.generateBenchmark(currentValue, historicalData, category);
    logger.info('Benchmark analysis completed', {
        performance: result.performance,
        percentile: result.percentile,
        userId: req.user?.userId
    });
    res.json(api_response_1.ResponseBuilder.success({
        benchmark: result,
        insights: {
            performanceLevel: result.performance,
            relativePosition: `Better than ${result.comparison.betterThan.toFixed(1)}% of historical values`,
            recommendation: result.performance === 'poor' ? 'Immediate optimization needed' :
                result.performance === 'below-average' ? 'Consider improvements' :
                    result.performance === 'average' ? 'Monitor trends' :
                        result.performance === 'good' ? 'Maintain current performance' :
                            'Excellent performance - share best practices'
        }
    }));
}));
/**
 * POST /analytics/statistical/sla
 * Monitor SLA compliance and detect violations
 */
router.post('/sla', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, request_validation_1.validateRequest)({ body: slaMonitoringSchema }), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { currentValue, slaTarget, historicalData, violationType } = req.body;
    logger.info('SLA monitoring requested', {
        currentValue,
        slaTarget,
        violationType,
        userId: req.user?.userId
    });
    const result = statistical_analytics_service_1.statisticalAnalyticsService.monitorSLA(currentValue, slaTarget, historicalData, violationType);
    logger.info('SLA monitoring completed', {
        violated: result.violated,
        severity: result.severity,
        userId: req.user?.userId
    });
    res.json(api_response_1.ResponseBuilder.success({
        sla: result,
        recommendations: {
            status: result.violated ? 'VIOLATION' : 'COMPLIANT',
            urgency: result.violated ? result.severity.toUpperCase() : 'NONE',
            nextActions: result.violated ? result.remediation.immediateActions : ['Continue monitoring'],
            longTermStrategy: result.violated ? result.remediation.longTermActions : ['Maintain current standards']
        }
    }));
}));
/**
 * POST /analytics/statistical/costs
 * Analyze costs and identify optimization opportunities
 */
router.post('/costs', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_WRITE), (0, request_validation_1.validateRequest)({ body: costAnalysisSchema }), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { executionTimeMinutes, resourceUsage, historicalCostData } = req.body;
    logger.info('Cost analysis requested', {
        executionTimeMinutes,
        resourceUsage,
        historicalDataPoints: historicalCostData.length,
        userId: req.user?.userId
    });
    const result = statistical_analytics_service_1.statisticalAnalyticsService.analyzeCosts(executionTimeMinutes, resourceUsage, historicalCostData);
    logger.info('Cost analysis completed', {
        totalCost: result.totalCost,
        optimizationOpportunities: result.optimizationOpportunities.length,
        efficiencyScore: result.efficiency.score,
        userId: req.user?.userId
    });
    res.json(api_response_1.ResponseBuilder.success({
        costAnalysis: result,
        recommendations: {
            totalSavingsPotential: result.optimizationOpportunities.reduce((sum, op) => sum + op.potentialSavings, 0),
            topOptimization: result.optimizationOpportunities.length > 0 ?
                result.optimizationOpportunities.sort((a, b) => b.potentialSavings - a.potentialSavings)[0] : null,
            efficiencyGrade: result.efficiency.score >= 90 ? 'A' :
                result.efficiency.score >= 80 ? 'B' :
                    result.efficiency.score >= 70 ? 'C' :
                        result.efficiency.score >= 60 ? 'D' : 'F',
            immediateActions: result.optimizationOpportunities
                .filter(op => op.priority === 'high' || op.priority === 'critical')
                .slice(0, 3)
        }
    }));
}));
/**
 * GET /analytics/statistical/health
 * Get health status of the statistical analytics engine
 */
router.get('/health', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ADMIN), (0, error_handler_1.asyncHandler)(async (req, res) => {
    logger.info('Statistical analytics health check requested', {
        userId: req.user?.userId
    });
    // Test the service with sample data
    const testData = [
        { timestamp: new Date(), value: 1 },
        { timestamp: new Date(), value: 2 },
        { timestamp: new Date(), value: 3 },
        { timestamp: new Date(), value: 4 },
        { timestamp: new Date(), value: 5 }
    ];
    try {
        const trendTest = statistical_analytics_service_1.statisticalAnalyticsService.analyzeTrend(testData);
        const benchmarkTest = statistical_analytics_service_1.statisticalAnalyticsService.generateBenchmark(3, testData);
        res.json(api_response_1.ResponseBuilder.success({
            status: 'healthy',
            version: '1.0.0',
            features: {
                anomalyDetection: true,
                trendAnalysis: true,
                benchmarking: true,
                slaMonitoring: true,
                costAnalysis: true
            },
            testResults: {
                trendAnalysis: trendTest.trend !== undefined,
                benchmarking: benchmarkTest.performance !== undefined
            },
            timestamp: new Date().toISOString()
        }));
    }
    catch (error) {
        logger.error('Statistical analytics health check failed', { error });
        res.status(503).json(api_response_1.ResponseBuilder.error({
            code: 'SERVICE_UNAVAILABLE',
            message: 'Statistical analytics service unavailable'
        }));
    }
}));
/**
 * Pipeline-Specific Statistical Analytics Endpoints
 * These endpoints integrate the statistical engine with real pipeline data
 */
// Validation schemas for pipeline-specific endpoints
const pipelineAnalysisSchema = joi_1.default.object({
    metric: joi_1.default.string().valid('duration', 'cpu', 'memory', 'success_rate', 'test_coverage').default('duration'),
    method: joi_1.default.string().valid('z-score', 'percentile', 'iqr', 'all').default('all'),
    periodDays: joi_1.default.number().integer().min(1).max(365).default(30)
});
const pipelineTrendSchema = joi_1.default.object({
    metric: joi_1.default.string().valid('duration', 'cpu', 'memory', 'success_rate', 'test_coverage').default('duration'),
    periodDays: joi_1.default.number().integer().min(1).max(365).default(30)
});
const pipelineBenchmarkSchema = joi_1.default.object({
    metric: joi_1.default.string().valid('duration', 'cpu', 'memory', 'success_rate', 'test_coverage').default('duration'),
    periodDays: joi_1.default.number().integer().min(1).max(365).default(30)
});
const pipelineSlaSchema = joi_1.default.object({
    slaTarget: joi_1.default.number().min(0).required(),
    metric: joi_1.default.string().valid('duration', 'cpu', 'memory', 'success_rate', 'test_coverage').default('duration'),
    periodDays: joi_1.default.number().integer().min(1).max(365).default(30)
});
const pipelineCostSchema = joi_1.default.object({
    periodDays: joi_1.default.number().integer().min(1).max(365).default(30)
});
// Job Management Schemas
const jobCreationSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).required(),
    type: joi_1.default.string().valid('anomaly_detection', 'trend_analysis', 'sla_monitoring', 'cost_analysis', 'full_analysis').required(),
    schedule: joi_1.default.string().required(), // cron expression
    enabled: joi_1.default.boolean().default(true),
    pipelineId: joi_1.default.string().uuid().optional(),
    parameters: joi_1.default.object({
        metric: joi_1.default.string().valid('duration', 'cpu', 'memory', 'success_rate', 'test_coverage').optional(),
        method: joi_1.default.string().valid('z-score', 'percentile', 'iqr', 'all').optional(),
        periodDays: joi_1.default.number().integer().min(1).max(365).optional(),
        slaTarget: joi_1.default.number().optional(),
        alertThresholds: joi_1.default.object({
            anomaly: joi_1.default.string().valid('low', 'medium', 'high', 'critical').optional(),
            trend: joi_1.default.string().valid('significant', 'moderate', 'minimal').optional(),
            sla: joi_1.default.boolean().optional(),
            cost: joi_1.default.number().optional()
        }).optional()
    }).default({})
});
const jobParamsSchema = joi_1.default.object({
    jobId: joi_1.default.string().uuid().required()
});
const pipelineParamsSchema = joi_1.default.object({
    pipelineId: joi_1.default.string().uuid().required()
});
/**
 * POST /analytics/statistical/pipelines/:pipelineId/anomalies
 * Detect anomalies in pipeline execution data
 */
router.post('/pipelines/:pipelineId/anomalies', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, request_validation_1.validateRequest)({
    params: pipelineParamsSchema,
    body: pipelineAnalysisSchema
}), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { pipelineId } = req.params;
    const { metric, method, periodDays } = req.body;
    if (!pipelineId) {
        throw new error_handler_1.AppError('Pipeline ID is required', 400);
    }
    logger.info('Pipeline anomaly detection requested', {
        pipelineId,
        metric,
        method,
        periodDays,
        userId: req.user?.userId
    });
    const results = await statistical_analytics_service_1.statisticalAnalyticsService.analyzePipelineAnomalies(pipelineId, metric, method, periodDays);
    logger.info('Pipeline anomaly detection completed', {
        pipelineId,
        anomaliesFound: results.length,
        userId: req.user?.userId
    });
    res.json(api_response_1.ResponseBuilder.success({
        pipelineId,
        metric,
        anomalies: results,
        summary: {
            periodDays,
            anomaliesDetected: results.length,
            criticalAnomalies: results.filter(a => a.severity === 'critical').length,
            highSeverityAnomalies: results.filter(a => a.severity === 'high').length,
            method
        }
    }));
}));
/**
 * POST /analytics/statistical/pipelines/:pipelineId/trends
 * Analyze trends in pipeline performance over time
 */
router.post('/pipelines/:pipelineId/trends', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, request_validation_1.validateRequest)({
    params: pipelineParamsSchema,
    body: pipelineTrendSchema
}), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { pipelineId } = req.params;
    const { metric, periodDays } = req.body;
    if (!pipelineId) {
        throw new error_handler_1.AppError('Pipeline ID is required', 400);
    }
    logger.info('Pipeline trend analysis requested', {
        pipelineId,
        metric,
        periodDays,
        userId: req.user?.userId
    });
    const result = await statistical_analytics_service_1.statisticalAnalyticsService.analyzePipelineTrends(pipelineId, metric, periodDays);
    logger.info('Pipeline trend analysis completed', {
        pipelineId,
        trend: result.trend,
        correlation: result.correlation,
        userId: req.user?.userId
    });
    res.json(api_response_1.ResponseBuilder.success({
        pipelineId,
        metric,
        trend: result,
        interpretation: {
            direction: result.trend,
            strength: result.correlation > 0.8 ? 'strong' : result.correlation > 0.5 ? 'moderate' : 'weak',
            reliability: result.rSquared > 0.8 ? 'high' : result.rSquared > 0.5 ? 'medium' : 'low',
            significance: Math.abs(result.slope) > 0.1 ? 'significant' : 'minimal'
        },
        summary: {
            periodDays,
            changeRate: result.changeRate,
            volatility: result.volatility
        }
    }));
}));
/**
 * POST /analytics/statistical/pipelines/:pipelineId/benchmark
 * Benchmark current pipeline performance against historical data
 */
router.post('/pipelines/:pipelineId/benchmark', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, request_validation_1.validateRequest)({
    params: pipelineParamsSchema,
    body: pipelineBenchmarkSchema
}), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { pipelineId } = req.params;
    const { metric, periodDays } = req.body;
    if (!pipelineId) {
        throw new error_handler_1.AppError('Pipeline ID is required', 400);
    }
    logger.info('Pipeline benchmark analysis requested', {
        pipelineId,
        metric,
        periodDays,
        userId: req.user?.userId
    });
    const result = await statistical_analytics_service_1.statisticalAnalyticsService.benchmarkPipelinePerformance(pipelineId, metric, periodDays);
    logger.info('Pipeline benchmark analysis completed', {
        pipelineId,
        performance: result.performance,
        percentile: result.percentile,
        userId: req.user?.userId
    });
    res.json(api_response_1.ResponseBuilder.success({
        pipelineId,
        metric,
        benchmark: result,
        summary: {
            periodDays,
            currentValue: result.currentValue,
            benchmark: result.benchmark,
            performance: result.performance,
            deviationPercent: result.deviationPercent
        }
    }));
}));
/**
 * POST /analytics/statistical/pipelines/:pipelineId/sla
 * Monitor pipeline SLA compliance
 */
router.post('/pipelines/:pipelineId/sla', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, request_validation_1.validateRequest)({
    params: pipelineParamsSchema,
    body: pipelineSlaSchema
}), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { pipelineId } = req.params;
    const { slaTarget, metric, periodDays } = req.body;
    if (!pipelineId) {
        throw new error_handler_1.AppError('Pipeline ID is required', 400);
    }
    logger.info('Pipeline SLA monitoring requested', {
        pipelineId,
        slaTarget,
        metric,
        periodDays,
        userId: req.user?.userId
    });
    const result = await statistical_analytics_service_1.statisticalAnalyticsService.monitorPipelineSLA(pipelineId, slaTarget, metric, periodDays);
    logger.info('Pipeline SLA monitoring completed', {
        pipelineId,
        violated: result.violated,
        violationPercent: result.violationPercent,
        userId: req.user?.userId
    });
    res.json(api_response_1.ResponseBuilder.success({
        pipelineId,
        metric,
        sla: result,
        summary: {
            periodDays,
            slaTarget,
            actualValue: result.actualValue,
            violated: result.violated,
            violationPercent: result.violationPercent,
            severity: result.severity
        }
    }));
}));
/**
 * POST /analytics/statistical/pipelines/:pipelineId/cost
 * Analyze pipeline cost trends and optimization opportunities
 */
router.post('/pipelines/:pipelineId/cost', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, request_validation_1.validateRequest)({
    params: pipelineParamsSchema,
    body: pipelineCostSchema
}), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { pipelineId } = req.params;
    const { periodDays } = req.body;
    if (!pipelineId) {
        throw new error_handler_1.AppError('Pipeline ID is required', 400);
    }
    logger.info('Pipeline cost analysis requested', {
        pipelineId,
        periodDays,
        userId: req.user?.userId
    });
    const result = await statistical_analytics_service_1.statisticalAnalyticsService.analyzePipelineCostTrends(pipelineId, periodDays);
    logger.info('Pipeline cost analysis completed', {
        pipelineId,
        totalCost: result.totalCost,
        optimizationOpportunities: result.optimizationOpportunities.length,
        userId: req.user?.userId
    });
    res.json(api_response_1.ResponseBuilder.success({
        pipelineId,
        cost: result,
        summary: {
            periodDays,
            totalCost: result.totalCost,
            costPerMinute: result.costPerMinute,
            optimizationOpportunities: result.optimizationOpportunities.length,
            potentialSavings: result.optimizationOpportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0),
            efficiencyScore: result.efficiency.score
        }
    }));
}));
// === WebSocket Endpoints ===
/**
 * GET /websocket/info - Get WebSocket connection information
 * Returns WebSocket server details for client connections
 */
router.get('/websocket/info', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, error_handler_1.asyncHandler)(async (req, res) => {
    logger.info('WebSocket info requested', {
        userId: req.user?.userId
    });
    const protocol = req.secure ? 'wss' : 'ws';
    const host = req.get('host') || 'localhost';
    res.json(api_response_1.ResponseBuilder.success({
        websocketUrl: `${protocol}://${host}`,
        features: [
            'real-time statistical updates',
            'anomaly detection alerts',
            'trend analysis notifications',
            'SLA violation alerts',
            'cost optimization insights'
        ],
        authentication: {
            required: true,
            method: 'JWT token via query parameter or auth header',
            permissions: ['read:analytics', 'read:pipelines']
        },
        subscriptionTypes: [
            'pipeline-specific analytics',
            'global anomaly alerts',
            'cost threshold warnings',
            'trend degradation notifications'
        ]
    }));
}));
/**
 * POST /jobs - Create a new background statistical analysis job
 * Creates scheduled jobs for continuous statistical analysis
 */
router.post('/jobs', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_WRITE), (0, request_validation_1.validateRequest)({ body: jobCreationSchema }), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { name, type, schedule, enabled, pipelineId, parameters } = req.body;
    logger.info('Background job creation requested', {
        name,
        type,
        schedule,
        pipelineId,
        userId: req.user?.userId
    });
    const jobService = (0, background_job_service_1.getBackgroundJobService)();
    const jobId = await jobService.createJob({
        name,
        type,
        schedule,
        enabled,
        pipelineId,
        parameters
    });
    logger.info('Background job created', {
        jobId,
        name,
        type,
        userId: req.user?.userId
    });
    res.json(api_response_1.ResponseBuilder.success({
        jobId,
        message: 'Background job created successfully',
        job: {
            id: jobId,
            name,
            type,
            schedule,
            enabled,
            pipelineId
        }
    }));
}));
/**
 * GET /jobs - Get all background jobs
 * Returns list of all scheduled statistical analysis jobs
 */
router.get('/jobs', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, error_handler_1.asyncHandler)(async (req, res) => {
    logger.info('Jobs list requested', {
        userId: req.user?.userId
    });
    const jobService = (0, background_job_service_1.getBackgroundJobService)();
    const jobs = jobService.getAllJobs();
    res.json(api_response_1.ResponseBuilder.success({
        jobs,
        total: jobs.length,
        enabled: jobs.filter(job => job.enabled).length,
        disabled: jobs.filter(job => !job.enabled).length
    }));
}));
/**
 * GET /jobs/:jobId - Get specific job status and details
 * Returns detailed information about a specific background job
 */
router.get('/jobs/:jobId', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_READ), (0, request_validation_1.validateRequest)({ params: jobParamsSchema }), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    logger.info('Job status requested', {
        jobId,
        userId: req.user?.userId
    });
    const jobService = (0, background_job_service_1.getBackgroundJobService)();
    const jobStatus = await jobService.getJobStatus(jobId);
    res.json(api_response_1.ResponseBuilder.success({
        job: jobStatus,
        execution: {
            isRunning: jobStatus.isActive,
            current: jobStatus.currentExecution || null,
            recent: jobStatus.recentExecutions.slice(0, 5)
        }
    }));
}));
/**
 * POST /jobs/:jobId/cancel - Cancel running job execution
 * Cancels currently running execution of a background job
 */
router.post('/jobs/:jobId/cancel', auth_1.authenticateJWT, (0, auth_1.requirePermission)(auth_1.Permission.ANALYTICS_WRITE), (0, request_validation_1.validateRequest)({ params: jobParamsSchema }), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    logger.info('Job cancellation requested', {
        jobId,
        userId: req.user?.userId
    });
    const jobService = (0, background_job_service_1.getBackgroundJobService)();
    const result = await jobService.cancelJob(jobId);
    logger.info('Job cancellation result', {
        jobId,
        cancelled: result.cancelled,
        userId: req.user?.userId
    });
    res.json(api_response_1.ResponseBuilder.success({
        jobId,
        cancelled: result.cancelled,
        message: result.message
    }));
}));
/**
 * GET /jobs/metrics - Get background job service metrics
 * Returns performance metrics and statistics for the job service
 */
router.get('/jobs/metrics', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ADMIN), (0, error_handler_1.asyncHandler)(async (req, res) => {
    logger.info('Job metrics requested', {
        userId: req.user?.userId
    });
    const jobService = (0, background_job_service_1.getBackgroundJobService)();
    const metrics = jobService.getMetrics();
    res.json(api_response_1.ResponseBuilder.success({
        metrics,
        timestamp: new Date().toISOString()
    }));
}));
//# sourceMappingURL=statistical-analytics.routes.js.map