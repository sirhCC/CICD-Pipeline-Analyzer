/**
 * Statistical Result Entity - Phase 3 Data Persistence
 * Stores statistical analysis results for historical tracking and trend analysis
 */
import { Pipeline } from './pipeline.entity';
export declare enum AnalysisType {
    ANOMALY_DETECTION = "anomaly_detection",
    TREND_ANALYSIS = "trend_analysis",
    SLA_MONITORING = "sla_monitoring",
    COST_ANALYSIS = "cost_analysis",
    BENCHMARK_ANALYSIS = "benchmark_analysis"
}
export declare enum ResultStatus {
    SUCCESS = "success",
    WARNING = "warning",
    ERROR = "error",
    CRITICAL = "critical"
}
export declare class StatisticalResult {
    id: string;
    pipelineId?: string;
    pipeline?: Pipeline;
    analysisType: AnalysisType;
    status: ResultStatus;
    metric?: string;
    method?: string;
    result: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    score?: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    dataPointCount?: number;
    periodDays?: number;
    executionTime?: number;
    jobExecutionId?: string;
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=statistical-result.entity.d.ts.map