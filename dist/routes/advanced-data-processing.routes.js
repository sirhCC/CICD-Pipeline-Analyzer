"use strict";
/**
 * Advanced Data Processing API Routes
 *
 * Endpoints for advanced analytics processing:
 * - Time-series compression and optimization
 * - Data aggregation with multiple strategies
 * - Processing job management
 * - Cache management and statistics
 *
 * @author sirhCC
 * @version 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const error_handler_1 = require("../middleware/error-handler");
const request_validation_1 = require("../middleware/request-validation");
const api_response_1 = require("../shared/api-response");
const logger_1 = require("../shared/logger");
const advanced_data_processing_service_1 = require("../services/advanced-data-processing.service");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
const logger = new logger_1.Logger('AdvancedDataProcessingRoutes');
// Request validation schemas
const timeSeriesCompressionSchema = joi_1.default.object({
    data: joi_1.default.array().items(joi_1.default.object({
        timestamp: joi_1.default.date().required(),
        value: joi_1.default.number().required(),
        metadata: joi_1.default.object().optional()
    })).required(),
    compressionRatio: joi_1.default.number().min(0.01).max(1).default(0.1),
    preserveAnomalies: joi_1.default.boolean().default(true)
});
/**
 * @route POST /api/analytics/advanced/compress-timeseries
 * @desc Compress time-series data with anomaly preservation
 * @access Private
 */
router.post('/compress-timeseries', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ANALYST), (0, request_validation_1.validateRequest)({ body: timeSeriesCompressionSchema }), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { data, compressionRatio, preserveAnomalies } = req.body;
    logger.info('Starting time-series compression', {
        dataPoints: data.length,
        compressionRatio,
        preserveAnomalies
    });
    const result = await advanced_data_processing_service_1.advancedDataProcessingService.compressTimeSeries(data, compressionRatio, preserveAnomalies);
    logger.info('Time-series compression completed', {
        originalSize: data.length,
        compressedSize: result.points.length,
        actualRatio: result.compressionRatio
    });
    res.json(api_response_1.ResponseBuilder.success({
        data: result,
        message: 'Time-series data compressed successfully'
    }));
}));
/**
 * @route GET /api/analytics/advanced/jobs
 * @desc Get all processing jobs
 * @access Private
 */
router.get('/jobs', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ANALYST), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const jobs = advanced_data_processing_service_1.advancedDataProcessingService.getAllJobs();
    res.json(api_response_1.ResponseBuilder.success({
        data: {
            jobs,
            summary: {
                total: jobs.length,
                byStatus: jobs.reduce((acc, job) => {
                    acc[job.status] = (acc[job.status] || 0) + 1;
                    return acc;
                }, {})
            }
        },
        message: 'Processing jobs retrieved successfully'
    }));
}));
/**
 * @route GET /api/analytics/advanced/jobs/:jobId
 * @desc Get specific job status
 * @access Private
 */
router.get('/jobs/:jobId', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ANALYST), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    if (!jobId) {
        throw new error_handler_1.AppError('Job ID is required', 400);
    }
    const job = advanced_data_processing_service_1.advancedDataProcessingService.getJobStatus(jobId);
    if (!job) {
        throw new error_handler_1.AppError('Job not found', 404);
    }
    res.json(api_response_1.ResponseBuilder.success({
        data: job,
        message: 'Job status retrieved successfully'
    }));
}));
/**
 * @route DELETE /api/analytics/advanced/jobs/:jobId
 * @desc Cancel a running job
 * @access Private
 */
router.delete('/jobs/:jobId', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ANALYST), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    if (!jobId) {
        throw new error_handler_1.AppError('Job ID is required', 400);
    }
    const cancelled = await advanced_data_processing_service_1.advancedDataProcessingService.cancelJob(jobId);
    if (!cancelled) {
        throw new error_handler_1.AppError('Job not found or cannot be cancelled', 400);
    }
    logger.info('Job cancelled', { jobId });
    res.json(api_response_1.ResponseBuilder.success({
        data: { jobId, cancelled: true },
        message: 'Job cancelled successfully'
    }));
}));
/**
 * @route GET /api/analytics/advanced/cache/stats
 * @desc Get cache statistics
 * @access Private
 */
