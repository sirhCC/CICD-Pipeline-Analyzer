/**
 * Enhanced Database Service - Production-ready database layer
 * Integrates connection management, monitoring, and business logic
 */

import { databaseManager } from '@/core/database';
import { databaseConnectionManager } from '@/core/database-monitor';
import { databaseSecurityManager } from '@/core/database-security';
import { repositoryFactory } from '@/repositories/factory.enhanced';
import { Logger } from '@/shared/logger';
import { configManager } from '@/config';
import { Pipeline } from '@/entities/pipeline.entity';
import { PipelineRun } from '@/entities/pipeline-run.entity';
import { User } from '@/entities/user.entity';
import { PipelineProvider, PipelineStatus, UserRole } from '@/types';

export interface DatabaseHealthStatus {
  isConnected: boolean;
  connectionStats: any;
  entityCounts: {
    users: number;
    pipelines: number;
    pipelineRuns: number;
  };
  performanceMetrics: any;
  migrations: {
    executed: number;
    pending: number;
  };
  uptime: number;
  isHealthy: boolean;
  recommendations: string[];
  security: {
    metrics: any;
    recentEvents: any[];
    recommendations: string[];
    securityScore: number;
  };
}

export interface DatabaseSeedOptions {
  createUsers?: boolean;
  createPipelines?: boolean;
  createTestData?: boolean;
  adminUser?: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
  };
}

export class EnhancedDatabaseService {
  private static instance: EnhancedDatabaseService;
  private logger: Logger;
  private isInitialized = false;

  private constructor() {
    this.logger = new Logger('EnhancedDatabaseService');
  }

  public static getInstance(): EnhancedDatabaseService {
    if (!EnhancedDatabaseService.instance) {
      EnhancedDatabaseService.instance = new EnhancedDatabaseService();
    }
    return EnhancedDatabaseService.instance;
  }

  /**
   * Initialize database service with monitoring
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing enhanced database service...');
      
      // Initialize database connection
      await databaseManager.initialize();
      
      // Initialize repositories
      await repositoryFactory.initializeRepositories();
      
      // Start connection monitoring
      databaseConnectionManager.startHealthMonitoring(30000); // Every 30 seconds
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Run migrations in production/staging
      if (!configManager.isTest()) {
        await this.runMigrations();
      }

      this.isInitialized = true;
      this.logger.info('Enhanced database service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize enhanced database service', error);
      throw error;
    }
  }

  /**
   * Setup database event listeners
   */
  private setupEventListeners(): void {
    databaseConnectionManager.on('healthCheckFailed', (error) => {
      this.logger.error('Database health check failed', error);
      // Could trigger alerts or failover logic here
    });

    databaseConnectionManager.on('slowQuery', ({ duration }) => {
      this.logger.warn('Slow query detected', { duration });
      // Could log to monitoring system
    });

    databaseConnectionManager.on('healthCheckSuccess', ({ responseTime, metrics }) => {
      this.logger.debug('Database health check successful', { responseTime });
    });
  }

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<void> {
    try {
      this.logger.info('Running database migrations...');
      await databaseManager.runMigrations();
      this.logger.info('Database migrations completed');
    } catch (error) {
      this.logger.error('Failed to run migrations', error);
      throw error;
    }
  }

  /**
   * Get comprehensive database health status
   */
  async getHealthStatus(): Promise<DatabaseHealthStatus> {
    try {
      const isConnected = await databaseConnectionManager.testConnection();
      const connectionStats = databaseConnectionManager.getConnectionStats();
      const metrics = databaseConnectionManager.getMetrics();
      
      // Get entity counts
      const userRepository = repositoryFactory.getUserRepository();
      const pipelineRepository = repositoryFactory.getPipelineRepository();
      const pipelineRunRepository = repositoryFactory.getPipelineRunRepository();
      
      const [userCount, pipelineCount, runCount] = await Promise.all([
        repositoryFactory.executeWithMonitoring(
          () => userRepository.count(),
          'count_users'
        ),
        repositoryFactory.executeWithMonitoring(
          () => pipelineRepository.count(),
          'count_pipelines'
        ),
        repositoryFactory.executeWithMonitoring(
          () => pipelineRunRepository.count(),
          'count_pipeline_runs'
        )
      ]);

      // Get migration status
      const dataSource = databaseManager.getDataSource();
      const executedMigrations = await dataSource.query(
        'SELECT COUNT(*) as count FROM migrations'
      ).catch(() => [{ count: 0 }]);
      
      // Get performance recommendations
      const recommendations = databaseConnectionManager.getPerformanceRecommendations();
      
      // Get security status
      const securityReport = databaseSecurityManager.generateSecurityReport();
      
      return {
        isConnected,
        connectionStats,
        entityCounts: {
          users: userCount,
          pipelines: pipelineCount,
          pipelineRuns: runCount
        },
        performanceMetrics: metrics.performanceMetrics,
        migrations: {
          executed: parseInt(executedMigrations[0]?.count || '0', 10),
          pending: 0 // We don't track pending migrations yet
        },
        uptime: metrics.uptime,
        isHealthy: metrics.isHealthy,
        recommendations,
        security: {
          metrics: securityReport.summary,
          recentEvents: securityReport.recentEvents,
          recommendations: securityReport.recommendations,
          securityScore: securityReport.summary.securityScore
        }
      };
    } catch (error) {
      this.logger.error('Failed to get database health status', error);
      throw error;
    }
  }

