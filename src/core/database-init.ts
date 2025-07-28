/**
 * Database Initialization Script
 * Comprehensive database setup for production deployment
 */

import { enhancedDatabaseService } from '@/services/database.enhanced';
import { databaseManager } from '@/core/database';
import { Logger } from '@/shared/logger';
import { configManager } from '@/config';

const logger = new Logger('DatabaseInit');

export interface InitializationOptions {
  runMigrations?: boolean;
  seedData?: boolean;
  createAdminUser?: boolean;
  adminUser?: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
  };
  enableMonitoring?: boolean;
  skipHealthCheck?: boolean;
  verbose?: boolean;
}

export class DatabaseInitializer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('DatabaseInitializer');
  }

  /**
   * Initialize database with comprehensive setup
   */
  async initialize(options: InitializationOptions = {}): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting database initialization...', options as Record<string, unknown>);

      // Step 1: Initialize enhanced database service
      await this.initializeService(options);

      // Step 2: Run migrations if needed
      if (options.runMigrations !== false && !configManager.isTest()) {
        await this.runMigrations();
      }

      // Step 3: Seed data if requested
      if (options.seedData) {
        await this.seedData(options);
      }

      // Step 4: Run health check
      if (!options.skipHealthCheck) {
        await this.performHealthCheck();
      }

      // Step 5: Log completion
      const duration = Date.now() - startTime;
      this.logger.info('Database initialization completed successfully', { 
        duration: `${duration}ms`,
        environment: process.env.NODE_ENV
      });

    } catch (error) {
      this.logger.error('Database initialization failed', error);
      throw error;
    }
  }

  /**
   * Initialize the enhanced database service
   */
  private async initializeService(options: InitializationOptions): Promise<void> {
    this.logger.info('Initializing enhanced database service...');
    
    await enhancedDatabaseService.initialize();
    
    this.logger.info('Enhanced database service initialized');
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    this.logger.info('Running database migrations...');
    
    try {
      await databaseManager.runMigrations();
      this.logger.info('Database migrations completed successfully');
    } catch (error) {
      this.logger.error('Database migration failed', error);
      throw error;
    }
  }

  /**
   * Seed database with initial data
   */
  private async seedData(options: InitializationOptions): Promise<void> {
    this.logger.info('Seeding database with initial data...');
    
    const seedOptions: any = {
      createUsers: options.createAdminUser || false,
      createPipelines: true,
      createTestData: configManager.isDevelopment()
    };

    if (options.adminUser) {
      seedOptions.adminUser = options.adminUser;
    }

    await enhancedDatabaseService.seedDatabase(seedOptions);
    
    this.logger.info('Database seeding completed');
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    this.logger.info('Performing database health check...');
    
    try {
      const healthStatus = await enhancedDatabaseService.getHealthStatus();
      
      this.logger.info('Database health check completed', {
        isHealthy: healthStatus.isHealthy,
        isConnected: healthStatus.isConnected,
        entityCounts: healthStatus.entityCounts,
        uptime: healthStatus.uptime
      });

      if (!healthStatus.isHealthy) {
        this.logger.warn('Database health issues detected', {
          recommendations: healthStatus.recommendations
        });
      }

      if (healthStatus.recommendations.length > 0) {
        this.logger.info('Performance recommendations:', {
          recommendations: healthStatus.recommendations
        });
      }

    } catch (error) {
      this.logger.error('Database health check failed', error);
      throw error;
    }
  }

  /**
   * Quick initialization for development
   */
  async initializeDevelopment(): Promise<void> {
    await this.initialize({
      runMigrations: false, // Use synchronize in development
      seedData: true,
      createAdminUser: true,
      adminUser: {
        email: 'admin@cicd-analyzer.local',
        username: 'admin',
        password: 'admin123456', // Should be changed in production
        firstName: 'Admin',
        lastName: 'User'
      },
      enableMonitoring: true,
      verbose: true
    });
  }

  /**
   * Production initialization
   */
  async initializeProduction(): Promise<void> {
    const adminUser = {
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'changeme',
      firstName: process.env.ADMIN_FIRST_NAME || 'System',
      lastName: process.env.ADMIN_LAST_NAME || 'Administrator'
    };

    if (adminUser.password === 'changeme') {
      throw new Error('Admin password must be set via ADMIN_PASSWORD environment variable');
    }

    await this.initialize({
      runMigrations: true,
      seedData: true,
      createAdminUser: true,
      adminUser,
      enableMonitoring: true,
      skipHealthCheck: false,
      verbose: false
    });
  }

  /**
   * Test initialization (minimal setup)
   */
  async initializeTest(): Promise<void> {
    await this.initialize({
      runMigrations: false,
      seedData: false,
      createAdminUser: false,
      enableMonitoring: false,
      skipHealthCheck: true,
      verbose: false
    });
  }

  /**
   * Get initialization status
   */
  async getStatus(): Promise<Record<string, unknown>> {
    try {
      const healthStatus = await enhancedDatabaseService.getHealthStatus();
      const statistics = await enhancedDatabaseService.getStatistics();
      
      return {
        healthy: healthStatus.isHealthy,
        connected: healthStatus.isConnected,
        initialized: statistics.initialized,
        uptime: healthStatus.uptime,
        entityCounts: healthStatus.entityCounts,
        performance: healthStatus.performanceMetrics
      };
    } catch (error) {
      return {
        healthy: false,
        connected: false,
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Shutdown database gracefully
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down database...');
    
    try {
      await enhancedDatabaseService.shutdown();
      this.logger.info('Database shutdown completed');
    } catch (error) {
      this.logger.error('Database shutdown failed', error);
      throw error;
    }
  }
}

// Export singleton instance
export const databaseInitializer = new DatabaseInitializer();

// Convenience functions for different environments
export const initializeDatabaseForEnvironment = async (): Promise<void> => {
  if (configManager.isTest()) {
    await databaseInitializer.initializeTest();
  } else if (configManager.isDevelopment()) {
    await databaseInitializer.initializeDevelopment();
  } else {
    await databaseInitializer.initializeProduction();
  }
};

// CLI script support
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
      initializeDatabaseForEnvironment()
        .then(() => {
          console.log('Database initialization completed successfully');
          process.exit(0);
        })
        .catch((error) => {
          console.error('Database initialization failed:', error);
          process.exit(1);
        });
      break;
      
    case 'status':
      databaseInitializer.getStatus()
        .then((status) => {
          console.log('Database Status:', JSON.stringify(status, null, 2));
          process.exit(0);
        })
        .catch((error) => {
          console.error('Failed to get database status:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node database-init.js [init|status]');
      process.exit(1);
  }
}
