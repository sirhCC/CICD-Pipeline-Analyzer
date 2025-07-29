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

import { Router, Request, Response } from 'express';
import { authenticateJWT, requireRole, UserRole } from '@/middleware/auth';
import { asyncHandler, AppError } from '@/middleware/error-handler';
import { validateRequest } from '@/middleware/request-validation';
import { ResponseBuilder } from '@/shared/api-response';
import { Logger } from '@/shared/logger';
import { 
  advancedDataProcessingService,
  AggregationLevel,
  AggregationStrategy,
  ExportFormat
} from '@/services/advanced-data-processing.service';
import Joi from 'joi';

const router = Router();
const logger = new Logger('AdvancedDataProcessingRoutes');

// Request validation schemas
const timeSeriesCompressionSchema = Joi.object({
  data: Joi.array().items(Joi.object({
    timestamp: Joi.date().required(),
    value: Joi.number().required(),
    metadata: Joi.object().optional()
  })).required(),
  compressionRatio: Joi.number().min(0.01).max(1).default(0.1),
  preserveAnomalies: Joi.boolean().default(true)
});

/**
 * @route POST /api/analytics/advanced/compress-timeseries
 * @desc Compress time-series data with anomaly preservation
 * @access Private
 */
router.post('/compress-timeseries', 
  authenticateJWT,
  requireRole(UserRole.ANALYST),
  validateRequest({ body: timeSeriesCompressionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { data, compressionRatio, preserveAnomalies } = req.body;
    
    logger.info('Starting time-series compression', {
      dataPoints: data.length,
      compressionRatio,
      preserveAnomalies
    });
    
    const result = await advancedDataProcessingService.compressTimeSeries(
      data,
      compressionRatio,
      preserveAnomalies
    );
    
    logger.info('Time-series compression completed', {
      originalSize: data.length,
      compressedSize: result.points.length,
      actualRatio: result.compressionRatio
    });
    
    res.json(ResponseBuilder.success({
      data: result,
      message: 'Time-series data compressed successfully'
    }));
  })
);

/**
 * @route GET /api/analytics/advanced/jobs
 * @desc Get all processing jobs
 * @access Private
 */
router.get('/jobs', 
  authenticateJWT,
  requireRole(UserRole.ANALYST),
  asyncHandler(async (req: Request, res: Response) => {
    const jobs = advancedDataProcessingService.getAllJobs();
    
    res.json(ResponseBuilder.success({
      data: {
        jobs,
        summary: {
          total: jobs.length,
          byStatus: jobs.reduce((acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      },
      message: 'Processing jobs retrieved successfully'
    }));
  })
);

/**
 * @route GET /api/analytics/advanced/jobs/:jobId
 * @desc Get specific job status
 * @access Private
 */
router.get('/jobs/:jobId', 
  authenticateJWT,
  requireRole(UserRole.ANALYST),
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;
    
    if (!jobId) {
      throw new AppError('Job ID is required', 400);
    }
    
    const job = advancedDataProcessingService.getJobStatus(jobId);
    
    if (!job) {
      throw new AppError('Job not found', 404);
    }
    
    res.json(ResponseBuilder.success({
      data: job,
      message: 'Job status retrieved successfully'
    }));
  })
);

/**
 * @route DELETE /api/analytics/advanced/jobs/:jobId
 * @desc Cancel a running job
 * @access Private
 */
router.delete('/jobs/:jobId', 
  authenticateJWT,
  requireRole(UserRole.ANALYST),
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;
    
    if (!jobId) {
      throw new AppError('Job ID is required', 400);
    }
    
    const cancelled = await advancedDataProcessingService.cancelJob(jobId);
    
    if (!cancelled) {
      throw new AppError('Job not found or cannot be cancelled', 400);
    }
    
    logger.info('Job cancelled', { jobId });
    res.json(ResponseBuilder.success({
      data: { jobId, cancelled: true },
      message: 'Job cancelled successfully'
    }));
  })
);

/**
 * @route GET /api/analytics/advanced/cache/stats
 * @desc Get cache statistics
 * @access Private
 */
router.get('/cache/stats', 
  authenticateJWT,
  requireRole(UserRole.ANALYST),
  asyncHandler(async (req: Request, res: Response) => {
    const stats = advancedDataProcessingService.getCacheStats();
    
    res.json(ResponseBuilder.success({
      data: stats,
      message: 'Cache statistics retrieved successfully'
    }));
  })
);

/**
 * @route DELETE /api/analytics/advanced/cache
 * @desc Clear cache
 * @access Private
 */
router.delete('/cache', 
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    advancedDataProcessingService.clearCache();
    
    logger.info('Cache cleared');
    res.json(ResponseBuilder.success({
      data: { cleared: true },
      message: 'Cache cleared successfully'
    }));
  })
);

/**
 * @route GET /api/analytics/advanced/aggregation-strategies
 * @desc Get available aggregation strategies
 * @access Private
 */
router.get('/aggregation-strategies', 
  authenticateJWT,
  requireRole(UserRole.VIEWER),
  asyncHandler(async (req: Request, res: Response) => {
    const strategies = Object.values(AggregationStrategy).map(strategy => ({
      value: strategy,
      label: strategy.replace(/_/g, ' ').toUpperCase(),
      description: getStrategyDescription(strategy)
    }));
    
    const levels = Object.values(AggregationLevel).map(level => ({
      value: level,
      label: level.toUpperCase(),
      description: getLevelDescription(level)
    }));
    
    res.json(ResponseBuilder.success({
      data: {
        strategies,
        levels,
        exportFormats: Object.values(ExportFormat)
      },
      message: 'Aggregation options retrieved successfully'
    }));
  })
);

// Helper functions
function getStrategyDescription(strategy: AggregationStrategy): string {
  switch (strategy) {
    case AggregationStrategy.AVERAGE:
      return 'Calculate the mean value of data points in each window';
    case AggregationStrategy.SUM:
      return 'Sum all values in each time window';
    case AggregationStrategy.MIN:
      return 'Find the minimum value in each window';
    case AggregationStrategy.MAX:
      return 'Find the maximum value in each window';
    case AggregationStrategy.COUNT:
      return 'Count the number of data points in each window';
    case AggregationStrategy.MEDIAN:
      return 'Calculate the median value in each window';
    case AggregationStrategy.PERCENTILE_95:
      return 'Calculate the 95th percentile value in each window';
    case AggregationStrategy.PERCENTILE_99:
      return 'Calculate the 99th percentile value in each window';
    default:
      return 'Unknown aggregation strategy';
  }
}

function getLevelDescription(level: AggregationLevel): string {
  switch (level) {
    case AggregationLevel.RAW:
      return 'No aggregation, keep raw data points';
    case AggregationLevel.MINUTE:
      return 'Aggregate data by minute intervals';
    case AggregationLevel.HOUR:
      return 'Aggregate data by hour intervals';
    case AggregationLevel.DAY:
      return 'Aggregate data by day intervals';
    case AggregationLevel.WEEK:
      return 'Aggregate data by week intervals';
    case AggregationLevel.MONTH:
      return 'Aggregate data by month intervals';
    default:
      return 'Unknown aggregation level';
  }
}

export default router;
