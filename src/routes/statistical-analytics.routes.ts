/**
 * Statistical Analytics Routes - Phase 3 Mathematical Analysis API
 * Provides endpoints for advanced statistical analysis and mathematical insights
 */

import type { Request, Response } from 'express';
import { Router } from 'express';
import {
  authenticateJWT,
  requireRole,
  UserRole,
  requirePermission,
  Permission,
} from '@/middleware/auth';
import { asyncHandler, AppError } from '@/middleware/error-handler';
import { validateRequest } from '@/middleware/request-validation';
import { ResponseBuilder } from '@/shared/api-response';
import { Logger } from '@/shared/logger';
import type { StatisticalDataPoint } from '@/services/statistical-analytics.service';
import { statisticalAnalyticsService } from '@/services/statistical-analytics.service';
import { getBackgroundJobService } from '@/services/background-job.service';
import { PipelineStatus } from '@/types';
import { PipelineRun } from '@/entities/pipeline-run.entity';
import { databaseManager } from '@/core/database';
import Joi from 'joi';

const router = Router();
const logger = new Logger('StatisticalAnalyticsRoutes');

// Validation schemas
const dataPointSchema = Joi.object({
  timestamp: Joi.date().required(),
  value: Joi.number().required(),
  metadata: Joi.object().optional(),
});

const anomalyDetectionSchema = Joi.object({
  data: Joi.array().items(dataPointSchema).min(10).required(),
  method: Joi.string().valid('z-score', 'percentile', 'iqr', 'all').default('all'),
});

const trendAnalysisSchema = Joi.object({
  data: Joi.array().items(dataPointSchema).min(5).required(),
});

const benchmarkSchema = Joi.object({
  currentValue: Joi.number().required(),
  historicalData: Joi.array().items(dataPointSchema).min(5).required(),
  category: Joi.string().optional().default('general'),
});

const slaMonitoringSchema = Joi.object({
  currentValue: Joi.number().required(),
  slaTarget: Joi.number().required(),
  historicalData: Joi.array().items(dataPointSchema).required(),
  violationType: Joi.string()
    .valid('threshold', 'availability', 'performance', 'quality')
    .default('performance'),
});

const costAnalysisSchema = Joi.object({
  executionTimeMinutes: Joi.number().min(0).required(),
  resourceUsage: Joi.object({
    cpu: Joi.number().min(0).max(100).required(),
    memory: Joi.number().min(0).max(100).required(),
    storage: Joi.number().min(0).max(100).required(),
    network: Joi.number().min(0).max(100).required(),
  }).required(),
  historicalCostData: Joi.array().items(dataPointSchema).optional().default([]),
});

/**
 * POST /analytics/statistical/anomalies
 * Detect anomalies in time series data
 */
router.post(
  '/anomalies',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_WRITE),
  validateRequest({ body: anomalyDetectionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { data, method } = req.body;

    logger.info('Anomaly detection requested', {
      dataPoints: data.length,
      method,
      userId: (req as any).user?.userId,
    });

    const results = statisticalAnalyticsService.detectAnomalies(data, method);

    logger.info('Anomaly detection completed', {
      anomaliesFound: results.length,
      method,
      userId: (req as any).user?.userId,
    });

    res.json(
      ResponseBuilder.success({
        anomalies: results,
        summary: {
          totalDataPoints: data.length,
          anomaliesDetected: results.length,
          anomalyRate: (results.length / data.length) * 100,
          method,
          criticalAnomalies: results.filter(a => a.severity === 'critical').length,
          highSeverityAnomalies: results.filter(a => a.severity === 'high').length,
        },
      })
    );
  })
);

/**
 * POST /analytics/statistical/trends
 * Analyze trends in time series data using regression analysis
 */
router.post(
  '/trends',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  validateRequest({ body: trendAnalysisSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { data } = req.body;

    logger.info('Trend analysis requested', {
      dataPoints: data.length,
      userId: (req as any).user?.userId,
    });

    const result = statisticalAnalyticsService.analyzeTrend(data);

    logger.info('Trend analysis completed', {
      trend: result.trend,
      correlation: result.correlation,
      userId: (req as any).user?.userId,
    });

    res.json(
      ResponseBuilder.success({
        trend: result,
        interpretation: {
          direction: result.trend,
          strength:
            result.correlation > 0.8 ? 'strong' : result.correlation > 0.5 ? 'moderate' : 'weak',
          reliability: result.rSquared > 0.8 ? 'high' : result.rSquared > 0.5 ? 'medium' : 'low',
          significance: Math.abs(result.slope) > 0.1 ? 'significant' : 'minimal',
        },
      })
    );
  })
);

/**
 * POST /analytics/statistical/benchmark
 * Compare current performance against historical benchmarks
 */
