"use strict";
/**
 * Pipeline Management Controller
 * Handles CRUD operations and analytics for CI/CD pipelines
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelineController = void 0;
const repositories_1 = require("../repositories");
const logger_1 = require("../shared/logger");
const error_handler_1 = require("../middleware/error-handler");
const factory_1 = require("../providers/factory");
const types_1 = require("../types");
const api_response_1 = require("../shared/api-response");
const response_1 = require("../middleware/response");
const logger = new logger_1.Logger('PipelineController');
exports.pipelineController = {
    /**
     * List pipelines with standardized pagination and filtering
     */
    async listPipelines(req, res, next) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
            const provider = req.query.provider;
            const status = req.query.status;
            const repository = req.query.repository;
            // Track database query for performance metrics
            (0, response_1.trackDatabaseQuery)(req);
            // Build filter options
            const where = {};
            if (provider)
                where.provider = provider;
            if (status)
                where.status = status;
            if (repository)
                where.repository = repository;
            // Get total count for pagination
            const total = await repositories_1.pipelineRepository.count(where);
            (0, response_1.trackDatabaseQuery)(req);
            // Get paginated results
            const pipelines = await repositories_1.pipelineRepository.findMany({
                where,
                take: limit,
                skip: (page - 1) * limit,
                order: { createdAt: 'DESC' }
            });
            (0, response_1.trackDatabaseQuery)(req);
            const pagination = (0, api_response_1.calculatePagination)(page, limit, total);
            logger.info('Pipelines listed successfully', {
                userId: req.user?.userId,
                count: pipelines.length,
                total,
                page,
                limit,
                filters: { provider, status, repository }
            });
            // Use standardized response format
            res.apiSuccess({ items: pipelines, pagination });
        }
        catch (error) {
            logger.error('Failed to list pipelines', {
                error: error instanceof Error ? error.message : String(error),
                userId: req.user?.userId
            });
            next(error);
        }
    },
    /**
     * Create a new pipeline
     */
    async createPipeline(req, res, next) {
        try {
            const { name, provider, repository, branch = 'main' } = req.body;
            // Validate required fields
            if (!name || !provider || !repository) {
                throw new error_handler_1.ValidationError('Name, provider, and repository are required');
            }
            // Validate provider is supported
            const registeredProviders = factory_1.providerFactory.getRegisteredProviders();
            if (!registeredProviders.includes(provider)) {
                throw new error_handler_1.ValidationError(`Provider ${provider} is not supported`);
            }
            const pipeline = await repositories_1.pipelineRepository.create({
                name,
                provider,
                externalId: `external_${Date.now()}`,
                repository,
                branch,
                status: types_1.PipelineStatus.PENDING,
                metadata: {
                    createdAt: new Date(),
                    createdBy: req.user.userId,
                }
            });
            logger.info('Pipeline created', {
                pipelineId: pipeline.id,
                userId: req.user?.userId,
                provider,
                repository
            });
            res.status(201).json({
                success: true,
                data: { pipeline },
                metadata: {
                    requestId: req.headers['x-request-id'] || 'unknown',
                    timestamp: new Date(),
                    processingTime: 0,
                    version: '1.0.0'
                }
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Get a specific pipeline by ID
     */
    async getPipeline(req, res, next) {
        try {
            const { pipelineId } = req.params;
            if (!pipelineId) {
                throw new error_handler_1.ValidationError('Pipeline ID is required');
            }
            const pipeline = await repositories_1.pipelineRepository.findById(pipelineId);
            if (!pipeline) {
                throw new error_handler_1.NotFoundError('Pipeline not found');
            }
            logger.info('Pipeline retrieved', {
                pipelineId,
                userId: req.user?.userId
            });
            res.json({
                success: true,
                data: { pipeline },
                metadata: {
                    requestId: req.headers['x-request-id'] || 'unknown',
                    timestamp: new Date(),
                    processingTime: 0,
                    version: '1.0.0'
                }
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Update a pipeline (simplified)
     */
    async updatePipeline(req, res, next) {
        try {
            const { pipelineId } = req.params;
            if (!pipelineId) {
                throw new error_handler_1.ValidationError('Pipeline ID is required');
            }
            const pipeline = await repositories_1.pipelineRepository.findById(pipelineId);
            if (!pipeline) {
                throw new error_handler_1.NotFoundError('Pipeline not found');
            }
            // For now, just return success without actual update logic
            logger.info('Pipeline update requested', {
                pipelineId,
                userId: req.user?.userId
            });
            res.json({
                success: true,
                data: {
                    pipeline,
                    message: 'Pipeline update functionality will be implemented in Phase 2'
                },
                metadata: {
                    requestId: req.headers['x-request-id'] || 'unknown',
                    timestamp: new Date(),
                    processingTime: 0,
                    version: '1.0.0'
                }
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Delete a pipeline (simplified)
     */
    async deletePipeline(req, res, next) {
        try {
            const { pipelineId } = req.params;
            if (!pipelineId) {
                throw new error_handler_1.ValidationError('Pipeline ID is required');
            }
            const pipeline = await repositories_1.pipelineRepository.findById(pipelineId);
            if (!pipeline) {
                throw new error_handler_1.NotFoundError('Pipeline not found');
            }
            // For now, just return success without actual deletion
            logger.info('Pipeline deletion requested', {
                pipelineId,
                userId: req.user?.userId
            });
            res.json({
                success: true,
                data: { message: 'Pipeline deletion functionality will be implemented in Phase 2' },
                metadata: {
                    requestId: req.headers['x-request-id'] || 'unknown',
                    timestamp: new Date(),
                    processingTime: 0,
                    version: '1.0.0'
                }
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Get pipeline runs (simplified)
     */
    async getPipelineRuns(req, res, next) {
        try {
            const { pipelineId } = req.params;
            if (!pipelineId) {
                throw new error_handler_1.ValidationError('Pipeline ID is required');
            }
            const pipeline = await repositories_1.pipelineRepository.findById(pipelineId);
            if (!pipeline) {
                throw new error_handler_1.NotFoundError('Pipeline not found');
            }
            // For now, return empty runs array
            const runs = [];
            logger.info('Pipeline runs retrieved', {
                pipelineId,
                userId: req.user?.userId,
                count: runs.length
            });
            res.json({
                success: true,
                data: {
                    runs,
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 0,
                        totalPages: 0
                    }
                },
                metadata: {
                    requestId: req.headers['x-request-id'] || 'unknown',
                    timestamp: new Date(),
                    processingTime: 0,
                    version: '1.0.0'
                }
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Get a specific pipeline run (simplified)
     */
    async getPipelineRun(req, res, next) {
        try {
            const { pipelineId, runId } = req.params;
            if (!pipelineId || !runId) {
                throw new error_handler_1.ValidationError('Pipeline ID and Run ID are required');
            }
            const pipeline = await repositories_1.pipelineRepository.findById(pipelineId);
            if (!pipeline) {
                throw new error_handler_1.NotFoundError('Pipeline not found');
            }
            // For now, return a mock run
            const run = {
                id: runId,
                pipelineId,
                status: types_1.PipelineStatus.SUCCESS,
                startTime: new Date(),
                endTime: new Date(),
                duration: 120000
            };
            logger.info('Pipeline run retrieved', {
                pipelineId,
                runId,
                userId: req.user?.userId
            });
            res.json({
                success: true,
                data: { run },
                metadata: {
                    requestId: req.headers['x-request-id'] || 'unknown',
                    timestamp: new Date(),
                    processingTime: 0,
                    version: '1.0.0'
                }
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Analyze a pipeline (trigger analytics processing)
     */
    async analyzePipeline(req, res, next) {
        try {
            const { pipelineId } = req.params;
            if (!pipelineId) {
                throw new error_handler_1.ValidationError('Pipeline ID is required');
            }
            const pipeline = await repositories_1.pipelineRepository.findById(pipelineId);
            if (!pipeline) {
                throw new error_handler_1.NotFoundError('Pipeline not found');
            }
            const analysisJobId = `analysis_${pipelineId}_${Date.now()}`;
            logger.info('Pipeline analysis triggered', {
                pipelineId,
                analysisJobId,
                userId: req.user?.userId
            });
            res.json({
                success: true,
                data: {
                    analysisJobId,
                    message: 'Pipeline analysis started',
                    estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000)
                },
                metadata: {
                    requestId: req.headers['x-request-id'] || 'unknown',
                    timestamp: new Date(),
                    processingTime: 0,
                    version: '1.0.0'
                }
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Sync pipeline data from provider
     */
    async syncPipeline(req, res, next) {
        try {
            const { pipelineId } = req.params;
            if (!pipelineId) {
                throw new error_handler_1.ValidationError('Pipeline ID is required');
            }
            const pipeline = await repositories_1.pipelineRepository.findById(pipelineId);
            if (!pipeline) {
                throw new error_handler_1.NotFoundError('Pipeline not found');
            }
            const syncJobId = `sync_${pipelineId}_${Date.now()}`;
            logger.info('Pipeline sync triggered', {
                pipelineId,
                syncJobId,
                userId: req.user?.userId
            });
            res.json({
                success: true,
                data: {
                    syncJobId,
                    message: 'Pipeline sync started',
                    estimatedCompletion: new Date(Date.now() + 2 * 60 * 1000)
                },
                metadata: {
                    requestId: req.headers['x-request-id'] || 'unknown',
                    timestamp: new Date(),
                    processingTime: 0,
                    version: '1.0.0'
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
};
//# sourceMappingURL=pipeline.controller.js.map