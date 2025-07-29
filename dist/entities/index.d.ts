/**
 * Entity Index - Centralized entity exports
 */
export { BaseEntity } from './base.entity';
export { Pipeline } from './pipeline.entity';
export { PipelineRun, PipelineRunStage } from './pipeline-run.entity';
export { User, UserSession, ApiKey } from './user.entity';
export { StatisticalResult, AnalysisType, ResultStatus } from './statistical-result.entity';
export { AnomalyHistory, AnomalyMethod, AnomalySeverity } from './anomaly-history.entity';
export { TrendHistory, TrendDirection, TrendStrength } from './trend-history.entity';
export { StatisticalCache, CacheType } from './statistical-cache.entity';
export { PipelineMetrics, FailurePattern, OptimizationRecommendation, AnalyticsAlert } from './pipeline-metrics.entity';
export declare const entities: string[];
export declare const entityMetadata: {
    Pipeline: {
        tableName: string;
        primaryKey: string;
        relations: string[];
    };
    PipelineRun: {
        tableName: string;
        primaryKey: string;
        relations: string[];
    };
    PipelineRunStage: {
        tableName: string;
        primaryKey: string;
        relations: string[];
    };
    User: {
        tableName: string;
        primaryKey: string;
        relations: string[];
    };
    UserSession: {
        tableName: string;
        primaryKey: string;
        relations: string[];
    };
    ApiKey: {
        tableName: string;
        primaryKey: string;
        relations: string[];
    };
    StatisticalResult: {
        tableName: string;
        primaryKey: string;
        relations: never[];
    };
    AnomalyHistory: {
        tableName: string;
        primaryKey: string;
        relations: never[];
    };
    TrendHistory: {
        tableName: string;
        primaryKey: string;
        relations: never[];
    };
    StatisticalCache: {
        tableName: string;
        primaryKey: string;
        relations: never[];
    };
};
//# sourceMappingURL=index.d.ts.map