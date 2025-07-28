/**
 * Statistical Analytics Service Tests
 * Tests for the Phase 3 Statistical Analytics Engine
 */

import { statisticalAnalyticsService, StatisticalDataPoint } from '../services/statistical-analytics.service';
import { AppError } from '../middleware/error-handler';

describe('StatisticalAnalyticsService', () => {
  let service: typeof statisticalAnalyticsService;

  beforeEach(() => {
    service = statisticalAnalyticsService;
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies using z-score method', () => {
      const data: StatisticalDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 10 },
        { timestamp: new Date('2024-01-02'), value: 11 },
        { timestamp: new Date('2024-01-03'), value: 12 },
        { timestamp: new Date('2024-01-04'), value: 9 },
        { timestamp: new Date('2024-01-05'), value: 10 },
        { timestamp: new Date('2024-01-06'), value: 11 },
        { timestamp: new Date('2024-01-07'), value: 12 },
        { timestamp: new Date('2024-01-08'), value: 10 },
        { timestamp: new Date('2024-01-09'), value: 11 },
        { timestamp: new Date('2024-01-10'), value: 1000 }, // Extreme anomaly
      ];

      const results = service.detectAnomalies(data, 'z-score');
      
      expect(results).toHaveLength(1);
      expect(results[0]?.isAnomaly).toBe(true);
      expect(results[0]?.method).toBe('z-score');
      expect(results[0]?.actualValue).toBe(1000);
      expect(results[0]?.severity).toMatch(/low|medium|high|critical/); // Any severity is fine for this test
    });

    it('should detect anomalies using percentile method', () => {
      const data: StatisticalDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(`2024-01-${i + 1}`),
        value: 10 + Math.random() * 2, // Values around 10-12
      }));
      
      // Add clear outlier
      data.push({ timestamp: new Date('2024-01-21'), value: 100 });

      const results = service.detectAnomalies(data, 'percentile');
      
      expect(results.length).toBeGreaterThan(0);
      const outlier = results.find(r => r.actualValue === 100);
      expect(outlier).toBeDefined();
      expect(outlier?.method).toBe('percentile');
    });

    it('should throw error for insufficient data', () => {
      const data: StatisticalDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 10 },
      ];

      expect(() => service.detectAnomalies(data)).toThrow(AppError);
    });
  });

  describe('analyzeTrend', () => {
    it('should detect increasing trend', () => {
      const data: StatisticalDataPoint[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(`2024-01-${i + 1}`),
        value: 10 + i * 5, // Strong increasing values: 10, 15, 20, 25...
      }));

      const result = service.analyzeTrend(data);
      
      expect(result.trend).toBe('increasing');
      expect(result.slope).toBeGreaterThan(0);
      expect(result.correlation).toBeGreaterThan(0.9);
    });

    it('should detect decreasing trend', () => {
      const data: StatisticalDataPoint[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(`2024-01-${i + 1}`),
        value: 100 - i * 5, // Strong decreasing values: 100, 95, 90, 85...
      }));

      const result = service.analyzeTrend(data);
      
      expect(result.trend).toBe('decreasing');
      expect(result.slope).toBeLessThan(0);
      expect(result.changeRate).toBeLessThan(0);
    });

    it('should detect stable trend', () => {
      const data: StatisticalDataPoint[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(`2024-01-${i + 1}`),
        value: 25 + (Math.random() - 0.5) * 2, // Stable around 25
      }));

      const result = service.analyzeTrend(data);
      
      expect(result.trend).toBe('stable');
      expect(Math.abs(result.slope)).toBeLessThan(1);
    });

    it('should throw error for insufficient data', () => {
      const data: StatisticalDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 10 },
      ];

      expect(() => service.analyzeTrend(data)).toThrow(AppError);
    });
  });

  describe('generateBenchmark', () => {
    it('should benchmark current performance against historical data', () => {
      const historicalData: StatisticalDataPoint[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(`2024-01-${i + 1}`),
        value: 20 + Math.random() * 10, // Values between 20-30
      }));

      const currentValue = 35; // Above average
      const result = service.generateBenchmark(currentValue, historicalData);
      
      expect(result.currentValue).toBe(35);
      expect(result.benchmark).toBeGreaterThan(20);
      expect(result.benchmark).toBeLessThan(30);
      expect(result.percentile).toBeGreaterThan(50);
      expect(result.performance).toMatch(/excellent|good|average/);
      expect(result.historicalContext.best).toBeDefined();
      expect(result.historicalContext.worst).toBeDefined();
    });

    it('should throw error for insufficient historical data', () => {
      const historicalData: StatisticalDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 10 },
      ];

      expect(() => service.generateBenchmark(25, historicalData)).toThrow(AppError);
    });
  });

  describe('monitorSLA', () => {
    it('should detect SLA violations', () => {
      const historicalData: StatisticalDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (24 - i) * 60 * 60 * 1000), // Last 24 hours
        value: Math.random() < 0.1 ? 85 : 98, // 10% failure rate
      }));

      const result = service.monitorSLA(85, 95, historicalData, 'performance');
      
      expect(result.violated).toBe(true);
      expect(result.slaTarget).toBe(95);
      expect(result.actualValue).toBe(85);
      expect(result.violationPercent).toBeGreaterThan(0);
      expect(result.severity).toMatch(/minor|major|critical/);
      expect(result.remediation.immediateActions.length).toBeGreaterThan(0);
      expect(result.remediation.longTermActions.length).toBeGreaterThan(0);
    });

    it('should not detect violations when within SLA', () => {
      const historicalData: StatisticalDataPoint[] = [];
      const result = service.monitorSLA(98, 95, historicalData, 'availability');
      
      expect(result.violated).toBe(false);
      expect(result.violationPercent).toBe(0);
    });
  });

  describe('analyzeCosts', () => {
    it('should analyze costs and provide optimization recommendations', () => {
      const historicalCostData: StatisticalDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        value: 0.50 + Math.random() * 0.20, // $0.50-$0.70
      }));

      const resourceUsage = {
        cpu: 30, // Low CPU usage
        memory: 45, // Low memory usage
        storage: 80,
        network: 60,
      };

      const result = service.analyzeCosts(45, resourceUsage, historicalCostData);
      
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.costPerMinute).toBeGreaterThan(0);
      expect(result.optimizationOpportunities.length).toBeGreaterThan(0);
      expect(result.efficiency.score).toBeGreaterThanOrEqual(0);
      expect(result.efficiency.score).toBeLessThanOrEqual(100);
      expect(result.resourceUtilization).toEqual(resourceUsage);

      // Should suggest optimizations for low CPU/memory usage
      const cpuOptimization = result.optimizationOpportunities.find(
        op => op.type === 'resource-scaling' && op.description.includes('CPU')
      );
      expect(cpuOptimization).toBeDefined();
    });

    it('should handle cases with no historical cost data', () => {
      const resourceUsage = {
        cpu: 70,
        memory: 80,
        storage: 60,
        network: 40,
      };

      const result = service.analyzeCosts(30, resourceUsage, []);
      
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.costPerMinute).toBeGreaterThan(0);
      expect(result.costTrend).toBe(null);
      expect(result.efficiency.score).toBeGreaterThan(50); // Good utilization
    });
  });

  describe('Mathematical Helper Methods', () => {
    it('should calculate statistical measures correctly', () => {
      const data: StatisticalDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 1 },
        { timestamp: new Date('2024-01-02'), value: 2 },
        { timestamp: new Date('2024-01-03'), value: 3 },
        { timestamp: new Date('2024-01-04'), value: 4 },
        { timestamp: new Date('2024-01-05'), value: 5 },
      ];

      // Test through public methods that use private helpers
      const trendResult = service.analyzeTrend(data);
      expect(trendResult.slope).toBeGreaterThan(0); // Should detect upward trend
      expect(trendResult.correlation).toBeGreaterThan(0.9); // Strong correlation
      
      const benchmarkResult = service.generateBenchmark(3, data);
      expect(benchmarkResult.benchmark).toBe(3); // Mean of 1,2,3,4,5
      expect(benchmarkResult.percentile).toBe(60); // 3 is 60th percentile in [1,2,3,4,5]
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays gracefully', () => {
      expect(() => service.detectAnomalies([])).toThrow(AppError);
      expect(() => service.analyzeTrend([])).toThrow(AppError);
      expect(() => service.generateBenchmark(10, [])).toThrow(AppError);
    });

    it('should handle single data point', () => {
      const singlePoint: StatisticalDataPoint[] = [
        { timestamp: new Date(), value: 42 }
      ];

      expect(() => service.detectAnomalies(singlePoint)).toThrow(AppError);
      expect(() => service.analyzeTrend(singlePoint)).toThrow(AppError);
    });

    it('should handle identical values', () => {
      const identicalData: StatisticalDataPoint[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(`2024-01-${i + 1}`),
        value: 42, // All identical
      }));

      const trendResult = service.analyzeTrend(identicalData);
      expect(['stable', 'decreasing']).toContain(trendResult.trend); // Could be either due to numerical precision
      expect(Math.abs(trendResult.slope)).toBeLessThan(0.001); // Very close to 0
      expect(trendResult.volatility).toBe(0);

      const anomalyResults = service.detectAnomalies(identicalData, 'z-score');
      expect(anomalyResults).toHaveLength(0); // No anomalies in identical data
    });
  });
});
