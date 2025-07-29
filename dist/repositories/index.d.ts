/**
 * Repository Index - Centralized repository exports and factory
 */
export { BaseRepository } from './base.repository';
export { default as PipelineRepository } from './pipeline.repository';
export { default as PipelineRunRepository } from './pipeline-run.repository';
export { default as UserRepository } from './user.repository';
export { StatisticalResultRepository } from './statistical-result.repository';
export { StatisticalCacheRepository } from './statistical-cache.repository';
import PipelineRepository from './pipeline.repository';
import PipelineRunRepository from './pipeline-run.repository';
import UserRepository from './user.repository';
export declare class RepositoryFactory {
    private static pipelineRepository;
    private static pipelineRunRepository;
    private static userRepository;
    static getPipelineRepository(): PipelineRepository;
    static getPipelineRunRepository(): PipelineRunRepository;
    static getUserRepository(): UserRepository;
    /**
     * Reset all repositories (useful for testing)
     */
    static reset(): void;
}
export declare const pipelineRepository: PipelineRepository;
export declare const pipelineRunRepository: PipelineRunRepository;
export declare const userRepository: UserRepository;
//# sourceMappingURL=index.d.ts.map