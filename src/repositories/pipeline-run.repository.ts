/**
 * Pipeline Run Repository - Database operations for Pipeline Run entities
 */

import type { FindOptionsWhere } from 'typeorm';
import { MoreThan, LessThan, Between } from 'typeorm';
import type { PaginationOptions, PaginationResult } from './base.repository';
import { BaseRepository } from './base.repository';
import { PipelineRun, PipelineRunStage } from '@/entities/pipeline-run.entity';
import { PipelineStatus } from '@/types';

export interface PipelineRunSearchOptions {
  pipelineId?: string;
  status?: PipelineStatus;
  branch?: string;
  triggeredBy?: string;
  triggeredEvent?: string;
  commitSha?: string;
  startedAfter?: Date;
  startedBefore?: Date;
  duration?: {
    min?: number;
    max?: number;
  };
}

export interface PipelineRunMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageDuration: number;
  successRate: number;
  averageQueueTime: number;
  runsToday: number;
  runsThisWeek: number;
  runsThisMonth: number;
}

export class PipelineRunRepository extends BaseRepository<PipelineRun> {
  constructor() {
    super(PipelineRun);
  }

  /**
   * Find run by pipeline and run number
   */
  async findByPipelineAndRunNumber(
    pipelineId: string,
    runNumber: number
  ): Promise<PipelineRun | null> {
    return this.findOne(
      {
        pipelineId,
        runNumber,
      },
      {
        relations: ['pipeline', 'stages'],
      }
    );
  }

  /**
   * Find runs by pipeline
   */
  async findByPipeline(
    pipelineId: string,
    pagination?: PaginationOptions
  ): Promise<PaginationResult<PipelineRun>> {
    return this.findWithPagination({ pipelineId }, pagination, { relations: ['stages'] });
  }

  /**
   * Search pipeline runs with filters
   */
  async searchRuns(
    filters: PipelineRunSearchOptions,
    pagination?: PaginationOptions
  ): Promise<PaginationResult<PipelineRun>> {
    const where: FindOptionsWhere<PipelineRun> = {};

    if (filters.pipelineId) {
      where.pipelineId = filters.pipelineId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.branch) {
      where.branch = filters.branch;
    }
    if (filters.triggeredBy) {
      where.triggeredBy = filters.triggeredBy;
    }
    if (filters.triggeredEvent) {
      where.triggeredEvent = filters.triggeredEvent;
    }
    if (filters.commitSha) {
      where.commitSha = filters.commitSha;
    }
    if (filters.startedAfter && filters.startedBefore) {
      where.startedAt = Between(filters.startedAfter, filters.startedBefore) as any;
    } else if (filters.startedAfter) {
      where.startedAt = MoreThan(filters.startedAfter) as any;
    } else if (filters.startedBefore) {
      where.startedAt = LessThan(filters.startedBefore) as any;
    }

    return this.findWithPagination(where, pagination, {
      relations: ['pipeline', 'stages'],
    });
  }

  /**
   * Get pipeline run metrics
   */
  async getRunMetrics(pipelineId?: string): Promise<PipelineRunMetrics> {
    const whereClause = pipelineId ? `WHERE pipeline_id = $1` : '';
    const params = pipelineId ? [pipelineId] : [];

    const sql = `
      SELECT 
        COUNT(*) as total_runs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_runs,
        SUM(CASE WHEN status IN ('failed', 'cancelled', 'timeout') THEN 1 ELSE 0 END) as failed_runs,
        AVG(CASE WHEN duration IS NOT NULL THEN duration ELSE 0 END) as average_duration,
        AVG(CASE 
          WHEN started_at IS NOT NULL AND queued_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (started_at - queued_at))
          ELSE 0 
        END) as average_queue_time,
        SUM(CASE WHEN created_at >= CURRENT_DATE THEN 1 ELSE 0 END) as runs_today,
        SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 ELSE 0 END) as runs_this_week,
        SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 ELSE 0 END) as runs_this_month
      FROM pipeline_runs 
      ${whereClause}
      AND is_deleted = false
    `;

    const result = await this.query(sql, params);
    const metrics = result[0] || {};

    const totalRuns = parseInt(metrics.total_runs || '0', 10);
    const successfulRuns = parseInt(metrics.successful_runs || '0', 10);
    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

    return {
      totalRuns,
      successfulRuns,
      failedRuns: parseInt(metrics.failed_runs || '0', 10),
      averageDuration: parseFloat(metrics.average_duration || '0'),
      successRate,
      averageQueueTime: parseFloat(metrics.average_queue_time || '0'),
      runsToday: parseInt(metrics.runs_today || '0', 10),
      runsThisWeek: parseInt(metrics.runs_this_week || '0', 10),
      runsThisMonth: parseInt(metrics.runs_this_month || '0', 10),
    };
  }

