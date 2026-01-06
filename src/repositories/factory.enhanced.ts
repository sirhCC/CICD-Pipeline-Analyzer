/**
 * Enhanced Repository Factory with Connection Management
 * Provides centralized repository creation and management
 */

import type { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { DataSource } from 'typeorm';
import { databaseManager } from '@/core/database';
import { databaseConnectionManager } from '@/core/database-monitor';
import { Logger } from '@/shared/logger';

// Import repositories
import { UserRepository } from './user.repository';
import { PipelineRepository } from './pipeline.repository';
import { PipelineRunRepository } from './pipeline-run.repository';

// Import entities
import { User } from '@/entities/user.entity';
import { Pipeline } from '@/entities/pipeline.entity';
import { PipelineRun } from '@/entities/pipeline-run.entity';

export class EnhancedRepositoryFactory {
  private static instance: EnhancedRepositoryFactory;
  private repositories = new Map<string, any>();
  private customRepositories = new Map<string, any>();
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('RepositoryFactory');
  }

  public static getInstance(): EnhancedRepositoryFactory {
    if (!EnhancedRepositoryFactory.instance) {
      EnhancedRepositoryFactory.instance = new EnhancedRepositoryFactory();
    }
    return EnhancedRepositoryFactory.instance;
  }

  /**
   * Get typed repository instance
   */
  public getRepository<T extends ObjectLiteral>(entityClass: EntityTarget<T>): Repository<T> {
    const entityName = this.getEntityName(entityClass);

    if (!this.repositories.has(entityName)) {
      const dataSource = databaseManager.getDataSource();
      const repository = dataSource.getRepository(entityClass);
      this.repositories.set(entityName, repository);

      this.logger.debug(`Created repository for ${entityName}`);
    }

    return this.repositories.get(entityName);
  }

  /**
   * Get user repository
   */
  public getUserRepository(): UserRepository {
    const key = 'UserRepository';

    if (!this.customRepositories.has(key)) {
      const repository = new UserRepository();
      this.customRepositories.set(key, repository);
      this.logger.debug(`Created ${key}`);
    }

    return this.customRepositories.get(key);
  }

  /**
   * Get pipeline repository
   */
  public getPipelineRepository(): PipelineRepository {
    const key = 'PipelineRepository';

    if (!this.customRepositories.has(key)) {
      const repository = new PipelineRepository();
      this.customRepositories.set(key, repository);
      this.logger.debug(`Created ${key}`);
    }

    return this.customRepositories.get(key);
  }

  /**
   * Get pipeline run repository
   */
  public getPipelineRunRepository(): PipelineRunRepository {
    const key = 'PipelineRunRepository';

    if (!this.customRepositories.has(key)) {
      const repository = new PipelineRunRepository();
      this.customRepositories.set(key, repository);
      this.logger.debug(`Created ${key}`);
    }

    return this.customRepositories.get(key);
  }

  /**
   * Execute repository operation with monitoring
   */
  public async executeWithMonitoring<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = Date.now();
    let isError = false;

    try {
      this.logger.debug(`Starting repository operation: ${operationName}`);
      const result = await operation();
      this.logger.debug(`Completed repository operation: ${operationName}`);
      return result;
    } catch (error) {
      isError = true;
      this.logger.error(`Repository operation failed: ${operationName}`, error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      databaseConnectionManager.recordQuery(duration, isError);
    }
  }

  /**
   * Execute transaction with monitoring
   */
  public async executeTransaction<T>(
    operation: (repositories: {
      userRepository: UserRepository;
      pipelineRepository: PipelineRepository;
      pipelineRunRepository: PipelineRunRepository;
    }) => Promise<T>
  ): Promise<T> {
    return this.executeWithMonitoring(
      () =>
        databaseManager.transaction(async manager => {
          // Create transaction-scoped repositories
          const userRepository = new UserRepository();
          const pipelineRepository = new PipelineRepository();
          const pipelineRunRepository = new PipelineRunRepository();

          // Set the transaction manager
          (userRepository as any).manager = manager;
          (pipelineRepository as any).manager = manager;
          (pipelineRunRepository as any).manager = manager;

          return operation({
            userRepository,
            pipelineRepository,
            pipelineRunRepository,
          });
        }),
      'transaction'
    );
  }

  /**
   * Get entity name from target
   */
  private getEntityName(entityClass: EntityTarget<any>): string {
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
  public clearCache(): void {
    this.repositories.clear();
    this.logger.info('Repository cache cleared');
  }

  /**
   * Get repository statistics
   */
  public getStats(): {
    cachedRepositories: number;
    repositoryNames: string[];
  } {
    return {
      cachedRepositories: this.repositories.size,
      repositoryNames: Array.from(this.repositories.keys()),
    };
  }

  /**
   * Initialize all repositories
   */
  public async initializeRepositories(): Promise<void> {
    try {
      this.logger.info('Initializing repositories...');

      // Pre-initialize common repositories
      this.getUserRepository();
      this.getPipelineRepository();
      this.getPipelineRunRepository();

      this.logger.info('Repositories initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize repositories', error);
      throw error;
    }
  }
}

// Export singleton instance
export const repositoryFactory = EnhancedRepositoryFactory.getInstance();

// Export repository getter functions for backward compatibility
// These create repositories on-demand rather than at module import time
export const getUserRepository = () => repositoryFactory.getUserRepository();
export const getPipelineRepository = () => repositoryFactory.getPipelineRepository();
export const getPipelineRunRepository = () => repositoryFactory.getPipelineRunRepository();
