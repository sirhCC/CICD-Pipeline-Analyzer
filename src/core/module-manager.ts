/**
 * Core Module Manager - Enterprise Modular Architecture
 * Manages the lifecycle and dependencies of all modules
 */

import type { Module, ProviderModule, AnalysisModule } from '@/types';
import { configManager } from '@/config';
import { Logger } from '@/shared/logger';

export interface ModuleDefinition {
  name: string;
  version: string;
  type: 'provider' | 'analysis' | 'middleware' | 'utility';
  factory: () => Promise<Module>;
  dependencies: string[];
  optional: boolean;
}

export class ModuleManager {
  private static instance: ModuleManager;
  private modules: Map<string, Module> = new Map();
  private moduleDefinitions: Map<string, ModuleDefinition> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('ModuleManager');
  }

  public static getInstance(): ModuleManager {
    if (!ModuleManager.instance) {
      ModuleManager.instance = new ModuleManager();
    }
    return ModuleManager.instance;
  }

  /**
   * Register a module definition
   */
  public registerModule(definition: ModuleDefinition): void {
    this.logger.info(`Registering module: ${definition.name}`);

    this.moduleDefinitions.set(definition.name, definition);
    this.dependencyGraph.set(definition.name, new Set(definition.dependencies));

    this.logger.debug(`Module ${definition.name} registered with dependencies:`, {
      dependencies: definition.dependencies,
    });
  }

  /**
   * Initialize all registered modules in dependency order
   */
  public async initializeModules(): Promise<void> {
    this.logger.info('Initializing modules...');

    const initOrder = this.calculateInitializationOrder();

    for (const moduleName of initOrder) {
      await this.initializeModule(moduleName);
    }

    this.logger.info(`Successfully initialized ${this.modules.size} modules`);
  }

  /**
   * Initialize a specific module
   */
  private async initializeModule(name: string): Promise<void> {
    const definition = this.moduleDefinitions.get(name);
    if (!definition) {
      throw new Error(`Module definition not found: ${name}`);
    }

    if (this.modules.has(name)) {
      this.logger.debug(`Module ${name} already initialized`);
      return;
    }

    try {
      this.logger.info(`Initializing module: ${name}`);

      // Check dependencies
      await this.checkDependencies(name);

      // Initialize the module
      const module = await definition.factory();

      // Validate module
      this.validateModule(module, definition);

      // Store the module
      this.modules.set(name, module);

      this.logger.info(`Successfully initialized module: ${name} v${module.version}`);
    } catch (error) {
      if (definition.optional) {
        this.logger.warn(`Optional module ${name} failed to initialize:`, {
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        this.logger.error(`Critical module ${name} failed to initialize:`, error);
        throw error;
      }
    }
  }

  /**
   * Get a module by name
   */
  public getModule<T extends Module>(name: string): T | null {
    const module = this.modules.get(name);
    return (module as T) || null;
  }

  /**
   * Get all modules of a specific type
   */
  public getModulesByType<T extends Module>(type: string): T[] {
    const modules: T[] = [];

    for (const [name, module] of this.modules) {
      const definition = this.moduleDefinitions.get(name);
      if (definition?.type === type) {
        modules.push(module as T);
      }
    }

    return modules;
  }

  /**
   * Get all provider modules
   */
  public getProviderModules(): ProviderModule[] {
    return this.getModulesByType<ProviderModule>('provider');
  }

  /**
   * Get all analysis modules
   */
  public getAnalysisModules(): AnalysisModule[] {
    return this.getModulesByType<AnalysisModule>('analysis');
  }

  /**
   * Check if a module is loaded and enabled
   */
  public isModuleEnabled(name: string): boolean {
    const module = this.modules.get(name);
    return module?.enabled === true;
  }

  /**
   * Enable a module at runtime
   */
  public async enableModule(name: string): Promise<void> {
    const module = this.modules.get(name);
    if (!module) {
      throw new Error(`Module not found: ${name}`);
    }

    if (module.enabled) {
      this.logger.debug(`Module ${name} is already enabled`);
      return;
    }

    module.enabled = true;
    this.logger.info(`Enabled module: ${name}`);
  }

  /**
   * Disable a module at runtime
   */
  public async disableModule(name: string): Promise<void> {
    const module = this.modules.get(name);
    if (!module) {
      throw new Error(`Module not found: ${name}`);
    }

    if (!module.enabled) {
      this.logger.debug(`Module ${name} is already disabled`);
      return;
    }

    module.enabled = false;
    this.logger.info(`Disabled module: ${name}`);
  }

  /**
   * Shutdown all modules gracefully
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down modules...');

    const shutdownOrder = this.calculateShutdownOrder();

    for (const moduleName of shutdownOrder) {
      await this.shutdownModule(moduleName);
    }

    this.modules.clear();
    this.logger.info('All modules shut down successfully');
  }

  /**
   * Shutdown a specific module
   */
  private async shutdownModule(name: string): Promise<void> {
    const module = this.modules.get(name);
    if (!module) {
      return;
    }

    try {
      this.logger.info(`Shutting down module: ${name}`);

      // Call shutdown hook if available
      if ('shutdown' in module && typeof module.shutdown === 'function') {
        await (module.shutdown as () => Promise<void>)();
      }

      this.modules.delete(name);
      this.logger.info(`Successfully shut down module: ${name}`);
    } catch (error) {
      this.logger.error(`Error shutting down module ${name}:`, error);
    }
  }

  /**
   * Calculate module initialization order based on dependencies
   */
  private calculateInitializationOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (moduleName: string): void => {
      if (visited.has(moduleName)) {
        return;
      }

      if (visiting.has(moduleName)) {
        throw new Error(`Circular dependency detected involving module: ${moduleName}`);
      }

      visiting.add(moduleName);

      const dependencies = this.dependencyGraph.get(moduleName) || new Set();
      for (const dependency of dependencies) {
        if (this.moduleDefinitions.has(dependency)) {
          visit(dependency);
        }
      }

      visiting.delete(moduleName);
      visited.add(moduleName);
      order.push(moduleName);
    };

    for (const moduleName of this.moduleDefinitions.keys()) {
      visit(moduleName);
    }

    return order;
  }

  /**
   * Calculate module shutdown order (reverse of initialization)
   */
  private calculateShutdownOrder(): string[] {
    return this.calculateInitializationOrder().reverse();
  }

  /**
   * Check if all dependencies are available
   */
  private async checkDependencies(moduleName: string): Promise<void> {
    const dependencies = this.dependencyGraph.get(moduleName) || new Set();

    for (const dependency of dependencies) {
      if (!this.modules.has(dependency) && this.moduleDefinitions.has(dependency)) {
        // Try to initialize the dependency first
        await this.initializeModule(dependency);
      }

      if (!this.modules.has(dependency)) {
        const definition = this.moduleDefinitions.get(moduleName);
        if (!definition?.optional) {
          throw new Error(`Missing required dependency: ${dependency} for module: ${moduleName}`);
        }
        this.logger.warn(
          `Optional dependency ${dependency} not available for module: ${moduleName}`
        );
      }
    }
  }

  /**
   * Validate a module against its definition
   */
  private validateModule(module: Module, definition: ModuleDefinition): void {
    if (module.name !== definition.name) {
      throw new Error(`Module name mismatch: expected ${definition.name}, got ${module.name}`);
    }

    if (!module.version) {
      throw new Error(`Module ${module.name} missing version`);
    }

    // Additional type-specific validation
    if (definition.type === 'provider') {
      const providerModule = module as ProviderModule;
      if (!providerModule.provider || !providerModule.supportedFeatures) {
        throw new Error(`Provider module ${module.name} missing required provider fields`);
      }
    }

    if (definition.type === 'analysis') {
      const analysisModule = module as AnalysisModule;
      if (!analysisModule.analysisTypes || !analysisModule.requiredData) {
        throw new Error(`Analysis module ${module.name} missing required analysis fields`);
      }
    }
  }

  /**
   * Get module status and health information
   */
  public getModuleStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    for (const [name, module] of this.modules) {
      const definition = this.moduleDefinitions.get(name);
      status[name] = {
        name: module.name,
        version: module.version,
        type: definition?.type,
        enabled: module.enabled,
        dependencies: Array.from(this.dependencyGraph.get(name) || []),
        config: module.config,
      };
    }

    return status;
  }

  /**
   * Reload a module configuration
   */
  public async reloadModuleConfig(name: string, newConfig: Record<string, unknown>): Promise<void> {
    const module = this.modules.get(name);
    if (!module) {
      throw new Error(`Module not found: ${name}`);
    }

    this.logger.info(`Reloading configuration for module: ${name}`);

    // Update module configuration
    module.config = { ...module.config, ...newConfig };

    // Call reload hook if available
    if ('reload' in module && typeof module.reload === 'function') {
      await (module.reload as (config: Record<string, unknown>) => Promise<void>)(module.config);
    }

    this.logger.info(`Successfully reloaded configuration for module: ${name}`);
  }
}

// Export singleton instance
export const moduleManager = ModuleManager.getInstance();
