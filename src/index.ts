/**
 * CI/CD Pipeline Analyzer - Main Application Entry Point
 * Enterprise-grade modular architecture with comprehensive error handling
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { createServer } from 'http';

import { configManager } from './config';
import { Logger } from './shared/logger';
import { environmentValidator } from './core/environment-validator';
import { moduleManager } from './core/module-manager';
import { databaseManager } from './core/database';
import { redisManager } from './core/redis';
import { databaseInitializer } from './core/database-init';
import { enhancedDatabaseService } from './services/database.enhanced';
import { WebSocketService } from './services/websocket.service';
import { createBackgroundJobService, getBackgroundJobService } from './services/background-job.service';

// Import middleware
import { responseMiddleware } from './middleware/response';
import { createAllVersionedRouters, createVersionInfoRouter } from './config/router';
import { errorHandler } from '@/middleware/error-handler';
import { createRequestLogger, createMetricsEndpoint } from '@/middleware/request-logger';
import { rateLimiter } from '@/middleware/rate-limiter';

class Application {
  private app: express.Application;
  private logger: Logger;
  private server: any;
  private httpServer: any;
  private webSocketService: WebSocketService | null = null;

  constructor() {
    this.app = express();
    this.logger = new Logger('Application');
  }

  /**
   * Initialize the application
   */
  public async initialize(): Promise<void> {
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

    } catch (error) {
      this.logger.error('Failed to initialize application', error);
      throw error;
    }
  }

  /**
   * Start the application server
   */
  public async start(): Promise<void> {
    try {
      const config = configManager.getServer();
      
      // Create HTTP server
      this.httpServer = createServer(this.app);
      
      // Initialize WebSocket service
      this.webSocketService = new WebSocketService(this.httpServer, {
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
      const backgroundJobService = getBackgroundJobService();
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

    } catch (error) {
      this.logger.error('Failed to start server', error);
      throw error;
    }
  }

  /**
   * Stop the application server
   */
  public async stop(): Promise<void> {
    try {
      this.logger.info('Shutting down application...');

      // Shutdown background job service
      try {
        const backgroundJobService = getBackgroundJobService();
        await backgroundJobService.shutdown();
      } catch (err) {
        const meta: Record<string, unknown> = err instanceof Error
          ? { error: { name: err.name, message: err.message, stack: err.stack } }
          : { error: err as unknown };
        this.logger.warn('Background job service not initialized or already shut down', meta);
      }

      // Shutdown WebSocket service
      if (this.webSocketService) {
        await this.webSocketService.close();
        this.webSocketService = null;
      }

      // Close server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            this.logger.info('Server closed');
            resolve();
          });
        });
      }

      // Shutdown modules
      await moduleManager.shutdown();

      // Close database connections
      await databaseManager.close();

      // Close Redis connection
      await redisManager.close();

      this.logger.info('Application shutdown complete');

    } catch (error) {
      this.logger.error('Error during shutdown', error);
      throw error;
    }
  }

  /**
   * Validate application configuration
   */
  private validateConfiguration(): void {
    this.logger.info('Validating configuration...');
    
    try {
      // Validate environment variables first
      const envValidation = environmentValidator.validateEnvironment();
      environmentValidator.printValidationResults(envValidation);
      
      if (!envValidation.isValid) {
        throw new Error('Environment validation failed - check logs for details');
      }
      
      // Validate application configuration
      configManager.validateConfiguration();
      this.logger.info('Configuration validation passed');
    } catch (error) {
      this.logger.error('Configuration validation failed', error);
      throw error;
    }
  }

  /**
   * Initialize core services (database, cache, etc.)
   */
  private async initializeCoreServices(): Promise<void> {
    this.logger.info('Initializing core services...');

    const skipDb = (process.env.SKIP_DB_INIT || 'false').toLowerCase() === 'true';
    const skipRedis = (process.env.SKIP_REDIS_INIT || 'false').toLowerCase() === 'true';

    // Initialize database with enhanced initialization (unless skipped)
    if (skipDb) {
      this.logger.warn('Skipping database initialization due to SKIP_DB_INIT=true');
    } else {
      await databaseInitializer.initialize({
        runMigrations: !configManager.isTest(),
        seedData: configManager.isDevelopment(),
        enableMonitoring: true
      });
    }

    // Initialize Redis cache (unless skipped)
    if (skipRedis) {
      this.logger.warn('Skipping Redis initialization due to SKIP_REDIS_INIT=true');
    } else {
      await redisManager.initialize();
    }

    // Initialize background job service
    createBackgroundJobService({
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
  private configureMiddleware(): void {
    this.logger.info('Configuring middleware...');

    const config = configManager.getServer();

    // Security middleware
    if (config.security.helmet) {
      this.app.use(helmet({
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
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      optionsSuccessStatus: config.cors.optionsSuccessStatus,
    }));

    // Compression middleware
    if (config.security.compression) {
      this.app.use(compression());
    }

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Response standardization middleware
    this.app.use(responseMiddleware);

    // Request logging middleware
    const requestLogger = createRequestLogger({
      enableMetrics: true,
      enableSecurityLogging: true,
      enableAuditTrail: true,
      logLevel: 'info'
    });
    this.app.use(requestLogger);

    // Rate limiting middleware
    if (config.security.rateLimiting) {
      this.app.use(rateLimiter.createLimiter());
    }

    this.logger.info('Middleware configured successfully');
  }

  /**
   * Configure application routes
   */
  private async configureRoutes(): Promise<void> {
    this.logger.info('Configuring routes...');

    // Liveness endpoint (fast, no external deps)
    this.app.get('/health', (req, res) => {
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
    this.app.get('/ready', async (req, res) => {
      try {
        const health = await this.getHealthStatus();
        const isReady = health.status === 'healthy';
        res.status(isReady ? 200 : 503).json({
          status: isReady ? 'ready' : 'not-ready',
          ...health
        });
      } catch (error) {
        this.logger.error('Readiness check failed', error);
        res.status(503).json({
          status: 'not-ready',
          error: 'Readiness check failed'
        });
      }
    });

    // Basic metrics endpoint (JSON). Prometheus format can be added later.
    this.app.get('/metrics', createMetricsEndpoint());

    // API version endpoint
    this.app.get('/version', (req, res) => {
      res.json({
        name: 'CI/CD Pipeline Analyzer',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      });
    });

    // Configuration endpoint (development only)
    if (configManager.isDevelopment()) {
      this.app.get('/config', (req, res) => {
        const config = configManager.get();
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
      const status = moduleManager.getModuleStatus();
      res.json(status);
    });

    // API routes (will be implemented)
    // this.app.use('/api/v1/pipelines', pipelineRoutes);
    // this.app.use('/api/v1/analysis', analysisRoutes);
    // this.app.use('/api/v1/auth', authRoutes);

    // API version information endpoint
    this.app.use('/api/version', createVersionInfoRouter());
    
    // Create and register all versioned API routers
    const versionedRouters = createAllVersionedRouters();
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
  private configureErrorHandling(): void {
    this.logger.info('Configuring error handling...');

    // Use the comprehensive error handler middleware
    this.app.use(errorHandler);

    this.logger.info('Error handling configured successfully');
  }

  /**
   * Initialize application modules
   */
  private async initializeModules(): Promise<void> {
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
    await moduleManager.initializeModules();

    this.logger.info('Application modules initialized successfully');
  }

  /**
   * Get application health status
   */
  private async getHealthStatus(): Promise<any> {
  const skipDb = (process.env.SKIP_DB_INIT || 'false').toLowerCase() === 'true';
  const skipRedis = (process.env.SKIP_REDIS_INIT || 'false').toLowerCase() === 'true';

  const promises: Promise<any>[] = [];
  if (!skipDb) promises.push(enhancedDatabaseService.getHealthStatus());
  if (!skipRedis) promises.push(redisManager.healthCheck());
  const checks = await Promise.allSettled(promises);

  const dbHealth = !skipDb && checks[0] && checks[0].status === 'fulfilled' ? (checks[0] as PromiseFulfilledResult<any>).value : null;
  const dbHealthy = skipDb ? false : (dbHealth?.isHealthy || false);
  const redisIndex = skipDb ? 0 : 1;
  const redisHealthy = skipRedis ? false : (checks[redisIndex] && (checks[redisIndex] as PromiseSettledResult<any>).status === 'fulfilled' && (checks[redisIndex] as PromiseFulfilledResult<any>).value);

    const overall = dbHealthy && redisHealthy ? 'healthy' : 'degraded';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        redis: redisHealthy ? 'healthy' : 'unhealthy',
      },
      modules: moduleManager.getModuleStatus(),
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
  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach((signal) => {
      process.on(signal, async () => {
        this.logger.info(`Received ${signal}, shutting down gracefully...`);
        
        try {
          await this.stop();
          process.exit(0);
        } catch (error) {
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
  public getApp(): express.Application {
    return this.app;
  }

  /**
   * Get WebSocket service instance
   */
  public getWebSocketService(): WebSocketService | null {
    return this.webSocketService;
  }
}

// === Application Bootstrap ===
async function bootstrap(): Promise<void> {
  const app = new Application();
  
  try {
    await app.initialize();
    await app.start();
  } catch (err) {
    const logger = new Logger('Bootstrap');
    logger.error('Failed to start application', err);
    process.exit(1);
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  bootstrap().catch((err) => {
    const logger = new Logger('Bootstrap');
    logger.error('Bootstrap error', err);
    process.exit(1);
  });
}

export { Application };
export default bootstrap;
