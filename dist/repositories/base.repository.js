"use strict";
/**
 * Base Repository - Generic repository with common CRUD operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const database_1 = require("../core/database");
const logger_1 = require("../shared/logger");
class BaseRepository {
    repository;
    logger;
    entityName;
    constructor(entity) {
        this.repository = database_1.databaseManager.getDataSource().getRepository(entity);
        this.entityName = entity.name || 'Unknown';
        this.logger = new logger_1.Logger(`${this.entityName}Repository`);
    }
    /**
     * Create a new entity
     */
    async create(entityData) {
        try {
            const entity = this.repository.create(entityData);
            const savedEntity = await this.repository.save(entity);
            this.logger.info(`Created ${this.entityName}`, { id: savedEntity.id });
            return savedEntity;
        }
        catch (error) {
            this.logger.error(`Failed to create ${this.entityName}`, error, { entityData });
            throw error;
        }
    }
    /**
     * Find entity by ID
     */
    async findById(id, options) {
        try {
            const entity = await this.repository.findOne({
                where: { id },
                ...options
            });
            if (entity) {
                this.logger.debug(`Found ${this.entityName} by ID`, { id });
            }
            return entity;
        }
        catch (error) {
            this.logger.error(`Failed to find ${this.entityName} by ID`, error, { id });
            throw error;
        }
    }
    /**
     * Find entity by criteria
     */
    async findOne(where, options) {
        try {
            const entity = await this.repository.findOne({
                where,
                ...options
            });
            return entity;
        }
        catch (error) {
            this.logger.error(`Failed to find ${this.entityName}`, error, { where });
            throw error;
        }
    }
    /**
     * Find multiple entities
     */
    async findMany(options) {
        try {
            const entities = await this.repository.find(options);
            this.logger.debug(`Found ${entities.length} ${this.entityName} entities`);
            return entities;
        }
        catch (error) {
            this.logger.error(`Failed to find ${this.entityName} entities`, error, { options });
            throw error;
        }
    }
    /**
     * Find with pagination
     */
    async findWithPagination(where, paginationOptions, findOptions) {
        try {
            const page = paginationOptions?.page || 1;
            const limit = Math.min(paginationOptions?.limit || 20, 100); // Max 100 items per page
            const skip = (page - 1) * limit;
            const order = {};
            if (paginationOptions?.sortBy) {
                order[paginationOptions.sortBy] = paginationOptions.sortOrder || 'ASC';
            }
            else {
                order['createdAt'] = 'DESC'; // Default sort by creation date
            }
            const queryOptions = {
                take: limit,
                skip,
                order,
                ...findOptions
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
                hasPrevious: page > 1
            };
        }
        catch (error) {
            this.logger.error(`Failed to find ${this.entityName} with pagination`, error, { where, paginationOptions });
            throw error;
        }
    }
    /**
     * Update entity by ID
     */
    async updateById(id, updateData) {
        try {
            await this.repository.update(id, updateData);
            const updatedEntity = await this.findById(id);
            if (updatedEntity) {
                this.logger.info(`Updated ${this.entityName}`, { id, updateData });
            }
            return updatedEntity;
        }
        catch (error) {
            this.logger.error(`Failed to update ${this.entityName}`, error, { id, updateData });
            throw error;
        }
    }
    /**
     * Update multiple entities
     */
    async updateMany(where, updateData) {
        try {
            const result = await this.repository.update(where, updateData);
            const affectedRows = result.affected || 0;
            this.logger.info(`Updated ${affectedRows} ${this.entityName} entities`, { where, updateData });
            return affectedRows;
        }
        catch (error) {
            this.logger.error(`Failed to update ${this.entityName} entities`, error, { where, updateData });
            throw error;
        }
    }
    /**
     * Soft delete entity by ID
     */
    async softDeleteById(id) {
        try {
            const entity = await this.findById(id);
            if (!entity) {
                return false;
            }
            entity.softDelete();
            await this.repository.save(entity);
            this.logger.info(`Soft deleted ${this.entityName}`, { id });
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to soft delete ${this.entityName}`, error, { id });
            throw error;
        }
    }
    /**
     * Hard delete entity by ID
     */
    async deleteById(id) {
        try {
            const result = await this.repository.delete(id);
            const deleted = (result.affected || 0) > 0;
            if (deleted) {
                this.logger.info(`Hard deleted ${this.entityName}`, { id });
            }
            return deleted;
        }
        catch (error) {
            this.logger.error(`Failed to hard delete ${this.entityName}`, error, { id });
            throw error;
        }
    }
    /**
     * Count entities
     */
    async count(where) {
        try {
            const options = {};
            if (where) {
                options.where = where;
            }
            const count = await this.repository.count(options);
            return count;
        }
        catch (error) {
            this.logger.error(`Failed to count ${this.entityName}`, error, { where });
            throw error;
        }
    }
    /**
     * Check if entity exists
     */
    async exists(where) {
        try {
            const count = await this.repository.count({ where });
            return count > 0;
        }
        catch (error) {
            this.logger.error(`Failed to check if ${this.entityName} exists`, error, { where });
            throw error;
        }
    }
    /**
     * Save entity (create or update)
     */
    async save(entity) {
        try {
            const savedEntity = await this.repository.save(entity);
            this.logger.info(`Saved ${this.entityName}`, { id: savedEntity.id });
            return savedEntity;
        }
        catch (error) {
            this.logger.error(`Failed to save ${this.entityName}`, error, { entityId: entity.id });
            throw error;
        }
    }
    /**
     * Execute raw query
     */
    async query(sql, parameters) {
        try {
            return await database_1.databaseManager.query(sql, parameters);
        }
        catch (error) {
            this.logger.error(`Failed to execute raw query`, error, { sql, parameters });
            throw error;
        }
    }
    /**
     * Get repository statistics
     */
    async getStats() {
        try {
            const total = await this.count();
            const active = await this.count({ isDeleted: false });
            const deleted = await this.count({ isDeleted: true });
            // Recent items (last 24 hours)
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const [recentlyCreated, recentlyUpdated] = await Promise.all([
                this.repository.count({
                    where: {
                        createdAt: { $gte: yesterday }
                    }
                }),
                this.repository.count({
                    where: {
                        updatedAt: { $gte: yesterday }
                    }
                })
            ]);
            return {
                total,
                active,
                deleted,
                recentlyCreated,
                recentlyUpdated
            };
        }
        catch (error) {
            this.logger.error(`Failed to get ${this.entityName} stats`, error);
            throw error;
        }
    }
}
exports.BaseRepository = BaseRepository;
exports.default = BaseRepository;
//# sourceMappingURL=base.repository.js.map