/**
 * Alerting System Routes - Advanced Alert Management API
 * Provides endpoints for alert configuration, management, and monitoring
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
import type { AlertStatus, AlertConfiguration } from '@/services/alerting.service';
import {
  alertingService,
  AlertType,
  AlertSeverity,
  ChannelType,
  ResolutionType,
} from '@/services/alerting.service';
import Joi from 'joi';

const router = Router();
const logger = new Logger('AlertingRoutes');

// Validation schemas
const alertConfigurationSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  enabled: Joi.boolean().default(true),
  type: Joi.string()
    .valid(...Object.values(AlertType))
    .required(),
  severity: Joi.string()
    .valid(...Object.values(AlertSeverity))
    .required(),
  thresholds: Joi.object({
    anomaly: Joi.object({
      zScoreThreshold: Joi.number().min(1).max(5),
      percentileThreshold: Joi.number().min(90).max(99.9),
      minDataPoints: Joi.number().min(5).max(1000),
      triggerCount: Joi.number().min(1).max(10),
    }).optional(),
    sla: Joi.object({
      violationPercent: Joi.number().min(0).max(100),
      durationMinutes: Joi.number().min(1),
      frequency: Joi.number().min(1),
      timePeriodHours: Joi.number().min(1).max(168),
    }).optional(),
    cost: Joi.object({
      absoluteThreshold: Joi.number().min(0),
      percentageIncrease: Joi.number().min(0).max(1000),
      budgetExceeded: Joi.number().min(0),
      trendDetection: Joi.boolean(),
    }).optional(),
    performance: Joi.object({
      durationMs: Joi.number().min(0),
      errorRate: Joi.number().min(0).max(100),
      successRate: Joi.number().min(0).max(100),
      resourceUtilization: Joi.number().min(0).max(100),
    }).optional(),
  }).required(),
  channels: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        type: Joi.string()
          .valid(...Object.values(ChannelType))
          .required(),
        enabled: Joi.boolean().default(true),
        config: Joi.object().required(),
        filters: Joi.object({
          severities: Joi.array().items(Joi.string().valid(...Object.values(AlertSeverity))),
          types: Joi.array().items(Joi.string().valid(...Object.values(AlertType))),
          pipelineIds: Joi.array().items(Joi.string()).optional(),
          timeWindows: Joi.array().optional(),
        }).required(),
        retryPolicy: Joi.object({
          enabled: Joi.boolean().default(true),
          maxRetries: Joi.number().min(0).max(10).default(3),
          retryDelayMs: Joi.number().min(1000).max(60000).default(5000),
          exponentialBackoff: Joi.boolean().default(true),
          maxRetryDelayMs: Joi.number().min(5000).max(300000).default(30000),
        }).default({}),
      })
    )
    .min(1)
    .required(),
  escalation: Joi.object({
    enabled: Joi.boolean().default(false),
    stages: Joi.array()
      .items(
        Joi.object({
          stage: Joi.number().min(1).required(),
          delayMinutes: Joi.number().min(1).max(1440).required(),
          channels: Joi.array().items(Joi.string()).required(),
          requiresAcknowledgment: Joi.boolean().default(false),
          notifyRoles: Joi.array().items(Joi.string()).default([]),
          notifyUsers: Joi.array().items(Joi.string()).default([]),
        })
      )
      .optional()
      .default([]),
    maxEscalations: Joi.number().min(1).max(5).default(3),
    escalationTimeoutMinutes: Joi.number().min(5).max(1440).default(60),
    autoResolve: Joi.boolean().default(false),
    autoResolveTimeoutMinutes: Joi.number().min(60).max(4320).default(240),
  }).default({}),
  filters: Joi.object({
    pipelineIds: Joi.array().items(Joi.string()).optional(),
    environments: Joi.array().items(Joi.string()).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    timeWindows: Joi.array().optional(),
    excludePatterns: Joi.array().items(Joi.string()).optional(),
  }).default({}),
  rateLimit: Joi.object({
    enabled: Joi.boolean().default(true),
    maxAlertsPerHour: Joi.number().min(1).max(100).default(10),
    maxAlertsPerDay: Joi.number().min(1).max(1000).default(50),
    cooldownMinutes: Joi.number().min(1).max(60).default(5),
    deduplicationWindow: Joi.number().min(1).max(120).default(30),
  }).default({}),
  metadata: Joi.object().default({}),
});

const acknowledgeAlertSchema = Joi.object({
  comment: Joi.string().max(500).optional(),
});

const resolveAlertSchema = Joi.object({
  resolutionType: Joi.string()
    .valid(...Object.values(ResolutionType))
    .default(ResolutionType.MANUAL),
  comment: Joi.string().max(500).optional(),
  rootCause: Joi.string().max(500).optional(),
  actionsTaken: Joi.array().items(Joi.string().max(200)).default([]),
});

/**
 * POST /alerts/configurations - Create new alert configuration
 */
