/**
 * Statistical Cache Entity - Phase 3 Performance Optimization
 * Caches frequently accessed statistical computations and benchmark data
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum CacheType {
  BENCHMARK_DATA = 'benchmark_data',
  AGGREGATED_METRICS = 'aggregated_metrics',
  HISTORICAL_STATS = 'historical_stats',
  BASELINE_VALUES = 'baseline_values',
  THRESHOLD_CONFIG = 'threshold_config'
}

@Entity('statistical_cache')
@Index(['cacheKey'])
@Index(['cacheType', 'expiresAt'])
@Index(['pipelineId', 'cacheType'])
export class StatisticalCache {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  cacheKey!: string; // Unique cache identifier

  @Column({
    type: 'enum',
    enum: CacheType
  })
  cacheType!: CacheType;

  @Column({ type: 'uuid', nullable: true })
  pipelineId?: string; // Pipeline-specific cache

  @Column({ type: 'varchar', length: 100, nullable: true })
  metric?: string; // Metric-specific cache

  @Column({ type: 'json' })
  data!: Record<string, unknown>; // Cached data

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>; // Cache metadata

  @Column({ type: 'bigint' })
  size!: number; // Data size in bytes

  @Column({ type: 'int', default: 0 })
  hitCount!: number; // Cache hit counter

  @Column({ type: 'timestamp' })
  expiresAt!: Date; // Cache expiration

  @Column({ type: 'timestamp', nullable: true })
  lastAccessed?: Date; // Last access time

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn() 
  updatedAt!: Date;

  /**
   * Check if cache entry is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Update hit count and last accessed time
   */
  recordHit(): void {
    this.hitCount++;
    this.lastAccessed = new Date();
  }

  /**
   * Generate cache key for specific parameters
   */
  static generateKey(type: CacheType, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${type}:${sortedParams}`;
  }
}
