/**
 * Provider Factory and Registry System
 * Enterprise-grade factory pattern for CI/CD provider management
 */

import type { BaseCICDProvider, ProviderConfig } from './base.provider';
import { GitHubActionsProvider } from './github-actions.provider';
import { GitLabCIProvider } from './gitlab-ci.provider';
import { PipelineProvider } from '../types';
import { Logger } from '../shared/logger';
import { configManager } from '../config';

export interface ProviderRegistration {
  provider: PipelineProvider;
  factory: (config: ProviderConfig) => BaseCICDProvider;
  validateConfig: (config: ProviderConfig) => boolean;
  getRequiredFields: () => string[];
  getOptionalFields: () => string[];
  getSupportedFeatures: () => string[];
}

/**
 * Provider Factory for creating and managing CI/CD provider instances
 */
export class ProviderFactory {
  private static instance: ProviderFactory;
  private providers = new Map<PipelineProvider, ProviderRegistration>();
  private instances = new Map<string, BaseCICDProvider>();
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('ProviderFactory');
    this.registerBuiltInProviders();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ProviderFactory {
    if (!ProviderFactory.instance) {
      ProviderFactory.instance = new ProviderFactory();
    }
    return ProviderFactory.instance;
  }

  /**
   * Register a new provider
   */
  public registerProvider(registration: ProviderRegistration): void {
    if (this.providers.has(registration.provider)) {
      this.logger.warn(`Provider ${registration.provider} is already registered, overwriting`);
    }

    this.providers.set(registration.provider, registration);
    this.logger.info(`Registered provider: ${registration.provider}`);
  }

