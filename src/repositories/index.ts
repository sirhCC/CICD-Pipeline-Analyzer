/**
 * Repository Index - Centralized repository exports and factory
 */

export { BaseRepository } from './base.repository';
export { default as PipelineRepository } from './pipeline.repository';
export { default as PipelineRunRepository } from './pipeline-run.repository';
export { default as UserRepository } from './user.repository';

// Statistical Data Persistence Repositories - Phase 3
export { StatisticalResultRepository } from './statistical-result.repository';
export { StatisticalCacheRepository } from './statistical-cache.repository';

import PipelineRepository from './pipeline.repository';
import PipelineRunRepository from './pipeline-run.repository';
import UserRepository from './user.repository';
import { StatisticalResultRepository } from './statistical-result.repository';
import { StatisticalCacheRepository } from './statistical-cache.repository';

// Repository factory for dependency injection
export class RepositoryFactory {
  private static pipelineRepository: PipelineRepository;
  private static pipelineRunRepository: PipelineRunRepository;
  private static userRepository: UserRepository;

  static getPipelineRepository(): PipelineRepository {
    if (!this.pipelineRepository) {
      this.pipelineRepository = new PipelineRepository();
    }
    return this.pipelineRepository;
  }

  static getPipelineRunRepository(): PipelineRunRepository {
    if (!this.pipelineRunRepository) {
      this.pipelineRunRepository = new PipelineRunRepository();
    }
    return this.pipelineRunRepository;
  }

  static getUserRepository(): UserRepository {
    if (!this.userRepository) {
      this.userRepository = new UserRepository();
    }
    return this.userRepository;
  }

  /**
   * Reset all repositories (useful for testing)
   */
  static reset(): void {
    this.pipelineRepository = null as any;
    this.pipelineRunRepository = null as any;
    this.userRepository = null as any;
  }
}

// Lazy convenience exports using getters
export const pipelineRepository = new Proxy({} as PipelineRepository, {
  get(target, prop) {
    return RepositoryFactory.getPipelineRepository()[prop as keyof PipelineRepository];
  }
});

export const pipelineRunRepository = new Proxy({} as PipelineRunRepository, {
  get(target, prop) {
    return RepositoryFactory.getPipelineRunRepository()[prop as keyof PipelineRunRepository];
  }
});

export const userRepository = new Proxy({} as UserRepository, {
  get(target, prop) {
    return RepositoryFactory.getUserRepository()[prop as keyof UserRepository];
  }
});
