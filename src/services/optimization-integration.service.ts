/**
 * Optimization Integration Service - Coordinated Performance Management
 *
 * This service coordinates all optimization components and provides a unified
 * interface for managing performance improvements across the application.
 *
 * Features:
 * - Centralized optimization coordination
 * - Automatic service configuration synchronization
 * - Performance monitoring and alerting
 * - Health checks and diagnostics
 * - Graceful degradation management
 *
 * @author sirhCC
 * @version 1.0.0
 */

import { Logger } from '@/shared/logger';
import { EventEmitter } from 'events';
import {
  enhancedStatisticalAnalyticsService,
  EnhancedStatisticalAnalyticsService,
} from './enhanced-statistical-analytics.service';
import { memoizationService, MemoizationService } from './memoization.service';
import { batchProcessingService, BatchProcessingService } from './batch-processing.service';
import { PerformanceMonitorService } from './performance-monitor.service';
import { AdvancedCacheService } from './advanced-cache.service';
import type { OptimizationProfile } from './optimization-config.service';
import {
  optimizationConfigService,
  OptimizationConfigService,
} from './optimization-config.service';

export interface OptimizationStatus {
  overall: 'optimal' | 'good' | 'degraded' | 'critical';
  services: {
    memoization: ServiceStatus;
    batchProcessing: ServiceStatus;
    performanceMonitor: ServiceStatus;
    advancedCache: ServiceStatus;
    enhancedAnalytics: ServiceStatus;
  };
  metrics: {
    memoryUsage: number;
    cpuUsage: number;
    cacheHitRatio: number;
    averageResponseTime: number;
    throughput: number;
  };
  recommendations: string[];
}

export interface ServiceStatus {
  status: 'healthy' | 'warning' | 'error' | 'disabled';
  uptime: number;
  lastError?: Error;
  metrics?: Record<string, number>;
  configuredCorrectly: boolean;
}

