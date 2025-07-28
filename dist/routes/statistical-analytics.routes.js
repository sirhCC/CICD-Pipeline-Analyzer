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
//# sourceMappingURL=statistical-analytics.routes.js.map