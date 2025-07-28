/**
 * Background Job Processing Service - Phase 3 Continuous Analysis
 * Handles scheduled statistical analysis jobs and real-time alerting
 */

import * as cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@/shared/logger';
import { statisticalAnalyticsService } from './statistical-analytics.service';
import { WebSocketService } from './websocket.service';
import { AppError } from '@/middleware/error-handler';

export interface JobConfiguration {
  id: string;
  name: string;
  type: 'anomaly_detection' | 'trend_analysis' | 'sla_monitoring' | 'cost_analysis' | 'full_analysis';
  schedule: string; // cron expression
  enabled: boolean;
  pipelineId?: string; // specific pipeline or null for global
  parameters: {
    metric?: 'duration' | 'cpu' | 'memory' | 'success_rate' | 'test_coverage';
    method?: 'z-score' | 'percentile' | 'iqr' | 'all';
    periodDays?: number;
    slaTarget?: number;
    alertThresholds?: {
      anomaly?: 'low' | 'medium' | 'high' | 'critical';
      trend?: 'significant' | 'moderate' | 'minimal';
      sla?: boolean;
      cost?: number; // cost increase percentage threshold
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
  jobTimeout: number; // milliseconds
  enableRealTimeAlerts: boolean;
  historicalDataRetention: number; // days
  enableMetrics: boolean;
}

export class BackgroundJobService {
  private logger: Logger;
  private config: BackgroundJobConfig;
  private jobs: Map<string, JobConfiguration> = new Map();
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private activeExecutions: Map<string, JobExecution> = new Map();
  private executionHistory: JobExecution[] = [];
  private webSocketService: WebSocketService | null = null;
  private isShuttingDown = false;

  private metrics = {
    totalJobsScheduled: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    alertsGenerated: 0,
    lastReset: new Date()
  };

  constructor(config: Partial<BackgroundJobConfig> = {}) {
    this.logger = new Logger('BackgroundJobService');
    
    this.config = {
      maxConcurrentJobs: 5,
      defaultRetryAttempts: 3,
      jobTimeout: 300000, // 5 minutes
      enableRealTimeAlerts: true,
      historicalDataRetention: 30,
      enableMetrics: true,
      ...config
    };

    this.logger.info('Background job service initialized', {
      maxConcurrentJobs: this.config.maxConcurrentJobs,
      enableRealTimeAlerts: this.config.enableRealTimeAlerts
    });
  }

  /**
   * Set WebSocket service for real-time alerts
   */
  public setWebSocketService(webSocketService: WebSocketService): void {
    this.webSocketService = webSocketService;
    this.logger.info('WebSocket service connected for real-time alerts');
  }

  /**
   * Create and schedule a new background job
   */
  public async createJob(jobConfig: Omit<JobConfiguration, 'id' | 'metadata'>): Promise<string> {
    const jobId = uuidv4();
    
    const job: JobConfiguration = {
      id: jobId,
      ...jobConfig,
      metadata: {
        createdBy: 'system', // TODO: get from current user context
        createdAt: new Date(),
        runCount: 0,
        errorCount: 0
      }
    };

    // Validate cron expression
    if (!cron.validate(job.schedule)) {
      throw new AppError(`Invalid cron expression: ${job.schedule}`, 400);
    }

    this.jobs.set(jobId, job);
    this.metrics.totalJobsScheduled++;

    if (job.enabled) {
      await this.scheduleJob(job);
    }

    this.logger.info('Background job created', {
      jobId,
      type: job.type,
      schedule: job.schedule,
      pipelineId: job.pipelineId,
      enabled: job.enabled
    });

    return jobId;
  }

  /**
   * Schedule a job for execution
   */
  private async scheduleJob(job: JobConfiguration): Promise<void> {
    if (this.scheduledTasks.has(job.id)) {
      this.scheduledTasks.get(job.id)?.destroy();
    }

    const task = cron.schedule(job.schedule, async () => {
      if (!this.isShuttingDown) {
        await this.executeJob(job.id);
      }
    });

    this.scheduledTasks.set(job.id, task);
    task.start();

    this.logger.info('Job scheduled', {
      jobId: job.id,
      schedule: job.schedule,
      type: job.type
    });
  }

  /**
   * Execute a specific job
   */
  public async executeJob(jobId: string): Promise<JobExecution> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new AppError(`Job not found: ${jobId}`, 404);
    }

    if (!job.enabled) {
      throw new AppError(`Job is disabled: ${jobId}`, 400);
    }

    // Check concurrent job limit
    if (this.activeExecutions.size >= this.config.maxConcurrentJobs) {
      this.logger.warn('Max concurrent jobs reached, queuing job', {
        jobId,
        activeJobs: this.activeExecutions.size
      });
      // TODO: Implement job queue for later execution
      throw new AppError('Max concurrent jobs limit reached', 429);
    }

    const execution: JobExecution = {
      id: uuidv4(),
      jobId,
      startTime: new Date(),
      status: 'running',
      alertsGenerated: 0
    };

    this.activeExecutions.set(execution.id, execution);
    this.metrics.totalExecutions++;

    this.logger.info('Starting job execution', {
      executionId: execution.id,
      jobId,
      type: job.type,
      pipelineId: job.pipelineId
    });

    try {
      const result = await this.runJobLogic(job, execution);
      
      execution.status = 'completed';
      execution.result = result;
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      // Update job metadata
      job.metadata.lastRun = execution.endTime;
      job.metadata.lastResult = 'success';
      job.metadata.runCount++;

      this.metrics.successfulExecutions++;
      this.updateAverageExecutionTime(execution.duration);

      this.logger.info('Job execution completed', {
        executionId: execution.id,
        jobId,
        duration: execution.duration,
        alertsGenerated: execution.alertsGenerated
      });

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      // Update job metadata
      job.metadata.lastRun = execution.endTime;
      job.metadata.lastResult = 'failure';
      job.metadata.errorCount++;

      this.metrics.failedExecutions++;

      this.logger.error('Job execution failed', {
        executionId: execution.id,
        jobId,
        error: execution.error,
        duration: execution.duration
      });
    } finally {
      this.activeExecutions.delete(execution.id);
      this.executionHistory.push(execution);
      this.cleanupExecutionHistory();
    }

    return execution;
  }

