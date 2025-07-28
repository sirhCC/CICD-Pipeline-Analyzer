/**
 * Versioned Router Factory
 * Creates Express routers with API version support
 */

import { Router } from 'express';
import { apiVersionManager } from '../config/versioning';
import { Logger } from '../shared/logger';
import authRoutes from '../routes/auth.routes';
import pipelineRoutes from '../routes/pipeline.routes';

const logger = new Logger('VersionedRouter');

export interface VersionedRouterConfig {
  version: string;
  prefix?: string;
  deprecated?: boolean;
  routes: {
    auth?: boolean;
    pipelines?: boolean;
    analytics?: boolean;
    admin?: boolean;
  };
}

/**
 * Create a versioned router with specified configuration
 */
export function createVersionedRouter(config: VersionedRouterConfig): Router {
  const router = Router();
  const versionConfig = apiVersionManager.getVersionConfig(config.version);
  
  if (!versionConfig) {
    throw new Error(`Unsupported API version: ${config.version}`);
  }

  logger.info(`Creating versioned router for ${config.version}`, {
    version: config.version,
    prefix: config.prefix,
    deprecated: config.deprecated,
    features: versionConfig.features,
  });

  // Add version validation middleware
  router.use((req, res, next) => {
    // Ensure the request version matches the router version
    if (req.apiVersion !== config.version) {
      // Allow fallback to default version
      if (config.version === apiVersionManager.getDefaultVersion()) {
        req.apiVersion = config.version;
        return next();
      } else {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VERSION_NOT_FOUND',
            message: `API version ${config.version} not available for this route`,
          },
          timestamp: new Date().toISOString(),
          version: req.apiVersion || apiVersionManager.getCurrentVersion(),
        });
      }
    }
    next();
  });

  // Add deprecation warning middleware for deprecated versions
  if (config.deprecated || versionConfig.deprecated) {
    router.use((req, res, next) => {
      logger.warn(`Deprecated API version accessed`, {
        version: config.version,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
      next();
    });
  }

  // Register route modules based on configuration
  if (config.routes.auth) {
    router.use('/auth', authRoutes);
    logger.debug(`Registered auth routes for ${config.version}`);
  }

  if (config.routes.pipelines) {
    router.use('/pipelines', pipelineRoutes);
    logger.debug(`Registered pipeline routes for ${config.version}`);
  }

  // Placeholder for future route modules
  if (config.routes.analytics) {
    router.use('/analytics', (req, res) => {
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Analytics endpoints will be available in Phase 2',
        },
        timestamp: new Date().toISOString(),
        version: config.version,
      });
    });
    logger.debug(`Registered analytics placeholder for ${config.version}`);
  }

  if (config.routes.admin) {
    router.use('/admin', (req, res) => {
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Admin endpoints will be available in Phase 2',
        },
        timestamp: new Date().toISOString(),
        version: config.version,
      });
    });
    logger.debug(`Registered admin placeholder for ${config.version}`);
  }

  return router;
}

/**
 * Create all supported API version routers
 */
export function createAllVersionedRouters(): Array<{ version: string; prefix: string; router: Router }> {
  const supportedVersions = apiVersionManager.getSupportedVersions();
  const routers: Array<{ version: string; prefix: string; router: Router }> = [];

  for (const versionConfig of supportedVersions) {
    try {
      const config: VersionedRouterConfig = {
        version: versionConfig.version,
        prefix: versionConfig.prefix,
        deprecated: versionConfig.deprecated,
        routes: {
          auth: versionConfig.features.includes('authentication'),
          pipelines: versionConfig.features.includes('pipeline-management'),
          analytics: versionConfig.features.includes('basic-analytics') || 
                    versionConfig.features.includes('advanced-analytics'),
          admin: versionConfig.features.includes('user-management'),
        },
      };

      const router = createVersionedRouter(config);
      
      routers.push({
        version: versionConfig.version,
        prefix: versionConfig.prefix,
        router,
      });

      logger.info(`Created router for API version ${versionConfig.version}`, {
        prefix: versionConfig.prefix,
        deprecated: versionConfig.deprecated,
        routes: Object.entries(config.routes)
          .filter(([, enabled]) => enabled)
          .map(([route]) => route),
      });
    } catch (error) {
      logger.error(`Failed to create router for version ${versionConfig.version}`, error);
    }
  }

  return routers;
}

/**
 * Get API version information endpoint
 */
export function createVersionInfoRouter(): Router {
  const router = Router();

  // Version information endpoint
  router.get('/', (req, res) => {
    const supportedVersions = apiVersionManager.getSupportedVersions();
    const deprecatedVersions = apiVersionManager.getDeprecatedVersions();
    
    res.json({
      success: true,
      data: {
        currentVersion: apiVersionManager.getCurrentVersion(),
        defaultVersion: apiVersionManager.getDefaultVersion(),
        supportedVersions: supportedVersions.map(v => ({
          version: v.version,
          prefix: v.prefix,
          deprecated: v.deprecated,
          features: v.features,
          deprecationDate: v.deprecationDate,
          sunsetDate: v.sunsetDate,
        })),
        deprecatedVersions: deprecatedVersions.map(v => v.version),
      },
      timestamp: new Date().toISOString(),
      version: req.apiVersion || apiVersionManager.getCurrentVersion(),
    });
  });

  // Individual version information
  router.get('/:version', (req, res) => {
    const { version } = req.params;
    const versionConfig = apiVersionManager.getVersionConfig(version);
    
    if (!versionConfig) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `API version ${version} not found`,
        },
        timestamp: new Date().toISOString(),
        version: req.apiVersion || apiVersionManager.getCurrentVersion(),
      });
    }

    return res.json({
      success: true,
      data: {
        version: versionConfig.version,
        prefix: versionConfig.prefix,
        supported: versionConfig.supported,
        deprecated: versionConfig.deprecated,
        features: versionConfig.features,
        breaking: versionConfig.breaking,
        deprecationDate: versionConfig.deprecationDate,
        sunsetDate: versionConfig.sunsetDate,
      },
      timestamp: new Date().toISOString(),
      version: req.apiVersion || apiVersionManager.getCurrentVersion(),
    });
  });

  return router;
}
