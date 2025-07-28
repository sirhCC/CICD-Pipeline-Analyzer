/**
 * Database Layer Basic Tests
 */

import { databaseService } from '../services/database.service';
import { configManager } from '../config';
import { 
  pipelineRepository, 
  pipelineRunRepository, 
  userRepository 
} from '../repositories';
import { 
  PipelineProvider, 
  PipelineStatus, 
  UserRole 
} from '../types';

describe('Database Layer Basic Tests', () => {
  beforeAll(async () => {
    // Initialize test database
    await databaseService.initialize();
    
    // Clear existing data
    if (configManager.isTest()) {
      await databaseService.clearAllData();
    }
  });

  afterAll(async () => {
    // Clean up and close connections
    if (configManager.isTest()) {
      await databaseService.clearAllData();
    }
    await databaseService.close();
  });

  describe('Database Service', () => {
    it('should initialize successfully', async () => {
      const health = await databaseService.getHealthStatus();
      expect(health.isConnected).toBe(true);
      expect(health.entityCounts).toBeDefined();
    });

    it('should seed database with initial data', async () => {
      await databaseService.seedDatabase({
        createUsers: true,
        createPipelines: true,
        adminUser: {
          email: 'test-admin@example.com',
          username: 'testadmin',
          password: 'password123',
          firstName: 'Test',
          lastName: 'Admin'
        }
      });

      const health = await databaseService.getHealthStatus();
      expect(health.entityCounts.users).toBeGreaterThan(0);
      expect(health.entityCounts.pipelines).toBeGreaterThan(0);
    });
  });

  describe('User Repository', () => {
    let testUser: any;

    it('should create a new user', async () => {
      testUser = await userRepository.createUser({
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashedpassword',
        role: UserRole.ANALYST
      });

      expect(testUser).toBeDefined();
      expect(testUser.email).toBe('test@example.com');
      expect(testUser.role).toBe(UserRole.ANALYST);
    });

    it('should find user by email', async () => {
      const foundUser = await userRepository.findByEmail('test@example.com');
      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(testUser.id);
    });

    it('should find user by username', async () => {
      const foundUser = await userRepository.findByUsername('testuser');
      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(testUser.id);
    });

    it('should count users', async () => {
      const count = await userRepository.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('Pipeline Repository', () => {
    let testPipeline: any;

    it('should create a new pipeline', async () => {
      testPipeline = await pipelineRepository.create({
        name: 'Test Pipeline',
        description: 'A test pipeline for integration testing',
        provider: PipelineProvider.GITHUB_ACTIONS,
        externalId: 'test-pipeline-1',
        repository: 'test/repo',
        branch: 'main',
        status: PipelineStatus.SUCCESS,
        owner: 'testowner',
        organization: 'testorg'
      });

      expect(testPipeline).toBeDefined();
      expect(testPipeline.name).toBe('Test Pipeline');
      expect(testPipeline.provider).toBe(PipelineProvider.GITHUB_ACTIONS);
    });

    it('should find pipeline by ID', async () => {
      const foundPipeline = await pipelineRepository.findById(testPipeline.id);
      expect(foundPipeline).toBeDefined();
      expect(foundPipeline?.id).toBe(testPipeline.id);
    });

    it('should find pipeline by provider and external ID', async () => {
      const foundPipeline = await pipelineRepository.findByProviderAndExternalId(
        PipelineProvider.GITHUB_ACTIONS,
        'test-pipeline-1'
      );

      expect(foundPipeline).toBeDefined();
      expect(foundPipeline?.id).toBe(testPipeline.id);
    });

    it('should count pipelines', async () => {
      const count = await pipelineRepository.count();
      expect(count).toBeGreaterThan(0);
    });

    it('should get basic statistics', async () => {
      const stats = await pipelineRepository.getStats();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.active).toBeDefined();
    });
  });

  describe('Pipeline Run Repository', () => {
    let testRun: any;
    let testPipeline: any;

    beforeEach(async () => {
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
        organization: 'testorg'
      });
    });

    it('should create a new pipeline run', async () => {
      testRun = await pipelineRunRepository.create({
        externalId: 'run-1',
        provider: PipelineProvider.GITLAB_CI,
        status: 'running',
        pipeline: testPipeline,
        triggerType: 'push',
        branch: 'main',
        commit: 'abc123',
        author: 'testuser'
      });

      expect(testRun).toBeDefined();
      expect(testRun.status).toBe('running');
      expect(testRun.pipeline.id).toBe(testPipeline.id);
    });

    it('should find run by ID', async () => {
      const foundRun = await pipelineRunRepository.findById(testRun.id);
      expect(foundRun).toBeDefined();
      expect(foundRun?.id).toBe(testRun.id);
    });

    it('should count pipeline runs', async () => {
      const count = await pipelineRunRepository.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('Database Health', () => {
    it('should perform health check', async () => {
      const health = await databaseService.getHealthStatus();
      expect(health.isConnected).toBe(true);
      expect(health.entityCounts.users).toBeGreaterThanOrEqual(0);
      expect(health.entityCounts.pipelines).toBeGreaterThanOrEqual(0);
      expect(health.entityCounts.pipelineRuns).toBeGreaterThanOrEqual(0);
    });
  });
});