  /**
   * Run the actual job logic based on job type
   */
  private async runJobLogic(job: JobConfiguration, execution: JobExecution): Promise<any> {
    const { type, pipelineId, parameters } = job;
    let result: any = {};

    switch (type) {
      case 'anomaly_detection':
        result = await this.runAnomalyDetectionJob(pipelineId, parameters, execution);
        break;

      case 'trend_analysis':
        result = await this.runTrendAnalysisJob(pipelineId, parameters, execution);
        break;

      case 'sla_monitoring':
        result = await this.runSlaMonitoringJob(pipelineId, parameters, execution);
        break;

      case 'cost_analysis':
        result = await this.runCostAnalysisJob(pipelineId, parameters, execution);
        break;

      case 'full_analysis':
        result = await this.runFullAnalysisJob(pipelineId, parameters, execution);
        break;

      default:
        throw new AppError(`Unknown job type: ${type}`, 400);
    }

    return result;
  }

  /**
   * Run anomaly detection job
   */
  private async runAnomalyDetectionJob(
    pipelineId: string | undefined,
    parameters: JobConfiguration['parameters'],
    execution: JobExecution
  ): Promise<any> {
    const metric = parameters.metric || 'duration';
    const method = parameters.method || 'all';
    const periodDays = parameters.periodDays || 30;

    let anomalies: any[] = [];

    if (pipelineId) {
      anomalies = await statisticalAnalyticsService.analyzePipelineAnomalies(
        pipelineId,
        metric,
        method,
        periodDays
      );
    } else {
      // TODO: Implement global anomaly detection across all pipelines
      this.logger.warn('Global anomaly detection not yet implemented');
    }

    // Filter anomalies based on alert thresholds
    const alertThreshold = parameters.alertThresholds?.anomaly || 'medium';
    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    const minSeverity = severityOrder[alertThreshold];

    const significantAnomalies = anomalies.filter(anomaly => 
      severityOrder[anomaly.severity as keyof typeof severityOrder] >= minSeverity
    );

    // Send real-time alerts for significant anomalies
    if (significantAnomalies.length > 0 && this.config.enableRealTimeAlerts) {
      await this.sendAnomalyAlerts(significantAnomalies, pipelineId, execution);
    }

    return {
      type: 'anomaly_detection',
      pipelineId,
      totalAnomalies: anomalies.length,
      significantAnomalies: significantAnomalies.length,
      anomalies: significantAnomalies,
      parameters: { metric, method, periodDays, alertThreshold }
    };
  }

