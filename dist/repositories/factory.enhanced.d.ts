/**
 * Enhanced Repository Factory with Connection Management
 * Provides centralized repository creation and management
 */
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { UserRepository } from './user.repository';
import { PipelineRepository } from './pipeline.repository';
import { PipelineRunRepository } from './pipeline-run.repository';
export declare class EnhancedRepositoryFactory {
    private static instance;
    private repositories;
    private customRepositories;
    private logger;
    private constructor();
    static getInstance(): EnhancedRepositoryFactory;
    /**
     * Get typed repository instance
     */
    getRepository<T extends ObjectLiteral>(entityClass: EntityTarget<T>): Repository<T>;
    /**
     * Get user repository
     */
    getUserRepository(): UserRepository;
    /**
     * Get pipeline repository
     */
    getPipelineRepository(): PipelineRepository;
    /**
     * Get pipeline run repository
     */
    getPipelineRunRepository(): PipelineRunRepository;
    /**
     * Execute repository operation with monitoring
     */
    executeWithMonitoring<T>(operation: () => Promise<T>, operationName: string): Promise<T>;
    /**
     * Execute transaction with monitoring
     */
    executeTransaction<T>(operation: (repositories: {
        userRepository: UserRepository;
        pipelineRepository: PipelineRepository;
        pipelineRunRepository: PipelineRunRepository;
    }) => Promise<T>): Promise<T>;
    /**
     * Get entity name from target
     */
    private getEntityName;
    /**
     * Clear repository cache
     */
    clearCache(): void;
    /**
     * Get repository statistics
     */
    getStats(): {
        cachedRepositories: number;
        repositoryNames: string[];
    };
    /**
     * Initialize all repositories
     */
    initializeRepositories(): Promise<void>;
}
export declare const repositoryFactory: EnhancedRepositoryFactory;
export declare const userRepository: UserRepository;
export declare const pipelineRepository: PipelineRepository;
export declare const pipelineRunRepository: PipelineRunRepository;
//# sourceMappingURL=factory.enhanced.d.ts.map