/**
 * Performance Monitoring Service - Advanced Metrics Collection & Analysis
 *
 * Features:
 * - Real-time performance metrics collection
 * - Memory usage tracking and optimization
 * - API response time monitoring
 * - Database query performance analysis
 * - Resource utilization alerts
 * - Performance trend analysis
 *
 * @author sirhCC
 * @version 1.0.0
 */

import { Logger } from '@/shared/logger';
import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  timestamp: Date;
  memory: {
    used: number;
    total: number;
    heap: {
      used: number;
      total: number;
    };
    external: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  requests: {
    total: number;
    active: number;
    averageResponseTime: number;
    slowQueries: number;
  };
  database: {
    activeConnections: number;
    queryTime: number;
    slowQueries: number;
  };
  cache: {
    hitRatio: number;
    size: number;
    evictions: number;
  };
}

export interface PerformanceAlert {
  type: 'memory' | 'cpu' | 'response_time' | 'database' | 'cache';
  severity: 'warning' | 'critical';
  message: string;
  metrics: Partial<PerformanceMetrics>;
  threshold: number;
  actual: number;
  timestamp: Date;
}

export interface PerformanceThresholds {
  memory: {
    warning: number; // 80%
    critical: number; // 95%
  };
  cpu: {
    warning: number; // 70%
    critical: number; // 90%
  };
  responseTime: {
    warning: number; // 1000ms
    critical: number; // 5000ms
  };
  database: {
    connectionWarning: number; // 80% of pool
    queryTimeWarning: number; // 1000ms
  };
  cache: {
    hitRatioWarning: number; // 70%
  };
}

export class PerformanceMonitorService extends EventEmitter {
  private static instance: PerformanceMonitorService;
  private logger: Logger;
  private metrics: PerformanceMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | undefined;
  private thresholds: PerformanceThresholds;
  private requestMetrics = new Map<string, { startTime: number; endTime?: number }>();

  private constructor() {
    super();
    this.logger = new Logger('PerformanceMonitor');
    this.thresholds = {
      memory: { warning: 0.8, critical: 0.95 },
      cpu: { warning: 0.7, critical: 0.9 },
      responseTime: { warning: 1000, critical: 5000 },
      database: { connectionWarning: 0.8, queryTimeWarning: 1000 },
      cache: { hitRatioWarning: 0.7 },
    };
  }

  public static getInstance(): PerformanceMonitorService {
    if (!PerformanceMonitorService.instance) {
      PerformanceMonitorService.instance = new PerformanceMonitorService();
    }
    return PerformanceMonitorService.instance;
  }

