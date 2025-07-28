/**
 * Services module exports
 */

export { DatabaseService, databaseService } from './database.service';
export type { DatabaseHealthStatus, DatabaseSeedOptions } from './database.service';

export { AnalyticsService } from './analytics.service';
export type { 
  AnalyticsConfig,
  MetricCalculationResult,
  FailurePatternResult,
  OptimizationResult,
  AlertResult
} from './analytics.service';
