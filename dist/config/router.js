"use strict";
/**
 * Versioned Router Factory
 * Creates Express routers with API version support
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVersionedRouter = createVersionedRouter;
exports.createAllVersionedRouters = createAllVersionedRouters;
exports.createVersionInfoRouter = createVersionInfoRouter;
const express_1 = require("express");
const versioning_1 = require("../config/versioning");
const logger_1 = require("../shared/logger");
const auth_routes_1 = __importDefault(require("../routes/auth.routes"));
const pipeline_routes_1 = __importDefault(require("../routes/pipeline.routes"));
const analytics_routes_1 = __importDefault(require("../routes/analytics.routes"));
const enhanced_analytics_routes_1 = __importDefault(require("../routes/enhanced-analytics.routes"));
const logger = new logger_1.Logger('VersionedRouter');
/**
 * Create a versioned router with specified configuration
 */
function createVersionedRouter(config) {
    const router = (0, express_1.Router)();
    const versionConfig = versioning_1.apiVersionManager.getVersionConfig(config.version);
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
            if (config.version === versioning_1.apiVersionManager.getDefaultVersion()) {
                req.apiVersion = config.version;
                return next();
            }
            else {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'VERSION_NOT_FOUND',
                        message: `API version ${config.version} not available for this route`,
                    },
                    timestamp: new Date().toISOString(),
                    version: req.apiVersion || versioning_1.apiVersionManager.getCurrentVersion(),
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
        router.use('/auth', auth_routes_1.default);
        logger.debug(`Registered auth routes for ${config.version}`);
    }
    if (config.routes.pipelines) {
        router.use('/pipelines', pipeline_routes_1.default);
        logger.debug(`Registered pipeline routes for ${config.version}`);
    }
    // Analytics routes (Phase 2 - Implemented)
    if (config.routes.analytics) {
        router.use('/analytics', analytics_routes_1.default);
        logger.debug(`Registered analytics routes for ${config.version}`);
    }
    // Enhanced Analytics routes (Phase 3 - Optimized)
    if (config.routes.enhancedAnalytics) {
        router.use('/analytics/enhanced', enhanced_analytics_routes_1.default);
        logger.debug(`Registered enhanced analytics routes for ${config.version}`);
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
function createAllVersionedRouters() {
    const supportedVersions = versioning_1.apiVersionManager.getSupportedVersions();
    const routers = [];
    for (const versionConfig of supportedVersions) {
        try {
            const config = {
                version: versionConfig.version,
                prefix: versionConfig.prefix,
                deprecated: versionConfig.deprecated,
                routes: {
                    auth: versionConfig.features.includes('authentication'),
                    pipelines: versionConfig.features.includes('pipeline-management'),
                    analytics: versionConfig.features.includes('basic-analytics') ||
                        versionConfig.features.includes('advanced-analytics'),
                    enhancedAnalytics: versionConfig.features.includes('advanced-analytics') ||
                        versionConfig.features.includes('phase3-optimizations'),
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
        }
        catch (error) {
            logger.error(`Failed to create router for version ${versionConfig.version}`, error);
        }
    }
    return routers;
}
/**
 * Get API version information endpoint
 */
function createVersionInfoRouter() {
    const router = (0, express_1.Router)();
    // Version information endpoint
    router.get('/', (req, res) => {
        const supportedVersions = versioning_1.apiVersionManager.getSupportedVersions();
        const deprecatedVersions = versioning_1.apiVersionManager.getDeprecatedVersions();
        res.json({
            success: true,
            data: {
                currentVersion: versioning_1.apiVersionManager.getCurrentVersion(),
                defaultVersion: versioning_1.apiVersionManager.getDefaultVersion(),
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
            version: req.apiVersion || versioning_1.apiVersionManager.getCurrentVersion(),
        });
    });
    // Individual version information
    router.get('/:version', (req, res) => {
        const { version } = req.params;
        const versionConfig = versioning_1.apiVersionManager.getVersionConfig(version);
        if (!versionConfig) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'VERSION_NOT_FOUND',
                    message: `API version ${version} not found`,
                },
                timestamp: new Date().toISOString(),
                version: req.apiVersion || versioning_1.apiVersionManager.getCurrentVersion(),
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
            version: req.apiVersion || versioning_1.apiVersionManager.getCurrentVersion(),
        });
    });
    return router;
}
//# sourceMappingURL=router.js.map