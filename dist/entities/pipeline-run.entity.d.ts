/**
 * Pipeline Run Entity - Represents individual pipeline executions
 */
import { BaseEntity } from './base.entity';
import { Pipeline } from './pipeline.entity';
import { PipelineStatus } from '../types';
/**
 * Pipeline Run Stage Entity for detailed stage tracking
 */
export declare class PipelineRunStage extends BaseEntity {
    name: string;
    description?: string;
    status: PipelineStatus;
    startedAt?: Date;
    completedAt?: Date;
    duration?: number;
    exitCode: number;
    logs?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
    resources?: Record<string, any>;
    artifacts?: Record<string, any>;
    runId: string;
    run: any;
    /**
     * Calculate stage duration
     */
    calculateDuration(): number;
    /**
     * Check if stage is successful
     */
    isSuccessful(): boolean;
    /**
     * Check if stage failed
     */
    isFailed(): boolean;
}
/**
 * Pipeline Run Entity for tracking individual executions
 */
export declare class PipelineRun extends BaseEntity {
    runNumber: number;
    branch: string;
    tag?: string;
    commitSha: string;
    commitMessage?: string;
    commitAuthor?: string;
    status: PipelineStatus;
    triggeredBy: string;
    triggeredEvent?: string;
    queuedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    duration?: number;
    exitCode: number;
    errorMessage?: string;
    environment?: Record<string, any>;
    variables?: Record<string, any>;
    artifacts?: Array<{
        name: string;
        url: string;
        size: number;
        type: string;
    }>;
    testResults?: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        coverage?: number;
    };
    resources?: {
        maxCpu?: number;
        maxMemory?: number;
        totalCpuTime?: number;
        networkIO?: number;
        diskIO?: number;
    };
    metadata?: Record<string, any>;
    externalUrl?: string;
    rawData?: string;
    pipelineId: string;
    pipeline: Pipeline;
    stages: any[];
    /**
     * Calculate run duration
     */
    calculateDuration(): number;
    /**
     * Calculate queue time
     */
    calculateQueueTime(): number;
    /**
     * Check if run is successful
     */
    isSuccessful(): boolean;
    /**
     * Check if run failed
     */
    isFailed(): boolean;
    /**
     * Check if run is in progress
     */
    isInProgress(): boolean;
    /**
     * Get success rate for test results
     */
    getTestSuccessRate(): number;
    /**
     * Update run statistics
     */
    updateDuration(): void;
    /**
     * Mark as completed
     */
    markCompleted(status: PipelineStatus, exitCode?: number, errorMessage?: string): void;
    /**
     * Mark as started
     */
    markStarted(): void;
    /**
     * Add stage result
     */
    addStageResult(stage: Partial<PipelineRunStage>): PipelineRunStage;
}
//# sourceMappingURL=pipeline-run.entity.d.ts.map