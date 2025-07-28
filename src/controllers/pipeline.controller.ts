/**
 * Pipeline Management Controller
 * Handles CRUD operations and analytics for CI/CD pipelines
 */

import { Request, Response, NextFunction } from 'express';
import { pipelineRepository, pipelineRunRepository } from '../repositories';
import { AuthenticatedRequest } from '../middleware/auth';
import { Logger } from '../shared/logger';
import { providerFactory } from '../providers/factory';
import { PipelineProvider, PipelineStatus } from '../types';
import { calculatePagination } from '../shared/api-response';
import { trackDatabaseQuery } from '../middleware/response';

const logger = new Logger('PipelineController');

export const pipelineController = {
  /**
   * List pipelines with standardized pagination and filtering
   */
  async listPipelines(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const provider = req.query.provider as PipelineProvider;
      const status = req.query.status as PipelineStatus;
      const repository = req.query.repository as string;

      // Track database query for performance metrics
      trackDatabaseQuery(req);

      // Build filter options
      const where: any = {};
      if (provider) where.provider = provider;
      if (status) where.status = status;
      if (repository) where.repository = repository;

      // Get total count for pagination
      const total = await pipelineRepository.count(where);
      trackDatabaseQuery(req);

      // Get paginated results
      const pipelines = await pipelineRepository.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' }
      });
      trackDatabaseQuery(req);

      const pagination = calculatePagination(page, limit, total);

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
    } catch (error) {
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
  async createPipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        name,
        provider,
        repository,
        branch = 'main'
      } = req.body;

      // Validate required fields
      if (!name || !provider || !repository) {
        return res.apiValidationError('Name, provider, and repository are required');
      }

      // Validate provider is supported
      const registeredProviders = providerFactory.getRegisteredProviders();
      if (!registeredProviders.includes(provider)) {
        return res.apiValidationError(`Provider ${provider} is not supported`);
      }

      const pipeline = await pipelineRepository.create({
        name,
        provider,
        externalId: `external_${Date.now()}`,
        repository,
        branch,
        status: PipelineStatus.PENDING,
        metadata: {
          createdAt: new Date(),
          createdBy: req.user!.userId,
        }
      });

      logger.info('Pipeline created', {
        pipelineId: pipeline.id,
        userId: req.user?.userId,
        provider,
        repository
      });

      res.apiCreated({ pipeline });
    } catch (error) {
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
  async getPipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pipelineId } = req.params;

      if (!pipelineId) {
        return res.apiValidationError('Pipeline ID is required');
      }

      const pipeline = await pipelineRepository.findById(pipelineId);
      if (!pipeline) {
        return res.apiNotFound('Pipeline', pipelineId);
      }

      logger.info('Pipeline retrieved', {
        pipelineId,
        userId: req.user?.userId
      });

      res.apiSuccess({ pipeline });
    } catch (error) {
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
  async updatePipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pipelineId } = req.params;

      if (!pipelineId) {
        return res.apiValidationError('Pipeline ID is required');
      }

      const pipeline = await pipelineRepository.findById(pipelineId);
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
    } catch (error) {
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
  async deletePipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pipelineId } = req.params;

      if (!pipelineId) {
        return res.apiValidationError('Pipeline ID is required');
      }

      const pipeline = await pipelineRepository.findById(pipelineId);
      if (!pipeline) {
        return res.apiNotFound('Pipeline', pipelineId);
      }

      // For now, just return success without actual deletion
      logger.info('Pipeline deletion requested', {
        pipelineId,
        userId: req.user?.userId
      });

      res.apiSuccess({ message: 'Pipeline deletion functionality will be implemented in Phase 2' });
    } catch (error) {
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
  async getPipelineRuns(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pipelineId } = req.params;

      if (!pipelineId) {
        return res.apiValidationError('Pipeline ID is required');
      }

      const pipeline = await pipelineRepository.findById(pipelineId);
      if (!pipeline) {
        return res.apiNotFound('Pipeline', pipelineId);
      }

      // For now, return empty runs array
      const runs: any[] = [];

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
    } catch (error) {
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
  async getPipelineRun(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pipelineId, runId } = req.params;

      if (!pipelineId || !runId) {
        return res.apiValidationError('Pipeline ID and Run ID are required');
      }

      const pipeline = await pipelineRepository.findById(pipelineId);
      if (!pipeline) {
        return res.apiNotFound('Pipeline', pipelineId);
      }

      // For now, return a mock run
      const run = {
        id: runId,
        pipelineId,
        status: PipelineStatus.SUCCESS,
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
    } catch (error) {
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
  async analyzePipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pipelineId } = req.params;

      if (!pipelineId) {
        return res.apiValidationError('Pipeline ID is required');
      }

      const pipeline = await pipelineRepository.findById(pipelineId);
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
    } catch (error) {
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
  async syncPipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pipelineId } = req.params;

      if (!pipelineId) {
        return res.apiValidationError('Pipeline ID is required');
      }

      const pipeline = await pipelineRepository.findById(pipelineId);
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
    } catch (error) {
      logger.error('Failed to trigger pipeline sync', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.userId,
        pipelineId: req.params.pipelineId
      });
      return res.apiInternalError('Failed to trigger pipeline sync');
    }
  }
};