  /**
   * Run trend analysis job
   */
  private async runTrendAnalysisJob(
    pipelineId: string | undefined,
    parameters: JobConfiguration['parameters'],
    execution: JobExecution
  ): Promise<any> {
    const metric = parameters.metric || 'duration';
    const periodDays = parameters.periodDays || 30;

    let trendResult: any = null;

    if (pipelineId) {
      trendResult = await statisticalAnalyticsService.analyzePipelineTrends(
        pipelineId,
        metric,
        periodDays
      );
    } else {
      // TODO: Implement global trend analysis
      this.logger.warn('Global trend analysis not yet implemented');
    }

    // Check for significant trend changes
    const alertThreshold = parameters.alertThresholds?.trend || 'significant';
    const shouldAlert = this.shouldAlertOnTrend(trendResult, alertThreshold);

    if (shouldAlert && this.config.enableRealTimeAlerts) {
      await this.sendTrendAlert(trendResult, pipelineId, execution);
    }

    return {
      type: 'trend_analysis',
      pipelineId,
      trend: trendResult,
      alertGenerated: shouldAlert,
      parameters: { metric, periodDays, alertThreshold }
    };
  }

  /**
   * Run SLA monitoring job
   */
  private async runSlaMonitoringJob(
    pipelineId: string | undefined,
    parameters: JobConfiguration['parameters'],
    execution: JobExecution
  ): Promise<any> {
    const metric = parameters.metric || 'duration';
    const periodDays = parameters.periodDays || 30;
    const slaTarget = parameters.slaTarget;

    if (!slaTarget) {
      throw new AppError('SLA target is required for SLA monitoring job', 400);
    }

    let slaResult: any = null;

    if (pipelineId) {
      slaResult = await statisticalAnalyticsService.monitorPipelineSLA(
        pipelineId,
        slaTarget,
        metric,
        periodDays
      );
    } else {
      // TODO: Implement global SLA monitoring
      this.logger.warn('Global SLA monitoring not yet implemented');
    }

    // Send alert if SLA is violated
    if (slaResult?.violated && this.config.enableRealTimeAlerts) {
      await this.sendSlaViolationAlert(slaResult, pipelineId, execution);
    }

    return {
      type: 'sla_monitoring',
      pipelineId,
      sla: slaResult,
      alertGenerated: slaResult?.violated || false,
      parameters: { metric, periodDays, slaTarget }
    };
  }

  /**
   * Run cost analysis job
   */
  private async runCostAnalysisJob(
    pipelineId: string | undefined,
    parameters: JobConfiguration['parameters'],
    execution: JobExecution
  ): Promise<any> {
    const periodDays = parameters.periodDays || 30;

    let costResult: any = null;

    if (pipelineId) {
      costResult = await statisticalAnalyticsService.analyzePipelineCostTrends(
        pipelineId,
        periodDays
      );
    } else {
      // TODO: Implement global cost analysis
      this.logger.warn('Global cost analysis not yet implemented');
    }

    // Check for cost threshold alerts
    const costThreshold = parameters.alertThresholds?.cost || 20; // 20% increase
    const shouldAlert = this.shouldAlertOnCost(costResult, costThreshold);

    if (shouldAlert && this.config.enableRealTimeAlerts) {
      await this.sendCostAlert(costResult, pipelineId, execution);
    }

    return {
      type: 'cost_analysis',
      pipelineId,
      cost: costResult,
      alertGenerated: shouldAlert,
      parameters: { periodDays, costThreshold }
    };
  }

