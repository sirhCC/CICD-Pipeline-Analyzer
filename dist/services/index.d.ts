/**
 * Services module exports
 */
export { DatabaseService, databaseService } from './database.service';
export type { DatabaseHealthStatus, DatabaseSeedOptions } from './database.service';
export { AnalyticsService } from './analytics.service';
export type { AnalyticsConfig, MetricCalculationResult, FailurePatternResult, OptimizationResult, AlertResult } from './analytics.service';
export { StatisticalAnalyticsService, statisticalAnalyticsService } from './statistical-analytics.service';
export type { StatisticalDataPoint, AnomalyDetectionResult, TrendAnalysisResult, BenchmarkResult, SLAMonitoringResult, CostAnalysisResult, StatisticalAnalyticsConfig } from './statistical-analytics.service';
export { EnhancedStatisticalAnalyticsService, enhancedStatisticalAnalyticsService } from './enhanced-statistical-analytics.service';
export type { EnhancedAnalyticsConfig, AnalyticsPerformanceMetrics } from './enhanced-statistical-analytics.service';
export { MemoizationService, memoizationService } from './memoization.service';
export type { MemoizationConfig, MemoizationMetrics } from './memoization.service';
export { BatchProcessingService, batchProcessingService } from './batch-processing.service';
export type { BatchConfig, BatchResult, BatchProgress, StreamingConfig } from './batch-processing.service';
export { OptimizedMathUtils, optimizedMathUtils } from './optimized-math-utils.service';
export type { StatisticalSummary, RegressionResult, MovingAverageConfig } from './optimized-math-utils.service';
export { PerformanceMonitorService } from './performance-monitor.service';
export type { PerformanceMetrics, PerformanceAlert, PerformanceThresholds } from './performance-monitor.service';
export { AdvancedCacheService } from './advanced-cache.service';
export type { CacheEntry as AdvancedCacheEntry, CacheStats, CacheConfig, AccessPattern } from './advanced-cache.service';
export { AlertingService, alertingService, AlertType, AlertSeverity, AlertStatus, ChannelType, ResolutionType } from './alerting.service';
export type { AlertConfiguration, Alert, AlertDetails, AlertContext, NotificationChannel, EscalationPolicy } from './alerting.service';
export { AdvancedDataProcessingService, advancedDataProcessingService, AggregationLevel, AggregationStrategy, ProcessingJobType, JobStatus, ExportFormat } from './advanced-data-processing.service';
export type { TimeSeriesPoint, TimeSeriesData, AggregationConfig, ProcessingJob, CacheEntry, ExportOptions } from './advanced-data-processing.service';
export { OptimizationConfigService, optimizationConfigService } from './optimization-config.service';
export type { OptimizationProfile, PerformanceMetrics as OptimizationPerformanceMetrics, AutoTuningConfig } from './optimization-config.service';
export { OptimizationIntegrationService, optimizationIntegrationService } from './optimization-integration.service';
export type { OptimizationStatus, ServiceStatus, OptimizationReport } from './optimization-integration.service';
//# sourceMappingURL=index.d.ts.map