router.post(
  '/benchmark',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  validateRequest({ body: benchmarkSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { currentValue, historicalData, category } = req.body;

    logger.info('Benchmark analysis requested', {
      currentValue,
      historicalDataPoints: historicalData.length,
      category,
      userId: (req as any).user?.userId,
    });

    const result = statisticalAnalyticsService.generateBenchmark(
      currentValue,
      historicalData,
      category
    );

    logger.info('Benchmark analysis completed', {
      performance: result.performance,
      percentile: result.percentile,
      userId: (req as any).user?.userId,
    });

    res.json(
      ResponseBuilder.success({
        benchmark: result,
        insights: {
          performanceLevel: result.performance,
          relativePosition: `Better than ${result.comparison.betterThan.toFixed(1)}% of historical values`,
          recommendation:
            result.performance === 'poor'
              ? 'Immediate optimization needed'
              : result.performance === 'below-average'
                ? 'Consider improvements'
                : result.performance === 'average'
                  ? 'Monitor trends'
                  : result.performance === 'good'
                    ? 'Maintain current performance'
                    : 'Excellent performance - share best practices',
        },
      })
    );
  })
);

/**
 * POST /analytics/statistical/sla
 * Monitor SLA compliance and detect violations
 */
router.post(
  '/sla',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  validateRequest({ body: slaMonitoringSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { currentValue, slaTarget, historicalData, violationType } = req.body;

    logger.info('SLA monitoring requested', {
      currentValue,
      slaTarget,
      violationType,
      userId: (req as any).user?.userId,
    });

    const result = statisticalAnalyticsService.monitorSLA(
      currentValue,
      slaTarget,
      historicalData,
      violationType
    );

    logger.info('SLA monitoring completed', {
      violated: result.violated,
      severity: result.severity,
      userId: (req as any).user?.userId,
    });

    res.json(
      ResponseBuilder.success({
        sla: result,
        recommendations: {
          status: result.violated ? 'VIOLATION' : 'COMPLIANT',
          urgency: result.violated ? result.severity.toUpperCase() : 'NONE',
          nextActions: result.violated
            ? result.remediation.immediateActions
            : ['Continue monitoring'],
          longTermStrategy: result.violated
            ? result.remediation.longTermActions
            : ['Maintain current standards'],
        },
      })
    );
  })
);

/**
 * POST /analytics/statistical/costs
 * Analyze costs and identify optimization opportunities
 */
router.post(
  '/costs',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_WRITE),
  validateRequest({ body: costAnalysisSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { executionTimeMinutes, resourceUsage, historicalCostData } = req.body;

    logger.info('Cost analysis requested', {
      executionTimeMinutes,
      resourceUsage,
      historicalDataPoints: historicalCostData.length,
      userId: (req as any).user?.userId,
    });

    const result = statisticalAnalyticsService.analyzeCosts(
      executionTimeMinutes,
      resourceUsage,
      historicalCostData
    );

    logger.info('Cost analysis completed', {
      totalCost: result.totalCost,
      optimizationOpportunities: result.optimizationOpportunities.length,
      efficiencyScore: result.efficiency.score,
      userId: (req as any).user?.userId,
    });

    res.json(
      ResponseBuilder.success({
        costAnalysis: result,
        recommendations: {
          totalSavingsPotential: result.optimizationOpportunities.reduce(
            (sum, op) => sum + op.potentialSavings,
            0
          ),
          topOptimization:
            result.optimizationOpportunities.length > 0
              ? result.optimizationOpportunities.sort(
                  (a, b) => b.potentialSavings - a.potentialSavings
                )[0]
              : null,
          efficiencyGrade:
            result.efficiency.score >= 90
              ? 'A'
              : result.efficiency.score >= 80
                ? 'B'
                : result.efficiency.score >= 70
                  ? 'C'
                  : result.efficiency.score >= 60
                    ? 'D'
                    : 'F',
          immediateActions: result.optimizationOpportunities
            .filter(op => op.priority === 'high' || op.priority === 'critical')
            .slice(0, 3),
        },
      })
    );
  })
);

/**
 * GET /analytics/statistical/health
 * Get health status of the statistical analytics engine
 */
