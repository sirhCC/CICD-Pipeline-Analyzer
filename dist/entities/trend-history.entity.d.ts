/**
 * Trend Analysis History Entity - Phase 3 Data Persistence
 * Stores historical trend analysis results for long-term pattern tracking
 */
import { Pipeline } from './pipeline.entity';
export declare enum TrendDirection {
    IMPROVING = "improving",
    DEGRADING = "degrading",
    STABLE = "stable",
    VOLATILE = "volatile"
}
export declare enum TrendStrength {
    WEAK = "weak",
    MODERATE = "moderate",
    STRONG = "strong",
    VERY_STRONG = "very_strong"
}
export declare class TrendHistory {
    id: string;
    pipelineId?: string;
    pipeline?: Pipeline;
    metric: string;
    trend: TrendDirection;
    strength: TrendStrength;
    correlation: number;
    slope: number;
    rSquared: number;
    volatility?: number;
    dataPoints: number;
    periodDays: number;
    prediction?: Record<string, unknown>;
    confidenceInterval?: Record<string, unknown>;
    jobExecutionId?: string;
    timestamp: Date;
    createdAt: Date;
}
//# sourceMappingURL=trend-history.entity.d.ts.map