  /**
   * Create a provider instance
   */
  public createProvider(
    provider: PipelineProvider,
    config: ProviderConfig,
    instanceId?: string
  ): BaseCICDProvider {
    const registration = this.providers.get(provider);
    if (!registration) {
      throw new Error(`Provider ${provider} is not registered`);
    }

    // Validate configuration
    if (!registration.validateConfig(config)) {
      throw new Error(`Invalid configuration for provider ${provider}`);
    }

    try {
      const instance = registration.factory(config);

      // Cache instance if instanceId provided
      if (instanceId) {
        this.instances.set(instanceId, instance);
      }

      this.logger.info(`Created provider instance: ${provider}`, {
        provider,
        instanceId,
        hasApiKey: !!config.apiKey,
      });

      return instance;
    } catch (error) {
      this.logger.error(`Failed to create provider instance: ${provider}`, {
        provider,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get cached provider instance
   */
  public getInstance(instanceId: string): BaseCICDProvider | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Remove cached instance
   */
  public removeInstance(instanceId: string): boolean {
    return this.instances.delete(instanceId);
  }

  /**
   * Get all registered providers
   */
  public getRegisteredProviders(): PipelineProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider registration details
   */
  public getProviderInfo(provider: PipelineProvider): ProviderRegistration | undefined {
    return this.providers.get(provider);
  }

  /**
   * Validate provider configuration
   */
  public validateProviderConfig(
    provider: PipelineProvider,
    config: ProviderConfig
  ): { valid: boolean; errors: string[] } {
    const registration = this.providers.get(provider);
    if (!registration) {
      return {
        valid: false,
        errors: [`Provider ${provider} is not registered`],
      };
    }

    const errors: string[] = [];
    const requiredFields = registration.getRequiredFields();

    // Check required fields
    for (const field of requiredFields) {
      if (!(field in config) || !config[field as keyof ProviderConfig]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Provider-specific validation
    if (errors.length === 0 && !registration.validateConfig(config)) {
      errors.push('Provider-specific validation failed');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get provider from configuration
   */
  public getProviderFromConfig(configKey: string): BaseCICDProvider | null {
    try {
      // This would typically load from environment variables or config files
      // For now, return null as it's not implemented
      this.logger.warn(`Configuration-based provider creation not implemented for: ${configKey}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to create provider from config: ${configKey}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Create provider from environment configuration
   */
  public createProviderFromEnv(provider: PipelineProvider): BaseCICDProvider | null {
    try {
      const envConfig = this.getEnvironmentConfig(provider);
      if (!envConfig) {
        return null;
      }

      return this.createProvider(provider, envConfig);
    } catch (error) {
      this.logger.error(`Failed to create provider from environment: ${provider}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get environment configuration for a provider
   */
  private getEnvironmentConfig(provider: PipelineProvider): ProviderConfig | null {
    switch (provider) {
      case PipelineProvider.GITHUB_ACTIONS:
        const githubApiKey = process.env.GITHUB_TOKEN || process.env.GITHUB_API_KEY;
        if (!githubApiKey) return null;

        const githubConfig: ProviderConfig = {
          apiKey: githubApiKey,
          baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
          timeout: parseInt(process.env.GITHUB_TIMEOUT || '30000'),
        };

        if (process.env.GITHUB_WEBHOOK_SECRET) {
          githubConfig.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
        }

        return githubConfig;

      case PipelineProvider.GITLAB_CI:
        const gitlabApiKey = process.env.GITLAB_TOKEN || process.env.GITLAB_API_KEY;
        if (!gitlabApiKey) return null;

        const gitlabConfig: ProviderConfig = {
          apiKey: gitlabApiKey,
          baseUrl: process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4',
          timeout: parseInt(process.env.GITLAB_TIMEOUT || '30000'),
        };

        if (process.env.GITLAB_WEBHOOK_SECRET) {
          gitlabConfig.webhookSecret = process.env.GITLAB_WEBHOOK_SECRET;
        }

        return gitlabConfig;

      default:
        return null;
    }
  }

  /**
   * Test all configured providers
   */
  public async testAllProviders(): Promise<
    {
      provider: PipelineProvider;
      success: boolean;
      error?: string;
    }[]
  > {
    const results: {
      provider: PipelineProvider;
      success: boolean;
      error?: string;
    }[] = [];

    for (const provider of this.getRegisteredProviders()) {
      try {
        // For now, we'll skip config-based testing until providers are implemented
        results.push({
          provider,
          success: false,
          error: 'Provider implementation not available yet',
        });
      } catch (error) {
        results.push({
          provider,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Register built-in providers
   */
  private registerBuiltInProviders(): void {
    // GitHub Actions provider registration
    this.registerProvider({
      provider: PipelineProvider.GITHUB_ACTIONS,
      factory: config => {
        return new GitHubActionsProvider(config as any);
      },
      validateConfig: config => {
        return !!config.apiKey;
      },
      getRequiredFields: () => ['apiKey'],
      getOptionalFields: () => ['baseUrl', 'webhookSecret', 'timeout', 'owner', 'repo'],
      getSupportedFeatures: () => ['pipelines', 'webhooks', 'logs', 'artifacts', 'resourceUsage'],
    });

    // GitLab CI provider registration
    this.registerProvider({
      provider: PipelineProvider.GITLAB_CI,
      factory: config => {
        return new GitLabCIProvider(config as any);
      },
      validateConfig: config => {
        return !!(config.apiKey && config.baseUrl);
      },
      getRequiredFields: () => ['apiKey', 'baseUrl'],
      getOptionalFields: () => ['webhookSecret', 'timeout', 'projectId'],
      getSupportedFeatures: () => ['pipelines', 'webhooks', 'logs', 'artifacts'],
    });

    // Jenkins provider registration (will implement later)
    this.registerProvider({
      provider: PipelineProvider.JENKINS,
      factory: config => {
        // TODO: Import and create JenkinsProvider
        throw new Error('Jenkins provider not implemented yet');
      },
      validateConfig: config => {
        return !!(config.apiKey && config.baseUrl);
      },
      getRequiredFields: () => ['apiKey', 'baseUrl'],
      getOptionalFields: () => ['timeout'],
      getSupportedFeatures: () => ['pipelines', 'logs'],
    });

    this.logger.info('Registered built-in providers', {
      providers: this.getRegisteredProviders(),
    });
  }

  /**
   * Get provider statistics
   */
  public getProviderStatistics(): {
    totalProviders: number;
    registeredProviders: PipelineProvider[];
    activeInstances: number;
    instancesPerProvider: Record<string, number>;
  } {
    const instancesPerProvider: Record<string, number> = {};

    for (const [, instance] of this.instances) {
      const provider = instance.getProviderType();
      instancesPerProvider[provider] = (instancesPerProvider[provider] || 0) + 1;
    }

    return {
      totalProviders: this.providers.size,
      registeredProviders: this.getRegisteredProviders(),
      activeInstances: this.instances.size,
      instancesPerProvider,
    };
  }

  /**
   * Clear all cached instances
   */
  public clearInstances(): void {
    this.instances.clear();
    this.logger.info('Cleared all provider instances');
  }

  /**
   * Health check for all active instances
   */
  public async healthCheck(): Promise<
    {
      instanceId: string;
      provider: PipelineProvider;
      healthy: boolean;
      metrics?: any;
      error?: string;
    }[]
  > {
    const results: {
      instanceId: string;
      provider: PipelineProvider;
      healthy: boolean;
      metrics?: any;
      error?: string;
    }[] = [];

    for (const [instanceId, instance] of this.instances) {
      try {
        const isHealthy = await instance.testConnection();
        const metrics = instance.getMetrics();

        results.push({
          instanceId,
          provider: instance.getProviderType(),
          healthy: isHealthy,
          metrics,
        });
      } catch (error) {
        results.push({
          instanceId,
          provider: instance.getProviderType(),
          healthy: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }
}

// Export singleton instance
export const providerFactory = ProviderFactory.getInstance();
