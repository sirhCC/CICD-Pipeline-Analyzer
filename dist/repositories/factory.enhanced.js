"use strict";
/**
 * Enhanced Repository Factory with Connection Management
 * Provides centralized repository creation and management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPipelineRunRepository = exports.getPipelineRepository = exports.getUserRepository = exports.repositoryFactory = exports.EnhancedRepositoryFactory = void 0;
const database_1 = require("../core/database");
const database_monitor_1 = require("../core/database-monitor");
const logger_1 = require("../shared/logger");
// Import repositories
const user_repository_1 = require("./user.repository");
const pipeline_repository_1 = require("./pipeline.repository");
const pipeline_run_repository_1 = require("./pipeline-run.repository");
class EnhancedRepositoryFactory {
    static instance;
    repositories = new Map();
    customRepositories = new Map();
    logger;
    constructor() {
        this.logger = new logger_1.Logger('RepositoryFactory');
    }
    static getInstance() {
        if (!EnhancedRepositoryFactory.instance) {
            EnhancedRepositoryFactory.instance = new EnhancedRepositoryFactory();
        }
        return EnhancedRepositoryFactory.instance;
    }
    /**
     * Get typed repository instance
     */
    getRepository(entityClass) {
        const entityName = this.getEntityName(entityClass);
        if (!this.repositories.has(entityName)) {
            const dataSource = database_1.databaseManager.getDataSource();
            const repository = dataSource.getRepository(entityClass);
            this.repositories.set(entityName, repository);
            this.logger.debug(`Created repository for ${entityName}`);
        }
        return this.repositories.get(entityName);
    }
    /**
     * Get user repository
     */
    getUserRepository() {
        const key = 'UserRepository';
        if (!this.customRepositories.has(key)) {
            const repository = new user_repository_1.UserRepository();
            this.customRepositories.set(key, repository);
            this.logger.debug(`Created ${key}`);
        }
        return this.customRepositories.get(key);
    }
    /**
     * Get pipeline repository
     */
    getPipelineRepository() {
        const key = 'PipelineRepository';
        if (!this.customRepositories.has(key)) {
            const repository = new pipeline_repository_1.PipelineRepository();
            this.customRepositories.set(key, repository);
            this.logger.debug(`Created ${key}`);
        }
        return this.customRepositories.get(key);
    }
    /**
     * Get pipeline run repository
     */
    getPipelineRunRepository() {
        const key = 'PipelineRunRepository';
        if (!this.customRepositories.has(key)) {
            const repository = new pipeline_run_repository_1.PipelineRunRepository();
            this.customRepositories.set(key, repository);
            this.logger.debug(`Created ${key}`);
        }
        return this.customRepositories.get(key);
    }
    /**
     * Execute repository operation with monitoring
     */
    async executeWithMonitoring(operation, operationName) {
        const startTime = Date.now();
        let isError = false;
        try {
            this.logger.debug(`Starting repository operation: ${operationName}`);
            const result = await operation();
            this.logger.debug(`Completed repository operation: ${operationName}`);
            return result;
        }
        catch (error) {
            isError = true;
            this.logger.error(`Repository operation failed: ${operationName}`, error);
            throw error;
        }
        finally {
            const duration = Date.now() - startTime;
            database_monitor_1.databaseConnectionManager.recordQuery(duration, isError);
        }
    }
    /**
     * Execute transaction with monitoring
     */
    async executeTransaction(operation) {
        return this.executeWithMonitoring(() => database_1.databaseManager.transaction(async (manager) => {
            // Create transaction-scoped repositories
            const userRepository = new user_repository_1.UserRepository();
            const pipelineRepository = new pipeline_repository_1.PipelineRepository();
            const pipelineRunRepository = new pipeline_run_repository_1.PipelineRunRepository();
            // Set the transaction manager
            userRepository.manager = manager;
            pipelineRepository.manager = manager;
            pipelineRunRepository.manager = manager;
            return operation({
                userRepository,
                pipelineRepository,
                pipelineRunRepository
            });
        }), 'transaction');
    }
    /**
     * Get entity name from target
     */
    getEntityName(entityClass) {
        if (typeof entityClass === 'string') {
            return entityClass;
        }
        if (typeof entityClass === 'function') {
            return entityClass.name;
        }
        return 'Unknown';
    }
    /**
     * Clear repository cache
     */
    clearCache() {
        this.repositories.clear();
        this.logger.info('Repository cache cleared');
    }
    /**
     * Get repository statistics
     */
    getStats() {
        return {
            cachedRepositories: this.repositories.size,
            repositoryNames: Array.from(this.repositories.keys())
        };
    }
    /**
     * Initialize all repositories
     */
    async initializeRepositories() {
        try {
            this.logger.info('Initializing repositories...');
            // Pre-initialize common repositories
            this.getUserRepository();
            this.getPipelineRepository();
            this.getPipelineRunRepository();
            this.logger.info('Repositories initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize repositories', error);
            throw error;
        }
    }
}
exports.EnhancedRepositoryFactory = EnhancedRepositoryFactory;
// Export singleton instance
exports.repositoryFactory = EnhancedRepositoryFactory.getInstance();
// Export repository getter functions for backward compatibility
// These create repositories on-demand rather than at module import time
const getUserRepository = () => exports.repositoryFactory.getUserRepository();
exports.getUserRepository = getUserRepository;
const getPipelineRepository = () => exports.repositoryFactory.getPipelineRepository();
exports.getPipelineRepository = getPipelineRepository;
const getPipelineRunRepository = () => exports.repositoryFactory.getPipelineRunRepository();
exports.getPipelineRunRepository = getPipelineRunRepository;
//# sourceMappingURL=factory.enhanced.js.map