router.get(
  '/health',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Statistical analytics health check requested', {
      userId: (req as any).user?.userId,
    });

    // Test the service with sample data
    const testData: StatisticalDataPoint[] = [
      { timestamp: new Date(), value: 1 },
      { timestamp: new Date(), value: 2 },
      { timestamp: new Date(), value: 3 },
      { timestamp: new Date(), value: 4 },
      { timestamp: new Date(), value: 5 },
    ];

    try {
      const trendTest = statisticalAnalyticsService.analyzeTrend(testData);
      const benchmarkTest = statisticalAnalyticsService.generateBenchmark(3, testData);

      res.json(
        ResponseBuilder.success({
          status: 'healthy',
          version: '1.0.0',
          features: {
            anomalyDetection: true,
            trendAnalysis: true,
            benchmarking: true,
            slaMonitoring: true,
            costAnalysis: true,
          },
          testResults: {
            trendAnalysis: trendTest.trend !== undefined,
            benchmarking: benchmarkTest.performance !== undefined,
          },
          timestamp: new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error('Statistical analytics health check failed', { error });
      res.status(503).json(
        ResponseBuilder.error({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Statistical analytics service unavailable',
        })
      );
    }
  })
);

/**
 * Pipeline-Specific Statistical Analytics Endpoints
 * These endpoints integrate the statistical engine with real pipeline data
 */

// Validation schemas for pipeline-specific endpoints
const pipelineAnalysisSchema = Joi.object({
  metric: Joi.string()
    .valid('duration', 'cpu', 'memory', 'success_rate', 'test_coverage')
    .default('duration'),
  method: Joi.string().valid('z-score', 'percentile', 'iqr', 'all').default('all'),
  periodDays: Joi.number().integer().min(1).max(365).default(30),
});

const pipelineTrendSchema = Joi.object({
  metric: Joi.string()
    .valid('duration', 'cpu', 'memory', 'success_rate', 'test_coverage')
    .default('duration'),
  periodDays: Joi.number().integer().min(1).max(365).default(30),
});

const pipelineBenchmarkSchema = Joi.object({
  metric: Joi.string()
    .valid('duration', 'cpu', 'memory', 'success_rate', 'test_coverage')
    .default('duration'),
  periodDays: Joi.number().integer().min(1).max(365).default(30),
});

const pipelineSlaSchema = Joi.object({
  slaTarget: Joi.number().min(0).required(),
  metric: Joi.string()
    .valid('duration', 'cpu', 'memory', 'success_rate', 'test_coverage')
    .default('duration'),
  periodDays: Joi.number().integer().min(1).max(365).default(30),
});

const pipelineCostSchema = Joi.object({
  periodDays: Joi.number().integer().min(1).max(365).default(30),
});

// Job Management Schemas
const jobCreationSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string()
    .valid(
      'anomaly_detection',
      'trend_analysis',
      'sla_monitoring',
      'cost_analysis',
      'full_analysis'
    )
    .required(),
  schedule: Joi.string().required(), // cron expression
  enabled: Joi.boolean().default(true),
  pipelineId: Joi.string().uuid().optional(),
  parameters: Joi.object({
    metric: Joi.string()
      .valid('duration', 'cpu', 'memory', 'success_rate', 'test_coverage')
      .optional(),
    method: Joi.string().valid('z-score', 'percentile', 'iqr', 'all').optional(),
    periodDays: Joi.number().integer().min(1).max(365).optional(),
    slaTarget: Joi.number().optional(),
    alertThresholds: Joi.object({
      anomaly: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
      trend: Joi.string().valid('significant', 'moderate', 'minimal').optional(),
      sla: Joi.boolean().optional(),
      cost: Joi.number().optional(),
    }).optional(),
  }).default({}),
});

const jobParamsSchema = Joi.object({
  jobId: Joi.string().uuid().required(),
});

const pipelineParamsSchema = Joi.object({
  pipelineId: Joi.string().uuid().required(),
});

/**
 * POST /analytics/statistical/pipelines/:pipelineId/anomalies
 * Detect anomalies in pipeline execution data
 */
router.post(
  '/pipelines/:pipelineId/anomalies',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  validateRequest({
    params: pipelineParamsSchema,
    body: pipelineAnalysisSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { pipelineId } = req.params;
    const { metric, method, periodDays } = req.body;

    if (!pipelineId) {
      throw new AppError('Pipeline ID is required', 400);
    }

    logger.info('Pipeline anomaly detection requested', {
      pipelineId,
      metric,
      method,
      periodDays,
      userId: (req as any).user?.userId,
    });

    const results = await statisticalAnalyticsService.analyzePipelineAnomalies(
      pipelineId,
      metric,
      method,
      periodDays
    );

    logger.info('Pipeline anomaly detection completed', {
      pipelineId,
      anomaliesFound: results.length,
      userId: (req as any).user?.userId,
    });

    res.json(
      ResponseBuilder.success({
        pipelineId,
        metric,
        anomalies: results,
        summary: {
          periodDays,
          anomaliesDetected: results.length,
          criticalAnomalies: results.filter(a => a.severity === 'critical').length,
          highSeverityAnomalies: results.filter(a => a.severity === 'high').length,
          method,
        },
      })
    );
  })
);

/**
 * POST /analytics/statistical/pipelines/:pipelineId/trends
 * Analyze trends in pipeline performance over time
 */
