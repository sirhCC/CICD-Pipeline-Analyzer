"use strict";
/**
 * Core Module Manager - Enterprise Modular Architecture
 * Manages the lifecycle and dependencies of all modules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.moduleManager = exports.ModuleManager = void 0;
const logger_1 = require("@/shared/logger");
class ModuleManager {
    static instance;
    modules = new Map();
    moduleDefinitions = new Map();
    dependencyGraph = new Map();
    logger;
    constructor() {
        this.logger = new logger_1.Logger('ModuleManager');
    }
    static getInstance() {
        if (!ModuleManager.instance) {
            ModuleManager.instance = new ModuleManager();
        }
        return ModuleManager.instance;
    }
    /**
     * Register a module definition
     */
    registerModule(definition) {
        this.logger.info(`Registering module: ${definition.name}`);
        this.moduleDefinitions.set(definition.name, definition);
        this.dependencyGraph.set(definition.name, new Set(definition.dependencies));
        this.logger.debug(`Module ${definition.name} registered with dependencies:`, { dependencies: definition.dependencies });
    }
    /**
     * Initialize all registered modules in dependency order
     */
    async initializeModules() {
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
    async initializeModule(name) {
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
        }
        catch (error) {
            if (definition.optional) {
                this.logger.warn(`Optional module ${name} failed to initialize:`, { error: error instanceof Error ? error.message : String(error) });
            }
            else {
                this.logger.error(`Critical module ${name} failed to initialize:`, error);
                throw error;
            }
        }
    }
    /**
     * Get a module by name
     */
    getModule(name) {
        const module = this.modules.get(name);
        return module || null;
    }
    /**
     * Get all modules of a specific type
     */
    getModulesByType(type) {
        const modules = [];
        for (const [name, module] of this.modules) {
            const definition = this.moduleDefinitions.get(name);
            if (definition?.type === type) {
                modules.push(module);
            }
        }
        return modules;
    }
    /**
     * Get all provider modules
     */
    getProviderModules() {
        return this.getModulesByType('provider');
    }
    /**
     * Get all analysis modules
     */
    getAnalysisModules() {
        return this.getModulesByType('analysis');
    }
    /**
     * Check if a module is loaded and enabled
     */
    isModuleEnabled(name) {
        const module = this.modules.get(name);
        return module?.enabled === true;
    }
    /**
     * Enable a module at runtime
     */
    async enableModule(name) {
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
    async disableModule(name) {
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
    async shutdown() {
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
    async shutdownModule(name) {
        const module = this.modules.get(name);
        if (!module) {
            return;
        }
        try {
            this.logger.info(`Shutting down module: ${name}`);
            // Call shutdown hook if available
            if ('shutdown' in module && typeof module.shutdown === 'function') {
                await module.shutdown();
            }
            this.modules.delete(name);
            this.logger.info(`Successfully shut down module: ${name}`);
        }
        catch (error) {
            this.logger.error(`Error shutting down module ${name}:`, error);
        }
    }
    /**
     * Calculate module initialization order based on dependencies
     */
    calculateInitializationOrder() {
        const visited = new Set();
        const visiting = new Set();
        const order = [];
        const visit = (moduleName) => {
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
    calculateShutdownOrder() {
        return this.calculateInitializationOrder().reverse();
    }
    /**
     * Check if all dependencies are available
     */
    async checkDependencies(moduleName) {
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
                this.logger.warn(`Optional dependency ${dependency} not available for module: ${moduleName}`);
            }
        }
    }
    /**
     * Validate a module against its definition
     */
    validateModule(module, definition) {
        if (module.name !== definition.name) {
            throw new Error(`Module name mismatch: expected ${definition.name}, got ${module.name}`);
        }
        if (!module.version) {
            throw new Error(`Module ${module.name} missing version`);
        }
        // Additional type-specific validation
        if (definition.type === 'provider') {
            const providerModule = module;
            if (!providerModule.provider || !providerModule.supportedFeatures) {
                throw new Error(`Provider module ${module.name} missing required provider fields`);
            }
        }
        if (definition.type === 'analysis') {
            const analysisModule = module;
            if (!analysisModule.analysisTypes || !analysisModule.requiredData) {
                throw new Error(`Analysis module ${module.name} missing required analysis fields`);
            }
        }
    }
    /**
     * Get module status and health information
     */
    getModuleStatus() {
        const status = {};
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
    async reloadModuleConfig(name, newConfig) {
        const module = this.modules.get(name);
        if (!module) {
            throw new Error(`Module not found: ${name}`);
        }
        this.logger.info(`Reloading configuration for module: ${name}`);
        // Update module configuration
        module.config = { ...module.config, ...newConfig };
        // Call reload hook if available
        if ('reload' in module && typeof module.reload === 'function') {
            await module.reload(module.config);
        }
        this.logger.info(`Successfully reloaded configuration for module: ${name}`);
    }
}
exports.ModuleManager = ModuleManager;
// Export singleton instance
exports.moduleManager = ModuleManager.getInstance();
//# sourceMappingURL=module-manager.js.map