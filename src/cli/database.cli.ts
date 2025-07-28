#!/usr/bin/env node

/**
 * Database CLI - Command line interface for database operations
 */

import { program } from 'commander';
import { databaseService } from '@/services/database.service';
import { configManager } from '@/config';
import { Logger } from '@/shared/logger';

const logger = new Logger('DatabaseCLI');

program
  .name('db-cli')
  .description('CI/CD Pipeline Analyzer Database CLI')
  .version('1.0.0');

// Initialize command
program
  .command('init')
  .description('Initialize database and run migrations')
  .action(async () => {
    try {
      logger.info('Initializing database...');
      await databaseService.initialize();
      logger.info('Database initialized successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Failed to initialize database', error as Record<string, unknown>);
      process.exit(1);
    }
  });

// Migrate command
program
  .command('migrate')
  .description('Run database migrations')
  .action(async () => {
    try {
      logger.info('Running migrations...');
      await databaseService.runMigrations();
      logger.info('Migrations completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Failed to run migrations', error as Record<string, unknown>);
      process.exit(1);
    }
  });

// Seed command
program
  .command('seed')
  .description('Seed database with initial data')
  .option('--users', 'Create sample users')
  .option('--pipelines', 'Create sample pipelines')
  .option('--test-data', 'Create test data (dev only)')
  .option('--admin-email <email>', 'Admin user email')
  .option('--admin-username <username>', 'Admin user username')
  .option('--admin-password <password>', 'Admin user password')
  .option('--admin-first-name <firstName>', 'Admin user first name')
  .option('--admin-last-name <lastName>', 'Admin user last name')
  .action(async (options) => {
    try {
      logger.info('Seeding database...');
      
      const seedOptions: any = {
        createUsers: options.users,
        createPipelines: options.pipelines,
        createTestData: options.testData
      };

      if (options.adminEmail) {
        seedOptions.adminUser = {
          email: options.adminEmail,
          username: options.adminUsername || 'admin',
          password: options.adminPassword || 'admin123',
          firstName: options.adminFirstName || 'Admin',
          lastName: options.adminLastName || 'User'
        };
      }

      await databaseService.initialize();
      await databaseService.seedDatabase(seedOptions);
      logger.info('Database seeded successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Failed to seed database', error as Record<string, unknown>);
      process.exit(1);
    }
  });

// Health command
program
  .command('health')
  .description('Check database health status')
  .action(async () => {
    try {
      logger.info('Checking database health...');
      await databaseService.initialize();
      const health = await databaseService.getHealthStatus();
      
      console.log('\n=== Database Health Status ===');
      console.log(`Connected: ${health.isConnected ? '✅' : '❌'}`);
      console.log(`Users: ${health.entityCounts.users}`);
      console.log(`Pipelines: ${health.entityCounts.pipelines}`);
      console.log(`Pipeline Runs: ${health.entityCounts.pipelineRuns}`);
      console.log(`Migrations Executed: ${health.migrations.executed}`);
      console.log(`Pool Stats:`, health.poolStats);
      
      process.exit(0);
    } catch (error) {
      logger.error('Failed to check database health', error as Record<string, unknown>);
      process.exit(1);
    }
  });

// Maintenance command
program
  .command('maintenance')
  .description('Perform database maintenance')
  .action(async () => {
    try {
      logger.info('Performing database maintenance...');
      await databaseService.initialize();
      const result = await databaseService.performMaintenance();
      
      console.log('\n=== Maintenance Results ===');
      console.log(`Deleted old runs: ${result.deletedOldRuns}`);
      console.log(`Deleted inactive users: ${result.deletedInactiveUsers}`);
      console.log(`Optimized tables: ${result.optimizedTables.join(', ')}`);
      
      process.exit(0);
    } catch (error) {
      logger.error('Database maintenance failed', error as Record<string, unknown>);
      process.exit(1);
    }
  });

// Backup command
program
  .command('backup')
  .description('Create database backup')
  .option('--path <path>', 'Backup file path')
  .action(async (options) => {
    try {
      logger.info('Creating database backup...');
      await databaseService.initialize();
      const backupPath = await databaseService.createBackup(options.path);
      
      console.log(`\n✅ Database backup created: ${backupPath}`);
      process.exit(0);
    } catch (error) {
      logger.error('Failed to create backup', error as Record<string, unknown>);
      process.exit(1);
    }
  });

// Clear command (dev/test only)
program
  .command('clear')
  .description('Clear all database data (dev/test only)')
  .option('--confirm', 'Confirm data deletion')
  .action(async (options) => {
    if (!options.confirm) {
      console.error('❌ Must use --confirm flag to clear database data');
      process.exit(1);
    }

    if (configManager.isProduction()) {
      console.error('❌ Cannot clear data in production environment');
      process.exit(1);
    }

    try {
      logger.warn('Clearing all database data...');
      await databaseService.initialize();
      await databaseService.clearAllData();
      
      console.log('\n⚠️  All database data cleared');
      process.exit(0);
    } catch (error) {
      logger.error('Failed to clear database data', error as Record<string, unknown>);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show database configuration and status')
  .action(async () => {
    try {
      const dbConfig = configManager.getDatabase();
      
      console.log('\n=== Database Configuration ===');
      console.log(`Type: ${dbConfig.type}`);
      console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
      console.log(`Database: ${dbConfig.database}`);
      console.log(`Username: ${dbConfig.username}`);
      console.log(`SSL: ${dbConfig.ssl ? '✅' : '❌'}`);
      
      try {
        await databaseService.initialize();
        const health = await databaseService.getHealthStatus();
        
        console.log('\n=== Connection Status ===');
        console.log(`Status: ${health.isConnected ? '✅ Connected' : '❌ Disconnected'}`);
        console.log(`Entity Counts: ${JSON.stringify(health.entityCounts, null, 2)}`);
      } catch (error) {
        console.log('\n=== Connection Status ===');
        console.log('Status: ❌ Cannot connect');
        console.log(`Error: ${(error as Error).message}`);
      }
      
      process.exit(0);
    } catch (error) {
      logger.error('Failed to get database status', error as Record<string, unknown>);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
