"use strict";
/**
 * Background Job Processing Service - Phase 3 Continuous Analysis
 * Handles scheduled statistical analysis jobs and real-time alerting
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBackgroundJobService = exports.createBackgroundJobService = exports.BackgroundJobService = void 0;
const cron = __importStar(require("node-cron"));
const uuid_1 = require("uuid");
const logger_1 = require("../shared/logger");
const statistical_analytics_service_1 = require("./statistical-analytics.service");
const error_handler_1 = require("../middleware/error-handler");
class BackgroundJobService {
    logger;
    config;
    jobs = new Map();
    scheduledTasks = new Map();
    activeExecutions = new Map();
    executionHistory = [];
    webSocketService = null;
    isShuttingDown = false;
    metrics = {
        totalJobsScheduled: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        alertsGenerated: 0,
        lastReset: new Date()
    };
    constructor(config = {}) {
        this.logger = new logger_1.Logger('BackgroundJobService');
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
    setWebSocketService(webSocketService) {
        this.webSocketService = webSocketService;
        this.logger.info('WebSocket service connected for real-time alerts');
    }
    /**
     * Create and schedule a new background job
     */
    async createJob(jobConfig) {
        const jobId = (0, uuid_1.v4)();
        const job = {
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
            throw new error_handler_1.AppError(`Invalid cron expression: ${job.schedule}`, 400);
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
    async scheduleJob(job) {
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
    async executeJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            throw new error_handler_1.AppError(`Job not found: ${jobId}`, 404);
        }
        if (!job.enabled) {
            throw new error_handler_1.AppError(`Job is disabled: ${jobId}`, 400);
        }
        // Check concurrent job limit
        if (this.activeExecutions.size >= this.config.maxConcurrentJobs) {
            this.logger.warn('Max concurrent jobs reached, queuing job', {
                jobId,
                activeJobs: this.activeExecutions.size
            });
            // TODO: Implement job queue for later execution
            throw new error_handler_1.AppError('Max concurrent jobs limit reached', 429);
        }
        const execution = {
            id: (0, uuid_1.v4)(),
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
        }
        catch (error) {
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
        }
        finally {
            this.activeExecutions.delete(execution.id);
            this.executionHistory.push(execution);
            this.cleanupExecutionHistory();
        }
        return execution;
    }
    /**
     * Run the actual job logic based on job type
     */
    async runJobLogic(job, execution) {
        const { type, pipelineId, parameters } = job;
        let result = {};
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
                throw new error_handler_1.AppError(`Unknown job type: ${type}`, 400);
        }
        return result;
    }
    /**
     * Run anomaly detection job
     */
    async runAnomalyDetectionJob(pipelineId, parameters, execution) {
        const metric = parameters.metric || 'duration';
        const method = parameters.method || 'all';
        const periodDays = parameters.periodDays || 30;
        let anomalies = [];
        if (pipelineId) {
            anomalies = await statistical_analytics_service_1.statisticalAnalyticsService.analyzePipelineAnomalies(pipelineId, metric, method, periodDays);
        }
        else {
            // TODO: Implement global anomaly detection across all pipelines
            this.logger.warn('Global anomaly detection not yet implemented');
        }
        // Filter anomalies based on alert thresholds
        const alertThreshold = parameters.alertThresholds?.anomaly || 'medium';
        const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        const minSeverity = severityOrder[alertThreshold];
        const significantAnomalies = anomalies.filter(anomaly => severityOrder[anomaly.severity] >= minSeverity);
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
    async runTrendAnalysisJob(pipelineId, parameters, execution) {
        const metric = parameters.metric || 'duration';
        const periodDays = parameters.periodDays || 30;
        let trendResult = null;
        if (pipelineId) {
            trendResult = await statistical_analytics_service_1.statisticalAnalyticsService.analyzePipelineTrends(pipelineId, metric, periodDays);
        }
        else {
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
    async runSlaMonitoringJob(pipelineId, parameters, execution) {
        const metric = parameters.metric || 'duration';
        const periodDays = parameters.periodDays || 30;
        const slaTarget = parameters.slaTarget;
        if (!slaTarget) {
            throw new error_handler_1.AppError('SLA target is required for SLA monitoring job', 400);
        }
        let slaResult = null;
        if (pipelineId) {
            slaResult = await statistical_analytics_service_1.statisticalAnalyticsService.monitorPipelineSLA(pipelineId, slaTarget, metric, periodDays);
        }
        else {
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
    async runCostAnalysisJob(pipelineId, parameters, execution) {
        const periodDays = parameters.periodDays || 30;
        let costResult = null;
        if (pipelineId) {
            costResult = await statistical_analytics_service_1.statisticalAnalyticsService.analyzePipelineCostTrends(pipelineId, periodDays);
        }
        else {
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
    async runFullAnalysisJob(pipelineId, parameters, execution) {
        const results = {
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
            totalAlerts: Object.values(results).reduce((sum, result) => sum + (result.alertGenerated ? 1 : 0), 0)
        };
    }
    /**
     * Send anomaly alerts via WebSocket
     */
    async sendAnomalyAlerts(anomalies, pipelineId, execution) {
        if (!this.webSocketService)
            return;
        for (const anomaly of anomalies) {
            const alertData = {
                type: 'anomaly',
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
    async sendTrendAlert(trendResult, pipelineId, execution) {
        if (!this.webSocketService)
            return;
        const alertData = {
            type: 'trend',
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
    async sendSlaViolationAlert(slaResult, pipelineId, execution) {
        if (!this.webSocketService)
            return;
        const alertData = {
            type: 'sla_violation',
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
    async sendCostAlert(costResult, pipelineId, execution) {
        if (!this.webSocketService)
            return;
        const alertData = {
            type: 'cost_alert',
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
    shouldAlertOnTrend(trendResult, threshold) {
        if (!trendResult)
            return false;
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
    shouldAlertOnCost(costResult, thresholdPercent) {
        if (!costResult?.efficiency?.score)
            return false;
        // Alert if efficiency drops below threshold or cost increase detected
        return costResult.efficiency.score < (100 - thresholdPercent) ||
            (costResult.optimizationOpportunities?.length > 0 &&
                costResult.optimizationOpportunities.some((op) => op.priority === 'high' || op.priority === 'critical'));
    }
    getTrendSeverity(trendResult) {
        const significance = Math.abs(trendResult?.slope || 0);
        const correlation = Math.abs(trendResult?.correlation || 0);
        if (significance > 0.2 && correlation > 0.8)
            return 'critical';
        if (significance > 0.1 && correlation > 0.7)
            return 'high';
        if (significance > 0.05 && correlation > 0.5)
            return 'medium';
        return 'low';
    }
    getCostSeverity(costResult) {
        const efficiency = costResult?.efficiency?.score || 100;
        if (efficiency < 50)
            return 'critical';
        if (efficiency < 70)
            return 'high';
        if (efficiency < 85)
            return 'medium';
        return 'low';
    }
    /**
     * Job management methods
     */
    async enableJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            throw new error_handler_1.AppError(`Job not found: ${jobId}`, 404);
        }
        job.enabled = true;
        await this.scheduleJob(job);
        this.logger.info('Job enabled', { jobId });
    }
    async disableJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            throw new error_handler_1.AppError(`Job not found: ${jobId}`, 404);
        }
        job.enabled = false;
        const task = this.scheduledTasks.get(jobId);
        if (task) {
            task.destroy();
            this.scheduledTasks.delete(jobId);
        }
        this.logger.info('Job disabled', { jobId });
    }
    async deleteJob(jobId) {
        await this.disableJob(jobId);
        this.jobs.delete(jobId);
        this.logger.info('Job deleted', { jobId });
    }
    /**
     * Get job status and information
     */
    async getJobStatus(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            throw new error_handler_1.AppError(`Job not found: ${jobId}`, 404);
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
    async cancelJob(jobId) {
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
    getAllJobs() {
        return Array.from(this.jobs.values());
    }
    /**
     * Get job execution history
     */
    getExecutionHistory(jobId) {
        const history = jobId
            ? this.executionHistory.filter(execution => execution.jobId === jobId)
            : this.executionHistory;
        return history.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    }
    /**
     * Get service metrics
     */
    getMetrics() {
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
    updateAverageExecutionTime(duration) {
        const totalTime = this.metrics.averageExecutionTime * (this.metrics.successfulExecutions - 1) + duration;
        this.metrics.averageExecutionTime = totalTime / this.metrics.successfulExecutions;
    }
    cleanupExecutionHistory() {
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - this.config.historicalDataRetention);
        this.executionHistory = this.executionHistory.filter(execution => execution.startTime >= retentionDate);
    }
    /**
     * Shutdown service gracefully
     */
    async shutdown() {
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
exports.BackgroundJobService = BackgroundJobService;
// Export singleton instance
let _backgroundJobService;
const createBackgroundJobService = (config) => {
    if (_backgroundJobService) {
        throw new Error('Background job service already initialized');
    }
    _backgroundJobService = new BackgroundJobService(config);
    return _backgroundJobService;
};
exports.createBackgroundJobService = createBackgroundJobService;
const getBackgroundJobService = () => {
    if (!_backgroundJobService) {
        throw new Error('Background job service not initialized. Call createBackgroundJobService() first.');
    }
    return _backgroundJobService;
};
exports.getBackgroundJobService = getBackgroundJobService;
//# sourceMappingURL=background-job.service.js.map