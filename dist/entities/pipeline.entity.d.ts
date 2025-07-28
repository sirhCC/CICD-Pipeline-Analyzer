/**
 * Pipeline Entity - Represents a CI/CD pipeline
 */
import { BaseEntity } from './base.entity';
import { PipelineProvider, PipelineStatus, PipelineVisibility } from '../types';
export declare class Pipeline extends BaseEntity {
    name: string;
    description?: string;
    provider: PipelineProvider;
    externalId: string;
    repository: string;
    branch: string;
    status: PipelineStatus;
    visibility: PipelineVisibility;
    owner?: string;
    organization?: string;
    configuration?: Record<string, any>;
    metadata?: Record<string, any>;
    lastRunAt?: Date;
    lastSuccessAt?: Date;
    lastFailureAt?: Date;
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    averageDuration?: number;
    successRate?: number;
    isActive: boolean;
    isMonitored: boolean;
    webhookUrl?: string;
    webhookSecret?: string;
    /**
     * Calculate and update success rate
     */
    updateSuccessRate(): void;
    /**
     * Check if pipeline is healthy (success rate above threshold)
     */
    isHealthy(threshold?: number): boolean;
    /**
     * Get pipeline URL based on provider
     */
    getExternalUrl(): string | null;
    /**
     * Update pipeline statistics
     */
    updateStats(duration?: number): void;
}
export default Pipeline;
//# sourceMappingURL=pipeline.entity.d.ts.map