  /**
   * Run full analysis job (all analysis types)
   */
  private async runFullAnalysisJob(
    pipelineId: string | undefined,
    parameters: JobConfiguration['parameters'],
    execution: JobExecution
  ): Promise<any> {
    const results: any = {
      anomalies: await this.runAnomalyDetectionJob(pipelineId, parameters, execution),
      trends: await this.runTrendAnalysisJob(pipelineId, parameters, execution),
      costs: await this.runCostAnalysisJob(pipelineId, parameters, execution)
    };

    // Add SLA monitoring if target is provided
    if (parameters.slaTarget) {
      results.sla = await this.runSlaMonitoringJob(pipelineId, parameters, execution);
    }

    return {
      type: 'full_analysis',
      pipelineId,
      results,
      totalAlerts: Object.values(results).reduce((sum: number, result: any) => 
        sum + (result.alertGenerated ? 1 : 0), 0
      )
    };
  }

  /**
   * Send anomaly alerts via WebSocket
   */
  private async sendAnomalyAlerts(
    anomalies: any[],
    pipelineId: string | undefined,
    execution: JobExecution
  ): Promise<void> {
    if (!this.webSocketService) return;

    for (const anomaly of anomalies) {
      const alertData: any = {
        type: 'anomaly' as const,
        timestamp: new Date(),
        data: anomaly,
        severity: anomaly.severity,
        metadata: {
          jobExecutionId: execution.id,
          analysisType: 'background_job'
        }
      };

      // Only include pipelineId if it exists
      if (pipelineId) {
        alertData.pipelineId = pipelineId;
      }

      // Publish to WebSocket service for real-time alerts
      this.webSocketService.publishStatisticalUpdate(alertData);
      execution.alertsGenerated++;
      this.metrics.alertsGenerated++;

      this.logger.info('Anomaly alert sent', {
        pipelineId,
        severity: anomaly.severity,
        value: anomaly.value
      });
    }
  }

  /**
   * Send trend alerts via WebSocket
   */
  private async sendTrendAlert(
    trendResult: any,
    pipelineId: string | undefined,
    execution: JobExecution
  ): Promise<void> {
    if (!this.webSocketService) return;

    const alertData: any = {
      type: 'trend' as const,
      timestamp: new Date(),
      data: trendResult,
      severity: this.getTrendSeverity(trendResult),
      metadata: {
        jobExecutionId: execution.id,
        analysisType: 'background_job'
      }
    };

    // Only include pipelineId if it exists
    if (pipelineId) {
      alertData.pipelineId = pipelineId;
    }

    // Publish to WebSocket service for real-time alerts
    this.webSocketService.publishStatisticalUpdate(alertData);
    execution.alertsGenerated++;
    this.metrics.alertsGenerated++;

    this.logger.info('Trend alert sent', {
      pipelineId,
      trend: trendResult.trend,
      correlation: trendResult.correlation
    });
  }

  /**
   * Send SLA violation alerts via WebSocket
   */
  private async sendSlaViolationAlert(
    slaResult: any,
    pipelineId: string | undefined,
    execution: JobExecution
  ): Promise<void> {
    if (!this.webSocketService) return;

    const alertData: any = {
      type: 'sla_violation' as const,
      timestamp: new Date(),
      data: slaResult,
      severity: slaResult.severity || 'medium',
      metadata: {
        jobExecutionId: execution.id,
        analysisType: 'background_job'
      }
    };

    // Only include pipelineId if it exists
    if (pipelineId) {
      alertData.pipelineId = pipelineId;
    }

    // Publish to WebSocket service for real-time alerts
    this.webSocketService.publishStatisticalUpdate(alertData);
    execution.alertsGenerated++;
    this.metrics.alertsGenerated++;

    this.logger.warn('SLA violation alert sent', {
      pipelineId,
      violation: slaResult.violationPercent,
      severity: slaResult.severity
    });
  }

