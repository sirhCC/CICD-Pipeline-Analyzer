/**
 * Statistical Result Repository - Phase 3 Data Persistence
 * Handles CRUD operations for statistical analysis results
 */

import type { Repository, DataSource, FindManyOptions } from 'typeorm';
import { Between, In } from 'typeorm';
import {
  StatisticalResult,
  AnalysisType,
  ResultStatus,
} from '@/entities/statistical-result.entity';
import { Logger } from '@/shared/logger';

export interface StatisticalResultFilter {
  pipelineId?: string;
  pipelineIds?: string[];
  analysisType?: AnalysisType;
  analysisTypes?: AnalysisType[];
  status?: ResultStatus;
  statuses?: ResultStatus[];
  metric?: string;
  method?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  severities?: ('low' | 'medium' | 'high' | 'critical')[];
  startDate?: Date;
  endDate?: Date;
  minScore?: number;
  maxScore?: number;
  jobExecutionId?: string;
}

export interface StatisticalResultSummary {
  totalResults: number;
  byAnalysisType: Record<AnalysisType, number>;
  byStatus: Record<ResultStatus, number>;
  bySeverity: Record<string, number>;
  avgScore: number;
  avgExecutionTime: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
}

export class StatisticalResultRepository {
  private repository: Repository<StatisticalResult>;
  private logger = new Logger('StatisticalResultRepository');

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(StatisticalResult);
  }

  /**
   * Create a new statistical result
   */
  async create(data: Partial<StatisticalResult>): Promise<StatisticalResult> {
    const result = this.repository.create(data);
    return this.repository.save(result);
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<StatisticalResult | null> {
    return this.repository.findOne({ where: { id }, relations: ['pipeline'] });
  }

  /**
   * Find all results
   */
  async findAll(): Promise<StatisticalResult[]> {
    return this.repository.find({ relations: ['pipeline'] });
  }

  /**
   * Delete a result
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Find statistical results with advanced filtering
   */
  async findWithFilters(
    filters: StatisticalResultFilter,
    options: {
      limit?: number;
      offset?: number;
      orderBy?: 'timestamp' | 'score' | 'executionTime';
      orderDirection?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{ results: StatisticalResult[]; total: number }> {
    const queryBuilder = this.repository
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.pipeline', 'pipeline');

    // Apply filters
    if (filters.pipelineId) {
      queryBuilder.andWhere('sr.pipelineId = :pipelineId', { pipelineId: filters.pipelineId });
    }

    if (filters.pipelineIds?.length) {
      queryBuilder.andWhere('sr.pipelineId IN (:...pipelineIds)', {
        pipelineIds: filters.pipelineIds,
      });
    }

    if (filters.analysisType) {
      queryBuilder.andWhere('sr.analysisType = :analysisType', {
        analysisType: filters.analysisType,
      });
    }

    if (filters.analysisTypes?.length) {
      queryBuilder.andWhere('sr.analysisType IN (:...analysisTypes)', {
        analysisTypes: filters.analysisTypes,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('sr.status = :status', { status: filters.status });
    }

    if (filters.statuses?.length) {
      queryBuilder.andWhere('sr.status IN (:...statuses)', { statuses: filters.statuses });
    }

    if (filters.metric) {
      queryBuilder.andWhere('sr.metric = :metric', { metric: filters.metric });
    }

    if (filters.method) {
      queryBuilder.andWhere('sr.method = :method', { method: filters.method });
    }

    if (filters.severity) {
      queryBuilder.andWhere('sr.severity = :severity', { severity: filters.severity });
    }

    if (filters.severities?.length) {
      queryBuilder.andWhere('sr.severity IN (:...severities)', { severities: filters.severities });
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('sr.timestamp BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      queryBuilder.andWhere('sr.timestamp >= :startDate', { startDate: filters.startDate });
    } else if (filters.endDate) {
      queryBuilder.andWhere('sr.timestamp <= :endDate', { endDate: filters.endDate });
    }

    if (filters.minScore !== undefined) {
      queryBuilder.andWhere('sr.score >= :minScore', { minScore: filters.minScore });
    }

    if (filters.maxScore !== undefined) {
      queryBuilder.andWhere('sr.score <= :maxScore', { maxScore: filters.maxScore });
    }

    if (filters.jobExecutionId) {
      queryBuilder.andWhere('sr.jobExecutionId = :jobExecutionId', {
        jobExecutionId: filters.jobExecutionId,
      });
    }

    // Apply ordering
    const orderBy = options.orderBy || 'timestamp';
    const orderDirection = options.orderDirection || 'DESC';
    queryBuilder.orderBy(`sr.${orderBy}`, orderDirection);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    if (options.limit) {
      queryBuilder.limit(options.limit);
    }
    if (options.offset) {
      queryBuilder.offset(options.offset);
    }

    const results = await queryBuilder.getMany();

    this.logger.info('Statistical results queried', {
      filtersApplied: Object.keys(filters).length,
      totalFound: total,
      returned: results.length,
    });

    return { results, total };
  }

  /**
   * Get statistical results summary
   */
  async getSummary(filters?: StatisticalResultFilter): Promise<StatisticalResultSummary> {
    const queryBuilder = this.repository.createQueryBuilder('sr');

    // Apply same filters as findWithFilters (simplified)
    if (filters?.pipelineId) {
      queryBuilder.andWhere('sr.pipelineId = :pipelineId', { pipelineId: filters.pipelineId });
    }
    if (filters?.analysisType) {
      queryBuilder.andWhere('sr.analysisType = :analysisType', {
        analysisType: filters.analysisType,
      });
    }
    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('sr.timestamp BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    // Get all results for summary calculation
    const results = await queryBuilder.getMany();

    const summary: StatisticalResultSummary = {
      totalResults: results.length,
      byAnalysisType: {} as Record<AnalysisType, number>,
      byStatus: {} as Record<ResultStatus, number>,
      bySeverity: {},
      avgScore: 0,
      avgExecutionTime: 0,
      dateRange: {
        earliest: new Date(),
        latest: new Date(),
      },
    };

    if (results.length === 0) {
      return summary;
    }

    // Initialize counters
    Object.values(AnalysisType).forEach(type => {
      summary.byAnalysisType[type] = 0;
    });
    Object.values(ResultStatus).forEach(status => {
      summary.byStatus[status] = 0;
    });

    let totalScore = 0;
    let scoreCount = 0;
    let totalExecutionTime = 0;
    let executionTimeCount = 0;
    let minDate = results[0]!.timestamp;
    let maxDate = results[0]!.timestamp;

    results.forEach(result => {
      // Count by analysis type
      summary.byAnalysisType[result.analysisType]++;

      // Count by status
      summary.byStatus[result.status]++;

      // Count by severity
      if (result.severity) {
        summary.bySeverity[result.severity] = (summary.bySeverity[result.severity] || 0) + 1;
      }

      // Average score
      if (result.score !== null && result.score !== undefined) {
        totalScore += result.score;
        scoreCount++;
      }

      // Average execution time
      if (result.executionTime !== null && result.executionTime !== undefined) {
        totalExecutionTime += result.executionTime;
        executionTimeCount++;
      }

      // Date range
      if (result.timestamp < minDate) {
        minDate = result.timestamp;
      }
      if (result.timestamp > maxDate) {
        maxDate = result.timestamp;
      }
    });

    summary.avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;
    summary.avgExecutionTime = executionTimeCount > 0 ? totalExecutionTime / executionTimeCount : 0;
    summary.dateRange.earliest = minDate;
    summary.dateRange.latest = maxDate;

    return summary;
  }

  /**
   * Get recent results for a pipeline
   */
  async getRecentForPipeline(
    pipelineId: string,
    analysisType?: AnalysisType,
    limit: number = 100
  ): Promise<StatisticalResult[]> {
    const options: FindManyOptions<StatisticalResult> = {
      where: { pipelineId },
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['pipeline'],
    };

    if (analysisType) {
      options.where = { ...options.where, analysisType };
    }

    return this.repository.find(options);
  }

  /**
   * Clean up old statistical results
   */
  async cleanupOldResults(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('timestamp < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.info('Cleaned up old statistical results', {
      deletedCount: result.affected,
      cutoffDate,
      retentionDays,
    });

    return result.affected || 0;
  }
}