router.post(
  '/configurations',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  validateRequest({ body: alertConfigurationSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const configData = req.body;
    const userId = (req as any).user?.userId;

    logger.info('Creating alert configuration', {
      name: configData.name,
      type: configData.type,
      severity: configData.severity,
      userId,
    });

    try {
      const configId = await alertingService.createAlertConfiguration({
        ...configData,
        createdBy: userId || 'unknown',
      });

      res.status(201).json(
        ResponseBuilder.success({
          configurationId: configId,
          message: 'Alert configuration created successfully',
        })
      );

      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to create alert configuration', { error: errorMessage, userId });
      throw new AppError('Failed to create alert configuration', 500);
    }
  })
);

/**
 * GET /alerts/configurations - Get all alert configurations
 */
router.get(
  '/configurations',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;

    logger.info('Fetching alert configurations', { userId });

    try {
      // In a real implementation, this would fetch from database
      // For now, return empty array as configurations are stored in memory
      const configurations: AlertConfiguration[] = [];

      res.json(
        ResponseBuilder.success({
          configurations,
          total: configurations.length,
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to fetch alert configurations', { error: errorMessage, userId });
      throw new AppError('Failed to fetch alert configurations', 500);
    }
  })
);

/**
 * POST /alerts/trigger - Manually trigger an alert for testing
 */
router.post(
  '/trigger',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  validateRequest({
    body: Joi.object({
      type: Joi.string()
        .valid(...Object.values(AlertType))
        .required(),
      details: Joi.object({
        triggerValue: Joi.number().required(),
        threshold: Joi.number().required(),
        metric: Joi.string().required(),
        pipelineId: Joi.string().optional(),
        runId: Joi.string().optional(),
        source: Joi.string().default('manual'),
        raw: Joi.object().default({}),
      }).required(),
      context: Joi.object({
        environment: Joi.string().default('test'),
        tags: Joi.array().items(Joi.string()).default([]),
        metadata: Joi.object().default({}),
        relatedAlerts: Joi.array().items(Joi.string()).default([]),
      }).default({}),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, details, context } = req.body;
    const userId = (req as any).user?.userId;

    logger.info('Manually triggering alert', {
      type,
      metric: details.metric,
      triggerValue: details.triggerValue,
      userId,
    });

    try {
      const alertId = await alertingService.triggerAlert(type, details, context);

      if (!alertId) {
        return res.json(
          ResponseBuilder.success({
            triggered: false,
            message: 'Alert was not triggered (no matching configurations or rate limited)',
          })
        );
      }

      return res.json(
        ResponseBuilder.success({
          triggered: true,
          alertId,
          message: 'Alert triggered successfully',
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to trigger alert', { error: errorMessage, type, userId });
      throw new AppError('Failed to trigger alert', 500);
    }
  })
);

/**
 * GET /alerts/active - Get all active alerts
 */
router.get(
  '/active',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, severity, pipelineId, limit } = req.query;
    const userId = (req as any).user?.userId;

    logger.info('Fetching active alerts', {
      type,
      severity,
      pipelineId,
      limit,
      userId,
    });

    try {
      const filters = {
        ...(type && { type: type as AlertType }),
        ...(severity && { severity: severity as AlertSeverity }),
        ...(pipelineId && { pipelineId: pipelineId as string }),
        ...(limit && { limit: parseInt(limit as string) }),
      };

      const activeAlerts = alertingService.getActiveAlerts(filters);

      res.json(
        ResponseBuilder.success({
          alerts: activeAlerts,
          total: activeAlerts.length,
          filters,
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to fetch active alerts', { error: errorMessage, userId });
      throw new AppError('Failed to fetch active alerts', 500);
    }
  })
);

/**
 * GET /alerts/history - Get alert history
 */
router.get(
  '/history',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, severity, status, startDate, endDate, limit } = req.query;
    const userId = (req as any).user?.userId;

    logger.info('Fetching alert history', {
      type,
      severity,
      status,
      startDate,
      endDate,
      limit,
      userId,
    });

    try {
      const filters = {
        ...(type && { type: type as AlertType }),
        ...(severity && { severity: severity as AlertSeverity }),
        ...(status && { status: status as AlertStatus }),
        ...(startDate && { startDate: new Date(startDate as string) }),
        ...(endDate && { endDate: new Date(endDate as string) }),
        ...(limit && { limit: parseInt(limit as string) }),
      };

      const alertHistory = alertingService.getAlertHistory(filters);

      res.json(
        ResponseBuilder.success({
          alerts: alertHistory,
          total: alertHistory.length,
          filters,
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to fetch alert history', { error: errorMessage, userId });
      throw new AppError('Failed to fetch alert history', 500);
    }
  })
);

/**
 * POST /alerts/:alertId/acknowledge - Acknowledge an alert
 */
router.post(
  '/:alertId/acknowledge',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_WRITE),
  validateRequest({ body: acknowledgeAlertSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { alertId } = req.params;
    const { comment } = req.body;
    const userId = (req as any).user?.userId;

    if (!alertId) {
      throw new AppError('Alert ID is required', 400);
    }

    logger.info('Acknowledging alert', {
      alertId,
      userId,
      comment: comment ? 'provided' : 'none',
    });

    try {
      const resolvedUserId: string = userId || 'unknown';
      await alertingService.acknowledgeAlert(alertId, resolvedUserId, comment);

      return res.json(
        ResponseBuilder.success({
          acknowledged: true,
          message: 'Alert acknowledged successfully',
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to acknowledge alert', { error: errorMessage, alertId, userId });

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to acknowledge alert', 500);
    }
  })
);

/**
 * POST /alerts/:alertId/resolve - Resolve an alert
 */
router.post(
  '/:alertId/resolve',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_WRITE),
  validateRequest({ body: resolveAlertSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { alertId } = req.params;
    const { resolutionType, comment, rootCause, actionsTaken } = req.body;
    const userId = (req as any).user?.userId;

    if (!alertId) {
      throw new AppError('Alert ID is required', 400);
    }

    logger.info('Resolving alert', {
      alertId,
      resolutionType,
      userId,
      rootCause: rootCause ? 'provided' : 'none',
    });

    try {
      const resolvedUserId: string = userId || 'unknown';
      await alertingService.resolveAlert(
        alertId,
        resolvedUserId,
        resolutionType,
        comment,
        rootCause,
        actionsTaken
      );

      return res.json(
        ResponseBuilder.success({
          resolved: true,
          message: 'Alert resolved successfully',
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to resolve alert', { error: errorMessage, alertId, userId });

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to resolve alert', 500);
    }
  })
);

/**
 * GET /alerts/metrics - Get alerting system metrics
 */
router.get(
  '/metrics',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;

    logger.info('Fetching alerting metrics', { userId });

    try {
      const metrics = alertingService.getAlertingMetrics();

      res.json(
        ResponseBuilder.success({
          metrics,
          timestamp: new Date().toISOString(),
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to fetch alerting metrics', { error: errorMessage, userId });
      throw new AppError('Failed to fetch alerting metrics', 500);
    }
  })
);

/**
 * GET /alerts/health - Get alerting system health
 */
router.get(
  '/health',
  authenticateJWT,
  requirePermission(Permission.ANALYTICS_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;

    logger.info('Checking alerting system health', { userId });

    try {
      const health = {
        status: 'healthy',
        initialized: true,
        timestamp: new Date().toISOString(),
        metrics: alertingService.getAlertingMetrics(),
      };

      res.json(ResponseBuilder.success({ health }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Alerting health check failed', { error: errorMessage, userId });

      res.json(
        ResponseBuilder.success({
          health: {
            status: 'unhealthy',
            error: errorMessage,
            timestamp: new Date().toISOString(),
          },
        })
      );
    }
  })
);

export { router as alertingRoutes };