  /**
   * Send cost alerts via WebSocket
   */
  private async sendCostAlert(
    costResult: any,
    pipelineId: string | undefined,
    execution: JobExecution
  ): Promise<void> {
    if (!this.webSocketService) return;

    const alertData: any = {
      type: 'cost_alert' as const,
      timestamp: new Date(),
      data: costResult,
      severity: this.getCostSeverity(costResult),
      metadata: {
        jobExecutionId: execution.id,
        analysisType: 'background_job'
      }
    };

    // Only include pipelineId if it exists
    if (pipelineId) {
      alertData.pipelineId = pipelineId;
    }

    // Publish to WebSocket service for real-time alerts
    this.webSocketService.publishStatisticalUpdate(alertData);
    execution.alertsGenerated++;
    this.metrics.alertsGenerated++;

    this.logger.warn('Cost alert sent', {
      pipelineId,
      totalCost: costResult.totalCost,
      efficiency: costResult.efficiency?.score
    });
  }

  /**
   * Helper methods for determining alert conditions
   */
  private shouldAlertOnTrend(trendResult: any, threshold: string): boolean {
    if (!trendResult) return false;
    
    const significance = Math.abs(trendResult.slope || 0);
    
    switch (threshold) {
      case 'significant':
        return significance > 0.1 && Math.abs(trendResult.correlation || 0) > 0.7;
      case 'moderate':
        return significance > 0.05 && Math.abs(trendResult.correlation || 0) > 0.5;
      default:
        return significance > 0.02;
    }
  }

  private shouldAlertOnCost(costResult: any, thresholdPercent: number): boolean {
    if (!costResult?.efficiency?.score) return false;
    
    // Alert if efficiency drops below threshold or cost increase detected
    return costResult.efficiency.score < (100 - thresholdPercent) ||
           (costResult.optimizationOpportunities?.length > 0 && 
            costResult.optimizationOpportunities.some((op: any) => op.priority === 'high' || op.priority === 'critical'));
  }

  private getTrendSeverity(trendResult: any): 'low' | 'medium' | 'high' | 'critical' {
    const significance = Math.abs(trendResult?.slope || 0);
    const correlation = Math.abs(trendResult?.correlation || 0);
    
    if (significance > 0.2 && correlation > 0.8) return 'critical';
    if (significance > 0.1 && correlation > 0.7) return 'high';
    if (significance > 0.05 && correlation > 0.5) return 'medium';
    return 'low';
  }

  private getCostSeverity(costResult: any): 'low' | 'medium' | 'high' | 'critical' {
    const efficiency = costResult?.efficiency?.score || 100;
    
    if (efficiency < 50) return 'critical';
    if (efficiency < 70) return 'high';
    if (efficiency < 85) return 'medium';
    return 'low';
  }

