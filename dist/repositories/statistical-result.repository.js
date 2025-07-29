"use strict";
/**
 * Statistical Result Repository - Phase 3 Data Persistence
 * Handles CRUD operations for statistical analysis results
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticalResultRepository = void 0;
const statistical_result_entity_1 = require("../entities/statistical-result.entity");
const logger_1 = require("../shared/logger");
class StatisticalResultRepository {
    repository;
    logger = new logger_1.Logger('StatisticalResultRepository');
    constructor(dataSource) {
        this.repository = dataSource.getRepository(statistical_result_entity_1.StatisticalResult);
    }
    /**
     * Create a new statistical result
     */
    async create(data) {
        const result = this.repository.create(data);
        return this.repository.save(result);
    }
    /**
     * Find by ID
     */
    async findById(id) {
        return this.repository.findOne({ where: { id }, relations: ['pipeline'] });
    }
    /**
     * Find all results
     */
    async findAll() {
        return this.repository.find({ relations: ['pipeline'] });
    }
    /**
     * Delete a result
     */
    async delete(id) {
        await this.repository.delete(id);
    }
    /**
     * Find statistical results with advanced filtering
     */
    async findWithFilters(filters, options = {}) {
        const queryBuilder = this.repository.createQueryBuilder('sr')
            .leftJoinAndSelect('sr.pipeline', 'pipeline');
        // Apply filters
        if (filters.pipelineId) {
            queryBuilder.andWhere('sr.pipelineId = :pipelineId', { pipelineId: filters.pipelineId });
        }
        if (filters.pipelineIds?.length) {
            queryBuilder.andWhere('sr.pipelineId IN (:...pipelineIds)', { pipelineIds: filters.pipelineIds });
        }
        if (filters.analysisType) {
            queryBuilder.andWhere('sr.analysisType = :analysisType', { analysisType: filters.analysisType });
        }
        if (filters.analysisTypes?.length) {
            queryBuilder.andWhere('sr.analysisType IN (:...analysisTypes)', { analysisTypes: filters.analysisTypes });
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
                endDate: filters.endDate
            });
        }
        else if (filters.startDate) {
            queryBuilder.andWhere('sr.timestamp >= :startDate', { startDate: filters.startDate });
        }
        else if (filters.endDate) {
            queryBuilder.andWhere('sr.timestamp <= :endDate', { endDate: filters.endDate });
        }
        if (filters.minScore !== undefined) {
            queryBuilder.andWhere('sr.score >= :minScore', { minScore: filters.minScore });
        }
        if (filters.maxScore !== undefined) {
            queryBuilder.andWhere('sr.score <= :maxScore', { maxScore: filters.maxScore });
        }
        if (filters.jobExecutionId) {
            queryBuilder.andWhere('sr.jobExecutionId = :jobExecutionId', { jobExecutionId: filters.jobExecutionId });
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
            returned: results.length
        });
        return { results, total };
    }
    /**
     * Get statistical results summary
     */
    async getSummary(filters) {
        const queryBuilder = this.repository.createQueryBuilder('sr');
        // Apply same filters as findWithFilters (simplified)
        if (filters?.pipelineId) {
            queryBuilder.andWhere('sr.pipelineId = :pipelineId', { pipelineId: filters.pipelineId });
        }
        if (filters?.analysisType) {
            queryBuilder.andWhere('sr.analysisType = :analysisType', { analysisType: filters.analysisType });
        }
        if (filters?.startDate && filters?.endDate) {
            queryBuilder.andWhere('sr.timestamp BETWEEN :startDate AND :endDate', {
                startDate: filters.startDate,
                endDate: filters.endDate
            });
        }
        // Get all results for summary calculation
        const results = await queryBuilder.getMany();
        const summary = {
            totalResults: results.length,
            byAnalysisType: {},
            byStatus: {},
            bySeverity: {},
            avgScore: 0,
            avgExecutionTime: 0,
            dateRange: {
                earliest: new Date(),
                latest: new Date()
            }
        };
        if (results.length === 0) {
            return summary;
        }
        // Initialize counters
        Object.values(statistical_result_entity_1.AnalysisType).forEach(type => {
            summary.byAnalysisType[type] = 0;
        });
        Object.values(statistical_result_entity_1.ResultStatus).forEach(status => {
            summary.byStatus[status] = 0;
        });
        let totalScore = 0;
        let scoreCount = 0;
        let totalExecutionTime = 0;
        let executionTimeCount = 0;
        let minDate = results[0].timestamp;
        let maxDate = results[0].timestamp;
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
    async getRecentForPipeline(pipelineId, analysisType, limit = 100) {
        const options = {
            where: { pipelineId },
            order: { timestamp: 'DESC' },
            take: limit,
            relations: ['pipeline']
        };
        if (analysisType) {
            options.where = { ...options.where, analysisType };
        }
        return this.repository.find(options);
    }
    /**
     * Clean up old statistical results
     */
    async cleanupOldResults(retentionDays) {
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
            retentionDays
        });
        return result.affected || 0;
    }
}
exports.StatisticalResultRepository = StatisticalResultRepository;
//# sourceMappingURL=statistical-result.repository.js.map