router.post(
  '/pipelines/:pipelineId/trends',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  validateRequest({
    params: pipelineParamsSchema,
    body: pipelineTrendSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { pipelineId } = req.params;
    const { metric, periodDays } = req.body;

    if (!pipelineId) {
      throw new AppError('Pipeline ID is required', 400);
    }

    logger.info('Pipeline trend analysis requested', {
      pipelineId,
      metric,
      periodDays,
      userId: (req as any).user?.userId,
    });

    const result = await statisticalAnalyticsService.analyzePipelineTrends(
      pipelineId,
      metric,
      periodDays
    );

    logger.info('Pipeline trend analysis completed', {
      pipelineId,
      trend: result.trend,
      correlation: result.correlation,
      userId: (req as any).user?.userId,
    });

    res.json(
      ResponseBuilder.success({
        pipelineId,
        metric,
        trend: result,
        interpretation: {
          direction: result.trend,
          strength:
            result.correlation > 0.8 ? 'strong' : result.correlation > 0.5 ? 'moderate' : 'weak',
          reliability: result.rSquared > 0.8 ? 'high' : result.rSquared > 0.5 ? 'medium' : 'low',
          significance: Math.abs(result.slope) > 0.1 ? 'significant' : 'minimal',
        },
        summary: {
          periodDays,
          changeRate: result.changeRate,
          volatility: result.volatility,
        },
      })
    );
  })
);

/**
 * POST /analytics/statistical/pipelines/:pipelineId/benchmark
 * Benchmark current pipeline performance against historical data
 */
router.post(
  '/pipelines/:pipelineId/benchmark',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  validateRequest({
    params: pipelineParamsSchema,
    body: pipelineBenchmarkSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { pipelineId } = req.params;
    const { metric, periodDays } = req.body;

    if (!pipelineId) {
      throw new AppError('Pipeline ID is required', 400);
    }

    logger.info('Pipeline benchmark analysis requested', {
      pipelineId,
      metric,
      periodDays,
      userId: (req as any).user?.userId,
    });

    const result = await statisticalAnalyticsService.benchmarkPipelinePerformance(
      pipelineId,
      metric,
      periodDays
    );

    logger.info('Pipeline benchmark analysis completed', {
      pipelineId,
      performance: result.performance,
      percentile: result.percentile,
      userId: (req as any).user?.userId,
    });

    res.json(
      ResponseBuilder.success({
        pipelineId,
        metric,
        benchmark: result,
        summary: {
          periodDays,
          currentValue: result.currentValue,
          benchmark: result.benchmark,
          performance: result.performance,
          deviationPercent: result.deviationPercent,
        },
      })
    );
  })
);

/**
 * POST /analytics/statistical/pipelines/:pipelineId/sla
 * Monitor pipeline SLA compliance
 */
router.post(
  '/pipelines/:pipelineId/sla',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  validateRequest({
    params: pipelineParamsSchema,
    body: pipelineSlaSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { pipelineId } = req.params;
    const { slaTarget, metric, periodDays } = req.body;

    if (!pipelineId) {
      throw new AppError('Pipeline ID is required', 400);
    }

    logger.info('Pipeline SLA monitoring requested', {
      pipelineId,
      slaTarget,
      metric,
      periodDays,
      userId: (req as any).user?.userId,
    });

    const result = await statisticalAnalyticsService.monitorPipelineSLA(
      pipelineId,
      slaTarget,
      metric,
      periodDays
    );

    logger.info('Pipeline SLA monitoring completed', {
      pipelineId,
      violated: result.violated,
      violationPercent: result.violationPercent,
      userId: (req as any).user?.userId,
    });

    res.json(
      ResponseBuilder.success({
        pipelineId,
        metric,
        sla: result,
        summary: {
          periodDays,
          slaTarget,
          actualValue: result.actualValue,
          violated: result.violated,
          violationPercent: result.violationPercent,
          severity: result.severity,
        },
      })
    );
  })
);

/**
 * POST /analytics/statistical/pipelines/:pipelineId/cost
 * Analyze pipeline cost trends and optimization opportunities
 */
