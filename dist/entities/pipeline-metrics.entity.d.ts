import { BaseEntity } from './base.entity';
import { Pipeline } from './pipeline.entity';
/**
 * Analytics metrics for pipeline performance and trends
 */
export declare class PipelineMetrics extends BaseEntity {
    pipelineId: string;
    pipeline: Pipeline;
    metricType: string;
    value: number;
    metadata?: Record<string, any>;
    aggregationPeriod: string;
    timestamp: Date;
}
/**
 * Failure pattern analysis results
 */
export declare class FailurePattern extends BaseEntity {
    pipelineId?: string;
    pipeline?: Pipeline;
    patternType: string;
    description: string;
    confidence: number;
    data: Record<string, any>;
    severity: string;
    firstSeen: Date;
    lastSeen: Date;
    occurrenceCount: number;
    detectedAt: Date;
    active: boolean;
}
/**
 * Resource optimization recommendations
 */
export declare class OptimizationRecommendation extends BaseEntity {
    pipelineId?: string;
    pipeline?: Pipeline;
    recommendationType: string;
    title: string;
    description: string;
    potentialSavings: {
        time?: number;
        cost?: number;
        resources?: Record<string, number>;
    };
    implementationEffort: string;
    priority: string;
    actionItems?: string[];
    implemented: boolean;
    implementedAt?: Date;
}
/**
 * Analytics alerts and notifications
 */
export declare class AnalyticsAlert extends BaseEntity {
    pipelineId?: string;
    pipeline?: Pipeline;
    alertType: string;
    title: string;
    message: string;
    severity: string;
    data: Record<string, any>;
    thresholdValue?: number;
    actualValue?: number;
    acknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
    active: boolean;
}
//# sourceMappingURL=pipeline-metrics.entity.d.ts.map