/**
 * Enhanced Analytics Routes - Optimized Statistical Analytics API
 * 
 * This is an enhanced version of the analytics routes with:
 * - Performance optimizations and monitoring
 *    logger.info('Enhanced benchmark request', {
      currentValue,
      historicalDataLength: historicalData.length,
      category
    });

    const { enhancedStatisticalAnalyticsService } = await getServices();
    const result = await enhancedStatisticalAnalyticsService.generateBenchmark(nced caching strategies
 * - Batch processing for large datasets
 * - Enhanced error handling and validation
 * 
 * @author sirhCC
 * @version 2.0.0
 */

import type { Request, Response } from 'express';
import { Router } from 'express';
import { Logger } from '../shared/logger';

const router = Router();
const logger = new Logger('EnhancedAnalyticsRoutes');

// Lazy initialization of services to avoid circular dependencies and database initialization issues
let enhancedStatisticalAnalyticsService: any;
let optimizationIntegrationService: any;
let optimizationConfigService: any;

const getServices = async () => {
  if (!enhancedStatisticalAnalyticsService) {
    const services = await import('../services');
    enhancedStatisticalAnalyticsService = services.enhancedStatisticalAnalyticsService;
    optimizationIntegrationService = services.optimizationIntegrationService;
    optimizationConfigService = services.optimizationConfigService;
  }
  return {
    enhancedStatisticalAnalyticsService,
    optimizationIntegrationService,
    optimizationConfigService,
  };
};

// Simplified API response helper
const createResponse = (success: boolean, data: any, message: string) => ({
  success,
  data,
  message,
  timestamp: new Date().toISOString(),
});

/**
 * Enhanced anomaly detection with performance optimization
 * POST /analytics/enhanced/anomalies
 */
