"use strict";
/**
 * Provider Factory and Registry System
 * Enterprise-grade factory pattern for CI/CD provider management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerFactory = exports.ProviderFactory = void 0;
const github_actions_provider_1 = require("./github-actions.provider");
const gitlab_ci_provider_1 = require("./gitlab-ci.provider");
const types_1 = require("../types");
const logger_1 = require("../shared/logger");
/**
 * Provider Factory for creating and managing CI/CD provider instances
 */
class ProviderFactory {
    static instance;
    providers = new Map();
    instances = new Map();
    logger;
    constructor() {
        this.logger = new logger_1.Logger('ProviderFactory');
        this.registerBuiltInProviders();
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!ProviderFactory.instance) {
            ProviderFactory.instance = new ProviderFactory();
        }
        return ProviderFactory.instance;
    }
    /**
     * Register a new provider
     */
    registerProvider(registration) {
        if (this.providers.has(registration.provider)) {
            this.logger.warn(`Provider ${registration.provider} is already registered, overwriting`);
        }
        this.providers.set(registration.provider, registration);
        this.logger.info(`Registered provider: ${registration.provider}`);
    }
    /**
     * Create a provider instance
     */
    createProvider(provider, config, instanceId) {
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
        }
        catch (error) {
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
    getInstance(instanceId) {
        return this.instances.get(instanceId);
    }
    /**
     * Remove cached instance
     */
    removeInstance(instanceId) {
        return this.instances.delete(instanceId);
    }
    /**
     * Get all registered providers
     */
    getRegisteredProviders() {
        return Array.from(this.providers.keys());
    }
    /**
     * Get provider registration details
     */
    getProviderInfo(provider) {
        return this.providers.get(provider);
    }
    /**
     * Validate provider configuration
     */
    validateProviderConfig(provider, config) {
        const registration = this.providers.get(provider);
        if (!registration) {
            return {
                valid: false,
                errors: [`Provider ${provider} is not registered`],
            };
        }
        const errors = [];
        const requiredFields = registration.getRequiredFields();
        // Check required fields
        for (const field of requiredFields) {
            if (!(field in config) || !config[field]) {
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
    getProviderFromConfig(configKey) {
        try {
            // This would typically load from environment variables or config files
            // For now, return null as it's not implemented
            this.logger.warn(`Configuration-based provider creation not implemented for: ${configKey}`);
            return null;
        }
        catch (error) {
            this.logger.error(`Failed to create provider from config: ${configKey}`, {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    /**
     * Create provider from environment configuration
     */
    createProviderFromEnv(provider) {
        try {
            const envConfig = this.getEnvironmentConfig(provider);
            if (!envConfig) {
                return null;
            }
            return this.createProvider(provider, envConfig);
        }
        catch (error) {
            this.logger.error(`Failed to create provider from environment: ${provider}`, {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    /**
     * Get environment configuration for a provider
     */
    getEnvironmentConfig(provider) {
        switch (provider) {
            case types_1.PipelineProvider.GITHUB_ACTIONS:
                const githubApiKey = process.env.GITHUB_TOKEN || process.env.GITHUB_API_KEY;
                if (!githubApiKey)
                    return null;
                const githubConfig = {
                    apiKey: githubApiKey,
                    baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
                    timeout: parseInt(process.env.GITHUB_TIMEOUT || '30000'),
                };
                if (process.env.GITHUB_WEBHOOK_SECRET) {
                    githubConfig.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
                }
                return githubConfig;
            case types_1.PipelineProvider.GITLAB_CI:
                const gitlabApiKey = process.env.GITLAB_TOKEN || process.env.GITLAB_API_KEY;
                if (!gitlabApiKey)
                    return null;
                const gitlabConfig = {
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
    async testAllProviders() {
        const results = [];
        for (const provider of this.getRegisteredProviders()) {
            try {
                // For now, we'll skip config-based testing until providers are implemented
                results.push({
                    provider,
                    success: false,
                    error: 'Provider implementation not available yet',
                });
            }
            catch (error) {
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
    registerBuiltInProviders() {
        // GitHub Actions provider registration
        this.registerProvider({
            provider: types_1.PipelineProvider.GITHUB_ACTIONS,
            factory: (config) => {
                return new github_actions_provider_1.GitHubActionsProvider(config);
            },
            validateConfig: (config) => {
                return !!(config.apiKey);
            },
            getRequiredFields: () => ['apiKey'],
            getOptionalFields: () => ['baseUrl', 'webhookSecret', 'timeout', 'owner', 'repo'],
            getSupportedFeatures: () => [
                'pipelines',
                'webhooks',
                'logs',
                'artifacts',
                'resourceUsage',
            ],
        });
        // GitLab CI provider registration
        this.registerProvider({
            provider: types_1.PipelineProvider.GITLAB_CI,
            factory: (config) => {
                return new gitlab_ci_provider_1.GitLabCIProvider(config);
            },
            validateConfig: (config) => {
                return !!(config.apiKey && config.baseUrl);
            },
            getRequiredFields: () => ['apiKey', 'baseUrl'],
            getOptionalFields: () => ['webhookSecret', 'timeout', 'projectId'],
            getSupportedFeatures: () => [
                'pipelines',
                'webhooks',
                'logs',
                'artifacts',
            ],
        });
        // Jenkins provider registration (will implement later)
        this.registerProvider({
            provider: types_1.PipelineProvider.JENKINS,
            factory: (config) => {
                // TODO: Import and create JenkinsProvider
                throw new Error('Jenkins provider not implemented yet');
            },
            validateConfig: (config) => {
                return !!(config.apiKey && config.baseUrl);
            },
            getRequiredFields: () => ['apiKey', 'baseUrl'],
            getOptionalFields: () => ['timeout'],
            getSupportedFeatures: () => [
                'pipelines',
                'logs',
            ],
        });
        this.logger.info('Registered built-in providers', {
            providers: this.getRegisteredProviders(),
        });
    }
    /**
     * Get provider statistics
     */
    getProviderStatistics() {
        const instancesPerProvider = {};
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
    clearInstances() {
        this.instances.clear();
        this.logger.info('Cleared all provider instances');
    }
    /**
     * Health check for all active instances
     */
    async healthCheck() {
        const results = [];
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
            }
            catch (error) {
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
exports.ProviderFactory = ProviderFactory;
// Export singleton instance
exports.providerFactory = ProviderFactory.getInstance();
//# sourceMappingURL=factory.js.map