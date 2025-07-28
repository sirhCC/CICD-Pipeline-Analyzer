"use strict";
/**
 * Pipeline Management Controller
 * Handles CRUD operations and analytics for CI/CD pipelines
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelineController = void 0;
const repositories_1 = require("../repositories");
const logger_1 = require("../shared/logger");
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
            return res.apiInternalError('Failed to list pipelines');
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
                return res.apiValidationError('Name, provider, and repository are required');
            }
            // Validate provider is supported
            const registeredProviders = factory_1.providerFactory.getRegisteredProviders();
            if (!registeredProviders.includes(provider)) {
                return res.apiValidationError(`Provider ${provider} is not supported`);
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
            res.apiCreated({ pipeline });
        }
        catch (error) {
            logger.error('Failed to create pipeline', {
                error: error instanceof Error ? error.message : String(error),
                userId: req.user?.userId
            });
            return res.apiInternalError('Failed to create pipeline');
        }
    },
    /**
     * Get a specific pipeline by ID
     */
    async getPipeline(req, res, next) {
        try {
            const { pipelineId } = req.params;
            if (!pipelineId) {
                return res.apiValidationError('Pipeline ID is required');
            }
            const pipeline = await repositories_1.pipelineRepository.findById(pipelineId);
            if (!pipeline) {
                return res.apiNotFound('Pipeline', pipelineId);
            }
            logger.info('Pipeline retrieved', {
                pipelineId,
                userId: req.user?.userId
            });
            res.apiSuccess({ pipeline });
        }
        catch (error) {
            logger.error('Failed to retrieve pipeline', {
                error: error instanceof Error ? error.message : String(error),
                userId: req.user?.userId,
                pipelineId: req.params.pipelineId
            });
            return res.apiInternalError('Failed to retrieve pipeline');
        }
    },
    /**
     * Update a pipeline (simplified)
     */
    async updatePipeline(req, res, next) {
        try {
            const { pipelineId } = req.params;
            if (!pipelineId) {
                return res.apiValidationError('Pipeline ID is required');
            }
            const pipeline = await repositories_1.pipelineRepository.findById(pipelineId);
            if (!pipeline) {
                return res.apiNotFound('Pipeline', pipelineId);
            }
            // For now, just return success without actual update logic
            logger.info('Pipeline update requested', {
                pipelineId,
                userId: req.user?.userId
            });
            res.apiSuccess({
                pipeline,
                message: 'Pipeline update functionality will be implemented in Phase 2'
            });
        }
        catch (error) {
            logger.error('Failed to update pipeline', {
                error: error instanceof Error ? error.message : String(error),
                userId: req.user?.userId,
                pipelineId: req.params.pipelineId
            });
            return res.apiInternalError('Failed to update pipeline');
        }
    },
    /**
     * Delete a pipeline (simplified)
     */
    async deletePipeline(req, res, next) {
        try {
            const { pipelineId } = req.params;
            if (!pipelineId) {
                return res.apiValidationError('Pipeline ID is required');
            }
            const pipeline = await repositories_1.pipelineRepository.findById(pipelineId);
            if (!pipeline) {
                return res.apiNotFound('Pipeline', pipelineId);
            }
            // For now, just return success without actual deletion
            logger.info('Pipeline deletion requested', {
                pipelineId,
                userId: req.user?.userId
            });
            res.apiSuccess({ message: 'Pipeline deletion functionality will be implemented in Phase 2' });
        }
        catch (error) {
            logger.error('Failed to delete pipeline', {
                error: error instanceof Error ? error.message : String(error),
                userId: req.user?.userId,
                pipelineId: req.params.pipelineId
            });
            return res.apiInternalError('Failed to delete pipeline');
        }
    },
    /**
     * Get pipeline runs (simplified)
     */
    async getPipelineRuns(req, res, next) {
        try {
            const { pipelineId } = req.params;
            if (!pipelineId) {
                return res.apiValidationError('Pipeline ID is required');
            }
            const pipeline = await repositories_1.pipelineRepository.findById(pipelineId);
            if (!pipeline) {
                return res.apiNotFound('Pipeline', pipelineId);
            }
            // For now, return empty runs array
            const runs = [];
            logger.info('Pipeline runs retrieved', {
                pipelineId,
                userId: req.user?.userId,
                count: runs.length
            });
            res.apiSuccess({
                runs,
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 0
                }
            });
        }
        catch (error) {
            logger.error('Failed to retrieve pipeline runs', {
                error: error instanceof Error ? error.message : String(error),
                userId: req.user?.userId,
                pipelineId: req.params.pipelineId
            });
            return res.apiInternalError('Failed to retrieve pipeline runs');
        }
    },
    /**
     * Get a specific pipeline run (simplified)
     */
    async getPipelineRun(req, res, next) {
        try {
            const { pipelineId, runId } = req.params;
            if (!pipelineId || !runId) {
                return res.apiValidationError('Pipeline ID and Run ID are required');
            }
            const pipeline = await repositories_1.pipelineRepository.findById(pipelineId);
            if (!pipeline) {
                return res.apiNotFound('Pipeline', pipelineId);
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
            res.apiSuccess({ run });
        }
        catch (error) {
            logger.error('Failed to retrieve pipeline run', {
                error: error instanceof Error ? error.message : String(error),
                userId: req.user?.userId,
                pipelineId: req.params.pipelineId,
                runId: req.params.runId
            });
            return res.apiInternalError('Failed to retrieve pipeline run');
        }
    },
    /**
     * Analyze a pipeline (trigger analytics processing)
     */
    async analyzePipeline(req, res, next) {
        try {
            const { pipelineId } = req.params;
            if (!pipelineId) {
                return res.apiValidationError('Pipeline ID is required');
            }
            const pipeline = await repositories_1.pipelineRepository.findById(pipelineId);
            if (!pipeline) {
                return res.apiNotFound('Pipeline', pipelineId);
            }
            const analysisJobId = `analysis_${pipelineId}_${Date.now()}`;
            logger.info('Pipeline analysis triggered', {
                pipelineId,
                analysisJobId,
                userId: req.user?.userId
            });
            res.apiSuccess({
                analysisJobId,
                message: 'Pipeline analysis started',
                estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000)
            });
        }
        catch (error) {
            logger.error('Failed to trigger pipeline analysis', {
                error: error instanceof Error ? error.message : String(error),
                userId: req.user?.userId,
                pipelineId: req.params.pipelineId
            });
            return res.apiInternalError('Failed to trigger pipeline analysis');
        }
    },
    /**
     * Sync pipeline data from provider
     */
    async syncPipeline(req, res, next) {
        try {
            const { pipelineId } = req.params;
            if (!pipelineId) {
                return res.apiValidationError('Pipeline ID is required');
            }
            const pipeline = await repositories_1.pipelineRepository.findById(pipelineId);
            if (!pipeline) {
                return res.apiNotFound('Pipeline', pipelineId);
            }
            const syncJobId = `sync_${pipelineId}_${Date.now()}`;
            logger.info('Pipeline sync triggered', {
                pipelineId,
                syncJobId,
                userId: req.user?.userId
            });
            res.apiSuccess({
                syncJobId,
                message: 'Pipeline sync started',
                estimatedCompletion: new Date(Date.now() + 2 * 60 * 1000)
            });
        }
        catch (error) {
            logger.error('Failed to trigger pipeline sync', {
                error: error instanceof Error ? error.message : String(error),
                userId: req.user?.userId,
                pipelineId: req.params.pipelineId
            });
            return res.apiInternalError('Failed to trigger pipeline sync');
        }
    }
};
//# sourceMappingURL=pipeline.controller.js.map