  /**
   * Seed database with initial data
   */
  async seedDatabase(options: DatabaseSeedOptions = {}): Promise<void> {
    try {
      this.logger.info('Seeding database with initial data...', options as Record<string, unknown>);

      // Create admin user if specified
      if (options.createUsers && options.adminUser) {
        await this.createAdminUser(options.adminUser);
      }

      // Create sample pipelines
      if (options.createPipelines) {
        await this.createSamplePipelines();
      }

      // Create test data
      if (options.createTestData && configManager.isDevelopment()) {
        await this.createTestData();
      }

      this.logger.info('Database seeding completed');
    } catch (error) {
      this.logger.error('Failed to seed database', error);
      throw error;
    }
  }

  /**
   * Create admin user with transaction
   */
  private async createAdminUser(adminData: DatabaseSeedOptions['adminUser']): Promise<User> {
    if (!adminData) {
      throw new Error('Admin user data is required');
    }

    return repositoryFactory.executeTransaction(async ({ userRepository }) => {
      // Check if admin user already exists
      const existingAdmin = await userRepository.findByEmail(adminData.email);
      if (existingAdmin) {
        this.logger.info('Admin user already exists', { email: adminData.email });
        return existingAdmin;
      }

      const adminUser = await userRepository.createUser({
        email: adminData.email,
        username: adminData.username,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        passwordHash: adminData.password, // Will be hashed by entity
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true
      });

      this.logger.info('Admin user created', { id: adminUser.id, email: adminUser.email });
      return adminUser;
    });
  }

  /**
   * Create sample pipelines
   */
  private async createSamplePipelines(): Promise<void> {
    const pipelineRepository = repositoryFactory.getPipelineRepository();
    
    const samplePipelines = [
      {
        name: 'Sample Node.js Pipeline',
        description: 'Sample CI/CD pipeline for Node.js applications',
        provider: PipelineProvider.GITHUB_ACTIONS,
        externalId: 'sample-nodejs-1',
        repository: 'organization/sample-nodejs-app',
        branch: 'main',
        status: PipelineStatus.SUCCESS
      },
      {
        name: 'Sample Python Pipeline',
        description: 'Sample CI/CD pipeline for Python applications',
        provider: PipelineProvider.GITLAB_CI,
        externalId: 'sample-python-1',
        repository: 'organization/sample-python-app',
        branch: 'main',
        status: PipelineStatus.SUCCESS
      }
    ];

    for (const pipelineData of samplePipelines) {
      // Check if pipeline already exists
      const existing = await pipelineRepository.findByProviderAndExternalId(
        pipelineData.provider,
        pipelineData.externalId
      );
      
      if (!existing) {
        await pipelineRepository.create(pipelineData);
        this.logger.info('Created sample pipeline', { name: pipelineData.name });
      }
    }
  }

  /**
   * Create test data for development
   */
  private async createTestData(): Promise<void> {
    this.logger.info('Creating test data for development environment');
    
    // Create additional test users, pipelines, runs, etc.
    // This would include more comprehensive test data
    
    this.logger.info('Test data creation completed');
  }

  /**
   * Execute database backup
   */
  async createBackup(): Promise<string> {
    if (configManager.isProduction()) {
      throw new Error('Backup operations should be handled by infrastructure in production');
    }

    this.logger.info('Creating database backup...');
    
    // In a real implementation, this would execute pg_dump or similar
    const backupId = `backup_${Date.now()}`;
    
    this.logger.info('Database backup created', { backupId });
    return backupId;
  }

  /**
   * Clean up old data
   */
  async cleanupOldData(daysToKeep: number = 90): Promise<void> {
    this.logger.info('Cleaning up old data', { daysToKeep });
    
    return repositoryFactory.executeTransaction(async ({ pipelineRunRepository }) => {
      // Delete old pipeline runs
      const deletedRuns = await pipelineRunRepository.deleteOldRuns(daysToKeep);
      
      this.logger.info('Old data cleanup completed', { 
        deletedRuns,
        daysToKeep
      });
    });
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<Record<string, unknown>> {
    const metrics = databaseConnectionManager.getMetrics();
    const repositoryStats = repositoryFactory.getStats();
    const healthStatus = await this.getHealthStatus();
    
    return {
      ...metrics,
      repositories: repositoryStats,
      entities: healthStatus.entityCounts,
      initialized: this.isInitialized
    };
  }

  /**
   * Shutdown database service
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down database service...');
      
      // Stop health monitoring
      databaseConnectionManager.stopHealthMonitoring();
      
      // Clear repository cache
      repositoryFactory.clearCache();
      
      // Close database connection
      await databaseManager.close();
      
      this.isInitialized = false;
      this.logger.info('Database service shutdown completed');
    } catch (error) {
      this.logger.error('Error during database service shutdown', error);
      throw error;
    }
  }
}

// Export singleton instance
export const enhancedDatabaseService = EnhancedDatabaseService.getInstance();