  /**
   * Get recent runs
   */
  async getRecentRuns(limit: number = 50): Promise<PipelineRun[]> {
    return this.findMany({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['pipeline'],
    });
  }

  /**
   * Get running pipeline runs
   */
  async getRunningRuns(): Promise<PipelineRun[]> {
    return this.findMany({
      where: {
        status: PipelineStatus.RUNNING,
      },
      relations: ['pipeline', 'stages'],
    });
  }

  /**
   * Get failed runs for analysis
   */
  async getFailedRuns(since?: Date, limit: number = 100): Promise<PipelineRun[]> {
    const where: FindOptionsWhere<PipelineRun> = {
      status: PipelineStatus.FAILED,
    };

    if (since) {
      where.completedAt = MoreThan(since) as any;
    }

    return this.findMany({
      where,
      order: { completedAt: 'DESC' },
      take: limit,
      relations: ['pipeline', 'stages'],
    });
  }

  /**
   * Get next run number for a pipeline
   */
  async getNextRunNumber(pipelineId: string): Promise<number> {
    const sql = `
      SELECT COALESCE(MAX(run_number), 0) + 1 as next_run_number
      FROM pipeline_runs 
      WHERE pipeline_id = $1
    `;

    const result = await this.query(sql, [pipelineId]);
    return result[0]?.next_run_number || 1;
  }

  /**
   * Create new pipeline run
   */
  async createRun(runData: Partial<PipelineRun>): Promise<PipelineRun> {
    if (!runData.pipelineId) {
      throw new Error('Pipeline ID is required');
    }

    // Get next run number
    if (!runData.runNumber) {
      runData.runNumber = await this.getNextRunNumber(runData.pipelineId);
    }

    return this.create(runData);
  }

  /**
   * Update run status and duration
   */
  async updateRunStatus(
    runId: string,
    status: PipelineStatus,
    errorMessage?: string
  ): Promise<PipelineRun | null> {
    const run = await this.findById(runId);
    if (!run) {
      return null;
    }

    run.status = status;

    if (status === PipelineStatus.RUNNING && !run.startedAt) {
      run.markStarted();
    } else if (
      [
        PipelineStatus.SUCCESS,
        PipelineStatus.FAILED,
        PipelineStatus.CANCELLED,
        PipelineStatus.TIMEOUT,
      ].includes(status)
    ) {
      run.markCompleted(status, status === PipelineStatus.SUCCESS ? 0 : 1, errorMessage);
    }

    return this.save(run);
  }

  /**
   * Get average build time by branch
   */
  async getAverageBuildTimeByBranch(pipelineId: string): Promise<Record<string, number>> {
    const sql = `
      SELECT 
        branch,
        AVG(duration) as average_duration
      FROM pipeline_runs 
      WHERE pipeline_id = $1 
        AND status = 'success'
        AND duration IS NOT NULL
        AND is_deleted = false
      GROUP BY branch
      ORDER BY average_duration DESC
    `;

    const results = await this.query(sql, [pipelineId]);
    const buildTimes: Record<string, number> = {};

    results.forEach((row: any) => {
      buildTimes[row.branch] = parseFloat(row.average_duration);
    });

    return buildTimes;
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(
    pipelineId: string,
    days: number = 30
  ): Promise<
    Array<{
      date: string;
      totalRuns: number;
      successfulRuns: number;
      averageDuration: number;
      successRate: number;
    }>
  > {
    const sql = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_runs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_runs,
        AVG(CASE WHEN duration IS NOT NULL THEN duration ELSE 0 END) as average_duration
      FROM pipeline_runs 
      WHERE pipeline_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND is_deleted = false
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const results = await this.query(sql, [pipelineId]);

    return results.map((row: any) => ({
      date: row.date,
      totalRuns: parseInt(row.total_runs, 10),
      successfulRuns: parseInt(row.successful_runs, 10),
      averageDuration: parseFloat(row.average_duration),
      successRate: row.total_runs > 0 ? (row.successful_runs / row.total_runs) * 100 : 0,
    }));
  }

  /**
   * Get slowest runs
   */
  async getSlowestRuns(limit: number = 10, pipelineId?: string): Promise<PipelineRun[]> {
    const where: FindOptionsWhere<PipelineRun> = {
      status: PipelineStatus.SUCCESS,
    };

    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    return this.findMany({
      where,
      order: { duration: 'DESC' },
      take: limit,
      relations: ['pipeline'],
    });
  }

  /**
   * Delete old runs (cleanup)
   */
  async deleteOldRuns(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.info(`Deleted ${result.affected} old pipeline runs`, {
      olderThanDays,
      cutoffDate,
    });

    return result.affected || 0;
  }
}

export default PipelineRunRepository;
