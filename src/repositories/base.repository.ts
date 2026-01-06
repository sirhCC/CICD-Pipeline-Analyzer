/**
 * Base Repository - Generic repository with common CRUD operations
 */

import type {
  Repository,
  EntityTarget,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
  DeepPartial,
} from 'typeorm';
import { databaseManager } from '@/core/database';
import { Logger } from '@/shared/logger';
import type { BaseEntity } from '@/entities/base.entity';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export abstract class BaseRepository<T extends BaseEntity> {
  protected repository: Repository<T>;
  protected logger: Logger;
  protected entityName: string;

  constructor(entity: EntityTarget<T>) {
    this.repository = databaseManager.getDataSource().getRepository(entity);
    this.entityName = (entity as any).name || 'Unknown';
    this.logger = new Logger(`${this.entityName}Repository`);
  }

  /**
   * Create a new entity
   */
  async create(entityData: DeepPartial<T>): Promise<T> {
    try {
      const entity = this.repository.create(entityData);
      const savedEntity = await this.repository.save(entity);

      this.logger.info(`Created ${this.entityName}`, { id: savedEntity.id });
      return savedEntity;
    } catch (error) {
      this.logger.error(`Failed to create ${this.entityName}`, error, { entityData });
      throw error;
    }
  }

  /**
   * Find entity by ID
   */
  async findById(id: string, options?: FindOneOptions<T>): Promise<T | null> {
    try {
      const entity = await this.repository.findOne({
        where: { id } as FindOptionsWhere<T>,
        ...options,
      });

      if (entity) {
        this.logger.debug(`Found ${this.entityName} by ID`, { id });
      }

      return entity;
    } catch (error) {
      this.logger.error(`Failed to find ${this.entityName} by ID`, error, { id });
      throw error;
    }
  }

  /**
   * Find entity by criteria
   */
  async findOne(
    where: FindOptionsWhere<T>,
    options?: Omit<FindOneOptions<T>, 'where'>
  ): Promise<T | null> {
    try {
      const entity = await this.repository.findOne({
        where,
        ...options,
      });

      return entity;
    } catch (error) {
      this.logger.error(`Failed to find ${this.entityName}`, error, { where });
      throw error;
    }
  }

  /**
   * Find multiple entities
   */
  async findMany(options?: FindManyOptions<T>): Promise<T[]> {
    try {
      const entities = await this.repository.find(options);

      this.logger.debug(`Found ${entities.length} ${this.entityName} entities`);
      return entities;
    } catch (error) {
      this.logger.error(`Failed to find ${this.entityName} entities`, error, { options });
      throw error;
    }
  }

  /**
   * Find with pagination
   */
  async findWithPagination(
    where?: FindOptionsWhere<T>,
    paginationOptions?: PaginationOptions,
    findOptions?: Omit<FindManyOptions<T>, 'where' | 'take' | 'skip' | 'order'>
  ): Promise<PaginationResult<T>> {
    try {
      const page = paginationOptions?.page || 1;
      const limit = Math.min(paginationOptions?.limit || 20, 100); // Max 100 items per page
      const skip = (page - 1) * limit;

      const order: any = {};
      if (paginationOptions?.sortBy) {
        order[paginationOptions.sortBy] = paginationOptions.sortOrder || 'ASC';
      } else {
        order['createdAt'] = 'DESC'; // Default sort by creation date
      }

      const queryOptions: any = {
        take: limit,
        skip,
        order,
        ...findOptions,
      };

      if (where) {
        queryOptions.where = where;
      }

      const [data, total] = await this.repository.findAndCount(queryOptions);

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };
    } catch (error) {
      this.logger.error(`Failed to find ${this.entityName} with pagination`, error, {
        where,
        paginationOptions,
      });
      throw error;
    }
  }

  /**
   * Update entity by ID
   */
  async updateById(id: string, updateData: DeepPartial<T>): Promise<T | null> {
    try {
      await this.repository.update(id, updateData as any);
      const updatedEntity = await this.findById(id);

      if (updatedEntity) {
        this.logger.info(`Updated ${this.entityName}`, { id, updateData });
      }

      return updatedEntity;
    } catch (error) {
      this.logger.error(`Failed to update ${this.entityName}`, error, { id, updateData });
      throw error;
    }
  }

  /**
   * Update multiple entities
   */
  async updateMany(where: FindOptionsWhere<T>, updateData: DeepPartial<T>): Promise<number> {
    try {
      const result = await this.repository.update(where, updateData as any);
      const affectedRows = result.affected || 0;

      this.logger.info(`Updated ${affectedRows} ${this.entityName} entities`, {
        where,
        updateData,
      });
      return affectedRows;
    } catch (error) {
      this.logger.error(`Failed to update ${this.entityName} entities`, error, {
        where,
        updateData,
      });
      throw error;
    }
  }

  /**
   * Soft delete entity by ID
   */
  async softDeleteById(id: string): Promise<boolean> {
    try {
      const entity = await this.findById(id);
      if (!entity) {
        return false;
      }

      entity.softDelete();
      await this.repository.save(entity);

      this.logger.info(`Soft deleted ${this.entityName}`, { id });
      return true;
    } catch (error) {
      this.logger.error(`Failed to soft delete ${this.entityName}`, error, { id });
      throw error;
    }
  }

  /**
   * Hard delete entity by ID
   */
  async deleteById(id: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);
      const deleted = (result.affected || 0) > 0;

      if (deleted) {
        this.logger.info(`Hard deleted ${this.entityName}`, { id });
      }

      return deleted;
    } catch (error) {
      this.logger.error(`Failed to hard delete ${this.entityName}`, error, { id });
      throw error;
    }
  }

  /**
   * Count entities
   */
  async count(where?: FindOptionsWhere<T>): Promise<number> {
    try {
      const options: any = {};
      if (where) {
        options.where = where;
      }
      const count = await this.repository.count(options);
      return count;
    } catch (error) {
      this.logger.error(`Failed to count ${this.entityName}`, error, { where });
      throw error;
    }
  }

  /**
   * Check if entity exists
   */
  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    try {
      const count = await this.repository.count({ where });
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check if ${this.entityName} exists`, error, { where });
      throw error;
    }
  }

  /**
   * Save entity (create or update)
   */
  async save(entity: T): Promise<T> {
    try {
      const savedEntity = await this.repository.save(entity);
      this.logger.info(`Saved ${this.entityName}`, { id: savedEntity.id });
      return savedEntity;
    } catch (error) {
      this.logger.error(`Failed to save ${this.entityName}`, error, { entityId: entity.id });
      throw error;
    }
  }

  /**
   * Execute raw query
   */
  async query<R = any>(sql: string, parameters?: any[]): Promise<R> {
    try {
      return await databaseManager.query<R>(sql, parameters);
    } catch (error) {
      this.logger.error(`Failed to execute raw query`, error, { sql, parameters });
      throw error;
    }
  }

  /**
   * Get repository statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    deleted: number;
    recentlyCreated: number;
    recentlyUpdated: number;
  }> {
    try {
      const total = await this.count();
      const active = await this.count({ isDeleted: false } as FindOptionsWhere<T>);
      const deleted = await this.count({ isDeleted: true } as FindOptionsWhere<T>);

      // Recent items (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [recentlyCreated, recentlyUpdated] = await Promise.all([
        this.repository.count({
          where: {
            createdAt: { $gte: yesterday } as any,
          } as FindOptionsWhere<T>,
        }),
        this.repository.count({
          where: {
            updatedAt: { $gte: yesterday } as any,
          } as FindOptionsWhere<T>,
        }),
      ]);

      return {
        total,
        active,
        deleted,
        recentlyCreated,
        recentlyUpdated,
      };
    } catch (error) {
      this.logger.error(`Failed to get ${this.entityName} stats`, error);
      throw error;
    }
  }
}

export default BaseRepository;
