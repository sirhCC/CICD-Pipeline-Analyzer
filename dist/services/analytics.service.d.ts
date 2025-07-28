import { PipelineMetrics, FailurePattern, OptimizationRecommendation, AnalyticsAlert } from '../entities/pipeline-metrics.entity';
import { PipelineStatus } from '../types';
export interface AnalyticsConfig {
    enableRealTimeAnalysis: boolean;
    metricRetentionDays: number;
    alertThresholds: {
        failureRate: number;
        avgDuration: number;
        errorSpike: number;
    };
    batchSize: number;
    analysisInterval: number;
}
export interface MetricCalculationResult {
    metricType: string;
    value: number;
    metadata?: Record<string, any>;
    timestamp: Date;
    aggregationPeriod: string;
}
export interface FailurePatternResult {
    patternType: string;
    description: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    data: Record<string, any>;
    firstSeen: Date;
    lastSeen: Date;
    occurrenceCount: number;
}
export interface OptimizationResult {
    recommendationType: string;
    title: string;
    description: string;
    potentialSavings: {
        time?: number;
        cost?: number;
        resources?: Record<string, number>;
    };
    implementationEffort: 'low' | 'medium' | 'high';
    priority: 'low' | 'medium' | 'high' | 'critical';
    actionItems?: string[];
}
export interface AlertResult {
    alertType: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    data: Record<string, any>;
    thresholdValue?: number;
    actualValue?: number;
}
/**
 * Core Analytics Service
 * Provides comprehensive pipeline analytics, failure pattern detection,
 * optimization recommendations, and intelligent alerting
 */
export declare class AnalyticsService {
    private metricsRepo;
    private failurePatternsRepo;
    private optimizationRepo;
    private alertsRepo;
    private pipelineRepo;
    private pipelineRunRepo;
    private config;
    private analysisInProgress;
    private analysisInterval;
    constructor(config?: Partial<AnalyticsConfig>);
    /**
     * Calculate and store pipeline metrics
     */
    calculateMetrics(pipelineId: string, period?: 'hourly' | 'daily' | 'weekly' | 'monthly'): Promise<MetricCalculationResult[]>;
    /**
     * Detect failure patterns in pipeline runs
     */
    detectFailurePatterns(pipelineId?: string): Promise<FailurePatternResult[]>;
    /**
     * Generate optimization recommendations
     */
    generateOptimizationRecommendations(pipelineId: string): Promise<OptimizationResult[]>;
    /**
     * Generate intelligent alerts based on analytics
     */
    generateAlerts(pipelineId?: string): Promise<AlertResult[]>;
    /**
     * Get analytics dashboard data
     */
    getDashboardData(pipelineId?: string, period?: string): Promise<{
        metrics: PipelineMetrics[];
        patterns: FailurePattern[];
        recommendations: OptimizationRecommendation[];
        alerts: AnalyticsAlert[];
        recentActivity: {
            id: string;
            pipelineId: string;
            status: PipelineStatus;
            startedAt: Date | undefined;
            duration: number | undefined;
            triggeredBy: string;
        }[];
        topFailures: {
            id: string;
            patternType: string;
            frequency: number;
            description: string;
            impact: string;
        }[];
        performanceTrends: {
            timestamp: Date;
            metricType: string;
            value: number;
            period: string;
        }[];
        summary: {
            totalMetrics: number;
            activePatterns: number;
            pendingRecommendations: number;
            unacknowledgedAlerts: number;
            healthScore: number;
            lastUpdated: Date;
        };
    }>;
    /**
     * Generate comprehensive dashboard data
     */
    generateDashboard(options?: {
        timeRange?: string;
        pipelineId?: string;
    }): Promise<any>;
    /**
     * Run analytics analysis asynchronously
     */
    analyzeAsync(pipelineId?: string): Promise<void>;
    /**
     * Update alert status (acknowledge/resolve)
     */
    updateAlert(alertId: string, updates: {
        acknowledged?: boolean;
        status?: 'active' | 'resolved' | 'muted';
        acknowledgedBy?: string;
        notes?: string;
    }): Promise<any>;
    private startRealTimeAnalysis;
    stopRealTimeAnalysis(): void;
    private runAnalysisCycle;
    private getPeriodRange;
    private calculateSuccessRate;
    private calculateAverageDuration;
    private calculateThroughput;
    private storeMetrics;
    private detectRecurringFailures;
    private detectTimeoutPatterns;
    private detectDependencyFailures;
    private normalizeErrorMessage;
    private storeFailurePatterns;
    private getRecentMetrics;
    private analyzePerformanceBottlenecks;
    private analyzeResourceUtilization;
    private analyzeReliabilityOptimizations;
    private storeOptimizationRecommendations;
    private checkPerformanceDegradation;
    private checkFailureSpikes;
    private checkResourceWaste;
    private storeAlerts;
    private generateSummary;
    private calculateHealthScore;
}
//# sourceMappingURL=analytics.service.d.ts.map