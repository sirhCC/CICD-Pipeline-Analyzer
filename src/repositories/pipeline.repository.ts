/**
 * Pipeline Repository - Database operations for Pipeline entities
 */

import type { FindOptionsWhere } from 'typeorm';
import type { PaginationOptions, PaginationResult } from './base.repository';
import { BaseRepository } from './base.repository';
import { Pipeline } from '@/entities/pipeline.entity';
import type { PipelineProvider, PipelineStatus } from '@/types';

export interface PipelineSearchOptions {
  provider?: PipelineProvider;
  status?: PipelineStatus;
  repository?: string;
  branch?: string;
  owner?: string;
  organization?: string;
  isActive?: boolean;
  isMonitored?: boolean;
}

export interface PipelineStatsResult {
  total: number;
  byProvider: Record<PipelineProvider, number>;
  byStatus: Record<PipelineStatus, number>;
  totalRuns: number;
  averageSuccessRate: number;
  activePipelines: number;
  monitoredPipelines: number;
}

export class PipelineRepository extends BaseRepository<Pipeline> {
  constructor() {
    super(Pipeline);
  }

  /**
   * Find pipeline by provider and external ID
   */
  async findByProviderAndExternalId(
    provider: PipelineProvider,
    externalId: string
  ): Promise<Pipeline | null> {
    return this.findOne({
      provider,
      externalId,
    });
  }

  /**
   * Find pipelines by repository
   */
  async findByRepository(repository: string, branch?: string): Promise<Pipeline[]> {
    const where: FindOptionsWhere<Pipeline> = { repository };
    if (branch) {
      where.branch = branch;
    }

    return this.findMany({ where });
  }

  /**
   * Search pipelines with filters
   */
  async searchPipelines(
    filters: PipelineSearchOptions,
    pagination?: PaginationOptions
  ): Promise<PaginationResult<Pipeline>> {
    const where: FindOptionsWhere<Pipeline> = {};

    if (filters.provider) {
      where.provider = filters.provider;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.repository) {
      where.repository = filters.repository;
    }
    if (filters.branch) {
      where.branch = filters.branch;
    }
    if (filters.owner) {
      where.owner = filters.owner;
    }
    if (filters.organization) {
      where.organization = filters.organization;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.isMonitored !== undefined) {
      where.isMonitored = filters.isMonitored;
    }

    return this.findWithPagination(where, pagination, {
      relations: ['runs'],
    });
  }

  /**
   * Get pipeline statistics
   */
  async getPipelineStats(): Promise<PipelineStatsResult> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_pipelines,
        SUM(CASE WHEN is_monitored = true THEN 1 ELSE 0 END) as monitored_pipelines,
        SUM(total_runs) as total_runs,
        AVG(success_rate) as average_success_rate
      FROM pipelines 
      WHERE is_deleted = false
    `;

    const byProviderSql = `
      SELECT provider, COUNT(*) as count
      FROM pipelines 
      WHERE is_deleted = false
      GROUP BY provider
    `;

    const byStatusSql = `
      SELECT status, COUNT(*) as count
      FROM pipelines 
      WHERE is_deleted = false
      GROUP BY status
    `;

    const [generalStats, providerStats, statusStats] = await Promise.all([
      this.query(sql),
      this.query(byProviderSql),
      this.query(byStatusSql),
    ]);

    const general = generalStats[0] || {};

    const byProvider: Record<string, number> = {};
    providerStats.forEach((row: any) => {
      byProvider[row.provider] = parseInt(row.count, 10);
    });

    const byStatus: Record<string, number> = {};
    statusStats.forEach((row: any) => {
      byStatus[row.status] = parseInt(row.count, 10);
    });

    return {
      total: parseInt(general.total || '0', 10),
      byProvider: byProvider as Record<PipelineProvider, number>,
      byStatus: byStatus as Record<PipelineStatus, number>,
      totalRuns: parseInt(general.total_runs || '0', 10),
      averageSuccessRate: parseFloat(general.average_success_rate || '0'),
      activePipelines: parseInt(general.active_pipelines || '0', 10),
      monitoredPipelines: parseInt(general.monitored_pipelines || '0', 10),
    };
  }

  /**
   * Update pipeline statistics
   */
  async updatePipelineStats(
    pipelineId: string,
    runData: {
      isSuccess: boolean;
      duration?: number;
    }
  ): Promise<void> {
    const pipeline = await this.findById(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    // Update run counts
    pipeline.totalRuns += 1;
    if (runData.isSuccess) {
      pipeline.successfulRuns += 1;
      pipeline.lastSuccessAt = new Date();
    } else {
      pipeline.failedRuns += 1;
      pipeline.lastFailureAt = new Date();
    }

    // Update success rate
    pipeline.updateSuccessRate();

    // Update average duration if provided
    if (runData.duration !== undefined) {
      pipeline.updateStats(runData.duration);
    }

    pipeline.lastRunAt = new Date();

    await this.save(pipeline);
  }

  /**
   * Get trending pipelines (most active)
   */
  async getTrendingPipelines(limit: number = 10): Promise<Pipeline[]> {
    return this.findMany({
      where: { isActive: true },
      order: { totalRuns: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get failing pipelines
   */
  async getFailingPipelines(threshold: number = 80): Promise<Pipeline[]> {
    const sql = `
      SELECT * FROM pipelines 
      WHERE is_active = true 
        AND is_deleted = false
        AND total_runs > 0
        AND (success_rate IS NULL OR success_rate < $1)
      ORDER BY success_rate ASC, total_runs DESC
    `;

    return this.query(sql, [threshold]);
  }

  /**
   * Get pipelines by owner
   */
  async findByOwner(
    owner: string,
    pagination?: PaginationOptions
  ): Promise<PaginationResult<Pipeline>> {
    return this.findWithPagination({ owner, isActive: true }, pagination);
  }

  /**
   * Get pipelines by organization
   */
  async findByOrganization(
    organization: string,
    pagination?: PaginationOptions
  ): Promise<PaginationResult<Pipeline>> {
    return this.findWithPagination({ organization, isActive: true }, pagination);
  }

  /**
   * Get recently updated pipelines
   */
  async getRecentlyUpdated(hours: number = 24, limit: number = 50): Promise<Pipeline[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.findMany({
      where: {
        lastRunAt: { $gte: since } as any,
        isActive: true,
      },
      order: { lastRunAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Toggle pipeline monitoring
   */
  async toggleMonitoring(pipelineId: string, isMonitored: boolean): Promise<Pipeline | null> {
    return this.updateById(pipelineId, { isMonitored });
  }

  /**
   * Deactivate pipeline
   */
  async deactivatePipeline(pipelineId: string): Promise<Pipeline | null> {
    return this.updateById(pipelineId, { isActive: false });
  }

  /**
   * Activate pipeline
   */
  async activatePipeline(pipelineId: string): Promise<Pipeline | null> {
    return this.updateById(pipelineId, { isActive: true });
  }
}

export default PipelineRepository;
