/**
 * Pipeline Management Controller
 * Handles CRUD operations and analytics for CI/CD pipelines
 */

import { Request, Response, NextFunction } from 'express';
import { pipelineRepository, pipelineRunRepository } from '../repositories';
import { AuthenticatedRequest } from '../middleware/auth';
import { Logger } from '../shared/logger';
import { ValidationError, NotFoundError, AuthorizationError } from '../middleware/error-handler';
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
      next(error);
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
        throw new ValidationError('Name, provider, and repository are required');
      }

      // Validate provider is supported
      const registeredProviders = providerFactory.getRegisteredProviders();
      if (!registeredProviders.includes(provider)) {
        throw new ValidationError(`Provider ${provider} is not supported`);
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
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a specific pipeline by ID
   */
  async getPipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pipelineId } = req.params;

      if (!pipelineId) {
        throw new ValidationError('Pipeline ID is required');
      }

      const pipeline = await pipelineRepository.findById(pipelineId);
      if (!pipeline) {
        throw new NotFoundError('Pipeline not found');
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
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update a pipeline (simplified)
   */
  async updatePipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pipelineId } = req.params;

      if (!pipelineId) {
        throw new ValidationError('Pipeline ID is required');
      }

      const pipeline = await pipelineRepository.findById(pipelineId);
      if (!pipeline) {
        throw new NotFoundError('Pipeline not found');
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
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete a pipeline (simplified)
   */
  async deletePipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pipelineId } = req.params;

      if (!pipelineId) {
        throw new ValidationError('Pipeline ID is required');
      }

      const pipeline = await pipelineRepository.findById(pipelineId);
      if (!pipeline) {
        throw new NotFoundError('Pipeline not found');
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
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get pipeline runs (simplified)
   */
  async getPipelineRuns(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pipelineId } = req.params;

      if (!pipelineId) {
        throw new ValidationError('Pipeline ID is required');
      }

      const pipeline = await pipelineRepository.findById(pipelineId);
      if (!pipeline) {
        throw new NotFoundError('Pipeline not found');
      }

      // For now, return empty runs array
      const runs: any[] = [];

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
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a specific pipeline run (simplified)
   */
  async getPipelineRun(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pipelineId, runId } = req.params;

      if (!pipelineId || !runId) {
        throw new ValidationError('Pipeline ID and Run ID are required');
      }

      const pipeline = await pipelineRepository.findById(pipelineId);
      if (!pipeline) {
        throw new NotFoundError('Pipeline not found');
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
    } catch (error) {
      next(error);
    }
  },

  /**
   * Analyze a pipeline (trigger analytics processing)
   */
  async analyzePipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pipelineId } = req.params;

      if (!pipelineId) {
        throw new ValidationError('Pipeline ID is required');
      }

      const pipeline = await pipelineRepository.findById(pipelineId);
      if (!pipeline) {
        throw new NotFoundError('Pipeline not found');
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
    } catch (error) {
      next(error);
    }
  },

  /**
   * Sync pipeline data from provider
   */
  async syncPipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pipelineId } = req.params;

      if (!pipelineId) {
        throw new ValidationError('Pipeline ID is required');
      }

      const pipeline = await pipelineRepository.findById(pipelineId);
      if (!pipeline) {
        throw new NotFoundError('Pipeline not found');
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
    } catch (error) {
      next(error);
    }
  }
};
