/**
 * Enhanced Statistical Analytics Service - Optimized High-Performance Analytics
 *
 * This is an optimized version of the statistical analytics service with:
 * - Memoization for expensive calculations
 * - Batch processing for large datasets
 * - Parallel computation support
 * - Memory-efficient algorithms
 * - Enhanced error handling and validation
 * - Performance monitoring integration
 *
 * @author sirhCC
 * @version 2.0.0
 */
import { StatisticalDataPoint, AnomalyDetectionResult, TrendAnalysisResult, BenchmarkResult, SLAMonitoringResult, CostAnalysisResult, StatisticalAnalyticsConfig } from './statistical-analytics.service';
export interface EnhancedAnalyticsConfig extends StatisticalAnalyticsConfig {
    enableMemoization: boolean;
    enableBatchProcessing: boolean;
    enableParallelProcessing: boolean;
    batchSize: number;
    maxConcurrency: number;
    memoryThreshold: number;
    enableStreamProcessing: boolean;
    cacheEnabled: boolean;
    cacheTtl: number;
    enablePerformanceTracking: boolean;
    slowQueryThreshold: number;
}
export interface AnalyticsPerformanceMetrics {
    operationName: string;
    executionTime: number;
    memoryUsage: number;
    cacheHit: boolean;
    dataSize: number;
    timestamp: Date;
}
export declare class EnhancedStatisticalAnalyticsService {
    private static instance;
    private logger;
    private config;
    private performanceMetrics;
    private constructor();
    static getInstance(config?: Partial<EnhancedAnalyticsConfig>): EnhancedStatisticalAnalyticsService;
    /**
     * Enhanced anomaly detection with optimization
     */
    detectAnomalies(data: StatisticalDataPoint[], method?: 'z-score' | 'percentile' | 'iqr' | 'all'): Promise<AnomalyDetectionResult[]>;
    /**
     * Enhanced trend analysis with memoization
     */
    analyzeTrend(data: StatisticalDataPoint[]): Promise<TrendAnalysisResult>;
    /**
     * Enhanced benchmarking with parallel processing
     */
    generateBenchmark(currentValue: number, historicalData: StatisticalDataPoint[], category?: string): Promise<BenchmarkResult>;
    /**
     * Enhanced SLA monitoring with caching
     */
    monitorSLA(currentValue: number, slaTarget: number, historicalData: StatisticalDataPoint[], violationType?: 'threshold' | 'availability' | 'performance' | 'quality'): Promise<SLAMonitoringResult>;
    /**
     * Enhanced cost analysis with batch processing
     */
    analyzeCosts(executionTimeMinutes: number, resourceUsage: {
        cpu: number;
        memory: number;
        storage: number;
        network: number;
    }, historicalCostData: StatisticalDataPoint[]): Promise<CostAnalysisResult>;
    /**
     * Streaming analytics for very large datasets
     */
    analyzeDataStream(dataStream: AsyncIterable<StatisticalDataPoint>, analysisTypes?: ('anomaly' | 'trend' | 'benchmark')[]): AsyncGenerator<{
        type: string;
        result: any;
    }, void, unknown>;
    private detectAnomaliesBatch;
    private detectAnomaliesOptimized;
    private computeTrendAnalysis;
    private calculateTotalCost;
    private executeWithPerformanceTracking;
    private validateInput;
    private generateDataHash;
    private createAnomalyResult;
    private calculateValuePercentile;
    private determinePerformance;
    private calculateRecentViolations;
    private determineSLASeverity;
    private generateSLARemediation;
    private generateCostOptimizations;
    private calculateEfficiencyScore;
    private determineTrend;
    private calculateVolatility;
    private determineSeverity;
    /**
     * Get performance metrics for monitoring
     */
    getPerformanceMetrics(): AnalyticsPerformanceMetrics[];
    /**
     * Clear performance metrics
     */
    clearPerformanceMetrics(): void;
    /**
     * Get configuration
     */
    getConfig(): EnhancedAnalyticsConfig;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<EnhancedAnalyticsConfig>): void;
}
export declare const enhancedStatisticalAnalyticsService: EnhancedStatisticalAnalyticsService;
//# sourceMappingURL=enhanced-statistical-analytics.service.d.ts.map