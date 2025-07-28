/**
 * Pipeline Run Repository - Database operations for Pipeline Run entities
 */
import { BaseRepository, PaginationOptions, PaginationResult } from './base.repository';
import { PipelineRun } from '@/entities/pipeline-run.entity';
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
export declare class PipelineRunRepository extends BaseRepository<PipelineRun> {
    constructor();
    /**
     * Find run by pipeline and run number
     */
    findByPipelineAndRunNumber(pipelineId: string, runNumber: number): Promise<PipelineRun | null>;
    /**
     * Find runs by pipeline
     */
    findByPipeline(pipelineId: string, pagination?: PaginationOptions): Promise<PaginationResult<PipelineRun>>;
    /**
     * Search pipeline runs with filters
     */
    searchRuns(filters: PipelineRunSearchOptions, pagination?: PaginationOptions): Promise<PaginationResult<PipelineRun>>;
    /**
     * Get pipeline run metrics
     */
    getRunMetrics(pipelineId?: string): Promise<PipelineRunMetrics>;
    /**
     * Get recent runs
     */
    getRecentRuns(limit?: number): Promise<PipelineRun[]>;
    /**
     * Get running pipeline runs
     */
    getRunningRuns(): Promise<PipelineRun[]>;
    /**
     * Get failed runs for analysis
     */
    getFailedRuns(since?: Date, limit?: number): Promise<PipelineRun[]>;
    /**
     * Get next run number for a pipeline
     */
    getNextRunNumber(pipelineId: string): Promise<number>;
    /**
     * Create new pipeline run
     */
    createRun(runData: Partial<PipelineRun>): Promise<PipelineRun>;
    /**
     * Update run status and duration
     */
    updateRunStatus(runId: string, status: PipelineStatus, errorMessage?: string): Promise<PipelineRun | null>;
    /**
     * Get average build time by branch
     */
    getAverageBuildTimeByBranch(pipelineId: string): Promise<Record<string, number>>;
    /**
     * Get performance trends over time
     */
    getPerformanceTrends(pipelineId: string, days?: number): Promise<Array<{
        date: string;
        totalRuns: number;
        successfulRuns: number;
        averageDuration: number;
        successRate: number;
    }>>;
    /**
     * Get slowest runs
     */
    getSlowestRuns(limit?: number, pipelineId?: string): Promise<PipelineRun[]>;
    /**
     * Delete old runs (cleanup)
     */
    deleteOldRuns(olderThanDays: number): Promise<number>;
}
export default PipelineRunRepository;
//# sourceMappingURL=pipeline-run.repository.d.ts.map