router.post(
  '/pipelines/:pipelineId/cost',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  validateRequest({
    params: pipelineParamsSchema,
    body: pipelineCostSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { pipelineId } = req.params;
    const { periodDays } = req.body;

    if (!pipelineId) {
      throw new AppError('Pipeline ID is required', 400);
    }

    logger.info('Pipeline cost analysis requested', {
      pipelineId,
      periodDays,
      userId: (req as any).user?.userId,
    });

    const result = await statisticalAnalyticsService.analyzePipelineCostTrends(
      pipelineId,
      periodDays
    );

    logger.info('Pipeline cost analysis completed', {
      pipelineId,
      totalCost: result.totalCost,
      optimizationOpportunities: result.optimizationOpportunities.length,
      userId: (req as any).user?.userId,
    });

    res.json(
      ResponseBuilder.success({
        pipelineId,
        cost: result,
        summary: {
          periodDays,
          totalCost: result.totalCost,
          costPerMinute: result.costPerMinute,
          optimizationOpportunities: result.optimizationOpportunities.length,
          potentialSavings: result.optimizationOpportunities.reduce(
            (sum, opp) => sum + opp.potentialSavings,
            0
          ),
          efficiencyScore: result.efficiency.score,
        },
      })
    );
  })
);

// === WebSocket Endpoints ===

/**
 * GET /websocket/info - Get WebSocket connection information
 * Returns WebSocket server details for client connections
 */
router.get(
  '/websocket/info',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('WebSocket info requested', {
      userId: (req as any).user?.userId,
    });

    const protocol = req.secure ? 'wss' : 'ws';
    const host = req.get('host') || 'localhost';

    res.json(
      ResponseBuilder.success({
        websocketUrl: `${protocol}://${host}`,
        features: [
          'real-time statistical updates',
          'anomaly detection alerts',
          'trend analysis notifications',
          'SLA violation alerts',
          'cost optimization insights',
        ],
        authentication: {
          required: true,
          method: 'JWT token via query parameter or auth header',
          permissions: ['read:analytics', 'read:pipelines'],
        },
        subscriptionTypes: [
          'pipeline-specific analytics',
          'global anomaly alerts',
          'cost threshold warnings',
          'trend degradation notifications',
        ],
      })
    );
  })
);

/**
 * POST /jobs - Create a new background statistical analysis job
 * Creates scheduled jobs for continuous statistical analysis
 */
router.post(
  '/jobs',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_WRITE),
  validateRequest({ body: jobCreationSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, type, schedule, enabled, pipelineId, parameters } = req.body;

    logger.info('Background job creation requested', {
      name,
      type,
      schedule,
      pipelineId,
      userId: (req as any).user?.userId,
    });

    const jobService = getBackgroundJobService();
    const jobId = await jobService.createJob({
      name,
      type,
      schedule,
      enabled,
      pipelineId,
      parameters,
    });

    logger.info('Background job created', {
      jobId,
      name,
      type,
      userId: (req as any).user?.userId,
    });

    res.json(
      ResponseBuilder.success({
        jobId,
        message: 'Background job created successfully',
        job: {
          id: jobId,
          name,
          type,
          schedule,
          enabled,
          pipelineId,
        },
      })
    );
  })
);

/**
 * GET /jobs - Get all background jobs
 * Returns list of all scheduled statistical analysis jobs
 */
router.get(
  '/jobs',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Jobs list requested', {
      userId: (req as any).user?.userId,
    });

    const jobService = getBackgroundJobService();
    const jobs = jobService.getAllJobs();

    res.json(
      ResponseBuilder.success({
        jobs,
        total: jobs.length,
        enabled: jobs.filter(job => job.enabled).length,
        disabled: jobs.filter(job => !job.enabled).length,
      })
    );
  })
);

/**
 * GET /jobs/:jobId - Get specific job status and details
 * Returns detailed information about a specific background job
 */
router.get(
  '/jobs/:jobId',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  validateRequest({ params: jobParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;

    logger.info('Job status requested', {
      jobId,
      userId: (req as any).user?.userId,
    });

    const jobService = getBackgroundJobService();
    const jobStatus = await jobService.getJobStatus(jobId!);

    res.json(
      ResponseBuilder.success({
        job: jobStatus,
        execution: {
          isRunning: jobStatus.isActive,
          current: jobStatus.currentExecution || null,
          recent: jobStatus.recentExecutions.slice(0, 5),
        },
      })
    );
  })
);

/**
 * POST /jobs/:jobId/cancel - Cancel running job execution
 * Cancels currently running execution of a background job
 */
router.post(
  '/jobs/:jobId/cancel',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_WRITE),
  validateRequest({ params: jobParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;

    logger.info('Job cancellation requested', {
      jobId,
      userId: (req as any).user?.userId,
    });

    const jobService = getBackgroundJobService();
    const result = await jobService.cancelJob(jobId!);

    logger.info('Job cancellation result', {
      jobId,
      cancelled: result.cancelled,
      userId: (req as any).user?.userId,
    });

    res.json(
      ResponseBuilder.success({
        jobId,
        cancelled: result.cancelled,
        message: result.message,
      })
    );
  })
);

/**
 * GET /jobs/metrics - Get background job service metrics
 * Returns performance metrics and statistics for the job service
 */