  /**
   * Start performance monitoring
   */
  public startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      this.logger.warn('Performance monitoring already running');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    this.logger.info('Performance monitoring started', { intervalMs });
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    this.logger.info('Performance monitoring stopped');
  }

  /**
   * Collect current performance metrics
   */
  private collectMetrics(): void {
    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      memory: this.getMemoryMetrics(),
      cpu: this.getCpuMetrics(),
      requests: this.getRequestMetrics(),
      database: this.getDatabaseMetrics(),
      cache: this.getCacheMetrics(),
    };

    this.metrics.push(metrics);
    this.checkThresholds(metrics);

    // Keep only last 1000 metrics (about 8 hours at 30s intervals)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    this.emit('metrics', metrics);
  }

  /**
   * Get memory usage metrics
   */
  private getMemoryMetrics() {
    const usage = process.memoryUsage();
    return {
      used: usage.heapUsed,
      total: usage.heapTotal,
      heap: {
        used: usage.heapUsed,
        total: usage.heapTotal,
      },
      external: usage.external,
    };
  }

  /**
   * Get CPU usage metrics
   */
  private getCpuMetrics() {
    const usage = process.cpuUsage();
    const loadAverage = process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0];

    return {
      usage: (usage.user + usage.system) / 1000000, // Convert to seconds
      loadAverage,
    };
  }

  /**
   * Get request metrics
   */
  private getRequestMetrics() {
    const activeRequests = this.requestMetrics.size;
    const completedRequests = Array.from(this.requestMetrics.values()).filter(
      req => req.endTime !== undefined
    );

    const averageResponseTime =
      completedRequests.length > 0
        ? completedRequests.reduce((sum, req) => sum + (req.endTime! - req.startTime), 0) /
          completedRequests.length
        : 0;

    const slowQueries = completedRequests.filter(
      req => req.endTime! - req.startTime > this.thresholds.responseTime.warning
    ).length;

    return {
      total: completedRequests.length,
      active: activeRequests,
      averageResponseTime,
      slowQueries,
    };
  }

  /**
   * Get database metrics (placeholder - would integrate with actual DB monitoring)
   */
  private getDatabaseMetrics() {
    return {
      activeConnections: 5, // Would get from connection pool
      queryTime: 50, // Average query time
      slowQueries: 0,
    };
  }

  /**
   * Get cache metrics (placeholder - would integrate with Redis/cache monitoring)
   */
  private getCacheMetrics() {
    return {
      hitRatio: 0.85, // Would get from cache implementation
      size: 1024, // Cache size in entries
      evictions: 0,
    };
  }

  /**
   * Check performance thresholds and emit alerts
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    // Memory threshold check
    const memoryUsage = metrics.memory.used / metrics.memory.total;
    if (memoryUsage > this.thresholds.memory.critical) {
      this.emitAlert(
        'memory',
        'critical',
        'Critical memory usage detected',
        metrics,
        this.thresholds.memory.critical,
        memoryUsage
      );
    } else if (memoryUsage > this.thresholds.memory.warning) {
      this.emitAlert(
        'memory',
        'warning',
        'High memory usage detected',
        metrics,
        this.thresholds.memory.warning,
        memoryUsage
      );
    }

    // Response time threshold check
    if (metrics.requests.averageResponseTime > this.thresholds.responseTime.critical) {
      this.emitAlert(
        'response_time',
        'critical',
        'Critical response time detected',
        metrics,
        this.thresholds.responseTime.critical,
        metrics.requests.averageResponseTime
      );
    } else if (metrics.requests.averageResponseTime > this.thresholds.responseTime.warning) {
      this.emitAlert(
        'response_time',
        'warning',
        'High response time detected',
        metrics,
        this.thresholds.responseTime.warning,
        metrics.requests.averageResponseTime
      );
    }

    // Cache hit ratio check
    if (metrics.cache.hitRatio < this.thresholds.cache.hitRatioWarning) {
      this.emitAlert(
        'cache',
        'warning',
        'Low cache hit ratio detected',
        metrics,
        this.thresholds.cache.hitRatioWarning,
        metrics.cache.hitRatio
      );
    }
  }

  /**
   * Emit performance alert
   */
  private emitAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    metrics: PerformanceMetrics,
    threshold: number,
    actual: number
  ): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      message,
      metrics,
      threshold,
      actual,
      timestamp: new Date(),
    };

    this.emit('alert', alert);
    this.logger.warn('Performance alert', {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      threshold: alert.threshold,
      actual: alert.actual,
    });
  }

  /**
   * Track request start
   */
  public trackRequestStart(requestId: string): void {
    this.requestMetrics.set(requestId, { startTime: Date.now() });
  }

  /**
   * Track request end
   */
  public trackRequestEnd(requestId: string): number {
    const request = this.requestMetrics.get(requestId);
    if (request) {
      request.endTime = Date.now();
      const duration = request.endTime - request.startTime;

      // Clean up completed requests after a delay
      setTimeout(() => {
        this.requestMetrics.delete(requestId);
      }, 60000); // Clean up after 1 minute

      return duration;
    }
    return 0;
  }

  /**
   * Get current performance summary
   */
  public getPerformanceSummary(): {
    current: PerformanceMetrics | null;
    average: Partial<PerformanceMetrics>;
    trends: {
      memory: 'increasing' | 'decreasing' | 'stable';
      responseTime: 'increasing' | 'decreasing' | 'stable';
    };
  } {
    if (this.metrics.length === 0) {
      return {
        current: null,
        average: {},
        trends: { memory: 'stable', responseTime: 'stable' },
      };
    }

    const current = this.metrics[this.metrics.length - 1];
    if (!current) {
      return {
        current: null,
        average: {},
        trends: { memory: 'stable', responseTime: 'stable' },
      };
    }

    const recent = this.metrics.slice(-10); // Last 10 metrics

    const averageMemory =
      recent.reduce((sum, m) => sum + m.memory.used / m.memory.total, 0) / recent.length;
    const averageResponseTime =
      recent.reduce((sum, m) => sum + m.requests.averageResponseTime, 0) / recent.length;

    // Simple trend analysis
    const oldMetrics = this.metrics.slice(-20, -10);
    const memoryTrend =
      oldMetrics.length > 0
        ? this.calculateTrend(
            oldMetrics.map(m => m.memory.used / m.memory.total),
            recent.map(m => m.memory.used / m.memory.total)
          )
        : 'stable';

    const responseTimeTrend =
      oldMetrics.length > 0
        ? this.calculateTrend(
            oldMetrics.map(m => m.requests.averageResponseTime),
            recent.map(m => m.requests.averageResponseTime)
          )
        : 'stable';

    return {
      current,
      average: {
        memory: { used: averageMemory * current.memory.total, total: current.memory.total } as any,
        requests: { averageResponseTime } as any,
      },
      trends: {
        memory: memoryTrend,
        responseTime: responseTimeTrend,
      },
    };
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(
    oldValues: number[],
    newValues: number[]
  ): 'increasing' | 'decreasing' | 'stable' {
    const oldAvg = oldValues.reduce((sum, val) => sum + val, 0) / oldValues.length;
    const newAvg = newValues.reduce((sum, val) => sum + val, 0) / newValues.length;

    const change = (newAvg - oldAvg) / oldAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Get performance health score (0-100)
   */
  public getHealthScore(): number {
    if (this.metrics.length === 0) return 100;

    const current = this.metrics[this.metrics.length - 1];
    if (!current) return 100;

    let score = 100;

    // Memory score
    const memoryUsage = current.memory.used / current.memory.total;
    if (memoryUsage > this.thresholds.memory.critical) score -= 30;
    else if (memoryUsage > this.thresholds.memory.warning) score -= 15;

    // Response time score
    if (current.requests.averageResponseTime > this.thresholds.responseTime.critical) score -= 30;
    else if (current.requests.averageResponseTime > this.thresholds.responseTime.warning)
      score -= 15;

    // Cache hit ratio score
    if (current.cache.hitRatio < this.thresholds.cache.hitRatioWarning) score -= 10;

    return Math.max(0, score);
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitorService.getInstance();
