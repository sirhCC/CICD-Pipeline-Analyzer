import { Repository } from 'typeorm';
import { Logger } from '../shared/logger';
import { 
  PipelineMetrics, 
  FailurePattern, 
  OptimizationRecommendation, 
  AnalyticsAlert 
} from '../entities/pipeline-metrics.entity';
import { Pipeline, PipelineRun } from '../entities';
import { PipelineStatus } from '../types';
import { AppError } from '../middleware/error-handler';
import { repositoryFactory } from '../repositories/factory.enhanced';

const logger = new Logger('AnalyticsService');

export interface AnalyticsConfig {
  enableRealTimeAnalysis: boolean;
  metricRetentionDays: number;
  alertThresholds: {
    failureRate: number;
    avgDuration: number;
    errorSpike: number;
  };
  batchSize: number;
  analysisInterval: number; // minutes
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
export class AnalyticsService {
  private metricsRepo: Repository<PipelineMetrics>;
  private failurePatternsRepo: Repository<FailurePattern>;
  private optimizationRepo: Repository<OptimizationRecommendation>;
  private alertsRepo: Repository<AnalyticsAlert>;
  private pipelineRepo: Repository<Pipeline>;
  private pipelineRunRepo: Repository<PipelineRun>;
  
  private config: AnalyticsConfig;
  private analysisInProgress = false;
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<AnalyticsConfig>) {
    this.config = {
      enableRealTimeAnalysis: true,
      metricRetentionDays: 90,
      alertThresholds: {
        failureRate: 0.15, // 15%
        avgDuration: 1800, // 30 minutes
        errorSpike: 5 // 5x normal rate
      },
      batchSize: 100,
      analysisInterval: 15, // 15 minutes
      ...config
    };

    // Initialize repositories
    this.metricsRepo = repositoryFactory.getRepository(PipelineMetrics);
    this.failurePatternsRepo = repositoryFactory.getRepository(FailurePattern);
    this.optimizationRepo = repositoryFactory.getRepository(OptimizationRecommendation);
    this.alertsRepo = repositoryFactory.getRepository(AnalyticsAlert);
    this.pipelineRepo = repositoryFactory.getRepository(Pipeline);
    this.pipelineRunRepo = repositoryFactory.getRepository(PipelineRun);

    if (this.config.enableRealTimeAnalysis) {
      this.startRealTimeAnalysis();
    }
  }