router.get(
  '/jobs/metrics',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Job metrics requested', {
      userId: (req as any).user?.userId,
    });

    const jobService = getBackgroundJobService();
    const metrics = jobService.getMetrics();

    res.json(
      ResponseBuilder.success({
        metrics,
        timestamp: new Date().toISOString(),
      })
    );
  })
);

/**
 * =============================================================================
 * REAL-TIME DASHBOARD API ENDPOINTS
 * =============================================================================
 * Comprehensive endpoints for dashboard visualization and real-time insights
 */

/**
 * GET /dashboard/overview - Get comprehensive dashboard overview
 * Returns aggregated statistical data for dashboard widgets
 */
router.get(
  '/dashboard/overview',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { timeRange = '24h', pipelineId } = req.query;

    logger.info('Dashboard overview requested', {
      timeRange,
      pipelineId,
      userId: (req as any).user?.userId,
    });

    try {
      // Use existing method to extract pipeline data for recent time range
      // If no pipelineId is provided, get a sample pipeline for demonstration
      let dataPoints: StatisticalDataPoint[] = [];

      if (pipelineId) {
        dataPoints = await statisticalAnalyticsService.extractPipelineDataPoints(
          pipelineId as string,
          'duration'
        );
      } else {
        // Generate sample data for overview when no specific pipeline is requested
        dataPoints = generateSampleDataPoints();
      }

      if (dataPoints.length === 0) {
        return res.json(
          ResponseBuilder.success({
            overview: {
              totalRuns: 0,
              message: 'No pipeline runs found for the specified time range',
            },
          })
        );
      }

      // Filter data points for time range (last 24 hours by default)
      const timeRangeMs =
        timeRange === '24h'
          ? 24 * 60 * 60 * 1000
          : timeRange === '1h'
            ? 60 * 60 * 1000
            : timeRange === '7d'
              ? 7 * 24 * 60 * 60 * 1000
              : 24 * 60 * 60 * 1000;

      const cutoffTime = new Date(Date.now() - timeRangeMs);
      const recentDataPoints = dataPoints.filter(dp => dp.timestamp >= cutoffTime);

      // Calculate dashboard statistics
      const overview = {
        totalRuns: recentDataPoints.length,
        averageDuration:
          recentDataPoints.length > 0
            ? recentDataPoints.reduce(
                (sum: number, dp: StatisticalDataPoint) => sum + dp.value,
                0
              ) / recentDataPoints.length
            : 0,

        // Anomaly detection overview
        anomalies: statisticalAnalyticsService.detectAnomalies(recentDataPoints, 'z-score'),

        // Trend analysis overview
        trends: statisticalAnalyticsService.analyzeTrend(recentDataPoints),

        // Performance benchmarks
        benchmarks:
          recentDataPoints.length > 0
            ? statisticalAnalyticsService.generateBenchmark(
                recentDataPoints[recentDataPoints.length - 1]?.value || 0,
                recentDataPoints,
                'performance'
              )
            : null,

        // Real-time status
        realtimeStatus: {
          totalJobs: getBackgroundJobService().getAllJobs().length,
          recentExecutions: getBackgroundJobService().getExecutionHistory().length,
          lastUpdateTime: new Date().toISOString(),
        },
      };

      return res.json(ResponseBuilder.success({ overview }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Dashboard overview failed', { error: errorMessage });
      throw new AppError('Failed to generate dashboard overview', 500);
    }
  })
);

/**
 * GET /dashboard/real-time-metrics - Get real-time streaming metrics
 * Returns current metrics for real-time dashboard updates
 */
router.get(
  '/dashboard/real-time-metrics',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { pipelineId } = req.query;

    logger.info('Real-time metrics requested', {
      pipelineId,
      userId: (req as any).user?.userId,
    });

    try {
      // Get latest pipeline data points (last 10 minutes worth)
      let allDataPoints: StatisticalDataPoint[] = [];

      if (pipelineId) {
        allDataPoints = await statisticalAnalyticsService.extractPipelineDataPoints(
          pipelineId as string,
          'duration'
        );
      } else {
        allDataPoints = generateSampleDataPoints();
      }

      // Filter for last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentDataPoints = allDataPoints.filter(dp => dp.timestamp >= tenMinutesAgo);

      const currentTime = new Date();
      const metrics = {
        timestamp: currentTime.toISOString(),

        // Current pipeline activity
        activity: {
          runsInLast10Min: recentDataPoints.length,
          avgDuration:
            recentDataPoints.length > 0
              ? recentDataPoints.reduce(
                  (sum: number, dp: StatisticalDataPoint) => sum + dp.value,
                  0
                ) / recentDataPoints.length
              : 0,
        },

        // System health metrics
        system: {
          backgroundJobs: {
            total: getBackgroundJobService().getAllJobs().length,
            executions: getBackgroundJobService().getExecutionHistory().length,
          },
        },

        // Recent alerts and anomalies (simplified)
        alerts: await getRecentAlerts('5m'),

        // Performance indicators
        performance: {
          databaseHealth: await checkDatabaseHealth(),
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
        },
      };

      res.json(ResponseBuilder.success({ metrics }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Real-time metrics failed', { error: errorMessage });
      throw new AppError('Failed to get real-time metrics', 500);
    }
  })
);

