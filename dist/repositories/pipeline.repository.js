"use strict";
/**
 * Pipeline Repository - Database operations for Pipeline entities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineRepository = void 0;
const base_repository_1 = require("./base.repository");
const pipeline_entity_1 = require("../entities/pipeline.entity");
class PipelineRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(pipeline_entity_1.Pipeline);
    }
    /**
     * Find pipeline by provider and external ID
     */
    async findByProviderAndExternalId(provider, externalId) {
        return this.findOne({
            provider,
            externalId
        });
    }
    /**
     * Find pipelines by repository
     */
    async findByRepository(repository, branch) {
        const where = { repository };
        if (branch) {
            where.branch = branch;
        }
        return this.findMany({ where });
    }
    /**
     * Search pipelines with filters
     */
    async searchPipelines(filters, pagination) {
        const where = {};
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
            relations: ['runs']
        });
    }
    /**
     * Get pipeline statistics
     */
    async getPipelineStats() {
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
            this.query(byStatusSql)
        ]);
        const general = generalStats[0] || {};
        const byProvider = {};
        providerStats.forEach((row) => {
            byProvider[row.provider] = parseInt(row.count, 10);
        });
        const byStatus = {};
        statusStats.forEach((row) => {
            byStatus[row.status] = parseInt(row.count, 10);
        });
        return {
            total: parseInt(general.total || '0', 10),
            byProvider: byProvider,
            byStatus: byStatus,
            totalRuns: parseInt(general.total_runs || '0', 10),
            averageSuccessRate: parseFloat(general.average_success_rate || '0'),
            activePipelines: parseInt(general.active_pipelines || '0', 10),
            monitoredPipelines: parseInt(general.monitored_pipelines || '0', 10)
        };
    }
    /**
     * Update pipeline statistics
     */
    async updatePipelineStats(pipelineId, runData) {
        const pipeline = await this.findById(pipelineId);
        if (!pipeline) {
            throw new Error(`Pipeline not found: ${pipelineId}`);
        }
        // Update run counts
        pipeline.totalRuns += 1;
        if (runData.isSuccess) {
            pipeline.successfulRuns += 1;
            pipeline.lastSuccessAt = new Date();
        }
        else {
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
    async getTrendingPipelines(limit = 10) {
        return this.findMany({
            where: { isActive: true },
            order: { totalRuns: 'DESC' },
            take: limit
        });
    }
    /**
     * Get failing pipelines
     */
    async getFailingPipelines(threshold = 80) {
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
    async findByOwner(owner, pagination) {
        return this.findWithPagination({ owner, isActive: true }, pagination);
    }
    /**
     * Get pipelines by organization
     */
    async findByOrganization(organization, pagination) {
        return this.findWithPagination({ organization, isActive: true }, pagination);
    }
    /**
     * Get recently updated pipelines
     */
    async getRecentlyUpdated(hours = 24, limit = 50) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        return this.findMany({
            where: {
                lastRunAt: { $gte: since },
                isActive: true
            },
            order: { lastRunAt: 'DESC' },
            take: limit
        });
    }
    /**
     * Toggle pipeline monitoring
     */
    async toggleMonitoring(pipelineId, isMonitored) {
        return this.updateById(pipelineId, { isMonitored });
    }
    /**
     * Deactivate pipeline
     */
    async deactivatePipeline(pipelineId) {
        return this.updateById(pipelineId, { isActive: false });
    }
    /**
     * Activate pipeline
     */
    async activatePipeline(pipelineId) {
        return this.updateById(pipelineId, { isActive: true });
    }
}
exports.PipelineRepository = PipelineRepository;
exports.default = PipelineRepository;
//# sourceMappingURL=pipeline.repository.js.map