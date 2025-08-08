"use strict";
/**
 * CI/CD Pipeline Analyzer - Main Application Entry Point
 * Enterprise-grade modular architecture with comprehensive error handling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const http_1 = require("http");
const config_1 = require("./config");
const logger_1 = require("./shared/logger");
const environment_validator_1 = require("./core/environment-validator");
const module_manager_1 = require("./core/module-manager");
const database_1 = require("./core/database");
const redis_1 = require("./core/redis");
const database_init_1 = require("./core/database-init");
const database_enhanced_1 = require("./services/database.enhanced");
const websocket_service_1 = require("./services/websocket.service");
const background_job_service_1 = require("./services/background-job.service");
// Import middleware
const response_1 = require("./middleware/response");
const router_1 = require("./config/router");
const error_handler_1 = require("./middleware/error-handler");
const request_logger_1 = require("./middleware/request-logger");
const cache_control_1 = require("./middleware/cache-control");
const rate_limiter_1 = require("./middleware/rate-limiter");
class Application {
    app;
    logger;
    server;
    httpServer;
    webSocketService = null;
    constructor() {
        this.app = (0, express_1.default)();
        this.logger = new logger_1.Logger('Application');
    }
    /**
     * Initialize the application
     */
    async initialize() {
        try {
            this.logger.info('Starting CI/CD Pipeline Analyzer...');
            // Validate configuration
            this.validateConfiguration();
            // Initialize core services
            await this.initializeCoreServices();
            // Configure Express application
            this.configureMiddleware();
            await this.configureRoutes();
            this.configureErrorHandling();
            // Initialize modules
            await this.initializeModules();
            this.logger.info('Application initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize application', error);
            throw error;
        }
    }
    /**
     * Start the application server
     */
    async start() {
        try {
            const config = config_1.configManager.getServer();
            // Create HTTP server
            this.httpServer = (0, http_1.createServer)(this.app);
            // Initialize WebSocket service
            this.webSocketService = new websocket_service_1.WebSocketService(this.httpServer, {
                cors: {
                    origin: config.cors.origin,
                    credentials: config.cors.credentials
                },
                heartbeatInterval: 30000,
                clientTimeout: 60000,
                maxConnections: 1000,
                enableAuth: true,
                enableMetrics: true
            });
            // Connect WebSocket service to background job service for real-time alerts
            const backgroundJobService = (0, background_job_service_1.getBackgroundJobService)();
            backgroundJobService.setWebSocketService(this.webSocketService);
            this.server = this.httpServer.listen(config.port, config.host, () => {
                this.logger.info(`Server started successfully`, {
                    host: config.host,
                    port: config.port,
                    environment: process.env.NODE_ENV,
                    version: process.env.npm_package_version || '1.0.0',
                    websocket: 'enabled'
                });
            });
            // Graceful shutdown handlers
            this.setupGracefulShutdown();
        }
        catch (error) {
            this.logger.error('Failed to start server', error);
            throw error;
        }
    }
    /**
     * Stop the application server
     */
    async stop() {
        try {
            this.logger.info('Shutting down application...');
            // Shutdown background job service
            try {
                const backgroundJobService = (0, background_job_service_1.getBackgroundJobService)();
                await backgroundJobService.shutdown();
            }
            catch (err) {
                const meta = err instanceof Error
                    ? { error: { name: err.name, message: err.message, stack: err.stack } }
                    : { error: err };
                this.logger.warn('Background job service not initialized or already shut down', meta);
            }
            // Shutdown WebSocket service
            if (this.webSocketService) {
                await this.webSocketService.close();
                this.webSocketService = null;
            }
            // Close server
            if (this.server) {
                await new Promise((resolve) => {
                    this.server.close(() => {
                        this.logger.info('Server closed');
                        resolve();
                    });
                });
            }
            // Shutdown modules
            await module_manager_1.moduleManager.shutdown();
            // Close database connections
            await database_1.databaseManager.close();
            // Close Redis connection
            await redis_1.redisManager.close();
            this.logger.info('Application shutdown complete');
        }
        catch (error) {
            this.logger.error('Error during shutdown', error);
            throw error;
        }
    }
    /**
     * Validate application configuration
     */
    validateConfiguration() {
        this.logger.info('Validating configuration...');
        try {
            // Validate environment variables first
            const envValidation = environment_validator_1.environmentValidator.validateEnvironment();
            environment_validator_1.environmentValidator.printValidationResults(envValidation);
            if (!envValidation.isValid) {
                throw new Error('Environment validation failed - check logs for details');
            }
            // Validate application configuration
            config_1.configManager.validateConfiguration();
            this.logger.info('Configuration validation passed');
        }
        catch (error) {
            this.logger.error('Configuration validation failed', error);
            throw error;
        }
    }
    /**
     * Initialize core services (database, cache, etc.)
     */
    async initializeCoreServices() {
        this.logger.info('Initializing core services...');
        const skipDb = (process.env.SKIP_DB_INIT || 'false').toLowerCase() === 'true';
        const skipRedis = (process.env.SKIP_REDIS_INIT || 'false').toLowerCase() === 'true';
        // Initialize database with enhanced initialization (unless skipped)
        if (skipDb) {
            this.logger.warn('Skipping database initialization due to SKIP_DB_INIT=true');
        }
        else {
            await database_init_1.databaseInitializer.initialize({
                runMigrations: !config_1.configManager.isTest(),
                seedData: config_1.configManager.isDevelopment(),
                enableMonitoring: true
            });
        }
        // Initialize Redis cache (unless skipped)
        if (skipRedis) {
            this.logger.warn('Skipping Redis initialization due to SKIP_REDIS_INIT=true');
        }
        else {
            await redis_1.redisManager.initialize();
        }
        // Initialize background job service
        (0, background_job_service_1.createBackgroundJobService)({
            maxConcurrentJobs: 5,
            defaultRetryAttempts: 3,
            jobTimeout: 300000, // 5 minutes
            enableRealTimeAlerts: true,
            historicalDataRetention: 30,
            enableMetrics: true
        });
        this.logger.info('Core services initialized successfully');
    }
    /**
     * Configure Express middleware
     */
    configureMiddleware() {
        this.logger.info('Configuring middleware...');
        const config = config_1.configManager.getServer();
        // Express tuning & security
        // Trust reverse proxies (needed for correct IPs and HTTPS headers behind proxies/load balancers)
        this.app.set('trust proxy', true);
        // Remove X-Powered-By header
        this.app.disable('x-powered-by');
        // Security middleware
        if (config.security.helmet) {
            this.app.use((0, helmet_1.default)({
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        styleSrc: ["'self'", "'unsafe-inline'"],
                        scriptSrc: ["'self'"],
                        imgSrc: ["'self'", "data:", "https:"],
                    },
                },
                hsts: {
                    maxAge: 31536000,
                    includeSubDomains: true,
                    preload: true,
                },
            }));
        }
        // CORS middleware
        this.app.use((0, cors_1.default)({
            origin: config.cors.origin,
            credentials: config.cors.credentials,
            optionsSuccessStatus: config.cors.optionsSuccessStatus,
            maxAge: 600
        }));
        // Compression middleware
        if (config.security.compression) {
            this.app.use((0, compression_1.default)({
                threshold: '1kb',
                level: 6
            }));
        }
        // Body parsing middleware
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Response standardization middleware
        this.app.use(response_1.responseMiddleware);
        // Request logging middleware
        const requestLogger = (0, request_logger_1.createRequestLogger)({
            enableMetrics: true,
            enableSecurityLogging: true,
            enableAuditTrail: true,
            logLevel: 'info'
        });
        this.app.use(requestLogger);
        // Rate limiting middleware
        if (config.security.rateLimiting) {
            this.app.use(rate_limiter_1.rateLimiter.createLimiter());
        }
        this.logger.info('Middleware configured successfully');
    }
    /**
     * Configure application routes
     */
    async configureRoutes() {
        this.logger.info('Configuring routes...');
        // Liveness endpoint (fast, no external deps)
        this.app.get('/health', (0, cache_control_1.noStore)(), (req, res) => {
            const uptime = process.uptime();
            const memoryUsage = process.memoryUsage();
            res.status(200).json({
                status: 'alive',
                timestamp: new Date().toISOString(),
                uptime: `${Math.floor(uptime)}s`,
                pid: process.pid,
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                memory: {
                    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
                    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
                    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
                }
            });
        });
        // Readiness endpoint (checks external dependencies)
        this.app.get('/ready', (0, cache_control_1.noStore)(), async (req, res) => {
            try {
                const health = await this.getHealthStatus();
                const isReady = health.status === 'healthy';
                res.status(isReady ? 200 : 503).json({
                    status: isReady ? 'ready' : 'not-ready',
                    ...health
                });
            }
            catch (error) {
                this.logger.error('Readiness check failed', error);
                res.status(503).json({
                    status: 'not-ready',
                    error: 'Readiness check failed'
                });
            }
        });
        // Basic metrics endpoint (JSON). Prometheus format can be added later.
        this.app.get('/metrics', (0, cache_control_1.noStore)(), (0, request_logger_1.createMetricsEndpoint)());
        // API version endpoint
        this.app.get('/version', (0, cache_control_1.shortPublicCache)(60), (req, res) => {
            res.json({
                name: 'CI/CD Pipeline Analyzer',
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV,
                timestamp: new Date().toISOString(),
            });
        });
        // Configuration endpoint (development only)
        if (config_1.configManager.isDevelopment()) {
            this.app.get('/config', (req, res) => {
                const config = config_1.configManager.get();
                // Remove sensitive information
                const sanitized = {
                    ...config,
                    database: { ...config.database, password: '[REDACTED]' },
                    auth: { ...config.auth, jwtSecret: '[REDACTED]' },
                };
                res.json(sanitized);
            });
        }
        // Module status endpoint
        this.app.get('/modules', (req, res) => {
            const status = module_manager_1.moduleManager.getModuleStatus();
            res.json(status);
        });
        // API routes (will be implemented)
        // this.app.use('/api/v1/pipelines', pipelineRoutes);
        // this.app.use('/api/v1/analysis', analysisRoutes);
        // this.app.use('/api/v1/auth', authRoutes);
        // API version information endpoint
        this.app.use('/api/version', (0, router_1.createVersionInfoRouter)());
        // Create and register all versioned API routers
        const versionedRouters = (0, router_1.createAllVersionedRouters)();
        for (const { version, prefix, router } of versionedRouters) {
            this.app.use(prefix, router);
            this.logger.info(`Registered API router for ${version} at ${prefix}`);
        }
        // Catch-all for unmatched routes
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.method} ${req.originalUrl} not found`,
                timestamp: new Date().toISOString(),
            });
        });
        this.logger.info('Routes configured successfully');
    }
    /**
     * Configure error handling middleware
     */
    configureErrorHandling() {
        this.logger.info('Configuring error handling...');
        // Use the comprehensive error handler middleware
        this.app.use(error_handler_1.errorHandler);
        this.logger.info('Error handling configured successfully');
    }
    /**
     * Initialize application modules
     */
    async initializeModules() {
        this.logger.info('Initializing application modules...');
        // Register core modules (will be implemented)
        // moduleManager.registerModule({
        //   name: 'github-actions-provider',
        //   version: '1.0.0',
        //   type: 'provider',
        //   factory: () => import('@/providers/github-actions').then(m => m.createGitHubActionsProvider()),
        //   dependencies: [],
        //   optional: false,
        // });
        // Initialize all registered modules
        await module_manager_1.moduleManager.initializeModules();
        this.logger.info('Application modules initialized successfully');
    }
    /**
     * Get application health status
     */
    async getHealthStatus() {
        const skipDb = (process.env.SKIP_DB_INIT || 'false').toLowerCase() === 'true';
        const skipRedis = (process.env.SKIP_REDIS_INIT || 'false').toLowerCase() === 'true';
        const promises = [];
        if (!skipDb)
            promises.push(database_enhanced_1.enhancedDatabaseService.getHealthStatus());
        if (!skipRedis)
            promises.push(redis_1.redisManager.healthCheck());
        const checks = await Promise.allSettled(promises);
        const dbHealth = !skipDb && checks[0] && checks[0].status === 'fulfilled' ? checks[0].value : null;
        const dbHealthy = skipDb ? false : (dbHealth?.isHealthy || false);
        const redisIndex = skipDb ? 0 : 1;
        const redisHealthy = skipRedis ? false : (checks[redisIndex] && checks[redisIndex].status === 'fulfilled' && checks[redisIndex].value);
        const overall = dbHealthy && redisHealthy ? 'healthy' : 'degraded';
        return {
            status: overall,
            timestamp: new Date().toISOString(),
            services: {
                database: dbHealthy ? 'healthy' : 'unhealthy',
                redis: redisHealthy ? 'healthy' : 'unhealthy',
            },
            modules: module_manager_1.moduleManager.getModuleStatus(),
            database: dbHealth ? {
                connectionStats: dbHealth.connectionStats,
                performanceMetrics: dbHealth.performanceMetrics,
                recommendations: dbHealth.recommendations,
                uptime: dbHealth.uptime
            } : null
        };
    }
    /**
     * Setup graceful shutdown handlers
     */
    setupGracefulShutdown() {
        const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
        signals.forEach((signal) => {
            process.on(signal, async () => {
                this.logger.info(`Received ${signal}, shutting down gracefully...`);
                try {
                    await this.stop();
                    process.exit(0);
                }
                catch (error) {
                    this.logger.error('Error during graceful shutdown', error);
                    process.exit(1);
                }
            });
        });
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.logger.error('Uncaught exception', error);
            process.exit(1);
        });
        // Handle unhandled rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('Unhandled rejection', reason, { promise });
            process.exit(1);
        });
    }
    /**
     * Get Express application instance
     */
    getApp() {
        return this.app;
    }
    /**
     * Get WebSocket service instance
     */
    getWebSocketService() {
        return this.webSocketService;
    }
}
exports.Application = Application;
// === Application Bootstrap ===
async function bootstrap() {
    const app = new Application();
    try {
        await app.initialize();
        await app.start();
    }
    catch (err) {
        const logger = new logger_1.Logger('Bootstrap');
        logger.error('Failed to start application', err);
        process.exit(1);
    }
}
// Start the application if this file is run directly
if (require.main === module) {
    bootstrap().catch((err) => {
        const logger = new logger_1.Logger('Bootstrap');
        logger.error('Bootstrap error', err);
        process.exit(1);
    });
}
exports.default = bootstrap;
//# sourceMappingURL=index.js.map