/**
 * GET /dashboard/charts/:chartType - Get data for specific chart types
 * Returns formatted data for different dashboard chart components
 */
router.get(
  '/dashboard/charts/:chartType',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { chartType } = req.params;
    const { timeRange = '24h', pipelineId } = req.query;

    logger.info('Dashboard chart data requested', {
      chartType,
      timeRange,
      pipelineId,
      userId: (req as any).user?.userId,
    });

    try {
      let chartData: any = {};

      switch (chartType) {
        case 'anomaly-timeline':
          chartData = await generateAnomalyTimelineChart(
            (pipelineId as string) || null,
            timeRange as string
          );
          break;

        case 'trend-analysis':
          chartData = await generateTrendAnalysisChart(
            (pipelineId as string) || null,
            timeRange as string
          );
          break;

        case 'performance-summary':
          chartData = await generatePerformanceSummaryChart(
            (pipelineId as string) || null,
            timeRange as string
          );
          break;

        default:
          throw new AppError(`Unknown chart type: ${chartType}`, 400);
      }

      res.json(
        ResponseBuilder.success({
          chartType,
          data: chartData,
          metadata: {
            timeRange,
            pipelineId,
            generatedAt: new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Dashboard chart generation failed', {
        chartType,
        error: errorMessage,
      });
      throw new AppError(`Failed to generate ${chartType} chart data`, 500);
    }
  })
);

/**
 * GET /dashboard/alerts/recent - Get recent alerts and notifications
 * Returns recent alerts for dashboard alert panel
 */
router.get(
  '/dashboard/alerts/recent',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = 20, severity, timeRange = '24h' } = req.query;

    logger.info('Recent alerts requested', {
      limit,
      severity,
      timeRange,
      userId: (req as any).user?.userId,
    });

    try {
      const alerts = await getRecentAlertsWithDetails(
        timeRange as string,
        severity as string,
        parseInt(limit as string)
      );

      res.json(
        ResponseBuilder.success({
          alerts,
          summary: {
            total: alerts.length,
            critical: alerts.filter((a: any) => a.severity === 'critical').length,
            high: alerts.filter((a: any) => a.severity === 'high').length,
            medium: alerts.filter((a: any) => a.severity === 'medium').length,
            low: alerts.filter((a: any) => a.severity === 'low').length,
            unresolved: alerts.filter((a: any) => !a.resolved).length,
          },
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Recent alerts retrieval failed', { error: errorMessage });
      throw new AppError('Failed to get recent alerts', 500);
    }
  })
);

/**
 * GET /dashboard/system/health - Get system health overview
 * Returns current system status for monitoring dashboard
 */
