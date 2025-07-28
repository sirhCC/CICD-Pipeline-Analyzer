/**
 * Core Module Manager - Enterprise Modular Architecture
 * Manages the lifecycle and dependencies of all modules
 */
import type { Module, ProviderModule, AnalysisModule } from '../types';
export interface ModuleDefinition {
    name: string;
    version: string;
    type: 'provider' | 'analysis' | 'middleware' | 'utility';
    factory: () => Promise<Module>;
    dependencies: string[];
    optional: boolean;
}
export declare class ModuleManager {
    private static instance;
    private modules;
    private moduleDefinitions;
    private dependencyGraph;
    private logger;
    private constructor();
    static getInstance(): ModuleManager;
    /**
     * Register a module definition
     */
    registerModule(definition: ModuleDefinition): void;
    /**
     * Initialize all registered modules in dependency order
     */
    initializeModules(): Promise<void>;
    /**
     * Initialize a specific module
     */
    private initializeModule;
    /**
     * Get a module by name
     */
    getModule<T extends Module>(name: string): T | null;
    /**
     * Get all modules of a specific type
     */
    getModulesByType<T extends Module>(type: string): T[];
    /**
     * Get all provider modules
     */
    getProviderModules(): ProviderModule[];
    /**
     * Get all analysis modules
     */
    getAnalysisModules(): AnalysisModule[];
    /**
     * Check if a module is loaded and enabled
     */
    isModuleEnabled(name: string): boolean;
    /**
     * Enable a module at runtime
     */
    enableModule(name: string): Promise<void>;
    /**
     * Disable a module at runtime
     */
    disableModule(name: string): Promise<void>;
    /**
     * Shutdown all modules gracefully
     */
    shutdown(): Promise<void>;
    /**
     * Shutdown a specific module
     */
    private shutdownModule;
    /**
     * Calculate module initialization order based on dependencies
     */
    private calculateInitializationOrder;
    /**
     * Calculate module shutdown order (reverse of initialization)
     */
    private calculateShutdownOrder;
    /**
     * Check if all dependencies are available
     */
    private checkDependencies;
    /**
     * Validate a module against its definition
     */
    private validateModule;
    /**
     * Get module status and health information
     */
    getModuleStatus(): Record<string, any>;
    /**
     * Reload a module configuration
     */
    reloadModuleConfig(name: string, newConfig: Record<string, unknown>): Promise<void>;
}
export declare const moduleManager: ModuleManager;
//# sourceMappingURL=module-manager.d.ts.map