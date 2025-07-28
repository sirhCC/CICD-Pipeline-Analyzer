/**
 * Background Job Processing Service - Phase 3 Continuous Analysis
 * Handles scheduled statistical analysis jobs and real-time alerting
 */
import { WebSocketService } from './websocket.service';
export interface JobConfiguration {
    id: string;
    name: string;
    type: 'anomaly_detection' | 'trend_analysis' | 'sla_monitoring' | 'cost_analysis' | 'full_analysis';
    schedule: string;
    enabled: boolean;
    pipelineId?: string;
    parameters: {
        metric?: 'duration' | 'cpu' | 'memory' | 'success_rate' | 'test_coverage';
        method?: 'z-score' | 'percentile' | 'iqr' | 'all';
        periodDays?: number;
        slaTarget?: number;
        alertThresholds?: {
            anomaly?: 'low' | 'medium' | 'high' | 'critical';
            trend?: 'significant' | 'moderate' | 'minimal';
            sla?: boolean;
            cost?: number;
        };
    };
    metadata: {
        createdBy: string;
        createdAt: Date;
        lastRun?: Date;
        lastResult?: 'success' | 'failure' | 'warning';
        runCount: number;
        errorCount: number;
        description?: string;
    };
}
export interface JobExecution {
    id: string;
    jobId: string;
    startTime: Date;
    endTime?: Date;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    result?: any;
    error?: string;
    duration?: number;
    alertsGenerated: number;
}
export interface BackgroundJobConfig {
    maxConcurrentJobs: number;
    defaultRetryAttempts: number;
    jobTimeout: number;
    enableRealTimeAlerts: boolean;
    historicalDataRetention: number;
    enableMetrics: boolean;
}
export declare class BackgroundJobService {
    private logger;
    private config;
    private jobs;
    private scheduledTasks;
    private activeExecutions;
    private executionHistory;
    private webSocketService;
    private isShuttingDown;
    private metrics;
    constructor(config?: Partial<BackgroundJobConfig>);
    /**
     * Set WebSocket service for real-time alerts
     */
    setWebSocketService(webSocketService: WebSocketService): void;
    /**
     * Create and schedule a new background job
     */
    createJob(jobConfig: Omit<JobConfiguration, 'id' | 'metadata'>): Promise<string>;
    /**
     * Schedule a job for execution
     */
    private scheduleJob;
    /**
     * Execute a specific job
     */
    executeJob(jobId: string): Promise<JobExecution>;
    /**
     * Run the actual job logic based on job type
     */
    private runJobLogic;
    /**
     * Run anomaly detection job
     */
    private runAnomalyDetectionJob;
    /**
     * Run trend analysis job
     */
    private runTrendAnalysisJob;
    /**
     * Run SLA monitoring job
     */
    private runSlaMonitoringJob;
    /**
     * Run cost analysis job
     */
    private runCostAnalysisJob;
    /**
     * Run full analysis job (all analysis types)
     */
    private runFullAnalysisJob;
    /**
     * Send anomaly alerts via WebSocket
     */
    private sendAnomalyAlerts;
    /**
     * Send trend alerts via WebSocket
     */
    private sendTrendAlert;
    /**
     * Send SLA violation alerts via WebSocket
     */
    private sendSlaViolationAlert;
    /**
     * Send cost alerts via WebSocket
     */
    private sendCostAlert;
    /**
     * Helper methods for determining alert conditions
     */
    private shouldAlertOnTrend;
    private shouldAlertOnCost;
    private getTrendSeverity;
    private getCostSeverity;
    /**
     * Job management methods
     */
    enableJob(jobId: string): Promise<void>;
    disableJob(jobId: string): Promise<void>;
    deleteJob(jobId: string): Promise<void>;
    /**
     * Get job status and information
     */
    getJobStatus(jobId: string): Promise<JobConfiguration & {
        currentExecution?: JobExecution | undefined;
        recentExecutions: JobExecution[];
        isActive: boolean;
    }>;
    /**
     * Cancel a running job execution
     */
    cancelJob(jobId: string): Promise<{
        cancelled: boolean;
        message: string;
    }>;
    /**
     * Get all jobs
     */
    getAllJobs(): JobConfiguration[];
    /**
     * Get job execution history
     */
    getExecutionHistory(jobId?: string): JobExecution[];
    /**
     * Get service metrics
     */
    getMetrics(): {
        uptime: number;
        activeJobs: number;
        scheduledJobs: number;
        totalJobs: number;
        successRate: number;
        totalJobsScheduled: number;
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        averageExecutionTime: number;
        alertsGenerated: number;
        lastReset: Date;
    };
    /**
     * Utility methods
     */
    private updateAverageExecutionTime;
    private cleanupExecutionHistory;
    /**
     * Shutdown service gracefully
     */
    shutdown(): Promise<void>;
}
export declare const createBackgroundJobService: (config?: Partial<BackgroundJobConfig>) => BackgroundJobService;
export declare const getBackgroundJobService: () => BackgroundJobService;
//# sourceMappingURL=background-job.service.d.ts.map