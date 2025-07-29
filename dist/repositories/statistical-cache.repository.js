"use strict";
/**
 * Statistical Cache Repository - Phase 3 Performance Optimization
 * Handles cache operations for statistical computations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticalCacheRepository = void 0;
const typeorm_1 = require("typeorm");
const statistical_cache_entity_1 = require("../entities/statistical-cache.entity");
const logger_1 = require("../shared/logger");
class StatisticalCacheRepository {
    repository;
    logger = new logger_1.Logger('StatisticalCacheRepository');
    constructor(dataSource) {
        this.repository = dataSource.getRepository(statistical_cache_entity_1.StatisticalCache);
    }
    /**
     * Get cached data by key
     */
    async get(cacheKey) {
        const cache = await this.repository.findOne({ where: { cacheKey } });
        if (!cache) {
            return null;
        }
        if (cache.isExpired()) {
            await this.repository.delete(cache.id);
            return null;
        }
        // Update hit count and last accessed
        cache.recordHit();
        await this.repository.save(cache);
        return cache;
    }
    /**
     * Set cache data
     */
    async set(cacheKey, cacheType, data, expirationMs, pipelineId, metric, metadata) {
        const expiresAt = new Date(Date.now() + expirationMs);
        const size = JSON.stringify(data).length;
        // Check if cache entry already exists
        const existing = await this.repository.findOne({ where: { cacheKey } });
        if (existing) {
            // Update existing entry
            existing.data = data;
            existing.expiresAt = expiresAt;
            existing.size = size;
            if (metadata) {
                existing.metadata = metadata;
            }
            await this.repository.save(existing);
        }
        else {
            // Create new entry
            const cacheData = {
                cacheKey,
                cacheType,
                data,
                size,
                expiresAt,
                hitCount: 0
            };
            if (pipelineId) {
                cacheData.pipelineId = pipelineId;
            }
            if (metric) {
                cacheData.metric = metric;
            }
            if (metadata) {
                cacheData.metadata = metadata;
            }
            const cache = this.repository.create(cacheData);
            await this.repository.save(cache);
        }
    }
    /**
     * Delete cache entry
     */
    async delete(cacheKey) {
        await this.repository.delete({ cacheKey });
    }
    /**
     * Clean up expired cache entries
     */
    async cleanupExpired() {
        const result = await this.repository.delete({
            expiresAt: (0, typeorm_1.LessThan)(new Date())
        });
        const deletedCount = result.affected || 0;
        this.logger.info('Cleaned up expired cache entries', { deletedCount });
        return deletedCount;
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        const entries = await this.repository.find();
        const stats = {
            totalEntries: entries.length,
            totalSize: entries.reduce((sum, entry) => sum + entry.size, 0),
            totalHits: entries.reduce((sum, entry) => sum + entry.hitCount, 0),
            byType: {},
            averageHits: 0
        };
        // Initialize type counters
        Object.values(statistical_cache_entity_1.CacheType).forEach(type => {
            stats.byType[type] = 0;
        });
        // Count by type
        entries.forEach(entry => {
            stats.byType[entry.cacheType]++;
        });
        stats.averageHits = entries.length > 0 ? stats.totalHits / entries.length : 0;
        return stats;
    }
    /**
     * Clear all cache entries
     */
    async clear() {
        await this.repository.clear();
        this.logger.info('All cache entries cleared');
    }
    /**
     * Clear cache by type
     */
    async clearByType(cacheType) {
        const result = await this.repository.delete({ cacheType });
        const deletedCount = result.affected || 0;
        this.logger.info('Cache entries cleared by type', { cacheType, deletedCount });
        return deletedCount;
    }
}
exports.StatisticalCacheRepository = StatisticalCacheRepository;
//# sourceMappingURL=statistical-cache.repository.js.map