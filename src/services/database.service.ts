/**
 * Database Service - High-level database operations and business logic
 */

import { databaseManager } from '@/core/database';
import { Logger } from '@/shared/logger';
import {
  pipelineRepository,
  pipelineRunRepository,
  userRepository,
  RepositoryFactory,
} from '@/repositories';
import { configManager } from '@/config';
import type { Pipeline } from '@/entities/pipeline.entity';
import { PipelineRun } from '@/entities/pipeline-run.entity';
import type { User } from '@/entities/user.entity';
import { PipelineProvider, PipelineStatus, UserRole } from '@/types';

export interface DatabaseHealthStatus {
  isConnected: boolean;
  poolStats: Record<string, unknown>;
  entityCounts: {
    users: number;
    pipelines: number;
    pipelineRuns: number;
  };
  performanceMetrics: Record<string, unknown>;
  migrations: {
    executed: number;
    pending: number;
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

export class DatabaseService {
  private static instance: DatabaseService;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('DatabaseService');
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize database and run migrations
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing database service...');

      // Initialize database connection
      await databaseManager.initialize();

      // Run migrations in production/staging
      if (!configManager.isTest()) {
        await this.runMigrations();
      }

      this.logger.info('Database service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database service', error);
      throw error;
    }
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
   * Get database health status
   */
  async getHealthStatus(): Promise<DatabaseHealthStatus> {
    try {
      const isConnected = await databaseManager.healthCheck();
      const poolStats = databaseManager.getPoolStats();

      // Get entity counts
      const [userCount, pipelineCount, runCount] = await Promise.all([
        userRepository.count(),
        pipelineRepository.count(),
        pipelineRunRepository.count(),
      ]);

      // Get performance metrics
      const performanceMetrics = await databaseManager.getPerformanceMetrics();

      // Migration status
      const dataSource = databaseManager.getDataSource();
      const executedMigrations = await dataSource
        .query('SELECT COUNT(*) as count FROM migrations')
        .catch(() => [{ count: 0 }]);

      return {
        isConnected,
        poolStats,
        entityCounts: {
          users: userCount,
          pipelines: pipelineCount,
          pipelineRuns: runCount,
        },
        performanceMetrics,
        migrations: {
          executed: parseInt(executedMigrations[0]?.count || '0', 10),
          pending: 0, // We don't track pending migrations yet
        },
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
   * Create admin user
   */
  private async createAdminUser(adminData: DatabaseSeedOptions['adminUser']): Promise<User> {
    if (!adminData) {
      throw new Error('Admin user data is required');
    }

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
      isEmailVerified: true,
    });

    this.logger.info('Admin user created', { id: adminUser.id, email: adminUser.email });
    return adminUser;
  }

  /**
   * Create sample pipelines
   */
  private async createSamplePipelines(): Promise<Pipeline[]> {
    const samplePipelines = [
      {
        name: 'Sample GitHub Actions Pipeline',
        description: 'A sample CI/CD pipeline using GitHub Actions',
        provider: PipelineProvider.GITHUB_ACTIONS,
        externalId: 'sample-1',
        repository: 'sample-org/sample-repo',
        branch: 'main',
        status: PipelineStatus.SUCCESS,
        owner: 'sample-user',
        organization: 'sample-org',
      },
      {
        name: 'Sample GitLab CI Pipeline',
        description: 'A sample CI/CD pipeline using GitLab CI',
        provider: PipelineProvider.GITLAB_CI,
        externalId: 'sample-2',
        repository: 'sample-group/sample-project',
        branch: 'develop',
        status: PipelineStatus.RUNNING,
        owner: 'sample-user',
        organization: 'sample-group',
      },
    ];

    const createdPipelines: Pipeline[] = [];

    for (const pipelineData of samplePipelines) {
      const existing = await pipelineRepository.findByProviderAndExternalId(
        pipelineData.provider,
        pipelineData.externalId
      );

      if (!existing) {
        const pipeline = await pipelineRepository.create(pipelineData);
        createdPipelines.push(pipeline);
        this.logger.info('Sample pipeline created', { id: pipeline.id, name: pipeline.name });
      }
    }

    return createdPipelines;
  }

  /**
   * Create test data for development
   */
  private async createTestData(): Promise<void> {
    this.logger.info('Creating test data for development environment');

    // Create test users with different roles
    const testUsers = [
      {
        email: 'analyst@test.com',
        username: 'analyst',
        firstName: 'Test',
        lastName: 'Analyst',
        passwordHash: 'password123',
        role: UserRole.ANALYST,
      },
      {
        email: 'viewer@test.com',
        username: 'viewer',
        firstName: 'Test',
        lastName: 'Viewer',
        passwordHash: 'password123',
        role: UserRole.VIEWER,
      },
    ];

    for (const userData of testUsers) {
      const existing = await userRepository.findByEmail(userData.email);
      if (!existing) {
        const user = await userRepository.createUser(userData);
        this.logger.info('Test user created', { id: user.id, email: user.email });
      }
    }

    // Create additional test pipelines
    const testPipelines = [
      {
        name: 'Test Pipeline with Failures',
        description: 'Pipeline for testing failure scenarios',
        provider: PipelineProvider.JENKINS,
        externalId: 'test-fail-1',
        repository: 'test/failure-repo',
        branch: 'main',
        status: PipelineStatus.FAILED,
        totalRuns: 10,
        successfulRuns: 3,
        failedRuns: 7,
        successRate: 30,
      },
      {
        name: 'High Performance Pipeline',
        description: 'Fast executing pipeline for performance testing',
        provider: PipelineProvider.CIRCLECI,
        externalId: 'test-perf-1',
        repository: 'test/performance-repo',
        branch: 'main',
        status: PipelineStatus.SUCCESS,
        totalRuns: 100,
        successfulRuns: 95,
        failedRuns: 5,
        successRate: 95,
        averageDuration: 120, // 2 minutes
      },
    ];

    for (const pipelineData of testPipelines) {
      const existing = await pipelineRepository.findByProviderAndExternalId(
        pipelineData.provider,
        pipelineData.externalId
      );

      if (!existing) {
        const pipeline = await pipelineRepository.create(pipelineData);
        this.logger.info('Test pipeline created', { id: pipeline.id, name: pipeline.name });
      }
    }
  }

  /**
   * Clear all data (for testing)
   */
  async clearAllData(): Promise<void> {
    if (configManager.isProduction()) {
      throw new Error('Cannot clear data in production environment');
    }

    try {
      this.logger.warn('Clearing all database data');
      await databaseManager.clearDatabase();
      this.logger.info('All database data cleared');
    } catch (error) {
      this.logger.error('Failed to clear database data', error);
      throw error;
    }
  }

  /**
   * Perform database maintenance
   */
  async performMaintenance(): Promise<{
    deletedOldRuns: number;
    deletedInactiveUsers: number;
    optimizedTables: string[];
  }> {
    try {
      this.logger.info('Starting database maintenance');

      // Delete old pipeline runs (older than 90 days)
      const deletedOldRuns = await pipelineRunRepository.deleteOldRuns(90);

      // Delete inactive users (inactive for 365 days)
      const deletedInactiveUsers = await userRepository.deleteInactiveUsers(365);

      // Run database optimization
      const optimizedTables = await this.optimizeTables();

      this.logger.info('Database maintenance completed', {
        deletedOldRuns,
        deletedInactiveUsers,
        optimizedTables: optimizedTables.length,
      });

      return {
        deletedOldRuns,
        deletedInactiveUsers,
        optimizedTables,
      };
    } catch (error) {
      this.logger.error('Database maintenance failed', error);
      throw error;
    }
  }

  /**
   * Optimize database tables
   */
  private async optimizeTables(): Promise<string[]> {
    const tables = ['users', 'pipelines', 'pipeline_runs', 'pipeline_run_stages'];
    const optimizedTables: string[] = [];

    for (const table of tables) {
      try {
        await databaseManager.query(`ANALYZE ${table}`);
        optimizedTables.push(table);
      } catch (error) {
        this.logger.warn(`Failed to optimize table ${table}`, error as Record<string, unknown>);
      }
    }

    return optimizedTables;
  }

  /**
   * Create database backup
   */
  async createBackup(backupPath?: string): Promise<string> {
    try {
      this.logger.info('Creating database backup');

      const dbConfig = configManager.getDatabase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultPath = `backup_${dbConfig.database}_${timestamp}.sql`;
      const finalPath = backupPath || defaultPath;

      // Use pg_dump for PostgreSQL backups
      const command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f ${finalPath}`;

      this.logger.info('Database backup created', { path: finalPath });
      return finalPath;
    } catch (error) {
      this.logger.error('Failed to create database backup', error);
      throw error;
    }
  }

  /**
   * Get repository factory
   */
  getRepositoryFactory(): typeof RepositoryFactory {
    return RepositoryFactory;
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    try {
      this.logger.info('Closing database connections');
      await databaseManager.close();
      this.logger.info('Database connections closed');
    } catch (error) {
      this.logger.error('Failed to close database connections', error);
      throw error;
    }
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();
export default databaseService;