  /**
   * Job management methods
   */
  public async enableJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new AppError(`Job not found: ${jobId}`, 404);
    }

    job.enabled = true;
    await this.scheduleJob(job);

    this.logger.info('Job enabled', { jobId });
  }

  public async disableJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new AppError(`Job not found: ${jobId}`, 404);
    }

    job.enabled = false;
    const task = this.scheduledTasks.get(jobId);
    if (task) {
      task.destroy();
      this.scheduledTasks.delete(jobId);
    }

    this.logger.info('Job disabled', { jobId });
  }

  public async deleteJob(jobId: string): Promise<void> {
    await this.disableJob(jobId);
    this.jobs.delete(jobId);
    
    this.logger.info('Job deleted', { jobId });
  }

  /**
   * Get job status and information
   */
  public async getJobStatus(jobId: string): Promise<JobConfiguration & { 
    currentExecution?: JobExecution | undefined;
    recentExecutions: JobExecution[];
    isActive: boolean;
  }> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new AppError(`Job not found: ${jobId}`, 404);
    }

    // Find current execution
    const currentExecution = Array.from(this.activeExecutions.values())
      .find(execution => execution.jobId === jobId);

    // Get recent executions for this job
    const recentExecutions = this.executionHistory
      .filter(execution => execution.jobId === jobId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 10);

    return {
      ...job,
      currentExecution,
      recentExecutions,
      isActive: !!currentExecution
    };
  }

  /**
   * Cancel a running job execution
   */
  public async cancelJob(jobId: string): Promise<{ cancelled: boolean; message: string }> {
    const currentExecution = Array.from(this.activeExecutions.values())
      .find(execution => execution.jobId === jobId);

    if (!currentExecution) {
      return {
        cancelled: false,
        message: 'No active execution found for this job'
      };
    }

    // Mark execution as cancelled
    currentExecution.status = 'cancelled';
    currentExecution.endTime = new Date();
    currentExecution.duration = currentExecution.endTime.getTime() - currentExecution.startTime.getTime();

    // Remove from active executions
    this.activeExecutions.delete(currentExecution.id);

    // Add to history
    this.executionHistory.push(currentExecution);

    this.logger.info('Job execution cancelled', {
      executionId: currentExecution.id,
      jobId,
      duration: currentExecution.duration
    });

    return {
      cancelled: true,
      message: 'Job execution cancelled successfully'
    };
  }

  /**
   * Get all jobs
   */
  public getAllJobs(): JobConfiguration[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get job execution history
   */
  public getExecutionHistory(jobId?: string): JobExecution[] {
    const history = jobId 
      ? this.executionHistory.filter(execution => execution.jobId === jobId)
      : this.executionHistory;
    
    return history.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Get service metrics
   */
  public getMetrics() {
    const now = new Date();
    const uptime = now.getTime() - this.metrics.lastReset.getTime();
    
    return {
      ...this.metrics,
      uptime,
      activeJobs: this.activeExecutions.size,
      scheduledJobs: this.scheduledTasks.size,
      totalJobs: this.jobs.size,
      successRate: this.metrics.totalExecutions > 0 
        ? (this.metrics.successfulExecutions / this.metrics.totalExecutions) * 100 
        : 0
    };
  }

  /**
   * Utility methods
   */
  private updateAverageExecutionTime(duration: number): void {
    const totalTime = this.metrics.averageExecutionTime * (this.metrics.successfulExecutions - 1) + duration;
    this.metrics.averageExecutionTime = totalTime / this.metrics.successfulExecutions;
  }

  private cleanupExecutionHistory(): void {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.config.historicalDataRetention);
    
    this.executionHistory = this.executionHistory.filter(
      execution => execution.startTime >= retentionDate
    );
  }

  /**
   * Shutdown service gracefully
   */
  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    this.logger.info('Shutting down background job service...');

    // Stop all scheduled tasks
    for (const [jobId, task] of this.scheduledTasks) {
      task.destroy();
      this.logger.info('Stopped scheduled task', { jobId });
    }
    this.scheduledTasks.clear();

    // Wait for active executions to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.activeExecutions.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
      this.logger.info('Waiting for active jobs to complete', {
        activeJobs: this.activeExecutions.size
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (this.activeExecutions.size > 0) {
      this.logger.warn('Forcefully terminating remaining jobs', {
        remainingJobs: this.activeExecutions.size
      });
      this.activeExecutions.clear();
    }

    this.logger.info('Background job service shutdown complete');
  }
}

// Export singleton instance
let _backgroundJobService: BackgroundJobService | undefined;

export const createBackgroundJobService = (config?: Partial<BackgroundJobConfig>): BackgroundJobService => {
  if (_backgroundJobService) {
    throw new Error('Background job service already initialized');
  }
  _backgroundJobService = new BackgroundJobService(config);
  return _backgroundJobService;
};

export const getBackgroundJobService = (): BackgroundJobService => {
  if (!_backgroundJobService) {
    throw new Error('Background job service not initialized. Call createBackgroundJobService() first.');
  }
  return _backgroundJobService;
};
