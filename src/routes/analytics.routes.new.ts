import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { authenticateJWT, requirePermission, Permission } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validateRequest, ValidationSchema } from '../middleware/request-validation';
import { requestLoggers } from '../middleware/request-logger';
import { ResponseBuilder } from '../shared/api-response';
import { Logger } from '../shared/logger';
import Joi from 'joi';
import { alertingRoutes } from './alerting.routes';
import advancedDataProcessingRoutes from './advanced-data-processing.routes';

const router = Router();
const logger = new Logger('AnalyticsRoutes');

// Initialize analytics service with configuration
const analyticsService = new AnalyticsService({
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
router.use(requestLoggers.production);
router.use(authenticateJWT);

// Validation schemas
const pipelineParamsValidation: ValidationSchema = {
  params: Joi.object({
    pipelineId: Joi.string().uuid().required()
  })
};

const metricsQueryValidation: ValidationSchema = {
  query: Joi.object({
    period: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').default('daily'),
    limit: Joi.number().integer().min(1).max(1000).default(100)
  })
};

const dashboardQueryValidation: ValidationSchema = {
  query: Joi.object({
    period: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').default('daily'),
    pipelineId: Joi.string().uuid().optional()
  })
};

const alertParamsValidation: ValidationSchema = {
  params: Joi.object({
    alertId: Joi.string().uuid().required()
  })
};

const alertUpdateValidation: ValidationSchema = {
  body: Joi.object({
    acknowledged: Joi.boolean().required(),
    acknowledgedBy: Joi.string().max(100).optional()
  })
};

/**
 * GET /analytics/dashboard
 * Get analytics dashboard data for overview
 */
router.get('/dashboard',
  requirePermission(Permission.PIPELINES_READ),
  validateRequest(dashboardQueryValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { period, pipelineId } = req.query;
    
    logger.info('Analytics dashboard requested', { 
      period, 
      pipelineId,
      userId: (req as any).user?.userId 
    });

    const dashboard = await analyticsService.generateDashboard({
      timeRange: period as string,
      pipelineId: pipelineId as string
    });

    res.json(ResponseBuilder.success(dashboard, {
      performance: { executionTime: Date.now() - (req as any).startTime }
    }));
  })
);

/**
 * GET /analytics/pipelines/:pipelineId/metrics
 * Get detailed metrics for a specific pipeline
 */
router.get('/pipelines/:pipelineId/metrics',
  requirePermission(Permission.PIPELINES_READ),
  validateRequest(pipelineParamsValidation),
  validateRequest(metricsQueryValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { pipelineId } = req.params;
    const { period, limit } = req.query;
    
    logger.info('Pipeline metrics requested', { 
      pipelineId, 
      period, 
      limit,
      userId: (req as any).user?.userId 
    });

    const metrics = await analyticsService.calculateMetrics(pipelineId!, period as 'hourly' | 'daily' | 'weekly' | 'monthly');

    res.json(ResponseBuilder.success(metrics, {
      performance: { executionTime: Date.now() - (req as any).startTime }
    }));
  })
);

/**
 * GET /analytics/pipelines/:pipelineId/patterns
 * Detect failure patterns for a specific pipeline
 */
router.get('/pipelines/:pipelineId/patterns',
  requirePermission(Permission.PIPELINES_READ),
  validateRequest(pipelineParamsValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { pipelineId } = req.params;
    
    logger.info('Failure patterns requested', { 
      pipelineId,
      userId: (req as any).user?.userId 
    });

    const patterns = await analyticsService.detectFailurePatterns(pipelineId);

    res.json(ResponseBuilder.success(patterns, {
      performance: { executionTime: Date.now() - (req as any).startTime }
    }));
  })
);

/**
 * GET /analytics/patterns
 * Get global failure patterns across all pipelines
 */
router.get('/patterns',
  requirePermission(Permission.SYSTEM_METRICS),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Global failure patterns requested', { 
      userId: (req as any).user?.userId 
    });

    const patterns = await analyticsService.detectFailurePatterns();

    res.json(ResponseBuilder.success(patterns, {
      performance: { executionTime: Date.now() - (req as any).startTime }
    }));
  })
);

/**
 * GET /analytics/pipelines/:pipelineId/recommendations
 * Get optimization recommendations for a specific pipeline
 */
router.get('/pipelines/:pipelineId/recommendations',
  requirePermission(Permission.PIPELINES_READ),
  validateRequest(pipelineParamsValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { pipelineId } = req.params;
    
    logger.info('Optimization recommendations requested', { 
      pipelineId,
      userId: (req as any).user?.userId 
    });

    const recommendations = await analyticsService.generateOptimizationRecommendations(pipelineId!);

    res.json(ResponseBuilder.success(recommendations, {
      performance: { executionTime: Date.now() - (req as any).startTime }
    }));
  })
);

/**
 * GET /analytics/alerts
 * Get analytics alerts
 */
router.get('/alerts',
  requirePermission(Permission.PIPELINES_READ),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Analytics alerts requested', { 
      userId: (req as any).user?.userId 
    });

    const alerts = await analyticsService.generateAlerts();

    res.json(ResponseBuilder.success(alerts, {
      performance: { executionTime: Date.now() - (req as any).startTime }
    }));
  })
);

/**
 * PUT /analytics/alerts/:alertId
 * Update alert status (acknowledge/resolve)
 */
router.put('/alerts/:alertId',
  requirePermission(Permission.PIPELINES_WRITE),
  validateRequest(alertParamsValidation),
  validateRequest(alertUpdateValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { alertId } = req.params;
    const { acknowledged, acknowledgedBy } = req.body;
    
    logger.info('Alert update requested', { 
      alertId, 
      acknowledged, 
      acknowledgedBy,
      userId: (req as any).user?.userId 
    });

    const updatedAlert = await analyticsService.updateAlert(alertId!, {
      acknowledged,
      acknowledgedBy
    });

    res.json(ResponseBuilder.success(updatedAlert));
  })
);

/**
 * POST /analytics/pipelines/:pipelineId/trigger
 * Trigger analytics analysis for a specific pipeline
 */
router.post('/pipelines/:pipelineId/trigger',
  requirePermission(Permission.PIPELINES_WRITE),
  validateRequest(pipelineParamsValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { pipelineId } = req.params;
    
    logger.info('Analytics trigger requested', { 
      pipelineId,
      userId: (req as any).user?.userId 
    });

    // Start analysis in background
    analyticsService.analyzeAsync(pipelineId).catch(error => {
      logger.error('Background analytics analysis failed', { 
        pipelineId, 
        error: error.message 
      });
    });

    res.json(ResponseBuilder.success({
      pipelineId,
      status: 'triggered',
      message: 'Analytics analysis started in background'
    }));
  })
);

/**
 * GET /analytics/health
 * Health check for analytics service
 */
router.get('/health',
  requirePermission(Permission.SYSTEM_METRICS),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Analytics health check requested', { 
      userId: (req as any).user?.userId 
    });

    const health = await analyticsService.healthCheck();
    const isHealthy = health.status === 'healthy';

    res.status(isHealthy ? 200 : 503).json(
      ResponseBuilder.success(health, {
        performance: { executionTime: Date.now() - (req as any).startTime }
      })
    );
  })
);

// Mount alerting routes
router.use('/alerts', alertingRoutes);

// Mount advanced data processing routes
router.use('/advanced', advancedDataProcessingRoutes);

export default router;