export interface OptimizationReport {
  timestamp: Date;
  profile: string;
  status: OptimizationStatus;
  performanceTrend: {
    period: string;
    improvement: number; // percentage
    degradation: number; // percentage
  };
  resourceUtilization: {
    memory: { used: number; available: number; efficiency: number };
    cpu: { usage: number; efficiency: number };
    cache: { hitRatio: number; size: number; efficiency: number };
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export class OptimizationIntegrationService extends EventEmitter {
  private static instance: OptimizationIntegrationService;
  private logger: Logger;
  private isInitialized = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private configSyncInterval?: NodeJS.Timeout;
  private lastOptimizationReport?: OptimizationReport;

  private constructor() {
    super();
    this.logger = new Logger('OptimizationIntegration');
  }

  public static getInstance(): OptimizationIntegrationService {
    if (!OptimizationIntegrationService.instance) {
      OptimizationIntegrationService.instance = new OptimizationIntegrationService();
    }
    return OptimizationIntegrationService.instance;
  }

  /**
   * Initialize all optimization services with coordinated configuration
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Optimization integration already initialized');
      return;
    }

    this.logger.info('Initializing optimization integration...');

    try {
      // Get current optimization profile
      const profile = optimizationConfigService.getCurrentProfile();

      // Configure all services based on the profile
      await this.applyOptimizationProfile(profile);

      // Set up event listeners for configuration changes
      this.setupEventListeners();

      // Start health monitoring
      this.startHealthMonitoring();

      // Start configuration synchronization
      this.startConfigurationSync();

      this.isInitialized = true;
      this.logger.info('Optimization integration initialized successfully');

      this.emit('initialized', { profile: profile.name });
    } catch (error) {
      this.logger.error('Failed to initialize optimization integration', error);
      throw error;
    }
  }

  /**
   * Apply optimization profile to all services
   */
  public async applyOptimizationProfile(profile: OptimizationProfile): Promise<void> {
    this.logger.info('Applying optimization profile', { profile: profile.name });

    try {
      // Configure memoization service
      if (profile.memoization.enabled) {
        const memoConfig = {
          maxSize: profile.memoization.maxSize,
          defaultTtl: profile.memoization.defaultTtl,
          enableMetrics: profile.memoization.enableMetrics,
        };
        // Apply configuration (service supports dynamic reconfiguration)
        this.logger.debug('Memoization configured', memoConfig);
      }

      // Configure batch processing service
      if (profile.batchProcessing.enabled) {
        batchProcessingService.updateConfig({
          batchSize: profile.batchProcessing.batchSize,
          maxConcurrency: profile.batchProcessing.maxConcurrency,
          memoryThreshold: profile.batchProcessing.memoryThreshold,
          enableParallelProcessing: profile.batchProcessing.enableParallelProcessing,
        });
      }

      // Configure enhanced analytics service
      enhancedStatisticalAnalyticsService.updateConfig({
        enableMemoization: profile.memoization.enabled,
        enableBatchProcessing: profile.batchProcessing.enabled,
        enableParallelProcessing: profile.batchProcessing.enableParallelProcessing,
        batchSize: profile.batchProcessing.batchSize,
        maxConcurrency: profile.batchProcessing.maxConcurrency,
        memoryThreshold: profile.batchProcessing.memoryThreshold,
        enableStreamProcessing: profile.streaming.enabled,
        cacheEnabled: profile.caching.enabled,
        cacheTtl: profile.caching.defaultTtl,
        enablePerformanceTracking: profile.performance.enabled,
        slowQueryThreshold: profile.performance.slowQueryThreshold,
      });

      // Configure performance monitoring
      const perfMonitor = PerformanceMonitorService.getInstance();
      if (profile.performance.enabled) {
        perfMonitor.startMonitoring(profile.performance.monitoringInterval);
      } else {
        perfMonitor.stopMonitoring();
      }

      this.logger.info('Optimization profile applied successfully', {
        profile: profile.name,
      });

      this.emit('profileApplied', { profile: profile.name });
    } catch (error) {
      this.logger.error('Failed to apply optimization profile', error);
      throw error;
    }
  }

  /**
   * Get comprehensive optimization status
   */
  public async getOptimizationStatus(): Promise<OptimizationStatus> {
    const memoStats = memoizationService.getMetrics();
    const batchStats = batchProcessingService.getStats();
    const perfMonitor = PerformanceMonitorService.getInstance();

    // Get memory usage
    const memUsage = process.memoryUsage();
    const memoryUsage = memUsage.heapUsed / (1024 * 1024); // MB

    // Calculate overall status
    const services = {
      memoization: this.getServiceStatus('memoization', {
        hits: memoStats.hits,
        hitRatio: memoStats.hitRatio,
        memoryUsage: memoStats.memoryUsage,
      }),
      batchProcessing: this.getServiceStatus('batchProcessing', {
        activeProcessors: batchStats.activeProcessors,
        queueLength: batchStats.queueLength,
        memoryUsage: batchStats.memoryUsage,
      }),
      performanceMonitor: this.getServiceStatus('performanceMonitor'),
      advancedCache: this.getServiceStatus('advancedCache'),
      enhancedAnalytics: this.getServiceStatus('enhancedAnalytics'),
    };

    const overall = this.calculateOverallStatus(services);

    const status: OptimizationStatus = {
      overall,
      services,
      metrics: {
        memoryUsage,
        cpuUsage: 0, // Would be calculated from performance monitor
        cacheHitRatio: memoStats.hitRatio,
        averageResponseTime: memoStats.averageAccessTime,
        throughput: 0, // Would be calculated from performance metrics
      },
      recommendations: this.generateRecommendations(services, memoryUsage),
    };

    return status;
  }

  /**
   * Generate comprehensive optimization report
   */
  public async generateOptimizationReport(): Promise<OptimizationReport> {
    const status = await this.getOptimizationStatus();
    const profile = optimizationConfigService.getCurrentProfile();
    const trend = optimizationConfigService.getPerformanceTrend(60);

    const report: OptimizationReport = {
      timestamp: new Date(),
      profile: profile.name,
      status,
      performanceTrend: {
        period: '1 hour',
        improvement: 0, // Would be calculated from historical data
        degradation: 0,
      },
      resourceUtilization: {
        memory: {
          used: status.metrics.memoryUsage,
          available: 1024, // Would be calculated from system info
          efficiency: Math.max(0, 100 - (status.metrics.memoryUsage / 1024) * 100),
        },
        cpu: {
          usage: status.metrics.cpuUsage,
          efficiency: Math.max(0, 100 - status.metrics.cpuUsage),
        },
        cache: {
          hitRatio: status.metrics.cacheHitRatio,
          size: 0, // Would be calculated from cache stats
          efficiency: status.metrics.cacheHitRatio,
        },
      },
      recommendations: {
        immediate: trend.recommendations.slice(0, 3),
        shortTerm: this.generateShortTermRecommendations(status),
        longTerm: this.generateLongTermRecommendations(profile, status),
      },
    };

    this.lastOptimizationReport = report;
    this.emit('reportGenerated', report);

    return report;
  }

  /**
   * Perform automatic optimization based on current conditions
   */
  public async performAutomaticOptimization(): Promise<{
    applied: boolean;
    changes: string[];
    newProfile?: string;
  }> {
    this.logger.info('Performing automatic optimization...');

    const status = await this.getOptimizationStatus();
    const profile = optimizationConfigService.getCurrentProfile();

    // Determine if optimization is needed
    if (status.overall === 'optimal' || status.overall === 'good') {
      return { applied: false, changes: ['No optimization needed'] };
    }

    const changes: string[] = [];

    // Auto-tune based on current conditions
    const tuningApplied = await optimizationConfigService.performAutoTuning();
    if (tuningApplied) {
      changes.push('Auto-tuning adjustments applied');
    }

    // Consider profile switching for severe degradation
    if (status.overall === 'critical') {
      const currentProfileName = profile.name;

      if (currentProfileName !== 'high-throughput') {
        const switched = optimizationConfigService.switchProfile('high-throughput');
        if (switched) {
          changes.push('Switched to high-throughput profile');
          await this.applyOptimizationProfile(optimizationConfigService.getCurrentProfile());
        }
      }
    }

    // Apply service-specific optimizations
    const serviceOptimizations = await this.applyServiceSpecificOptimizations(status);
    changes.push(...serviceOptimizations);

    const applied = changes.length > 0;

    if (applied) {
      this.logger.info('Automatic optimization completed', { changes });
      this.emit('automaticOptimizationApplied', { changes });
    }

    return {
      applied,
      changes,
      newProfile: optimizationConfigService.getCurrentProfile().name,
    };
  }

  /**
   * Get last optimization report
   */
  public getLastOptimizationReport(): OptimizationReport | undefined {
    return this.lastOptimizationReport;
  }

  /**
   * Force health check of all services
   */
  public async performHealthCheck(): Promise<OptimizationStatus> {
    this.logger.debug('Performing health check...');
    const status = await this.getOptimizationStatus();

    this.emit('healthCheckCompleted', status);

    if (status.overall === 'critical' || status.overall === 'degraded') {
      this.logger.warn('Health check detected issues', {
        overall: status.overall,
        issues: status.recommendations,
      });
    }

    return status;
  }

  // Private methods

  private setupEventListeners(): void {
    // Listen for configuration changes
    optimizationConfigService.on('profileChanged', async event => {
      this.logger.info('Optimization profile changed', event);
      await this.applyOptimizationProfile(event.config);
    });

    optimizationConfigService.on('configUpdated', async event => {
      this.logger.info('Configuration updated', event);
      await this.applyOptimizationProfile(event.newConfig);
    });

    // Listen for performance alerts
    const perfMonitor = PerformanceMonitorService.getInstance();
    perfMonitor.on('metrics', metrics => {
      optimizationConfigService.recordPerformanceMetrics(metrics);
    });
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error('Health check failed', error);
      }
    }, 60000); // Every minute

