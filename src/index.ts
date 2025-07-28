/**
 * CI/CD Pipeline Analyzer - Main Application Entry Point
 * Enterprise-grade modular architecture with comprehensive error handling
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

import { configManager } from './config';
import { Logger } from './shared/logger';
import { moduleManager } from './core/module-manager';
import { databaseManager } from './core/database';
import { redisManager } from './core/redis';
import { databaseInitializer } from './core/database-init';
import { enhancedDatabaseService } from './services/database.enhanced';

// Import middleware
import { responseMiddleware } from './middleware/response';
import { createAllVersionedRouters, createVersionInfoRouter } from './config/router';
// import { errorHandler } from '@/middleware/error-handler';
// import { requestLogger } from '@/middleware/request-logger';
// import { rateLimiter } from '@/middleware/rate-limiter';
// import { auth } from '@/middleware/auth';

class Application {
  private app: express.Application;
  private logger: Logger;
  private server: any;

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
      
      this.server = this.app.listen(config.port, config.host, () => {
        this.logger.info(`Server started successfully`, {
          host: config.host,
          port: config.port,
          environment: process.env.NODE_ENV,
          version: process.env.npm_package_version || '1.0.0',
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

    // Initialize database with enhanced initialization
    await databaseInitializer.initialize({
      runMigrations: !configManager.isTest(),
      seedData: configManager.isDevelopment(),
      enableMonitoring: true
    });

    // Initialize Redis cache
    await redisManager.initialize();

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

    // Request logging middleware (will be implemented)
    // this.app.use(requestLogger);

    // Rate limiting middleware (will be implemented)
    // if (config.security.rateLimiting) {
    //   this.app.use(rateLimiter);
    // }

    this.logger.info('Middleware configured successfully');
  }

  /**
   * Configure application routes
   */
  private async configureRoutes(): Promise<void> {
    this.logger.info('Configuring routes...');

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.getHealthStatus();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        this.logger.error('Health check failed', error);
        res.status(503).json({
          status: 'unhealthy',
          error: 'Health check failed',
        });
      }
    });

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

    // Global error handler
    this.app.use((
      error: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      this.logger.error('Unhandled request error', error, {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      const statusCode = error.statusCode || 500;
      const message = configManager.isDevelopment() 
        ? error.message 
        : 'Internal Server Error';

      res.status(statusCode).json({
        error: message,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    });

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
    const checks = await Promise.allSettled([
      enhancedDatabaseService.getHealthStatus(),
      redisManager.healthCheck(),
    ]);

    const dbHealth = checks[0].status === 'fulfilled' ? checks[0].value : null;
    const dbHealthy = dbHealth?.isHealthy || false;
    const redisHealthy = checks[1].status === 'fulfilled' && checks[1].value;

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
}

// === Application Bootstrap ===
async function bootstrap(): Promise<void> {
  const app = new Application();
  
  try {
    await app.initialize();
    await app.start();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  bootstrap().catch((error) => {
    console.error('Bootstrap error:', error);
    process.exit(1);
  });
}

export { Application };
export default bootstrap;
