/**
 * Advanced Data Processing Service - High-Performance Analytics Engine
 *
 * Features:
 * - Time-series data optimization and compression
 * - Advanced data aggregation with multiple strategies
 * - Intelligent model caching with LRU eviction
 * - Parallel processing for large datasets
 * - Multi-format data export (CSV, JSON, Parquet, Excel)
 * - Memory-efficient streaming processing
 * - Predictive caching based on usage patterns
 *
 * @author sirhCC
 * @version 1.0.0
 */
export interface TimeSeriesPoint {
    timestamp: Date;
    value: number;
    metadata?: Record<string, unknown>;
}
export interface TimeSeriesData {
    metric: string;
    pipelineId: string;
    points: TimeSeriesPoint[];
    aggregationLevel: AggregationLevel;
    compressionRatio?: number;
}
export interface AggregationConfig {
    level: AggregationLevel;
    windowSize: number;
    strategy: AggregationStrategy;
    retentionPeriod: number;
}
export interface ProcessingJob {
    id: string;
    type: ProcessingJobType;
    status: JobStatus;
    input: unknown;
    output?: unknown;
    progress: number;
    startTime: Date;
    endTime?: Date;
    error?: string;
    metadata: Record<string, unknown>;
}
export interface CacheEntry {
    key: string;
    value: unknown;
    lastAccessed: Date;
    accessCount: number;
    computeTime: number;
    size: number;
    expiresAt?: Date;
}
export interface ExportOptions {
    format: ExportFormat;
    columns?: string[];
    filters?: Record<string, unknown>;
    compression?: boolean;
    includeMetadata?: boolean;
    batchSize?: number;
}
export declare enum AggregationLevel {
    RAW = "raw",
    MINUTE = "minute",
    HOUR = "hour",
    DAY = "day",
    WEEK = "week",
    MONTH = "month"
}
export declare enum AggregationStrategy {
    AVERAGE = "average",
    SUM = "sum",
    MIN = "min",
    MAX = "max",
    COUNT = "count",
    MEDIAN = "median",
    PERCENTILE_95 = "p95",
    PERCENTILE_99 = "p99"
}
export declare enum ProcessingJobType {
    TIME_SERIES_COMPRESSION = "time_series_compression",
    DATA_AGGREGATION = "data_aggregation",
    ANOMALY_DETECTION = "anomaly_detection",
    TREND_ANALYSIS = "trend_analysis",
    CORRELATION_ANALYSIS = "correlation_analysis",
    EXPORT = "export"
}
export declare enum JobStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare enum ExportFormat {
    CSV = "csv",
    JSON = "json",
    PARQUET = "parquet",
    EXCEL = "xlsx",
    XML = "xml"
}
export declare class AdvancedDataProcessingService {
    private logger;
    private cache;
    private workers;
    private jobs;
    private readonly maxCacheSize;
    private readonly maxMemoryUsage;
    private currentMemoryUsage;
    constructor();
    /**
     * Setup periodic cache cleanup
     */
    private setupCacheCleanup;
    /**
     * Advanced time-series data compression
     */
    compressTimeSeries(data: TimeSeriesPoint[], compressionRatio?: number, preserveAnomalies?: boolean): Promise<TimeSeriesData>;
    /**
     * Advanced data aggregation with multiple strategies
     */
    aggregateData(data: TimeSeriesPoint[], config: AggregationConfig): Promise<TimeSeriesPoint[]>;
    /**
     * Parallel processing for large datasets
     */
    processInParallel<T, R>(data: T[], processor: (chunk: T[]) => Promise<R>, chunkSize?: number, maxWorkers?: number): Promise<R[]>;
    /**
     * Export data in multiple formats
     */
    exportData(data: unknown[], options: ExportOptions): Promise<{
        filePath: string;
        size: number;
        recordCount: number;
    }>;
    /**
     * Get processing job status
     */
    getJobStatus(jobId: string): ProcessingJob | null;
    /**
     * Get all jobs
     */
    getAllJobs(): ProcessingJob[];
    /**
     * Cancel a running job
     */
    cancelJob(jobId: string): Promise<boolean>;
    /**
     * Convert data to CSV format
     */
    private convertToCSV;
    /**
     * Convert data to XML format
     */
    private convertToXML;
    /**
     * Cache management methods
     */
    private getFromCache;
    private setCache;
    private evictLRU;
    private cleanupCache;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        memoryUsage: number;
        hitRate: number;
        averageComputeTime: number;
    };
    /**
     * Clear cache
     */
    clearCache(): void;
}
export declare const advancedDataProcessingService: AdvancedDataProcessingService;
//# sourceMappingURL=advanced-data-processing.service.d.ts.map