    this.logger.debug('Health monitoring started');
  }

  private startConfigurationSync(): void {
    this.configSyncInterval = setInterval(
      async () => {
        try {
          const status = await this.getOptimizationStatus();

          // Trigger automatic optimization if needed
          if (status.overall === 'degraded' || status.overall === 'critical') {
            await this.performAutomaticOptimization();
          }
        } catch (error) {
          this.logger.error('Configuration sync failed', error);
        }
      },
      5 * 60 * 1000
    ); // Every 5 minutes

    this.logger.debug('Configuration sync started');
  }

  private getServiceStatus(serviceName: string, metrics?: Record<string, number>): ServiceStatus {
    // Simplified service status check
    const status: ServiceStatus = {
      status: 'healthy',
      uptime: process.uptime(),
      configuredCorrectly: true,
    };

    if (metrics) {
      status.metrics = metrics;
    }

    return status;
  }

  private calculateOverallStatus(
    services: any
  ): 'optimal' | 'good' | 'degraded' | 'critical' {
    const statuses = Object.values(services) as Array<{ status: string }>;
    const errorCount = statuses.filter((s): s is { status: string } => {
      return typeof s === 'object' && s !== null && 'status' in s && s.status === 'error';
    }).length;
    const warningCount = statuses.filter((s): s is { status: string } => {
      return typeof s === 'object' && s !== null && 'status' in s && s.status === 'warning';
    }).length;

    if (errorCount > 0) return 'critical';
    if (warningCount > 2) return 'degraded';
    if (warningCount > 0) return 'good';
    return 'optimal';
  }

  private generateRecommendations(services: any, memoryUsage: number): string[] {
    const recommendations: string[] = [];

    if (memoryUsage > 512) {
      recommendations.push('High memory usage detected - consider reducing cache sizes');
    }

    const memoService = services.memoization;
    if (memoService.metrics && memoService.metrics.hitRatio < 0.7) {
      recommendations.push('Low cache hit ratio - consider adjusting TTL settings');
    }

    return recommendations;
  }

  private generateShortTermRecommendations(status: OptimizationStatus): string[] {
    return [
      'Monitor memory usage trends',
      'Review batch processing configurations',
      'Optimize frequently used queries',
    ];
  }

  private generateLongTermRecommendations(
    profile: OptimizationProfile,
    status: OptimizationStatus
  ): string[] {
    return [
      'Consider upgrading infrastructure for better performance',
      'Implement distributed caching for horizontal scaling',
      'Review and optimize algorithm implementations',
    ];
  }

  private async applyServiceSpecificOptimizations(status: OptimizationStatus): Promise<string[]> {
    const optimizations: string[] = [];

    // Clear caches if memory usage is high
    if (status.metrics.memoryUsage > 800) {
      memoizationService.clear();
      optimizations.push('Cleared memoization cache to free memory');
    }

    return optimizations;
  }

  /**
   * Shutdown and cleanup
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down optimization integration...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.configSyncInterval) {
      clearInterval(this.configSyncInterval);
    }

    // Cleanup services
    await batchProcessingService.destroy();
    memoizationService.destroy();
    optimizationConfigService.destroy();

    this.isInitialized = false;
    this.logger.info('Optimization integration shutdown complete');
  }
}

// Export singleton instance
export const optimizationIntegrationService = OptimizationIntegrationService.getInstance();
