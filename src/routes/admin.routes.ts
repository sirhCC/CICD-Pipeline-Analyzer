/**
 * Admin Routes - Security and System Management
 * Provides endpoints for system administration and security monitoring
 */

import { Router, Request, Response } from 'express';
import { authenticateJWT, requireRole, UserRole, AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/error-handler';
import { databaseService } from '@/services/database.service';
import { databaseSecurityManager } from '@/core/database-security';
import { databaseConnectionManager } from '@/core/database-monitor';
import { ResponseBuilder } from '@/shared/api-response';
import { Logger } from '@/shared/logger';

const router = Router();
const logger = new Logger('AdminRoutes');

/**
 * Get database health status including security metrics
 */
router.get('/health',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const healthStatus = await databaseService.getHealthStatus();
    
    res.json(ResponseBuilder.success(healthStatus));
  })
);

/**
 * Get security metrics and recent events
 */
router.get('/security/metrics',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const securityMetrics = databaseSecurityManager.getSecurityMetrics();
    const recentEvents = databaseSecurityManager.getRecentEvents(50);
    
    res.json(ResponseBuilder.success({
      metrics: securityMetrics,
      recentEvents
    }));
  })
);

/**
 * Get comprehensive security report
 */
router.get('/security/report',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const securityReport = databaseSecurityManager.generateSecurityReport();
    
    res.json(ResponseBuilder.success(securityReport));
  })
);

/**
 * Get database connection metrics
 */
router.get('/database/metrics',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const connectionStats = databaseConnectionManager.getConnectionStats();
    const metrics = databaseConnectionManager.getMetrics();
    const recommendations = databaseConnectionManager.getPerformanceRecommendations();
    
    res.json(ResponseBuilder.success({
      connectionStats,
      metrics,
      recommendations
    }));
  })
);

/**
 * Reset security metrics (for testing/maintenance)
 */
router.post('/security/reset',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    databaseSecurityManager.resetMetrics();
    
    logger.info('Security metrics reset by admin', {
      userId: req.user?.userId,
      email: req.user?.email
    });
    
    res.json(ResponseBuilder.success({ message: 'Security metrics reset successfully' }));
  })
);

/**
 * Test database connection
 */
router.get('/database/test-connection',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const isConnected = await databaseConnectionManager.testConnection();
    
    res.json(ResponseBuilder.success({
      isConnected,
      timestamp: new Date().toISOString(),
      message: `Database connection ${isConnected ? 'successful' : 'failed'}`
    }));
  })
);

/**
 * Get system information
 */
router.get('/system/info',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const systemInfo = {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime()
      },
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };
    
    res.json(ResponseBuilder.success(systemInfo));
  })
);

export { router as adminRoutes };
