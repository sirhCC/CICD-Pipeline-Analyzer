/**
 * Provider Factory and Registry System
 * Enterprise-grade factory pattern for CI/CD provider management
 */
import { BaseCICDProvider, ProviderConfig } from './base.provider';
import { PipelineProvider } from '../types';
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
export declare class ProviderFactory {
    private static instance;
    private providers;
    private instances;
    private logger;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): ProviderFactory;
    /**
     * Register a new provider
     */
    registerProvider(registration: ProviderRegistration): void;
    /**
     * Create a provider instance
     */
    createProvider(provider: PipelineProvider, config: ProviderConfig, instanceId?: string): BaseCICDProvider;
    /**
     * Get cached provider instance
     */
    getInstance(instanceId: string): BaseCICDProvider | undefined;
    /**
     * Remove cached instance
     */
    removeInstance(instanceId: string): boolean;
    /**
     * Get all registered providers
     */
    getRegisteredProviders(): PipelineProvider[];
    /**
     * Get provider registration details
     */
    getProviderInfo(provider: PipelineProvider): ProviderRegistration | undefined;
    /**
     * Validate provider configuration
     */
    validateProviderConfig(provider: PipelineProvider, config: ProviderConfig): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Get provider from configuration
     */
    getProviderFromConfig(configKey: string): BaseCICDProvider | null;
    /**
     * Create provider from environment configuration
     */
    createProviderFromEnv(provider: PipelineProvider): BaseCICDProvider | null;
    /**
     * Get environment configuration for a provider
     */
    private getEnvironmentConfig;
    /**
     * Test all configured providers
     */
    testAllProviders(): Promise<{
        provider: PipelineProvider;
        success: boolean;
        error?: string;
    }[]>;
    /**
     * Register built-in providers
     */
    private registerBuiltInProviders;
    /**
     * Get provider statistics
     */
    getProviderStatistics(): {
        totalProviders: number;
        registeredProviders: PipelineProvider[];
        activeInstances: number;
        instancesPerProvider: Record<string, number>;
    };
    /**
     * Clear all cached instances
     */
    clearInstances(): void;
    /**
     * Health check for all active instances
     */
    healthCheck(): Promise<{
        instanceId: string;
        provider: PipelineProvider;
        healthy: boolean;
        metrics?: any;
        error?: string;
    }[]>;
}
export declare const providerFactory: ProviderFactory;
//# sourceMappingURL=factory.d.ts.map