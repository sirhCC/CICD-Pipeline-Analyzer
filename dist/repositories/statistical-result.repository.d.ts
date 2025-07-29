/**
 * Statistical Result Repository - Phase 3 Data Persistence
 * Handles CRUD operations for statistical analysis results
 */
import { DataSource } from 'typeorm';
import { StatisticalResult, AnalysisType, ResultStatus } from '../entities/statistical-result.entity';
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
export declare class StatisticalResultRepository {
    private repository;
    private logger;
    constructor(dataSource: DataSource);
    /**
     * Create a new statistical result
     */
    create(data: Partial<StatisticalResult>): Promise<StatisticalResult>;
    /**
     * Find by ID
     */
    findById(id: string): Promise<StatisticalResult | null>;
    /**
     * Find all results
     */
    findAll(): Promise<StatisticalResult[]>;
    /**
     * Delete a result
     */
    delete(id: string): Promise<void>;
    /**
     * Find statistical results with advanced filtering
     */
    findWithFilters(filters: StatisticalResultFilter, options?: {
        limit?: number;
        offset?: number;
        orderBy?: 'timestamp' | 'score' | 'executionTime';
        orderDirection?: 'ASC' | 'DESC';
    }): Promise<{
        results: StatisticalResult[];
        total: number;
    }>;
    /**
     * Get statistical results summary
     */
    getSummary(filters?: StatisticalResultFilter): Promise<StatisticalResultSummary>;
    /**
     * Get recent results for a pipeline
     */
    getRecentForPipeline(pipelineId: string, analysisType?: AnalysisType, limit?: number): Promise<StatisticalResult[]>;
    /**
     * Clean up old statistical results
     */
    cleanupOldResults(retentionDays: number): Promise<number>;
}
//# sourceMappingURL=statistical-result.repository.d.ts.map