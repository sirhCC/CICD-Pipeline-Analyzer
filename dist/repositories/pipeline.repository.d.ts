/**
 * Pipeline Repository - Database operations for Pipeline entities
 */
import { BaseRepository, PaginationOptions, PaginationResult } from './base.repository';
import { Pipeline } from '../entities/pipeline.entity';
import { PipelineProvider, PipelineStatus } from '../types';
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
export declare class PipelineRepository extends BaseRepository<Pipeline> {
    constructor();
    /**
     * Find pipeline by provider and external ID
     */
    findByProviderAndExternalId(provider: PipelineProvider, externalId: string): Promise<Pipeline | null>;
    /**
     * Find pipelines by repository
     */
    findByRepository(repository: string, branch?: string): Promise<Pipeline[]>;
    /**
     * Search pipelines with filters
     */
    searchPipelines(filters: PipelineSearchOptions, pagination?: PaginationOptions): Promise<PaginationResult<Pipeline>>;
    /**
     * Get pipeline statistics
     */
    getPipelineStats(): Promise<PipelineStatsResult>;
    /**
     * Update pipeline statistics
     */
    updatePipelineStats(pipelineId: string, runData: {
        isSuccess: boolean;
        duration?: number;
    }): Promise<void>;
    /**
     * Get trending pipelines (most active)
     */
    getTrendingPipelines(limit?: number): Promise<Pipeline[]>;
    /**
     * Get failing pipelines
     */
    getFailingPipelines(threshold?: number): Promise<Pipeline[]>;
    /**
     * Get pipelines by owner
     */
    findByOwner(owner: string, pagination?: PaginationOptions): Promise<PaginationResult<Pipeline>>;
    /**
     * Get pipelines by organization
     */
    findByOrganization(organization: string, pagination?: PaginationOptions): Promise<PaginationResult<Pipeline>>;
    /**
     * Get recently updated pipelines
     */
    getRecentlyUpdated(hours?: number, limit?: number): Promise<Pipeline[]>;
    /**
     * Toggle pipeline monitoring
     */
    toggleMonitoring(pipelineId: string, isMonitored: boolean): Promise<Pipeline | null>;
    /**
     * Deactivate pipeline
     */
    deactivatePipeline(pipelineId: string): Promise<Pipeline | null>;
    /**
     * Activate pipeline
     */
    activatePipeline(pipelineId: string): Promise<Pipeline | null>;
}
export default PipelineRepository;
//# sourceMappingURL=pipeline.repository.d.ts.map