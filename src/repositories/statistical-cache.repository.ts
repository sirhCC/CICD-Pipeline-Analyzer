/**
 * Statistical Cache Repository - Phase 3 Performance Optimization
 * Handles cache operations for statistical computations
 */

import type { Repository, DataSource } from 'typeorm';
import { LessThan } from 'typeorm';
import { StatisticalCache, CacheType } from '@/entities/statistical-cache.entity';
import { Logger } from '@/shared/logger';

export class StatisticalCacheRepository {
  private repository: Repository<StatisticalCache>;
  private logger = new Logger('StatisticalCacheRepository');

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(StatisticalCache);
  }

  /**
   * Get cached data by key
   */
  async get(cacheKey: string): Promise<StatisticalCache | null> {
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
  async set(
    cacheKey: string,
    cacheType: CacheType,
    data: Record<string, unknown>,
    expirationMs: number,
    pipelineId?: string,
    metric?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
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
    } else {
      // Create new entry
      const cacheData: any = {
        cacheKey,
        cacheType,
        data,
        size,
        expiresAt,
        hitCount: 0,
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
  async delete(cacheKey: string): Promise<void> {
    await this.repository.delete({ cacheKey });
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });

    const deletedCount = result.affected || 0;
    this.logger.info('Cleaned up expired cache entries', { deletedCount });

    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    totalHits: number;
    byType: Record<CacheType, number>;
    averageHits: number;
  }> {
    const entries = await this.repository.find();

    const stats = {
      totalEntries: entries.length,
      totalSize: entries.reduce((sum, entry) => sum + entry.size, 0),
      totalHits: entries.reduce((sum, entry) => sum + entry.hitCount, 0),
      byType: {} as Record<CacheType, number>,
      averageHits: 0,
    };

    // Initialize type counters
    Object.values(CacheType).forEach(type => {
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
  async clear(): Promise<void> {
    await this.repository.clear();
    this.logger.info('All cache entries cleared');
  }

  /**
   * Clear cache by type
   */
  async clearByType(cacheType: CacheType): Promise<number> {
    const result = await this.repository.delete({ cacheType });
    const deletedCount = result.affected || 0;

    this.logger.info('Cache entries cleared by type', { cacheType, deletedCount });
    return deletedCount;
  }
}
