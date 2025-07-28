/**
 * Provider Factory Tests
 * Tests for the enhanced provider factory system with GitLab CI support
 */

import { ProviderFactory, providerFactory } from '../providers/factory';
import { GitHubActionsProvider, GitLabCIProvider } from '../providers';
import { PipelineProvider } from '../types';

describe('Provider Factory Tests', () => {
  describe('Provider Registration', () => {
    it('should have GitHub Actions provider registered', () => {
      const registeredProviders = providerFactory.getRegisteredProviders();
      expect(registeredProviders).toContain(PipelineProvider.GITHUB_ACTIONS);
    });

    it('should have GitLab CI provider registered', () => {
      const registeredProviders = providerFactory.getRegisteredProviders();
      expect(registeredProviders).toContain(PipelineProvider.GITLAB_CI);
    });

    it('should get provider registration details', () => {
      const githubInfo = providerFactory.getProviderInfo(PipelineProvider.GITHUB_ACTIONS);
      expect(githubInfo).toBeDefined();
      expect(githubInfo?.provider).toBe(PipelineProvider.GITHUB_ACTIONS);
      expect(githubInfo?.getRequiredFields()).toContain('apiKey');

      const gitlabInfo = providerFactory.getProviderInfo(PipelineProvider.GITLAB_CI);
      expect(gitlabInfo).toBeDefined();
      expect(gitlabInfo?.provider).toBe(PipelineProvider.GITLAB_CI);
      expect(gitlabInfo?.getRequiredFields()).toContain('apiKey');
      expect(gitlabInfo?.getRequiredFields()).toContain('baseUrl');
    });
  });

  describe('Provider Creation', () => {
    it('should create GitHub Actions provider with valid config', () => {
      const config = {
        apiKey: 'test-github-token',
        baseUrl: 'https://api.github.com'
      };

      const provider = providerFactory.createProvider(
        PipelineProvider.GITHUB_ACTIONS,
        config
      );

      expect(provider).toBeInstanceOf(GitHubActionsProvider);
      expect(provider.getProviderType()).toBe(PipelineProvider.GITHUB_ACTIONS);
    });

    it('should create GitLab CI provider with valid config', () => {
      const config = {
        apiKey: 'test-gitlab-token',
        baseUrl: 'https://gitlab.com/api/v4'
      };

      const provider = providerFactory.createProvider(
        PipelineProvider.GITLAB_CI,
        config
      );

      expect(provider).toBeInstanceOf(GitLabCIProvider);
      expect(provider.getProviderType()).toBe(PipelineProvider.GITLAB_CI);
    });

    it('should throw error for invalid GitHub config', () => {
      const config = {
        baseUrl: 'https://api.github.com'
        // Missing apiKey
      };

      expect(() => {
        providerFactory.createProvider(PipelineProvider.GITHUB_ACTIONS, config);
      }).toThrow();
    });

    it('should throw error for invalid GitLab config', () => {
      const config = {
        apiKey: 'test-token'
        // Missing baseUrl
      };

      expect(() => {
        providerFactory.createProvider(PipelineProvider.GITLAB_CI, config);
      }).toThrow();
    });

    it('should throw error for unregistered provider', () => {
      const config = { apiKey: 'test' };

      expect(() => {
        providerFactory.createProvider('UNKNOWN_PROVIDER' as PipelineProvider, config);
      }).toThrow('Provider UNKNOWN_PROVIDER is not registered');
    });
  });

  describe('Provider Validation', () => {
    it('should validate GitHub Actions config correctly', () => {
      const validConfig = {
        apiKey: 'test-token',
        baseUrl: 'https://api.github.com'
      };

      const result = providerFactory.validateProviderConfig(
        PipelineProvider.GITHUB_ACTIONS,
        validConfig
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate GitLab CI config correctly', () => {
      const validConfig = {
        apiKey: 'test-token',
        baseUrl: 'https://gitlab.com/api/v4'
      };

      const result = providerFactory.validateProviderConfig(
        PipelineProvider.GITLAB_CI,
        validConfig
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for missing required fields', () => {
      const invalidConfig = {
        baseUrl: 'https://gitlab.com/api/v4'
        // Missing apiKey
      };

      const result = providerFactory.validateProviderConfig(
        PipelineProvider.GITLAB_CI,
        invalidConfig
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: apiKey');
    });

    it('should return error for unknown provider', () => {
      const config = { apiKey: 'test' };

      const result = providerFactory.validateProviderConfig(
        'UNKNOWN' as PipelineProvider,
        config
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Provider UNKNOWN is not registered');
    });
  });

  describe('Instance Management', () => {
    it('should cache and retrieve provider instances', () => {
      const config = {
        apiKey: 'test-token',
        baseUrl: 'https://api.github.com'
      };

      const instanceId = 'test-github-instance';
      const provider = providerFactory.createProvider(
        PipelineProvider.GITHUB_ACTIONS,
        config,
        instanceId
      );

      const cachedProvider = providerFactory.getInstance(instanceId);
      expect(cachedProvider).toBe(provider);
    });

    it('should remove cached instances', () => {
      const config = {
        apiKey: 'test-token',
        baseUrl: 'https://gitlab.com/api/v4'
      };

      const instanceId = 'test-gitlab-instance';
      providerFactory.createProvider(
        PipelineProvider.GITLAB_CI,
        config,
        instanceId
      );

      expect(providerFactory.getInstance(instanceId)).toBeDefined();

      const removed = providerFactory.removeInstance(instanceId);
      expect(removed).toBe(true);
      expect(providerFactory.getInstance(instanceId)).toBeUndefined();
    });

    it('should clear all instances', () => {
      const config = { apiKey: 'test', baseUrl: 'https://api.github.com' };
      
      providerFactory.createProvider(PipelineProvider.GITHUB_ACTIONS, config, 'instance1');
      providerFactory.createProvider(PipelineProvider.GITLAB_CI, config, 'instance2');

      const statsBefore = providerFactory.getProviderStatistics();
      expect(statsBefore.activeInstances).toBeGreaterThan(0);

      providerFactory.clearInstances();

      const statsAfter = providerFactory.getProviderStatistics();
      expect(statsAfter.activeInstances).toBe(0);
    });
  });

  describe('Environment Configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create provider from environment variables', () => {
      process.env.GITHUB_TOKEN = 'test-github-token';
      process.env.GITHUB_API_URL = 'https://api.github.com';

      const provider = providerFactory.createProviderFromEnv(PipelineProvider.GITHUB_ACTIONS);
      expect(provider).toBeInstanceOf(GitHubActionsProvider);
    });

    it('should return null when environment variables are missing', () => {
      delete process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_API_KEY;

      const provider = providerFactory.createProviderFromEnv(PipelineProvider.GITHUB_ACTIONS);
      expect(provider).toBeNull();
    });

    it('should handle GitLab environment configuration', () => {
      process.env.GITLAB_TOKEN = 'test-gitlab-token';
      process.env.GITLAB_API_URL = 'https://gitlab.example.com/api/v4';

      const provider = providerFactory.createProviderFromEnv(PipelineProvider.GITLAB_CI);
      expect(provider).toBeInstanceOf(GitLabCIProvider);
    });
  });

  describe('Provider Statistics', () => {
    beforeEach(() => {
      providerFactory.clearInstances();
    });

    it('should return correct statistics', () => {
      const config = { apiKey: 'test', baseUrl: 'https://api.example.com' };
      
      providerFactory.createProvider(PipelineProvider.GITHUB_ACTIONS, config, 'github1');
      providerFactory.createProvider(PipelineProvider.GITHUB_ACTIONS, config, 'github2');
      providerFactory.createProvider(PipelineProvider.GITLAB_CI, config, 'gitlab1');

      const stats = providerFactory.getProviderStatistics();
      
      expect(stats.totalProviders).toBeGreaterThanOrEqual(2); // At least GitHub and GitLab
      expect(stats.activeInstances).toBe(3);
      expect(stats.instancesPerProvider[PipelineProvider.GITHUB_ACTIONS]).toBe(2);
      expect(stats.instancesPerProvider[PipelineProvider.GITLAB_CI]).toBe(1);
    });
  });

  describe('Health Check', () => {
    it('should perform health check on active instances', async () => {
      // Clear cache to ensure clean state
      providerFactory.clearInstances();
      
      const config = { apiKey: 'test', baseUrl: 'https://api.github.com' };
      
      providerFactory.createProvider(PipelineProvider.GITHUB_ACTIONS, config, 'health-test');

      const healthResults = await providerFactory.healthCheck();
      
      expect(healthResults).toHaveLength(1);
      expect(healthResults[0]?.instanceId).toBe('health-test');
      expect(healthResults[0]?.provider).toBe(PipelineProvider.GITHUB_ACTIONS);
      expect(healthResults[0]).toHaveProperty('healthy');
      expect(healthResults[0]).toHaveProperty('metrics');
    });
  });
});
