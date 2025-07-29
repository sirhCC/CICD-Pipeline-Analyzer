/**
 * Anomaly Detection History Entity - Phase 3 Data Persistence
 * Tracks historical anomaly detection results for pattern analysis
 */
import { Pipeline } from './pipeline.entity';
export declare enum AnomalyMethod {
    Z_SCORE = "z-score",
    PERCENTILE = "percentile",
    IQR = "iqr",
    COMPOSITE = "composite"
}
export declare enum AnomalySeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare class AnomalyHistory {
    id: string;
    pipelineId?: string;
    pipeline?: Pipeline;
    metric: string;
    method: AnomalyMethod;
    isAnomaly: boolean;
    value: number;
    anomalyScore: number;
    severity: AnomalySeverity;
    threshold?: number;
    baseline?: number;
    deviation?: number;
    context?: Record<string, unknown>;
    jobExecutionId?: string;
    runId?: string;
    timestamp: Date;
    createdAt: Date;
}
//# sourceMappingURL=anomaly-history.entity.d.ts.map