router.post('/anomalies', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { data, method = 'all' } = req.body;

    if (!data || !Array.isArray(data) || data.length < 10) {
      return res
        .status(400)
        .json(
          createResponse(false, null, 'Invalid data: requires array with at least 10 data points')
        );
    }

    logger.info('Enhanced anomaly detection request', {
      dataPoints: data.length,
      method,
    });

    const { enhancedStatisticalAnalyticsService } = await getServices();
    const results = await enhancedStatisticalAnalyticsService.detectAnomalies(data, method);
    const executionTime = Date.now() - startTime;

    const response = {
      anomalies: results,
      summary: {
        totalDataPoints: data.length,
        anomaliesFound: results.length,
        anomalyRate: (results.length / data.length) * 100,
        severityDistribution: calculateSeverityDistribution(results),
      },
      performance: {
        executionTime,
      },
      metadata: {
        method,
        timestamp: new Date(),
        version: '2.0.0',
      },
    };

    logger.info('Enhanced anomaly detection completed', {
      anomaliesFound: results.length,
      executionTime,
      dataPoints: data.length,
    });

    return res.json(createResponse(true, response, 'Anomaly detection completed successfully'));
  } catch (error) {
    logger.error('Enhanced anomaly detection failed', error);
    return res
      .status(500)
      .json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Enhanced trend analysis with memoization
 * POST /analytics/enhanced/trends
 */
router.post('/trends', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data) || data.length < 5) {
      return res
        .status(400)
        .json(
          createResponse(false, null, 'Invalid data: requires array with at least 5 data points')
        );
    }

    logger.info('Enhanced trend analysis request', {
      dataPoints: data.length,
    });

    const { enhancedStatisticalAnalyticsService } = await getServices();
    const result = await enhancedStatisticalAnalyticsService.analyzeTrend(data);
    const executionTime = Date.now() - startTime;

    const response = {
      trend: result,
      insights: {
        strength: classifyTrendStrength(result.correlation),
        reliability: assessTrendReliability(result.rSquared),
        forecast: {
          shortTerm: result.prediction.next24h,
          mediumTerm: result.prediction.next7d,
          longTerm: result.prediction.next30d,
        },
      },
      performance: {
        executionTime,
      },
      metadata: {
        timestamp: new Date(),
        version: '2.0.0',
      },
    };

    logger.info('Enhanced trend analysis completed', {
      trend: result.trend,
      correlation: result.correlation,
      executionTime,
    });

    return res.json(createResponse(true, response, 'Trend analysis completed successfully'));
  } catch (error) {
    logger.error('Enhanced trend analysis failed', error);
    return res
      .status(500)
      .json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Enhanced benchmarking with parallel processing
 * POST /analytics/enhanced/benchmark
 */
router.post('/benchmark', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { currentValue, historicalData, category = 'general' } = req.body;

    if (
      typeof currentValue !== 'number' ||
      !historicalData ||
      !Array.isArray(historicalData) ||
      historicalData.length < 5
    ) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            null,
            'Invalid data: requires currentValue (number) and historicalData (array with at least 5 points)'
          )
        );
    }

    logger.info('Enhanced benchmark request', {
      currentValue,
      historicalDataPoints: historicalData.length,
      category,
    });

    const result = await enhancedStatisticalAnalyticsService.generateBenchmark(
      currentValue,
      historicalData,
      category
    );

    const executionTime = Date.now() - startTime;

    const response = {
      benchmark: result,
      insights: {
        performanceLevel: getPerformanceLevel(result.performance),
        improvementPotential: calculateImprovementPotential(result),
        recommendations: generatePerformanceRecommendations(result),
      },
      performance: {
        executionTime,
      },
      metadata: {
        category,
        timestamp: new Date(),
        version: '2.0.0',
      },
    };

    logger.info('Enhanced benchmark completed', {
      performance: result.performance,
      percentile: result.percentile,
      executionTime,
    });

    return res.json(createResponse(true, response, 'Benchmark analysis completed successfully'));
  } catch (error) {
    logger.error('Enhanced benchmark failed', error);
    return res
      .status(500)
      .json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Optimization status endpoint
 * GET /analytics/enhanced/optimization/status
 */
router.get('/optimization/status', async (req: Request, res: Response) => {
  try {
    const { optimizationIntegrationService } = await getServices();
    const status = await optimizationIntegrationService.getOptimizationStatus();

    return res.json(createResponse(true, status, 'Optimization status retrieved successfully'));
  } catch (error) {
    logger.error('Failed to get optimization status', error);
    return res
      .status(500)
      .json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Optimization report endpoint
 * GET /analytics/enhanced/optimization/report
 */
router.get('/optimization/report', async (req: Request, res: Response) => {
  try {
    const { optimizationIntegrationService } = await getServices();
    const report = await optimizationIntegrationService.generateOptimizationReport();

    return res.json(createResponse(true, report, 'Optimization report generated successfully'));
  } catch (error) {
    logger.error('Failed to generate optimization report', error);
    return res
      .status(500)
      .json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Performance profiles endpoint
 * GET /analytics/enhanced/optimization/profiles
 */
router.get('/optimization/profiles', async (req: Request, res: Response) => {
  try {
    const { optimizationConfigService } = await getServices();
    const profiles = optimizationConfigService.getAvailableProfiles();
    const currentProfile = optimizationConfigService.getCurrentProfile();

    return res.json(
      createResponse(
        true,
        {
          available: profiles,
          current: currentProfile.name,
          currentConfig: currentProfile,
        },
        'Profiles retrieved successfully'
      )
    );
  } catch (error) {
    logger.error('Failed to get optimization profiles', error);
    return res
      .status(500)
      .json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Switch optimization profile
 * POST /analytics/enhanced/optimization/profiles/:profileName
 */
router.post('/optimization/profiles/:profileName', async (req: Request, res: Response) => {
  try {
    const { profileName } = req.params;

    if (!profileName) {
      return res.status(400).json(createResponse(false, null, 'Profile name is required'));
    }

    const { optimizationConfigService } = await getServices();
    const success = optimizationConfigService.switchProfile(profileName);

    if (success) {
      return res.json(
        createResponse(
          true,
          { profile: profileName },
          `Switched to ${profileName} profile successfully`
        )
      );
    } else {
      return res
        .status(404)
        .json(createResponse(false, null, `Profile '${profileName}' does not exist`));
    }
  } catch (error) {
    logger.error('Failed to switch optimization profile', error);
    return res
      .status(500)
      .json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

// Helper functions
function calculateSeverityDistribution(results: any[]): Record<string, number> {
  const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
  results.forEach(result => {
    distribution[result.severity as keyof typeof distribution]++;
  });
  return distribution;
}

function classifyTrendStrength(correlation: number): string {
  const abs = Math.abs(correlation);
  if (abs >= 0.8) return 'very strong';
  if (abs >= 0.6) return 'strong';
  if (abs >= 0.4) return 'moderate';
  if (abs >= 0.2) return 'weak';
  return 'very weak';
}

function assessTrendReliability(rSquared: number): string {
  if (rSquared >= 0.8) return 'very reliable';
  if (rSquared >= 0.6) return 'reliable';
  if (rSquared >= 0.4) return 'moderately reliable';
  return 'low reliability';
}

function getPerformanceLevel(performance: string): string {
  const levels: Record<string, string> = {
    excellent: 'top tier',
    good: 'above average',
    average: 'baseline',
    'below-average': 'needs improvement',
    poor: 'critical improvement needed',
  };
  return levels[performance] || 'unknown';
}

function calculateImprovementPotential(result: any): number {
  return Math.max(0, 100 - result.percentile);
}

function generatePerformanceRecommendations(result: any): string[] {
  const recommendations: string[] = [];

  if (result.performance === 'poor' || result.performance === 'below-average') {
    recommendations.push('Immediate performance optimization required');
    recommendations.push('Review current implementation for bottlenecks');
  }

  if (result.deviationPercent > 20) {
    recommendations.push('Significant deviation from benchmark detected');
  }

  return recommendations;
}

export default router;
