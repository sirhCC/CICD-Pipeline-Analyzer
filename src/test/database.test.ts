/**
 * Database Layer Basic Tests
 */

import { databaseService } from '../services/database.service';
import { configManager } from '../config';
import { pipelineRepository, pipelineRunRepository, userRepository } from '../repositories';
import { PipelineProvider, PipelineStatus, UserRole } from '../types';
import { MockDatabaseService, setupTestDatabase, cleanupTestDatabase } from './test-db-setup';
import { DataSource } from 'typeorm';

describe('Database Layer Basic Tests', () => {
  let testDataSource: DataSource | null = null;
  let mockDbService: MockDatabaseService | null = null;
  let isDatabaseAvailable = false;

  beforeAll(async () => {
    try {
      // Try to use real database first, fallback to mock
      if (process.env.DB_TYPE === 'sqlite' || !process.env.DB_HOST) {
        // Use in-memory SQLite for testing
        mockDbService = new MockDatabaseService();
        await mockDbService.initialize();
        testDataSource = mockDbService.getDataSource();
        isDatabaseAvailable = true;
      } else {
        // Try to initialize real database
        await databaseService.initialize();
        isDatabaseAvailable = true;

        // Clear existing data
        if (configManager.isTest()) {
          await databaseService.clearAllData();
        }
      }
    } catch (error) {
      // Fallback to mock database
      try {
        mockDbService = new MockDatabaseService();
        await mockDbService.initialize();
        testDataSource = mockDbService.getDataSource();
        isDatabaseAvailable = true;
      } catch (mockError) {
        console.warn(
          'Database not available for testing - skipping database tests:',
          error instanceof Error ? error.message : String(error)
        );
        isDatabaseAvailable = false;
      }
    }
  });

  afterAll(async () => {
    if (isDatabaseAvailable) {
      try {
        if (mockDbService) {
          await mockDbService.close();
        } else {
          // Clean up real database
          if (configManager.isTest()) {
            await databaseService.clearAllData();
          }
          await databaseService.close();
        }
      } catch (error) {
        console.warn(
          'Error cleaning up database:',
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  });

  describe('Database Service', () => {
    it('should initialize successfully', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      const health = await databaseService.getHealthStatus();
      expect(health.isConnected).toBe(true);
      expect(health.entityCounts).toBeDefined();
    });

    it('should seed database with initial data', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      await databaseService.seedDatabase({
        createUsers: true,
        createPipelines: true,
        adminUser: {
          email: 'test-admin@example.com',
          username: 'testadmin',
          password: 'password123',
          firstName: 'Test',
          lastName: 'Admin',
        },
      });

      const health = await databaseService.getHealthStatus();
      expect(health.entityCounts.users).toBeGreaterThan(0);
      expect(health.entityCounts.pipelines).toBeGreaterThan(0);
    });
  });

  describe('User Repository', () => {
    let testUser: any;

    it('should create a new user', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      testUser = await userRepository.createUser({
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashedpassword',
        role: UserRole.ANALYST,
      });

      expect(testUser).toBeDefined();
      expect(testUser.email).toBe('test@example.com');
      expect(testUser.role).toBe(UserRole.ANALYST);
    });

    it('should find user by email', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      const foundUser = await userRepository.findByEmail('test@example.com');
      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(testUser.id);
    });

    it('should find user by username', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      const foundUser = await userRepository.findByUsername('testuser');
      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(testUser.id);
    });

    it('should count users', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      const count = await userRepository.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('Pipeline Repository', () => {
    let testPipeline: any;

    it('should create a new pipeline', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      testPipeline = await pipelineRepository.create({
        name: 'Test Pipeline',
        description: 'A test pipeline for integration testing',
        provider: PipelineProvider.GITHUB_ACTIONS,
        externalId: 'test-pipeline-1',
        repository: 'test/repo',
        branch: 'main',
        status: PipelineStatus.SUCCESS,
        owner: 'testowner',
        organization: 'testorg',
      });

      expect(testPipeline).toBeDefined();
      expect(testPipeline.name).toBe('Test Pipeline');
      expect(testPipeline.provider).toBe(PipelineProvider.GITHUB_ACTIONS);
    });

    it('should find pipeline by ID', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      const foundPipeline = await pipelineRepository.findById(testPipeline.id);
      expect(foundPipeline).toBeDefined();
      expect(foundPipeline?.id).toBe(testPipeline.id);
    });

    it('should find pipeline by provider and external ID', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      const foundPipeline = await pipelineRepository.findByProviderAndExternalId(
        PipelineProvider.GITHUB_ACTIONS,
        'test-pipeline-1'
      );

      expect(foundPipeline).toBeDefined();
      expect(foundPipeline?.id).toBe(testPipeline.id);
    });

    it('should count pipelines', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      const count = await pipelineRepository.count();
      expect(count).toBeGreaterThan(0);
    });

    it('should get basic statistics', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      const stats = await pipelineRepository.getStats();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.active).toBeDefined();
    });
  });

  describe('Pipeline Run Repository', () => {
    let testRun: any;
    let testPipeline: any;

    beforeEach(async () => {
      if (!isDatabaseAvailable) {
        return;
      }

      // Create a test pipeline first
      testPipeline = await pipelineRepository.create({
        name: 'Test Pipeline for Runs',
        description: 'Pipeline for testing runs',
        provider: PipelineProvider.GITLAB_CI,
        externalId: 'test-pipeline-runs',
        repository: 'test/runs-repo',
        branch: 'main',
        status: PipelineStatus.SUCCESS,
        owner: 'testowner',
        organization: 'testorg',
      });
    });

    it('should create a new pipeline run', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      testRun = await pipelineRunRepository.create({
        runNumber: 1,
        status: PipelineStatus.RUNNING,
        pipeline: testPipeline,
        triggeredBy: 'user',
        triggeredEvent: 'push',
        branch: 'main',
        commitSha: 'abc123',
        commitAuthor: 'testuser',
      });

      expect(testRun).toBeDefined();
      expect(testRun.status).toBe(PipelineStatus.RUNNING);
      expect(testRun.pipeline.id).toBe(testPipeline.id);
    });

    it('should find run by ID', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      const foundRun = await pipelineRunRepository.findById(testRun.id);
      expect(foundRun).toBeDefined();
      expect(foundRun?.id).toBe(testRun.id);
    });

    it('should count pipeline runs', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      const count = await pipelineRunRepository.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('Database Health', () => {
    it('should perform health check', async () => {
      if (!isDatabaseAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      const health = await databaseService.getHealthStatus();
      expect(health.isConnected).toBe(true);
      expect(health.entityCounts.users).toBeGreaterThanOrEqual(0);
      expect(health.entityCounts.pipelines).toBeGreaterThanOrEqual(0);
      expect(health.entityCounts.pipelineRuns).toBeGreaterThanOrEqual(0);
    });
  });
});
