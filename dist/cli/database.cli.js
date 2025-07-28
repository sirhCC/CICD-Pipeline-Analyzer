#!/usr/bin/env node
"use strict";
/**
 * Database CLI - Command line interface for database operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const database_service_1 = require("../services/database.service");
const config_1 = require("../config");
const logger_1 = require("../shared/logger");
const logger = new logger_1.Logger('DatabaseCLI');
commander_1.program
    .name('db-cli')
    .description('CI/CD Pipeline Analyzer Database CLI')
    .version('1.0.0');
// Initialize command
commander_1.program
    .command('init')
    .description('Initialize database and run migrations')
    .action(async () => {
    try {
        logger.info('Initializing database...');
        await database_service_1.databaseService.initialize();
        logger.info('Database initialized successfully');
        process.exit(0);
    }
    catch (error) {
        logger.error('Failed to initialize database', error);
        process.exit(1);
    }
});
// Migrate command
commander_1.program
    .command('migrate')
    .description('Run database migrations')
    .action(async () => {
    try {
        logger.info('Running migrations...');
        await database_service_1.databaseService.runMigrations();
        logger.info('Migrations completed successfully');
        process.exit(0);
    }
    catch (error) {
        logger.error('Failed to run migrations', error);
        process.exit(1);
    }
});
// Seed command
commander_1.program
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
        const seedOptions = {
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
        await database_service_1.databaseService.initialize();
        await database_service_1.databaseService.seedDatabase(seedOptions);
        logger.info('Database seeded successfully');
        process.exit(0);
    }
    catch (error) {
        logger.error('Failed to seed database', error);
        process.exit(1);
    }
});
// Health command
commander_1.program
    .command('health')
    .description('Check database health status')
    .action(async () => {
    try {
        logger.info('Checking database health...');
        await database_service_1.databaseService.initialize();
        const health = await database_service_1.databaseService.getHealthStatus();
        console.log('\n=== Database Health Status ===');
        console.log(`Connected: ${health.isConnected ? '✅' : '❌'}`);
        console.log(`Users: ${health.entityCounts.users}`);
        console.log(`Pipelines: ${health.entityCounts.pipelines}`);
        console.log(`Pipeline Runs: ${health.entityCounts.pipelineRuns}`);
        console.log(`Migrations Executed: ${health.migrations.executed}`);
        console.log(`Pool Stats:`, health.poolStats);
        process.exit(0);
    }
    catch (error) {
        logger.error('Failed to check database health', error);
        process.exit(1);
    }
});
// Maintenance command
commander_1.program
    .command('maintenance')
    .description('Perform database maintenance')
    .action(async () => {
    try {
        logger.info('Performing database maintenance...');
        await database_service_1.databaseService.initialize();
        const result = await database_service_1.databaseService.performMaintenance();
        console.log('\n=== Maintenance Results ===');
        console.log(`Deleted old runs: ${result.deletedOldRuns}`);
        console.log(`Deleted inactive users: ${result.deletedInactiveUsers}`);
        console.log(`Optimized tables: ${result.optimizedTables.join(', ')}`);
        process.exit(0);
    }
    catch (error) {
        logger.error('Database maintenance failed', error);
        process.exit(1);
    }
});
// Backup command
commander_1.program
    .command('backup')
    .description('Create database backup')
    .option('--path <path>', 'Backup file path')
    .action(async (options) => {
    try {
        logger.info('Creating database backup...');
        await database_service_1.databaseService.initialize();
        const backupPath = await database_service_1.databaseService.createBackup(options.path);
        console.log(`\n✅ Database backup created: ${backupPath}`);
        process.exit(0);
    }
    catch (error) {
        logger.error('Failed to create backup', error);
        process.exit(1);
    }
});
// Clear command (dev/test only)
commander_1.program
    .command('clear')
    .description('Clear all database data (dev/test only)')
    .option('--confirm', 'Confirm data deletion')
    .action(async (options) => {
    if (!options.confirm) {
        console.error('❌ Must use --confirm flag to clear database data');
        process.exit(1);
    }
    if (config_1.configManager.isProduction()) {
        console.error('❌ Cannot clear data in production environment');
        process.exit(1);
    }
    try {
        logger.warn('Clearing all database data...');
        await database_service_1.databaseService.initialize();
        await database_service_1.databaseService.clearAllData();
        console.log('\n⚠️  All database data cleared');
        process.exit(0);
    }
    catch (error) {
        logger.error('Failed to clear database data', error);
        process.exit(1);
    }
});
// Status command
commander_1.program
    .command('status')
    .description('Show database configuration and status')
    .action(async () => {
    try {
        const dbConfig = config_1.configManager.getDatabase();
        console.log('\n=== Database Configuration ===');
        console.log(`Type: ${dbConfig.type}`);
        console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
        console.log(`Database: ${dbConfig.database}`);
        console.log(`Username: ${dbConfig.username}`);
        console.log(`SSL: ${dbConfig.ssl ? '✅' : '❌'}`);
        try {
            await database_service_1.databaseService.initialize();
            const health = await database_service_1.databaseService.getHealthStatus();
            console.log('\n=== Connection Status ===');
            console.log(`Status: ${health.isConnected ? '✅ Connected' : '❌ Disconnected'}`);
            console.log(`Entity Counts: ${JSON.stringify(health.entityCounts, null, 2)}`);
        }
        catch (error) {
            console.log('\n=== Connection Status ===');
            console.log('Status: ❌ Cannot connect');
            console.log(`Error: ${error.message}`);
        }
        process.exit(0);
    }
    catch (error) {
        logger.error('Failed to get database status', error);
        process.exit(1);
    }
});
// Parse command line arguments
commander_1.program.parse();
// Show help if no command provided
if (!process.argv.slice(2).length) {
    commander_1.program.outputHelp();
}
//# sourceMappingURL=database.cli.js.map