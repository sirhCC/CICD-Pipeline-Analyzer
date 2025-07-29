/**
 * Statistical Analytics Engine - Mathematical-based Pipeline Analysis
 *
 * Features:
 * - Anomaly Detection using Z-score and percentile-based methods
 * - Trend Analysis with regression algorithms
 * - Benchmarking System for historical performance comparison
 * - SLA Monitoring with violation detection
 * - Cost Analysis for resource utilization optimization
 *
 * @author sirhCC
 * @version 1.0.0
 */
import { AnalysisType, CacheType } from '../entities';
export interface StatisticalDataPoint {
    timestamp: Date;
    value: number;
    metadata?: Record<string, unknown>;
}
export interface AnomalyDetectionResult {
    isAnomaly: boolean;
    anomalyScore: number;
    method: 'z-score' | 'percentile' | 'iqr';
    threshold: number;
    actualValue: number;
    expectedRange: {
        min: number;
        max: number;
    };
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
}
export interface TrendAnalysisResult {
    trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    slope: number;
    correlation: number;
    rSquared: number;
    confidenceInterval: {
        lower: number;
        upper: number;
    };
    prediction: {
        next24h: number;
        next7d: number;
        next30d: number;
    };
    changeRate: number;
    volatility: number;
}
export interface BenchmarkResult {
    currentValue: number;
    benchmark: number;
    percentile: number;
    deviationPercent: number;
    performance: 'excellent' | 'good' | 'average' | 'below-average' | 'poor';
    historicalContext: {
        best: number;
        worst: number;
        average: number;
        median: number;
    };
    comparison: {
        betterThan: number;
        category: string;
    };
}
export interface SLAMonitoringResult {
    violated: boolean;
    slaTarget: number;
    actualValue: number;
    violationPercent: number;
    violationType: 'threshold' | 'availability' | 'performance' | 'quality';
    severity: 'minor' | 'major' | 'critical';
    timeInViolation: number;
    frequencyOfViolation: number;
    remediation: {
        immediateActions: string[];
        longTermActions: string[];
        estimatedImpact: string;
    };
}
export interface CostAnalysisResult {
    totalCost: number;
    costPerMinute: number;
    costTrend: TrendAnalysisResult;
    optimizationOpportunities: {
        type: 'resource-scaling' | 'execution-time' | 'parallelization' | 'caching';
        description: string;
        potentialSavings: number;
        implementation: string;
        effort: 'low' | 'medium' | 'high';
        priority: 'low' | 'medium' | 'high' | 'critical';
    }[];
    resourceUtilization: {
        cpu: number;
        memory: number;
        storage: number;
        network: number;
    };
    efficiency: {
        score: number;
        recommendations: string[];
    };
}
export interface StatisticalAnalyticsConfig {
    anomalyDetection: {
        zScoreThreshold: number;
        percentileThreshold: number;
        minDataPoints: number;
        windowSize: number;
    };
    trendAnalysis: {
        minDataPoints: number;
        confidenceLevel: number;
        smoothingFactor: number;
    };
    benchmarking: {
        historicalDays: number;
        minSamples: number;
        updateFrequency: number;
    };
    slaMonitoring: {
        defaultSLA: number;
        violationBuffer: number;
        alertThresholds: {
            minor: number;
            major: number;
            critical: number;
        };
    };
    costAnalysis: {
        defaultHourlyCost: number;
        currencyCode: string;
        resourceCosts: {
            cpu: number;
            memory: number;
            storage: number;
            network: number;
        };
    };
}
export declare class StatisticalAnalyticsService {
    private static instance;
    private logger;
    private config;
    private resultRepository?;
    private cacheRepository?;
    private constructor();
    static getInstance(config?: Partial<StatisticalAnalyticsConfig>): StatisticalAnalyticsService;
    /**
     * Detect anomalies in time series data using multiple statistical methods
     */
    detectAnomalies(data: StatisticalDataPoint[], method?: 'z-score' | 'percentile' | 'iqr' | 'all'): AnomalyDetectionResult[];
    /**
     * Perform trend analysis using linear regression
     */
    analyzeTrend(data: StatisticalDataPoint[]): TrendAnalysisResult;
    /**
     * Compare current performance against historical benchmarks
     */
    generateBenchmark(currentValue: number, historicalData: StatisticalDataPoint[], category?: string): BenchmarkResult;
    /**
     * Monitor SLA compliance and detect violations
     */
    monitorSLA(currentValue: number, slaTarget: number, historicalData: StatisticalDataPoint[], violationType?: 'threshold' | 'availability' | 'performance' | 'quality'): SLAMonitoringResult;
    /**
     * Analyze costs and identify optimization opportunities
     */
    analyzeCosts(executionTimeMinutes: number, resourceUsage: {
        cpu: number;
        memory: number;
        storage: number;
        network: number;
    }, historicalCostData: StatisticalDataPoint[]): CostAnalysisResult;
    private calculateMean;
    private calculateStandardDeviation;
    private calculateMedian;
    private calculatePercentile;
    private calculateValuePercentile;
    private calculateConfidence;
    private calculatePercentileConfidence;
    private calculateIQRConfidence;
    private determineSeverity;
    private determinePercentileSeverity;
    private determineIQRSeverity;
    private determineTrend;
    private determinePerformance;
    private determineSLASeverity;
    private generateSLARemediation;
    private generateCostOptimizations;
    private calculateEfficiencyScore;
    private getTValue;
    /**
     * Pipeline Integration Methods
     */
    private pipelineRepo;
    private pipelineRunRepo;
    private initializePipelineRepositories;
    /**
     * Extract statistical data points from pipeline runs
     */
    extractPipelineDataPoints(pipelineId: string, metric?: 'duration' | 'cpu' | 'memory' | 'success_rate' | 'test_coverage', periodDays?: number): Promise<StatisticalDataPoint[]>;
    /**
     * Convert pipeline runs to statistical data points based on metric type
     */
    private convertRunsToDataPoints;
    /**
     * Analyze pipeline anomalies with integration
     */
    analyzePipelineAnomalies(pipelineId: string, metric?: 'duration' | 'cpu' | 'memory' | 'success_rate' | 'test_coverage', method?: 'z-score' | 'percentile' | 'iqr' | 'all', periodDays?: number): Promise<AnomalyDetectionResult[]>;
    /**
     * Analyze pipeline trends with integration
     */
    analyzePipelineTrends(pipelineId: string, metric?: 'duration' | 'cpu' | 'memory' | 'success_rate' | 'test_coverage', periodDays?: number): Promise<TrendAnalysisResult>;
    /**
     * Benchmark pipeline performance with integration
     */
    benchmarkPipelinePerformance(pipelineId: string, metric?: 'duration' | 'cpu' | 'memory' | 'success_rate' | 'test_coverage', periodDays?: number): Promise<BenchmarkResult>;
    /**
     * Monitor pipeline SLA compliance with integration
     */
    monitorPipelineSLA(pipelineId: string, slaTarget: number, metric?: 'duration' | 'cpu' | 'memory' | 'success_rate' | 'test_coverage', periodDays?: number): Promise<SLAMonitoringResult>;
    /**
     * Analyze pipeline cost trends with integration
     */
    analyzePipelineCostTrends(pipelineId: string, periodDays?: number): Promise<CostAnalysisResult>;
    /**
     * Lazy repository initialization methods
     */
    private getResultRepository;
    private getCacheRepository;
    /**
     * Data Persistence Methods - Phase 3
     */
    /**
     * Save statistical analysis result to database
     */
    saveAnalysisResult(analysisType: AnalysisType, result: any, pipelineId?: string, metadata?: {
        metric?: string;
        method?: string;
        score?: number;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        dataPointCount?: number;
        periodDays?: number;
        executionTime?: number;
        jobExecutionId?: string;
    }): Promise<void>;
    /**
     * Get cached analysis result
     */
    getCachedResult(cacheKey: string, cacheType: CacheType): Promise<any | null>;
    /**
     * Set cache for analysis result
     */
    setCachedResult(cacheKey: string, cacheType: CacheType, data: any, expirationMs?: number, // 1 hour default
    pipelineId?: string, metric?: string): Promise<void>;
    /**
     * Determine result status based on analysis results
     */
    private determineResultStatus;
    /**
     * Enhanced anomaly detection with automatic alerting
     */
    detectAnomaliesWithAlerting(pipelineId?: string, metric?: 'duration' | 'cpu' | 'memory' | 'success_rate', method?: 'z-score' | 'percentile' | 'iqr' | 'all', alertThreshold?: number): Promise<AnomalyDetectionResult[]>;
    /**
     * Trigger an alert for detected anomaly
     */
    private triggerAnomalyAlert;
    /**
     * Enhanced SLA monitoring with automatic alerting
     */
    monitorSLAWithAlerting(pipelineId?: string, slaConfig?: {
        duration?: number;
        errorRate?: number;
        successRate?: number;
    }): Promise<SLAMonitoringResult>;
    /**
     * Trigger an alert for SLA violation
     */
    private triggerSLAAlert;
}
export declare const getStatisticalAnalyticsService: () => StatisticalAnalyticsService;
export declare const statisticalAnalyticsService: StatisticalAnalyticsService;
//# sourceMappingURL=statistical-analytics.service.d.ts.map