  /**
   * Calculate and store pipeline metrics
   */
  async calculateMetrics(
    pipelineId: string, 
    period: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<MetricCalculationResult[]> {
    try {
      logger.info('Calculating metrics for pipeline', { pipelineId, period });

      const pipeline = await this.pipelineRepo.findOne({ where: { id: pipelineId } });
      if (!pipeline) {
        throw new AppError('Pipeline not found', 404);
      }

      const { startDate, endDate } = this.getPeriodRange(period);
      
      // Get pipeline runs for the period
      const runs = await this.pipelineRunRepo.find({
        where: { 
          pipelineId,
          startedAt: { $gte: startDate, $lte: endDate } as any
        },
        order: { startedAt: 'ASC' }
      });

      const results: MetricCalculationResult[] = [];
      const timestamp = new Date();

      // Calculate success rate
      const successRate = this.calculateSuccessRate(runs);
      results.push({
        metricType: 'success_rate',
        value: successRate,
        timestamp,
        aggregationPeriod: period,
        metadata: { totalRuns: runs.length }
      });

      // Calculate average duration
      const avgDuration = this.calculateAverageDuration(runs);
      results.push({
        metricType: 'avg_duration',
        value: avgDuration,
        timestamp,
        aggregationPeriod: period,
        metadata: { unit: 'seconds' }
      });

      // Calculate failure count
      const failureCount = runs.filter(run => run.status === 'failed').length;
      results.push({
        metricType: 'failure_count',
        value: failureCount,
        timestamp,
        aggregationPeriod: period
      });

      // Calculate throughput (runs per day)
      const throughput = this.calculateThroughput(runs, period);
      results.push({
        metricType: 'throughput',
        value: throughput,
        timestamp,
        aggregationPeriod: period,
        metadata: { unit: 'runs_per_day' }
      });

      // Store metrics in database
      await this.storeMetrics(pipelineId, results);

      logger.info('Metrics calculated successfully', { 
        pipelineId, 
        period, 
        metricsCount: results.length 
      });

      // Add pipelineId to all results
      const resultsWithPipelineId = results.map(result => ({
        ...result,
        pipelineId
      }));

      return resultsWithPipelineId;
    } catch (error) {
      logger.error('Failed to calculate metrics', { pipelineId, period, error });
      throw error;
    }
  }

  /**
   * Detect failure patterns in pipeline runs
   */
  async detectFailurePatterns(pipelineId?: string): Promise<FailurePatternResult[]> {
    try {
      logger.info('Detecting failure patterns', { pipelineId });

      const query = pipelineId 
        ? { pipelineId, status: 'failed' }
        : { status: 'failed' };

      // Get recent failed runs
      const failedRuns = await this.pipelineRunRepo.find({
        where: query as any,
        order: { startedAt: 'DESC' },
        take: 1000 // Analyze last 1000 failures
      });

      const patterns: FailurePatternResult[] = [];

      // Detect recurring failures
      const recurringPatterns = this.detectRecurringFailures(failedRuns);
      patterns.push(...recurringPatterns);

      // Detect timeout patterns
      const timeoutPatterns = this.detectTimeoutPatterns(failedRuns);
      patterns.push(...timeoutPatterns);

      // Detect dependency failures
      const dependencyPatterns = this.detectDependencyFailures(failedRuns);
      patterns.push(...dependencyPatterns);

      // Store detected patterns
      await this.storeFailurePatterns(pipelineId, patterns);

      logger.info('Failure patterns detected', { 
        pipelineId, 
        patternsCount: patterns.length 
      });

      return patterns;
    } catch (error) {
      logger.error('Failed to detect failure patterns', { pipelineId, error });
      throw error;
    }
  }

  /**
   * Generate optimization recommendations
   */
  async generateOptimizationRecommendations(pipelineId: string): Promise<OptimizationResult[]> {
    try {
      logger.info('Generating optimization recommendations', { pipelineId });

      const pipeline = await this.pipelineRepo.findOne({ where: { id: pipelineId } });
      if (!pipeline) {
        throw new AppError('Pipeline not found', 404);
      }

      // Get recent metrics and runs
      const recentMetrics = await this.getRecentMetrics(pipelineId, 30); // Last 30 days
      const recentRuns = await this.pipelineRunRepo.find({
        where: { pipelineId },
        order: { startedAt: 'DESC' },
        take: 100
      });

      const recommendations: OptimizationResult[] = [];

      // Analyze performance bottlenecks
      const performanceRecs = this.analyzePerformanceBottlenecks(recentRuns, recentMetrics);
      recommendations.push(...performanceRecs);

      // Analyze resource utilization
      const resourceRecs = this.analyzeResourceUtilization(recentRuns);
      recommendations.push(...resourceRecs);

      // Analyze failure patterns for optimization
      const reliabilityRecs = this.analyzeReliabilityOptimizations(recentRuns);
      recommendations.push(...reliabilityRecs);

      // Store recommendations
      await this.storeOptimizationRecommendations(pipelineId, recommendations);

      logger.info('Optimization recommendations generated', { 
        pipelineId, 
        recommendationsCount: recommendations.length 
      });

      return recommendations;
    } catch (error) {
      logger.error('Failed to generate optimization recommendations', { pipelineId, error });
      throw error;
    }
  }

  /**
   * Generate intelligent alerts based on analytics
   */
  async generateAlerts(pipelineId?: string): Promise<AlertResult[]> {
    try {
      logger.info('Generating analytics alerts', { pipelineId });

      const alerts: AlertResult[] = [];

      // Check for performance degradation
      const perfAlerts = await this.checkPerformanceDegradation(pipelineId);
      alerts.push(...perfAlerts);

      // Check for failure spikes
      const failureAlerts = await this.checkFailureSpikes(pipelineId);
      alerts.push(...failureAlerts);

      // Check for resource waste
      const resourceAlerts = await this.checkResourceWaste(pipelineId);
      alerts.push(...resourceAlerts);

      // Store alerts
      await this.storeAlerts(pipelineId, alerts);

      logger.info('Analytics alerts generated', { 
        pipelineId, 
        alertsCount: alerts.length 
      });

      return alerts;
    } catch (error) {
      logger.error('Failed to generate alerts', { pipelineId, error });
      throw error;
    }
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(pipelineId?: string, period: string = 'daily') {
    try {
      const whereClause = pipelineId ? { pipelineId } : {};

      const [metrics, patterns, recommendations, alerts, recentRuns] = await Promise.all([
        this.metricsRepo.find({
          where: { 
            ...whereClause,
            aggregationPeriod: period 
          },
          order: { timestamp: 'DESC' },
          take: 100
        }),
        this.failurePatternsRepo.find({
          where: { ...whereClause, active: true },
          order: { detectedAt: 'DESC' },
          take: 20
        }),
        this.optimizationRepo.find({
          where: { ...whereClause, implemented: false },
          order: { createdAt: 'DESC' },
          take: 10
        }),
        this.alertsRepo.find({
          where: { ...whereClause, acknowledged: false },
          order: { createdAt: 'DESC' },
          take: 50
        }),
        this.pipelineRunRepo.find({
          where: whereClause,
          order: { startedAt: 'DESC' },
          take: 20
        })
      ]);

      // Create recent activity from pipeline runs
      const recentActivity = recentRuns.map(run => ({
        id: run.id,
        pipelineId: run.pipelineId,
        status: run.status,
        startedAt: run.startedAt,
        duration: run.duration,
        triggeredBy: run.triggeredBy
      }));

      // Create top failures from patterns
      const topFailures = patterns.slice(0, 5).map(pattern => ({
        id: pattern.id,
        patternType: pattern.patternType,
        frequency: pattern.occurrenceCount,
        description: pattern.description,
        impact: pattern.severity
      }));

      // Create performance trends from metrics
      const performanceTrends = metrics.filter(m => m.metricType === 'avg_duration' || m.metricType === 'success_rate')
        .slice(0, 10).map(metric => ({
          timestamp: metric.timestamp,
          metricType: metric.metricType,
          value: metric.value,
          period: metric.aggregationPeriod
        }));

      return {
        metrics,
        patterns,
        recommendations,
        alerts,
        recentActivity,
        topFailures,
        performanceTrends,
        summary: this.generateSummary(metrics, patterns, recommendations, alerts)
      };
    } catch (error) {
      logger.error('Failed to get dashboard data', { pipelineId, period, error });
      throw error;
    }
  }

  /**
   * Generate comprehensive dashboard data
   */
  async generateDashboard(options: {
    timeRange?: string;
    pipelineId?: string;
  } = {}): Promise<any> {
    try {
      logger.info('Generating analytics dashboard', options);
      
      const { timeRange = 'daily', pipelineId } = options;
      
      // Get dashboard data
      const dashboardData = await this.getDashboardData(pipelineId, timeRange);
      
      // Get additional analytics
      const [metrics, patterns, recommendations, alerts] = await Promise.all([
        pipelineId ? this.calculateMetrics(pipelineId, timeRange as 'hourly' | 'daily' | 'weekly' | 'monthly') : Promise.resolve([]),
        this.detectFailurePatterns(pipelineId),
        pipelineId ? this.generateOptimizationRecommendations(pipelineId) : Promise.resolve([]),
        this.generateAlerts(pipelineId)
      ]);
      
      // Get pipeline counts and statistics
      const totalPipelines = await this.pipelineRepo.count();
      const activePipelines = await this.pipelineRepo.count({ where: { isActive: true } });
      
      // Calculate total runs and success rate from all recent runs
      const allRuns = await this.pipelineRunRepo.find({
        order: { startedAt: 'DESC' },
        take: 1000 // Last 1000 runs for stats
      });
      
      const totalRuns = allRuns.length;
      const successfulRuns = allRuns.filter(run => run.status === PipelineStatus.SUCCESS).length;
      const successRate = totalRuns > 0 ? successfulRuns / totalRuns : 0;
      const averageDuration = totalRuns > 0 ? 
        allRuns.reduce((sum, run) => sum + (run.duration || 0), 0) / totalRuns : 0;
      
      return {
        ...dashboardData,
        summary: {
          totalPipelines,
          activePipelines,
          totalRuns,
          successRate,
          averageDuration,
          recentFailures: patterns.length,
          criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
          pendingRecommendations: recommendations.length
        },
        metrics: metrics.slice(0, 10), // Latest 10 metrics
        patterns: patterns.slice(0, 5), // Top 5 patterns
        recommendations: recommendations.slice(0, 3), // Top 3 recommendations
        alerts: alerts.filter(a => a.severity === 'critical' || a.severity === 'error').slice(0, 5) // Important alerts
      };
    } catch (error: any) {
      logger.error('Failed to generate dashboard', { error: error.message, options });
      throw error;
    }
  }

  /**
   * Run analytics analysis asynchronously
   */
  async analyzeAsync(pipelineId?: string): Promise<void> {
    try {
      logger.info('Starting async analytics analysis', { pipelineId });
      
      // Run the analysis cycle
      if (pipelineId) {
        await this.runAnalysisCycle(pipelineId);
      } else {
        // Run for all pipelines
        const pipelines = await this.pipelineRepo.find({ where: { isActive: true } });
        
        for (const pipeline of pipelines) {
          await this.runAnalysisCycle(pipeline.id);
        }
      }
      
      logger.info('Async analytics analysis completed', { pipelineId });
    } catch (error: any) {
      logger.error('Async analytics analysis failed', { 
        pipelineId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update alert status (acknowledge/resolve)
   */
  async updateAlert(alertId: string, updates: {
    acknowledged?: boolean;
    status?: 'active' | 'resolved' | 'muted';
    acknowledgedBy?: string;
    notes?: string;
  }): Promise<any> {
    try {
      logger.info('Updating alert', { alertId, updates });
      
      const alert = await this.alertsRepo.findOne({ where: { id: alertId } });
      
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }
      
      // Update alert properties
      if (updates.acknowledged !== undefined) {
        alert.acknowledged = updates.acknowledged;
        if (updates.acknowledged) {
          alert.acknowledgedAt = new Date();
        }
      }
      
      if (updates.status) {
        alert.active = updates.status === 'active';
      }
      
      if (updates.acknowledgedBy) {
        alert.acknowledgedBy = updates.acknowledgedBy;
      }
      
      await this.alertsRepo.save(alert);
      
      logger.info('Alert updated successfully', { alertId });
      return alert;
    } catch (error: any) {
      logger.error('Failed to update alert', { alertId, error: error.message });
      throw error;
    }
  }

  // Private helper methods

  private async startRealTimeAnalysis() {
    const intervalMs = this.config.analysisInterval * 60 * 1000;
    
    this.analysisInterval = setInterval(async () => {
      if (this.analysisInProgress) return;
      
      try {
        this.analysisInProgress = true;
        logger.debug('Starting real-time analysis cycle');
        
        // Run analytics for all active pipelines
        const activePipelines = await this.pipelineRepo.find({ 
          where: { isActive: true } 
        });

        for (const pipeline of activePipelines) {
          await this.runAnalysisCycle(pipeline.id);
        }
        
        logger.debug('Real-time analysis cycle completed');
      } catch (error) {
        logger.error('Real-time analysis cycle failed', { error });
      } finally {
        this.analysisInProgress = false;
      }
    }, intervalMs);
  }

  public stopRealTimeAnalysis() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

  private async runAnalysisCycle(pipelineId: string) {
    try {
      // Calculate metrics for multiple periods
      await Promise.all([
        this.calculateMetrics(pipelineId, 'hourly'),
        this.calculateMetrics(pipelineId, 'daily')
      ]);

      // Detect patterns and generate recommendations/alerts
      await Promise.all([
        this.detectFailurePatterns(pipelineId),
        this.generateOptimizationRecommendations(pipelineId),
        this.generateAlerts(pipelineId)
      ]);
    } catch (error) {
      logger.error('Analysis cycle failed for pipeline', { pipelineId, error });
    }
  }

  private getPeriodRange(period: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'hourly':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    return { startDate, endDate };
  }

  private calculateSuccessRate(runs: PipelineRun[]): number {
    if (runs.length === 0) return 1.0;
    const successfulRuns = runs.filter(run => run.status === 'success').length;
    return successfulRuns / runs.length;
  }

  private calculateAverageDuration(runs: PipelineRun[]): number {
    const completedRuns = runs.filter(run => run.completedAt && run.startedAt);
    if (completedRuns.length === 0) return 0;

    const totalDuration = completedRuns.reduce((sum, run) => {
      const duration = (run.completedAt!.getTime() - run.startedAt!.getTime()) / 1000;
      return sum + duration;
    }, 0);

    return totalDuration / completedRuns.length;
  }

  private calculateThroughput(runs: PipelineRun[], period: string): number {
    if (runs.length === 0) return 0;

    const periodMultiplier = {
      hourly: 24,
      daily: 1,
      weekly: 1/7,
      monthly: 1/30
    }[period] || 1;

    return runs.length * periodMultiplier;
  }

  private async storeMetrics(pipelineId: string, results: MetricCalculationResult[]) {
    const metrics = results.map(result => {
      const metric = new PipelineMetrics();
      metric.pipelineId = pipelineId;
      metric.metricType = result.metricType;
      metric.value = result.value;
      if (result.metadata) {
        metric.metadata = result.metadata;
      }
      metric.aggregationPeriod = result.aggregationPeriod;
      metric.timestamp = result.timestamp;
      return metric;
    });

    await this.metricsRepo.save(metrics);
  }

  private detectRecurringFailures(failedRuns: PipelineRun[]): FailurePatternResult[] {
    // Group failures by error message similarity
    const errorGroups = new Map<string, PipelineRun[]>();
    
    failedRuns.forEach(run => {
      const errorKey = this.normalizeErrorMessage(run.errorMessage || 'Unknown error');
      if (!errorGroups.has(errorKey)) {
        errorGroups.set(errorKey, []);
      }
      errorGroups.get(errorKey)!.push(run);
    });

    const patterns: FailurePatternResult[] = [];

    errorGroups.forEach((runs, errorKey) => {
      if (runs.length >= 3) { // At least 3 occurrences to be considered a pattern
        const firstSeen = new Date(Math.min(...runs.map(r => r.startedAt!.getTime())));
        const lastSeen = new Date(Math.max(...runs.map(r => r.startedAt!.getTime())));
        
        patterns.push({
          patternType: 'recurring_failure',
          description: `Recurring failure: ${errorKey}`,
          confidence: Math.min(runs.length / 10, 1.0), // Max confidence at 10 occurrences
          severity: runs.length > 10 ? 'high' : runs.length > 5 ? 'medium' : 'low',
          data: {
            errorMessage: errorKey,
            affectedRuns: runs.map(r => r.id),
            frequency: runs.length
          },
          firstSeen,
          lastSeen,
          occurrenceCount: runs.length
        });
      }
    });

    return patterns;
  }

  private detectTimeoutPatterns(failedRuns: PipelineRun[]): FailurePatternResult[] {
    const timeoutRuns = failedRuns.filter(run => 
      run.errorMessage?.toLowerCase().includes('timeout') ||
      run.errorMessage?.toLowerCase().includes('timed out')
    );

    if (timeoutRuns.length < 2) return [];

    const avgDuration = timeoutRuns.reduce((sum, run) => {
      if (run.completedAt && run.startedAt) {
        return sum + (run.completedAt.getTime() - run.startedAt.getTime()) / 1000;
      }
      return sum;
    }, 0) / timeoutRuns.length;

    return [{
      patternType: 'timeout_pattern',
      description: `Frequent timeout failures detected (avg duration: ${Math.round(avgDuration)}s)`,
      confidence: Math.min(timeoutRuns.length / 5, 1.0),
      severity: timeoutRuns.length > 5 ? 'high' : 'medium',
      data: {
        timeoutCount: timeoutRuns.length,
        averageDuration: avgDuration,
        affectedRuns: timeoutRuns.map(r => r.id)
      },
      firstSeen: new Date(Math.min(...timeoutRuns.map(r => r.startedAt!.getTime()))),
      lastSeen: new Date(Math.max(...timeoutRuns.map(r => r.startedAt!.getTime()))),
      occurrenceCount: timeoutRuns.length
    }];
  }

  private detectDependencyFailures(failedRuns: PipelineRun[]): FailurePatternResult[] {
    const dependencyKeywords = ['dependency', 'service unavailable', 'connection refused', 'network'];
    
    const dependencyRuns = failedRuns.filter(run => 
      dependencyKeywords.some(keyword => 
        run.errorMessage?.toLowerCase().includes(keyword)
      )
    );

    if (dependencyRuns.length < 2) return [];

    return [{
      patternType: 'dependency_failure',
      description: 'Recurring dependency-related failures detected',
      confidence: Math.min(dependencyRuns.length / 3, 1.0),
      severity: dependencyRuns.length > 3 ? 'high' : 'medium',
      data: {
        dependencyFailureCount: dependencyRuns.length,
        affectedRuns: dependencyRuns.map(r => r.id),
        commonKeywords: dependencyKeywords.filter(keyword =>
          dependencyRuns.some(run => 
            run.errorMessage?.toLowerCase().includes(keyword)
          )
        )
      },
      firstSeen: new Date(Math.min(...dependencyRuns.map(r => r.startedAt!.getTime()))),
      lastSeen: new Date(Math.max(...dependencyRuns.map(r => r.startedAt!.getTime()))),
      occurrenceCount: dependencyRuns.length
    }];
  }

  private normalizeErrorMessage(message: string): string {
    // Simple normalization - remove timestamps, IDs, and other variable parts
    return message
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
      .replace(/\d+/g, 'NUMBER')
      .toLowerCase()
      .trim();
  }

  private async storeFailurePatterns(pipelineId: string | undefined, patterns: FailurePatternResult[]) {
    const entities = patterns.map(pattern => {
      const entity = new FailurePattern();
      if (pipelineId) {
        entity.pipelineId = pipelineId;
      }
      entity.patternType = pattern.patternType;
      entity.description = pattern.description;
      entity.confidence = pattern.confidence;
      entity.data = pattern.data;
      entity.severity = pattern.severity;
      entity.firstSeen = pattern.firstSeen;
      entity.lastSeen = pattern.lastSeen;
      entity.occurrenceCount = pattern.occurrenceCount;
      entity.detectedAt = new Date();
      entity.active = true;
      return entity;
    });

    if (entities.length > 0) {
      await this.failurePatternsRepo.save(entities);
    }
  }

  private async getRecentMetrics(pipelineId: string, days: number): Promise<PipelineMetrics[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.metricsRepo.find({
      where: {
        pipelineId,
        timestamp: { $gte: startDate } as any
      },
      order: { timestamp: 'DESC' }
    });
  }

  private analyzePerformanceBottlenecks(runs: PipelineRun[], metrics: PipelineMetrics[]): OptimizationResult[] {
    const recommendations: OptimizationResult[] = [];

    // Find slow runs
    const avgDurationMetric = metrics.find(m => m.metricType === 'avg_duration');
    const currentAvgDuration = avgDurationMetric?.value || 0;

    if (currentAvgDuration > this.config.alertThresholds.avgDuration) {
      recommendations.push({
        recommendationType: 'performance_optimization',
        title: 'Optimize Pipeline Duration',
        description: `Pipeline average duration (${Math.round(currentAvgDuration)}s) exceeds recommended threshold (${this.config.alertThresholds.avgDuration}s)`,
        potentialSavings: {
          time: currentAvgDuration - this.config.alertThresholds.avgDuration
        },
        implementationEffort: 'medium',
        priority: 'high',
        actionItems: [
          'Analyze pipeline stages for bottlenecks',
          'Consider parallelizing independent tasks',
          'Optimize resource allocation',
          'Review and optimize build steps'
        ]
      });
    }

    return recommendations;
  }

  private analyzeResourceUtilization(runs: PipelineRun[]): OptimizationResult[] {
    // Placeholder for resource utilization analysis
    // In a real implementation, this would analyze resource usage patterns
    return [];
  }

  private analyzeReliabilityOptimizations(runs: PipelineRun[]): OptimizationResult[] {
    const failedRuns = runs.filter(run => run.status === 'failed');
    const failureRate = failedRuns.length / runs.length;

    const recommendations: OptimizationResult[] = [];

    if (failureRate > this.config.alertThresholds.failureRate) {
      recommendations.push({
        recommendationType: 'reliability_improvement',
        title: 'Improve Pipeline Reliability',
        description: `Pipeline failure rate (${(failureRate * 100).toFixed(1)}%) exceeds recommended threshold (${(this.config.alertThresholds.failureRate * 100).toFixed(1)}%)`,
        potentialSavings: {
          cost: failedRuns.length * 10 // Estimated cost savings per prevented failure
        },
        implementationEffort: 'medium',
        priority: 'high',
        actionItems: [
          'Implement proper error handling and retries',
          'Add health checks for dependencies',
          'Improve test coverage',
          'Add monitoring and alerting'
        ]
      });
    }

    return recommendations;
  }

  private async storeOptimizationRecommendations(pipelineId: string, recommendations: OptimizationResult[]) {
    const entities = recommendations.map(rec => {
      const entity = new OptimizationRecommendation();
      entity.pipelineId = pipelineId;
      entity.recommendationType = rec.recommendationType;
      entity.title = rec.title;
      entity.description = rec.description;
      entity.potentialSavings = rec.potentialSavings;
      entity.implementationEffort = rec.implementationEffort;
      entity.priority = rec.priority;
      if (rec.actionItems) {
        entity.actionItems = rec.actionItems;
      }
      entity.implemented = false;
      return entity;
    });

    if (entities.length > 0) {
      await this.optimizationRepo.save(entities);
    }
  }

  private async checkPerformanceDegradation(pipelineId?: string): Promise<AlertResult[]> {
    // Implementation for performance degradation detection
    return [];
  }

  private async checkFailureSpikes(pipelineId?: string): Promise<AlertResult[]> {
    // Implementation for failure spike detection
    return [];
  }

  private async checkResourceWaste(pipelineId?: string): Promise<AlertResult[]> {
    // Implementation for resource waste detection
    return [];
  }

  private async storeAlerts(pipelineId: string | undefined, alerts: AlertResult[]) {
    const entities = alerts.map(alert => {
      const entity = new AnalyticsAlert();
      if (pipelineId) {
        entity.pipelineId = pipelineId;
      }
      entity.alertType = alert.alertType;
      entity.title = alert.title;
      entity.message = alert.message;
      entity.severity = alert.severity;
      entity.data = alert.data;
      if (alert.thresholdValue !== undefined) {
        entity.thresholdValue = alert.thresholdValue;
      }
      if (alert.actualValue !== undefined) {
        entity.actualValue = alert.actualValue;
      }
      entity.acknowledged = false;
      entity.active = true;
      return entity;
    });

    if (entities.length > 0) {
      await this.alertsRepo.save(entities);
    }
  }

  private generateSummary(
    metrics: PipelineMetrics[], 
    patterns: FailurePattern[], 
    recommendations: OptimizationRecommendation[], 
    alerts: AnalyticsAlert[]
  ) {
    return {
      totalMetrics: metrics.length,
      activePatterns: patterns.length,
      pendingRecommendations: recommendations.length,
      unacknowledgedAlerts: alerts.length,
      healthScore: this.calculateHealthScore(metrics, patterns, alerts),
      lastUpdated: new Date()
    };
  }

  private calculateHealthScore(
    metrics: PipelineMetrics[], 
    patterns: FailurePattern[], 
    alerts: AnalyticsAlert[]
  ): number {
    // Simple health score calculation (0-100)
    let score = 100;

    // Reduce score based on active patterns
    score -= patterns.length * 10;

    // Reduce score based on critical alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    score -= criticalAlerts * 20;

    // Reduce score based on failure rate
    const successRateMetric = metrics.find(m => m.metricType === 'success_rate');
    if (successRateMetric) {
      score = score * successRateMetric.value;
    }

    return Math.max(0, Math.min(100, score));
  }
}
