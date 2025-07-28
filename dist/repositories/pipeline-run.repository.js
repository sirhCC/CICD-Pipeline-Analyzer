"use strict";
/**
 * Pipeline Run Repository - Database operations for Pipeline Run entities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineRunRepository = void 0;
const typeorm_1 = require("typeorm");
const base_repository_1 = require("./base.repository");
const pipeline_run_entity_1 = require("../entities/pipeline-run.entity");
const types_1 = require("../types");
class PipelineRunRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(pipeline_run_entity_1.PipelineRun);
    }
    /**
     * Find run by pipeline and run number
     */
    async findByPipelineAndRunNumber(pipelineId, runNumber) {
        return this.findOne({
            pipelineId,
            runNumber
        }, {
            relations: ['pipeline', 'stages']
        });
    }
    /**
     * Find runs by pipeline
     */
    async findByPipeline(pipelineId, pagination) {
        return this.findWithPagination({ pipelineId }, pagination, { relations: ['stages'] });
    }
    /**
     * Search pipeline runs with filters
     */
    async searchRuns(filters, pagination) {
        const where = {};
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
            where.startedAt = (0, typeorm_1.Between)(filters.startedAfter, filters.startedBefore);
        }
        else if (filters.startedAfter) {
            where.startedAt = (0, typeorm_1.MoreThan)(filters.startedAfter);
        }
        else if (filters.startedBefore) {
            where.startedAt = (0, typeorm_1.LessThan)(filters.startedBefore);
        }
        return this.findWithPagination(where, pagination, {
            relations: ['pipeline', 'stages']
        });
    }
    /**
     * Get pipeline run metrics
     */
    async getRunMetrics(pipelineId) {
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
            runsThisMonth: parseInt(metrics.runs_this_month || '0', 10)
        };
    }
    /**
     * Get recent runs
     */
    async getRecentRuns(limit = 50) {
        return this.findMany({
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['pipeline']
        });
    }
    /**
     * Get running pipeline runs
     */
    async getRunningRuns() {
        return this.findMany({
            where: {
                status: types_1.PipelineStatus.RUNNING
            },
            relations: ['pipeline', 'stages']
        });
    }
    /**
     * Get failed runs for analysis
     */
    async getFailedRuns(since, limit = 100) {
        const where = {
            status: types_1.PipelineStatus.FAILED
        };
        if (since) {
            where.completedAt = (0, typeorm_1.MoreThan)(since);
        }
        return this.findMany({
            where,
            order: { completedAt: 'DESC' },
            take: limit,
            relations: ['pipeline', 'stages']
        });
    }
    /**
     * Get next run number for a pipeline
     */
    async getNextRunNumber(pipelineId) {
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
    async createRun(runData) {
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
    async updateRunStatus(runId, status, errorMessage) {
        const run = await this.findById(runId);
        if (!run) {
            return null;
        }
        run.status = status;
        if (status === types_1.PipelineStatus.RUNNING && !run.startedAt) {
            run.markStarted();
        }
        else if ([types_1.PipelineStatus.SUCCESS, types_1.PipelineStatus.FAILED, types_1.PipelineStatus.CANCELLED, types_1.PipelineStatus.TIMEOUT].includes(status)) {
            run.markCompleted(status, status === types_1.PipelineStatus.SUCCESS ? 0 : 1, errorMessage);
        }
        return this.save(run);
    }
    /**
     * Get average build time by branch
     */
    async getAverageBuildTimeByBranch(pipelineId) {
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
        const buildTimes = {};
        results.forEach((row) => {
            buildTimes[row.branch] = parseFloat(row.average_duration);
        });
        return buildTimes;
    }
    /**
     * Get performance trends over time
     */
    async getPerformanceTrends(pipelineId, days = 30) {
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
        return results.map((row) => ({
            date: row.date,
            totalRuns: parseInt(row.total_runs, 10),
            successfulRuns: parseInt(row.successful_runs, 10),
            averageDuration: parseFloat(row.average_duration),
            successRate: row.total_runs > 0 ? (row.successful_runs / row.total_runs) * 100 : 0
        }));
    }
    /**
     * Get slowest runs
     */
    async getSlowestRuns(limit = 10, pipelineId) {
        const where = {
            status: types_1.PipelineStatus.SUCCESS
        };
        if (pipelineId) {
            where.pipelineId = pipelineId;
        }
        return this.findMany({
            where,
            order: { duration: 'DESC' },
            take: limit,
            relations: ['pipeline']
        });
    }
    /**
     * Delete old runs (cleanup)
     */
    async deleteOldRuns(olderThanDays) {
        const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
        const result = await this.repository
            .createQueryBuilder()
            .delete()
            .where('created_at < :cutoffDate', { cutoffDate })
            .execute();
        this.logger.info(`Deleted ${result.affected} old pipeline runs`, {
            olderThanDays,
            cutoffDate
        });
        return result.affected || 0;
    }
}
exports.PipelineRunRepository = PipelineRunRepository;
exports.default = PipelineRunRepository;
//# sourceMappingURL=pipeline-run.repository.js.map