/**
 * Statistical Analytics Routes - Phase 3 Mathematical Analysis API
 * Provides endpoints for advanced statistical analysis and mathematical insights
 */

import { Router, Request, Response } from 'express';
import { authenticateJWT, requireRole, UserRole, requirePermission, Permission } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/error-handler';
import { validateRequest } from '@/middleware/request-validation';
import { ResponseBuilder } from '@/shared/api-response';
import { Logger } from '@/shared/logger';
import { statisticalAnalyticsService, StatisticalDataPoint } from '@/services/statistical-analytics.service';
import Joi from 'joi';

const router = Router();
const logger = new Logger('StatisticalAnalyticsRoutes');

// Validation schemas
const dataPointSchema = Joi.object({
  timestamp: Joi.date().required(),
  value: Joi.number().required(),
  metadata: Joi.object().optional()
});

const anomalyDetectionSchema = Joi.object({
  data: Joi.array().items(dataPointSchema).min(10).required(),
  method: Joi.string().valid('z-score', 'percentile', 'iqr', 'all').default('all')
});

const trendAnalysisSchema = Joi.object({
  data: Joi.array().items(dataPointSchema).min(5).required()
});

const benchmarkSchema = Joi.object({
  currentValue: Joi.number().required(),
  historicalData: Joi.array().items(dataPointSchema).min(5).required(),
  category: Joi.string().optional().default('general')
});

const slaMonitoringSchema = Joi.object({
  currentValue: Joi.number().required(),
  slaTarget: Joi.number().required(),
  historicalData: Joi.array().items(dataPointSchema).required(),
  violationType: Joi.string().valid('threshold', 'availability', 'performance', 'quality').default('performance')
});

const costAnalysisSchema = Joi.object({
  executionTimeMinutes: Joi.number().min(0).required(),
  resourceUsage: Joi.object({
    cpu: Joi.number().min(0).max(100).required(),
    memory: Joi.number().min(0).max(100).required(),
    storage: Joi.number().min(0).max(100).required(),
    network: Joi.number().min(0).max(100).required()
  }).required(),
  historicalCostData: Joi.array().items(dataPointSchema).optional().default([])
});

/**
 * POST /analytics/statistical/anomalies
 * Detect anomalies in time series data
 */
router.post('/anomalies',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_WRITE),
  validateRequest({ body: anomalyDetectionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { data, method } = req.body;
    
    logger.info('Anomaly detection requested', {
      dataPoints: data.length,
      method,
      userId: (req as any).user?.userId
    });

    const results = statisticalAnalyticsService.detectAnomalies(data, method);
    
    logger.info('Anomaly detection completed', {
      anomaliesFound: results.length,
      method,
      userId: (req as any).user?.userId
    });

    res.json(ResponseBuilder.success({
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
  })
);

/**
 * POST /analytics/statistical/trends
 * Analyze trends in time series data using regression analysis
 */
router.post('/trends',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  validateRequest({ body: trendAnalysisSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { data } = req.body;
    
    logger.info('Trend analysis requested', {
      dataPoints: data.length,
      userId: (req as any).user?.userId
    });

    const result = statisticalAnalyticsService.analyzeTrend(data);
    
    logger.info('Trend analysis completed', {
      trend: result.trend,
      correlation: result.correlation,
      userId: (req as any).user?.userId
    });

    res.json(ResponseBuilder.success({
      trend: result,
      interpretation: {
        direction: result.trend,
        strength: result.correlation > 0.8 ? 'strong' : result.correlation > 0.5 ? 'moderate' : 'weak',
        reliability: result.rSquared > 0.8 ? 'high' : result.rSquared > 0.5 ? 'medium' : 'low',
        significance: Math.abs(result.slope) > 0.1 ? 'significant' : 'minimal'
      }
    }));
  })
);

/**
 * POST /analytics/statistical/benchmark
 * Compare current performance against historical benchmarks
 */
router.post('/benchmark',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  validateRequest({ body: benchmarkSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { currentValue, historicalData, category } = req.body;
    
    logger.info('Benchmark analysis requested', {
      currentValue,
      historicalDataPoints: historicalData.length,
      category,
      userId: (req as any).user?.userId
    });

    const result = statisticalAnalyticsService.generateBenchmark(currentValue, historicalData, category);
    
    logger.info('Benchmark analysis completed', {
      performance: result.performance,
      percentile: result.percentile,
      userId: (req as any).user?.userId
    });

    res.json(ResponseBuilder.success({
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
  })
);

/**
 * POST /analytics/statistical/sla
 * Monitor SLA compliance and detect violations
 */
router.post('/sla',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  validateRequest({ body: slaMonitoringSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { currentValue, slaTarget, historicalData, violationType } = req.body;
    
    logger.info('SLA monitoring requested', {
      currentValue,
      slaTarget,
      violationType,
      userId: (req as any).user?.userId
    });

    const result = statisticalAnalyticsService.monitorSLA(currentValue, slaTarget, historicalData, violationType);
    
    logger.info('SLA monitoring completed', {
      violated: result.violated,
      severity: result.severity,
      userId: (req as any).user?.userId
    });

    res.json(ResponseBuilder.success({
      sla: result,
      recommendations: {
        status: result.violated ? 'VIOLATION' : 'COMPLIANT',
        urgency: result.violated ? result.severity.toUpperCase() : 'NONE',
        nextActions: result.violated ? result.remediation.immediateActions : ['Continue monitoring'],
        longTermStrategy: result.violated ? result.remediation.longTermActions : ['Maintain current standards']
      }
    }));
  })
);

/**
 * POST /analytics/statistical/costs
 * Analyze costs and identify optimization opportunities
 */
router.post('/costs',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_WRITE),
  validateRequest({ body: costAnalysisSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { executionTimeMinutes, resourceUsage, historicalCostData } = req.body;
    
    logger.info('Cost analysis requested', {
      executionTimeMinutes,
      resourceUsage,
      historicalDataPoints: historicalCostData.length,
      userId: (req as any).user?.userId
    });

    const result = statisticalAnalyticsService.analyzeCosts(executionTimeMinutes, resourceUsage, historicalCostData);
    
    logger.info('Cost analysis completed', {
      totalCost: result.totalCost,
      optimizationOpportunities: result.optimizationOpportunities.length,
      efficiencyScore: result.efficiency.score,
      userId: (req as any).user?.userId
    });

    res.json(ResponseBuilder.success({
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
  })
);

/**
 * GET /analytics/statistical/health
 * Get health status of the statistical analytics engine
 */
router.get('/health',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Statistical analytics health check requested', {
      userId: (req as any).user?.userId
    });

    // Test the service with sample data
    const testData: StatisticalDataPoint[] = [
      { timestamp: new Date(), value: 1 },
      { timestamp: new Date(), value: 2 },
      { timestamp: new Date(), value: 3 },
      { timestamp: new Date(), value: 4 },
      { timestamp: new Date(), value: 5 }
    ];

    try {
      const trendTest = statisticalAnalyticsService.analyzeTrend(testData);
      const benchmarkTest = statisticalAnalyticsService.generateBenchmark(3, testData);
      
      res.json(ResponseBuilder.success({
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
    } catch (error) {
      logger.error('Statistical analytics health check failed', { error });
      res.status(503).json(ResponseBuilder.error({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Statistical analytics service unavailable'
      }));
    }
  })
);

export { router as statisticalAnalyticsRoutes };