router.get(
  '/dashboard/system/health',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('System health requested', {
      userId: (req as any).user?.userId,
    });

    try {
      const systemHealth = {
        database: await checkDatabaseHealth(),
        backgroundJobs: {
          total: getBackgroundJobService().getAllJobs().length,
          executionHistory: getBackgroundJobService().getExecutionHistory().slice(-10),
        },
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };

      res.json(
        ResponseBuilder.success({
          health: systemHealth,
          status: systemHealth.database === 'healthy' ? 'healthy' : 'degraded',
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('System health check failed', { error: errorMessage });
      throw new AppError('Failed to get system health', 500);
    }
  })
);

// ===================== HELPER FUNCTIONS FOR DASHBOARD ENDPOINTS =====================

/**
 * Get recent alerts with filtering
 */
async function getRecentAlerts(timeRange: string): Promise<any[]> {
  // Implementation would get alerts from database/cache
  // For now, return mock data structure
  return [
    {
      id: 'alert-1',
      type: 'sla_violation',
      severity: 'high',
      message: 'SLA threshold exceeded',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
  ];
}

/**
 * Get recent alerts with detailed information
 */
async function getRecentAlertsWithDetails(
  timeRange: string,
  severity?: string,
  limit?: number
): Promise<any[]> {
  // Implementation would query alert history with filters
  // For now, return mock detailed data
  return [
    {
      id: 'alert-1',
      type: 'anomaly_detection',
      severity: 'critical',
      title: 'Pipeline Duration Anomaly',
      message: 'Pipeline execution time 300% above normal baseline',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      pipelineId: 'pipeline-abc-123',
      resolved: false,
      metadata: {
        expectedDuration: 120000,
        actualDuration: 360000,
        threshold: 200000,
        anomalyScore: 3.2,
      },
    },
  ];
}

/**
 * Check database health status
 */
async function checkDatabaseHealth(): Promise<string> {
  try {
    await databaseManager.query('SELECT 1');
    return 'healthy';
  } catch (error) {
    return 'unhealthy';
  }
}

/**
 * Generate chart data for anomaly timeline
 */
async function generateAnomalyTimelineChart(
  pipelineId: string | null,
  timeRange: string
): Promise<any> {
  // Use actual service data
  let dataPoints: StatisticalDataPoint[] = [];

  if (pipelineId) {
    dataPoints = await statisticalAnalyticsService.extractPipelineDataPoints(
      pipelineId,
      'duration'
    );
  } else {
    dataPoints = generateSampleDataPoints();
  }

  // Filter for time range
  const timeRangeMs =
    timeRange === '24h'
      ? 24 * 60 * 60 * 1000
      : timeRange === '1h'
        ? 60 * 60 * 1000
        : timeRange === '7d'
          ? 7 * 24 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

  const cutoffTime = new Date(Date.now() - timeRangeMs);
  const filteredPoints = dataPoints.filter(dp => dp.timestamp >= cutoffTime);

  const anomalies = statisticalAnalyticsService.detectAnomalies(filteredPoints, 'z-score');

  // Create set of anomaly values for quick lookup
  const anomalyValues = new Set(anomalies.map(a => a.actualValue));

  return {
    type: 'line',
    series: [
      {
        name: 'Normal Values',
        data: filteredPoints
          .filter(dp => !anomalyValues.has(dp.value))
          .map(dp => ({ x: dp.timestamp, y: dp.value })),
      },
      {
        name: 'Anomalies',
        data: anomalies.map(a => ({ x: new Date(), y: a.actualValue })), // Use current time as placeholder
      },
    ],
  };
}

/**
 * Generate chart data for trend analysis
 */
async function generateTrendAnalysisChart(
  pipelineId: string | null,
  timeRange: string
): Promise<any> {
  let dataPoints: StatisticalDataPoint[] = [];

  if (pipelineId) {
    dataPoints = await statisticalAnalyticsService.extractPipelineDataPoints(
      pipelineId,
      'duration'
    );
  } else {
    dataPoints = generateSampleDataPoints();
  }

  const trend = statisticalAnalyticsService.analyzeTrend(dataPoints);

  return {
    type: 'area',
    series: [
      {
        name: 'Actual Values',
        data: dataPoints.map(dp => ({ x: dp.timestamp, y: dp.value })),
      },
      {
        name: 'Trend Line',
        data: dataPoints.map((dp, index) => ({
          x: dp.timestamp,
          y: trend.slope * index + (dataPoints[0]?.value || 0), // Use first value as baseline
        })),
      },
    ],
    trendDirection: trend.trend,
    correlation: trend.correlation,
  };
}

/**
 * Generate chart data for performance summary
 */
async function generatePerformanceSummaryChart(
  pipelineId: string | null,
  timeRange: string
): Promise<any> {
  let dataPoints: StatisticalDataPoint[] = [];

  if (pipelineId) {
    dataPoints = await statisticalAnalyticsService.extractPipelineDataPoints(
      pipelineId,
      'duration'
    );
  } else {
    dataPoints = generateSampleDataPoints();
  }

  const anomalies = statisticalAnalyticsService.detectAnomalies(dataPoints, 'z-score');
  const trend = statisticalAnalyticsService.analyzeTrend(dataPoints);

  return {
    type: 'summary',
    metrics: {
      totalRuns: dataPoints.length,
      averageValue:
        dataPoints.length > 0
          ? dataPoints.reduce((sum, dp) => sum + dp.value, 0) / dataPoints.length
          : 0,
      anomalyCount: anomalies.length,
      trendDirection: trend.trend,
      correlation: trend.correlation,
    },
    timeRange,
  };
}

/**
 * Generate sample data points for demonstration when no pipeline is specified
 */
function generateSampleDataPoints(): StatisticalDataPoint[] {
  const now = new Date();
  const dataPoints: StatisticalDataPoint[] = [];

  // Generate 30 data points over the last 30 hours
  for (let i = 29; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // hourly intervals
    const baseValue = 120000; // 2 minutes base duration
    const variation = (Math.random() - 0.5) * 60000; // ±30 seconds variation
    const value = Math.max(30000, baseValue + variation); // minimum 30 seconds

    dataPoints.push({
      timestamp,
      value,
      metadata: {
        status: Math.random() > 0.1 ? 'success' : 'failed',
        synthetic: true,
      },
    });
  }

  return dataPoints;
}

export { router as statisticalAnalyticsRoutes };
