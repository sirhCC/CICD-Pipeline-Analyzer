/**
 * Entity Index - Centralized entity exports
 */

export { BaseEntity } from './base.entity';
export { Pipeline } from './pipeline.entity';
export { PipelineRun, PipelineRunStage } from './pipeline-run.entity';
export { User, UserSession, ApiKey } from './user.entity';

// Statistical Data Persistence Entities - Phase 3
export { StatisticalResult, AnalysisType, ResultStatus } from './statistical-result.entity';
export { AnomalyHistory, AnomalyMethod, AnomalySeverity } from './anomaly-history.entity';
export { TrendHistory, TrendDirection, TrendStrength } from './trend-history.entity';
export { StatisticalCache, CacheType } from './statistical-cache.entity';

export {
  PipelineMetrics,
  FailurePattern,
  OptimizationRecommendation,
  AnalyticsAlert,
} from './pipeline-metrics.entity';

// Entity arrays for TypeORM configuration
export const entities = [
  'Pipeline',
  'PipelineRun',
  'PipelineRunStage',
  'User',
  'UserSession',
  'ApiKey',
  'PipelineMetrics',
  'FailurePattern',
  'OptimizationRecommendation',
  'AnalyticsAlert',
  'StatisticalResult',
  'AnomalyHistory',
  'TrendHistory',
  'StatisticalCache',
];

// Entity metadata for introspection
export const entityMetadata = {
  Pipeline: {
    tableName: 'pipelines',
    primaryKey: 'id',
    relations: ['runs'],
  },
  PipelineRun: {
    tableName: 'pipeline_runs',
    primaryKey: 'id',
    relations: ['pipeline', 'stages'],
  },
  PipelineRunStage: {
    tableName: 'pipeline_run_stages',
    primaryKey: 'id',
    relations: ['run'],
  },
  User: {
    tableName: 'users',
    primaryKey: 'id',
    relations: ['sessions', 'apiKeys'],
  },
  UserSession: {
    tableName: 'user_sessions',
    primaryKey: 'id',
    relations: ['user'],
  },
  ApiKey: {
    tableName: 'api_keys',
    primaryKey: 'id',
    relations: ['user'],
  },
  StatisticalResult: {
    tableName: 'statistical_results',
    primaryKey: 'id',
    relations: [],
  },
  AnomalyHistory: {
    tableName: 'anomaly_history',
    primaryKey: 'id',
    relations: [],
  },
  TrendHistory: {
    tableName: 'trend_history',
    primaryKey: 'id',
    relations: [],
  },
  StatisticalCache: {
    tableName: 'statistical_cache',
    primaryKey: 'id',
    relations: [],
  },
};