router.get('/cache/stats', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ANALYST), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const stats = advanced_data_processing_service_1.advancedDataProcessingService.getCacheStats();
    res.json(api_response_1.ResponseBuilder.success({
        data: stats,
        message: 'Cache statistics retrieved successfully'
    }));
}));
/**
 * @route DELETE /api/analytics/advanced/cache
 * @desc Clear cache
 * @access Private
 */
router.delete('/cache', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.ADMIN), (0, error_handler_1.asyncHandler)(async (req, res) => {
    advanced_data_processing_service_1.advancedDataProcessingService.clearCache();
    logger.info('Cache cleared');
    res.json(api_response_1.ResponseBuilder.success({
        data: { cleared: true },
        message: 'Cache cleared successfully'
    }));
}));
/**
 * @route GET /api/analytics/advanced/aggregation-strategies
 * @desc Get available aggregation strategies
 * @access Private
 */
router.get('/aggregation-strategies', auth_1.authenticateJWT, (0, auth_1.requireRole)(auth_1.UserRole.VIEWER), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const strategies = Object.values(advanced_data_processing_service_1.AggregationStrategy).map(strategy => ({
        value: strategy,
        label: strategy.replace(/_/g, ' ').toUpperCase(),
        description: getStrategyDescription(strategy)
    }));
    const levels = Object.values(advanced_data_processing_service_1.AggregationLevel).map(level => ({
        value: level,
        label: level.toUpperCase(),
        description: getLevelDescription(level)
    }));
    res.json(api_response_1.ResponseBuilder.success({
        data: {
            strategies,
            levels,
            exportFormats: Object.values(advanced_data_processing_service_1.ExportFormat)
        },
        message: 'Aggregation options retrieved successfully'
    }));
}));
// Helper functions
function getStrategyDescription(strategy) {
    switch (strategy) {
        case advanced_data_processing_service_1.AggregationStrategy.AVERAGE:
            return 'Calculate the mean value of data points in each window';
        case advanced_data_processing_service_1.AggregationStrategy.SUM:
            return 'Sum all values in each time window';
        case advanced_data_processing_service_1.AggregationStrategy.MIN:
            return 'Find the minimum value in each window';
        case advanced_data_processing_service_1.AggregationStrategy.MAX:
            return 'Find the maximum value in each window';
        case advanced_data_processing_service_1.AggregationStrategy.COUNT:
            return 'Count the number of data points in each window';
        case advanced_data_processing_service_1.AggregationStrategy.MEDIAN:
            return 'Calculate the median value in each window';
        case advanced_data_processing_service_1.AggregationStrategy.PERCENTILE_95:
            return 'Calculate the 95th percentile value in each window';
        case advanced_data_processing_service_1.AggregationStrategy.PERCENTILE_99:
            return 'Calculate the 99th percentile value in each window';
        default:
            return 'Unknown aggregation strategy';
    }
}
function getLevelDescription(level) {
    switch (level) {
        case advanced_data_processing_service_1.AggregationLevel.RAW:
            return 'No aggregation, keep raw data points';
        case advanced_data_processing_service_1.AggregationLevel.MINUTE:
            return 'Aggregate data by minute intervals';
        case advanced_data_processing_service_1.AggregationLevel.HOUR:
            return 'Aggregate data by hour intervals';
        case advanced_data_processing_service_1.AggregationLevel.DAY:
            return 'Aggregate data by day intervals';
        case advanced_data_processing_service_1.AggregationLevel.WEEK:
            return 'Aggregate data by week intervals';
        case advanced_data_processing_service_1.AggregationLevel.MONTH:
            return 'Aggregate data by month intervals';
        default:
            return 'Unknown aggregation level';
    }
}
exports.default = router;
//# sourceMappingURL=advanced-data-processing.routes.js.map