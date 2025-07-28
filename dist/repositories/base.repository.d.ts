/**
 * Base Repository - Generic repository with common CRUD operations
 */
import { Repository, EntityTarget, FindOptionsWhere, FindManyOptions, FindOneOptions, DeepPartial } from 'typeorm';
import { Logger } from '@/shared/logger';
import { BaseEntity } from '@/entities/base.entity';
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
export declare abstract class BaseRepository<T extends BaseEntity> {
    protected repository: Repository<T>;
    protected logger: Logger;
    protected entityName: string;
    constructor(entity: EntityTarget<T>);
    /**
     * Create a new entity
     */
    create(entityData: DeepPartial<T>): Promise<T>;
    /**
     * Find entity by ID
     */
    findById(id: string, options?: FindOneOptions<T>): Promise<T | null>;
    /**
     * Find entity by criteria
     */
    findOne(where: FindOptionsWhere<T>, options?: Omit<FindOneOptions<T>, 'where'>): Promise<T | null>;
    /**
     * Find multiple entities
     */
    findMany(options?: FindManyOptions<T>): Promise<T[]>;
    /**
     * Find with pagination
     */
    findWithPagination(where?: FindOptionsWhere<T>, paginationOptions?: PaginationOptions, findOptions?: Omit<FindManyOptions<T>, 'where' | 'take' | 'skip' | 'order'>): Promise<PaginationResult<T>>;
    /**
     * Update entity by ID
     */
    updateById(id: string, updateData: DeepPartial<T>): Promise<T | null>;
    /**
     * Update multiple entities
     */
    updateMany(where: FindOptionsWhere<T>, updateData: DeepPartial<T>): Promise<number>;
    /**
     * Soft delete entity by ID
     */
    softDeleteById(id: string): Promise<boolean>;
    /**
     * Hard delete entity by ID
     */
    deleteById(id: string): Promise<boolean>;
    /**
     * Count entities
     */
    count(where?: FindOptionsWhere<T>): Promise<number>;
    /**
     * Check if entity exists
     */
    exists(where: FindOptionsWhere<T>): Promise<boolean>;
    /**
     * Save entity (create or update)
     */
    save(entity: T): Promise<T>;
    /**
     * Execute raw query
     */
    query<R = any>(sql: string, parameters?: any[]): Promise<R>;
    /**
     * Get repository statistics
     */
    getStats(): Promise<{
        total: number;
        active: number;
        deleted: number;
        recentlyCreated: number;
        recentlyUpdated: number;
    }>;
}
export default BaseRepository;
//# sourceMappingURL=base.repository.d.ts.map