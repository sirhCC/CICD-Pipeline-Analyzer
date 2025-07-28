/**
 * CI/CD Pipeline Analyzer - Main Application Entry Point
 * Enterprise-grade modular architecture with dependency injection
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { configManager } from '@/config';
import { Logger } from '@/shared/logger';
import { Database } from '@/core/database';
import { RedisClient } from '@/core/redis';
import { ModuleManager } from '@/core/module-manager';
import { HealthService } from '@/shared/health';
import { ErrorHandler } from '@/middleware/error-handler';
import { RequestLogger } from '@/middleware/request-logger';
import { RateLimiter } from '@/middleware/rate-limiter';
import { AuthMiddleware } from '@/middleware/auth';

export class Application {
  private app: express.Application;
  private server: any;
  private logger: Logger;
  private database: Database;
  private redis: RedisClient;
  private moduleManager: ModuleManager;
  private healthService: HealthService;

  constructor() {
    this.app = express();
    this.logger = new Logger('Application');
    this.database = new Database();
    this.redis = new RedisClient();
    this.moduleManager = new ModuleManager();
    this.healthService = new HealthService();
  }

  /**
   * Initialize the application with enterprise-grade setup
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('🚀 Initializing CI/CD Pipeline Analyzer...');

      // Validate configuration
      configManager.validateConfiguration();
      this.logger.info('✅ Configuration validated');

      // Initialize core services
      await this.initializeDatabase();
      await this.initializeRedis();
      await this.initializeModules();
      
      // Setup Express middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();

      this.logger.info('✅ Application initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * Start the HTTP server
   */
  public async start(): Promise<void> {
    const config = configManager.getServer();
    
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(config.port, config.host, () => {
          this.logger.info(`🌐 Server running on http://${config.host}:${config.port}`);
          this.logger.info(`📊 Environment: ${configManager.isProduction() ? 'production' : 'development'}`);
          this.logger.info(`🔧 Modules loaded: ${this.moduleManager.getLoadedModules().join(', ')}`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          this.logger.error('❌ Server startup error:', error);
          reject(error);
        });
      } catch (error) {
        this.logger.error('❌ Failed to start server:', error);
        reject(error);
      }
    });
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down application...');

    try {
      // Stop accepting new requests
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            this.logger.info('✅ HTTP server closed');
            resolve();
          });
        });
      }

      // Shutdown modules
      await this.moduleManager.shutdown();
      
      // Close database connections
      await this.database.disconnect();
      
      // Close Redis connection
      await this.redis.disconnect();

      this.logger.info('✅ Application shutdown complete');
    } catch (error) {
      this.logger.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Initialize database connection and run migrations
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.database.connect();
      await this.database.runMigrations();
      this.logger.info('✅ Database connected and migrations applied');
    } catch (error) {
      this.logger.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      await this.redis.connect();
      this.logger.info('✅ Redis connected');
    } catch (error) {
      this.logger.warn('⚠️ Redis connection failed, caching disabled:', error);
    }
  }

  /**
   * Initialize and load all modules
   */
  private async initializeModules(): Promise<void> {
    try {
      await this.moduleManager.loadAllModules();
      this.logger.info('✅ All modules loaded');
    } catch (error) {
      this.logger.error('❌ Module initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup Express middleware stack
   */
  private setupMiddleware(): void {
    const config = configManager.getServer();

    // Security middleware
    if (config.security.helmet) {
      this.app.use(helmet({
        contentSecurityPolicy: false, // Allow for dashboard
        crossOriginEmbedderPolicy: false,
      }));
    }

    // CORS
    this.app.use(cors(config.cors));

    // Compression
    if (config.security.compression) {
      this.app.use(compression());
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(RequestLogger.middleware());

    // Rate limiting
    if (config.security.rateLimiting) {
      this.app.use(RateLimiter.middleware());
    }

    // Authentication (applied selectively to routes)
    this.app.use('/api', AuthMiddleware.optional());
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      const health = await this.healthService.getHealthStatus();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    });

    // API version info
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'CI/CD Pipeline Analyzer',
        version: '1.0.0',
        description: 'Enterprise-grade CI/CD Pipeline Analyzer with intelligent insights',
        documentation: '/api/docs',
        health: '/health',
      });
    });

    // Load module routes
    this.moduleManager.registerRoutes(this.app);

    // Serve dashboard (in production, this would be served by nginx)
    if (!configManager.isProduction()) {
      this.app.use('/dashboard', express.static('public/dashboard'));
    }

    // API documentation
    this.app.get('/api/docs', (req, res) => {
      res.json({
        message: 'API documentation will be available here',
        swagger: '/api/docs/swagger',
        postman: '/api/docs/postman',
      });
    });
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`,
          timestamp: new Date().toISOString(),
        },
      });
    });

    // Global error handler
    this.app.use(ErrorHandler.middleware());
  }

  /**
   * Get Express application instance
   */
  public getApp(): express.Application {
    return this.app;
  }

  /**
   * Get application health status
   */
  public async getHealth(): Promise<any> {
    return this.healthService.getHealthStatus();
  }
}

// === Application Bootstrap ===
async function bootstrap(): Promise<void> {
  const app = new Application();

  // Graceful shutdown handling
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n📡 Received ${signal}, starting graceful shutdown...`);
    try {
      await app.shutdown();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Unhandled errors
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
  });

  try {
    await app.initialize();
    await app.start();
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  bootstrap().catch((error) => {
    console.error('❌ Bootstrap failed:', error);
    process.exit(1);
  });
}

export default Application;
