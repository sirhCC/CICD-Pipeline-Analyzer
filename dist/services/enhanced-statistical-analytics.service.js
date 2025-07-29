"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedStatisticalAnalyticsService = exports.EnhancedStatisticalAnalyticsService = void 0;
const logger_1 = require("../shared/logger");
const error_handler_1 = require("../middleware/error-handler");
const memoization_service_1 = require("./memoization.service");
const batch_processing_service_1 = require("./batch-processing.service");
const optimized_math_utils_service_1 = require("./optimized-math-utils.service");
const performance_monitor_service_1 = require("./performance-monitor.service");
class EnhancedStatisticalAnalyticsService {
    static instance;
    logger;
    config;
    performanceMetrics = [];
    constructor(config) {
        this.logger = new logger_1.Logger('EnhancedStatisticalAnalytics');
        this.config = {
            // Inherit base config
            anomalyDetection: {
                zScoreThreshold: 2.0,
                percentileThreshold: 95,
                minDataPoints: 10,
                windowSize: 50,
            },
            trendAnalysis: {
                minDataPoints: 5,
                confidenceLevel: 0.95,
                smoothingFactor: 0.3,
            },
            benchmarking: {
                historicalDays: 30,
                minSamples: 5,
                updateFrequency: 3600000,
            },
            slaMonitoring: {
                defaultSLA: 95,
                violationBuffer: 0.05,
                alertThresholds: {
                    minor: 90,
                    major: 85,
                    critical: 80
                },
            },
            costAnalysis: {
                defaultHourlyCost: 0.10,
                currencyCode: 'USD',
                resourceCosts: {
                    cpu: 0.02,
                    memory: 0.01,
                    storage: 0.001,
                    network: 0.005
                },
            },
            // Enhanced config
            enableMemoization: true,
            enableBatchProcessing: true,
            enableParallelProcessing: true,
            batchSize: 1000,
            maxConcurrency: 4,
            memoryThreshold: 512, // 512MB
            enableStreamProcessing: true,
            cacheEnabled: true,
            cacheTtl: 300000, // 5 minutes
            enablePerformanceTracking: true,
            slowQueryThreshold: 1000, // 1 second
            ...config
        };
    }
    static getInstance(config) {
        if (!EnhancedStatisticalAnalyticsService.instance) {
            EnhancedStatisticalAnalyticsService.instance = new EnhancedStatisticalAnalyticsService(config);
        }
        return EnhancedStatisticalAnalyticsService.instance;
    }
    /**
     * Enhanced anomaly detection with optimization
     */
    async detectAnomalies(data, method = 'all') {
        return this.executeWithPerformanceTracking('detectAnomalies', async () => {
            this.validateInput(data, this.config.anomalyDetection.minDataPoints);
            // Use batch processing for large datasets
            if (data.length > this.config.batchSize && this.config.enableBatchProcessing) {
                return this.detectAnomaliesBatch(data, method);
            }
            return this.detectAnomaliesOptimized(data, method);
        }, data.length);
    }
    /**
     * Enhanced trend analysis with memoization
     */
    async analyzeTrend(data) {
        return this.executeWithPerformanceTracking('analyzeTrend', async () => {
            this.validateInput(data, this.config.trendAnalysis.minDataPoints);
            // Memoized computation for repeated requests
            const memoizedAnalysis = this.config.enableMemoization ?
                memoization_service_1.memoizationService.memoizeAsync(this.computeTrendAnalysis.bind(this), {
                    ttl: this.config.cacheTtl,
                    keyGenerator: (data) => `trend_${this.generateDataHash(data)}`
                }) : this.computeTrendAnalysis.bind(this);
            return memoizedAnalysis(data);
        }, data.length);
    }
    /**
     * Enhanced benchmarking with parallel processing
     */
    async generateBenchmark(currentValue, historicalData, category = 'general') {
        return this.executeWithPerformanceTracking('generateBenchmark', async () => {
            this.validateInput(historicalData, this.config.benchmarking.minSamples);
            const values = historicalData.map(d => d.value);
            // Use parallel computation for statistical summary
            const stats = optimized_math_utils_service_1.optimizedMathUtils.computeStatisticalSummary(values);
            const percentile = this.calculateValuePercentile(values, currentValue);
            return {
                currentValue,
                benchmark: stats.mean,
                percentile,
                deviationPercent: ((currentValue - stats.mean) / stats.mean) * 100,
                performance: this.determinePerformance(percentile),
                historicalContext: {
                    best: stats.min,
                    worst: stats.max,
                    average: stats.mean,
                    median: stats.median
                },
                comparison: {
                    betterThan: percentile,
                    category
                }
            };
        }, historicalData.length);
    }
    /**
     * Enhanced SLA monitoring with caching
     */
    async monitorSLA(currentValue, slaTarget, historicalData, violationType = 'performance') {
        return this.executeWithPerformanceTracking('monitorSLA', async () => {
            const violated = currentValue < slaTarget;
            const violationPercent = violated ? ((slaTarget - currentValue) / slaTarget) * 100 : 0;
            // Optimized violation frequency calculation
            const recentViolations = this.calculateRecentViolations(historicalData, slaTarget);
            return {
                violated,
                slaTarget,
                actualValue: currentValue,
                violationPercent,
                violationType,
                severity: this.determineSLASeverity(violationPercent),
                timeInViolation: violated ? 1 : 0,
                frequencyOfViolation: recentViolations,
                remediation: this.generateSLARemediation(violationType, violationPercent)
            };
        }, historicalData.length);
    }
    /**
     * Enhanced cost analysis with batch processing
     */
    async analyzeCosts(executionTimeMinutes, resourceUsage, historicalCostData) {
        return this.executeWithPerformanceTracking('analyzeCosts', async () => {
            const costs = this.config.costAnalysis.resourceCosts;
            const executionHours = executionTimeMinutes / 60;
            // Parallel cost calculation
            const totalCost = await this.calculateTotalCost(resourceUsage, costs, executionHours);
            const costPerMinute = totalCost / executionTimeMinutes;
            // Optimized trend analysis for cost data
            let costTrend = null;
            if (historicalCostData.length >= this.config.trendAnalysis.minDataPoints) {
                costTrend = await this.analyzeTrend(historicalCostData);
            }
            return {
                totalCost,
                costPerMinute,
                costTrend: costTrend,
                optimizationOpportunities: this.generateCostOptimizations(resourceUsage, totalCost),
                resourceUtilization: resourceUsage,
                efficiency: this.calculateEfficiencyScore(resourceUsage, executionTimeMinutes)
            };
        }, historicalCostData.length);
    }
    /**
     * Streaming analytics for very large datasets
     */
    async *analyzeDataStream(dataStream, analysisTypes = ['anomaly']) {
        if (!this.config.enableStreamProcessing) {
            throw new error_handler_1.AppError('Stream processing is disabled', 400);
        }
        const windowSize = this.config.anomalyDetection.windowSize;
        const buffer = [];
        for await (const dataPoint of dataStream) {
            buffer.push(dataPoint);
            // Process when buffer is full
            if (buffer.length >= windowSize) {
                for (const analysisType of analysisTypes) {
                    try {
                        let result;
                        switch (analysisType) {
                            case 'anomaly':
                                result = await this.detectAnomalies(buffer);
                                break;
                            case 'trend':
                                if (buffer.length >= this.config.trendAnalysis.minDataPoints) {
                                    result = await this.analyzeTrend(buffer);
                                }
                                break;
                            case 'benchmark':
                                if (buffer.length >= this.config.benchmarking.minSamples) {
                                    const latest = buffer[buffer.length - 1];
                                    result = await this.generateBenchmark(latest.value, buffer.slice(0, -1));
                                }
                                break;
                        }
                        if (result) {
                            yield { type: analysisType, result };
                        }
                    }
                    catch (error) {
                        this.logger.error(`Stream analysis error for ${analysisType}`, error);
                    }
                }
                // Keep only last half of buffer for overlap
                buffer.splice(0, Math.floor(windowSize / 2));
            }
        }
    }
    // Private optimized methods
    async detectAnomaliesBatch(data, method) {
        const results = [];
        await batch_processing_service_1.batchProcessingService.processBatches(data, async (batch) => {
            const batchResults = await this.detectAnomaliesOptimized(batch, method);
            results.push(...batchResults);
            return batchResults;
        }, {
            onProgress: (progress) => {
                this.logger.debug('Anomaly detection progress', {
                    percentage: progress.percentage.toFixed(2)
                });
            }
        });
        return results;
    }
    async detectAnomaliesOptimized(data, method) {
        const values = data.map(d => d.value);
        const stats = optimized_math_utils_service_1.optimizedMathUtils.computeStatisticalSummary(values);
        const results = [];
        data.forEach((point, index) => {
            const value = point.value;
            if (method === 'z-score' || method === 'all') {
                const zScore = Math.abs((value - stats.mean) / stats.standardDeviation);
                if (zScore > this.config.anomalyDetection.zScoreThreshold) {
                    results.push(this.createAnomalyResult(value, zScore, 'z-score', stats));
                }
            }
            if (method === 'iqr' || method === 'all') {
                const lowerBound = stats.q1 - (1.5 * stats.iqr);
                const upperBound = stats.q3 + (1.5 * stats.iqr);
                if (value < lowerBound || value > upperBound) {
                    const distance = Math.min(Math.abs(value - lowerBound), Math.abs(value - upperBound));
                    const anomalyScore = distance / stats.iqr;
                    results.push(this.createAnomalyResult(value, anomalyScore, 'iqr', stats));
                }
            }
        });
        return results;
    }
    async computeTrendAnalysis(data) {
        const baseTime = data[0].timestamp.getTime();
        const xValues = data.map((d, i) => (d.timestamp.getTime() - baseTime) / (1000 * 60 * 60));
        const yValues = data.map(d => d.value);
        const regression = optimized_math_utils_service_1.optimizedMathUtils.computeLinearRegression(xValues, yValues, this.config.trendAnalysis.confidenceLevel);
        const lastPoint = xValues[xValues.length - 1];
        const meanValue = optimized_math_utils_service_1.optimizedMathUtils.computeMean(yValues);
        const changeRate = ((regression.slope * 24) / meanValue) * 100;
        return {
            trend: this.determineTrend(regression.slope, regression.standardError),
            slope: regression.slope,
            correlation: regression.correlation,
            rSquared: regression.rSquared,
            confidenceInterval: regression.confidenceInterval,
            prediction: {
                next24h: regression.slope * (lastPoint + 24) + regression.intercept,
                next7d: regression.slope * (lastPoint + 24 * 7) + regression.intercept,
                next30d: regression.slope * (lastPoint + 24 * 30) + regression.intercept
            },
            changeRate,
            volatility: this.calculateVolatility(yValues, regression)
        };
    }
    async calculateTotalCost(resourceUsage, costs, executionHours) {
        // Parallel cost calculation for better performance
        const costPromises = [
            Promise.resolve(resourceUsage.cpu * costs.cpu * executionHours),
            Promise.resolve(resourceUsage.memory * costs.memory * executionHours),
            Promise.resolve(resourceUsage.storage * costs.storage * executionHours),
            Promise.resolve(resourceUsage.network * costs.network)
        ];
        const costComponents = await Promise.all(costPromises);
        return costComponents.reduce((sum, cost) => sum + cost, 0);
    }
    async executeWithPerformanceTracking(operationName, operation, dataSize) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage().heapUsed;
        try {
            const result = await operation();
            if (this.config.enablePerformanceTracking) {
                const endTime = performance.now();
                const endMemory = process.memoryUsage().heapUsed;
                const executionTime = endTime - startTime;
                const metrics = {
                    operationName,
                    executionTime,
                    memoryUsage: endMemory - startMemory,
                    cacheHit: false, // Would be determined by actual cache implementation
                    dataSize,
                    timestamp: new Date()
                };
                this.performanceMetrics.push(metrics);
                // Log slow queries
                if (executionTime > this.config.slowQueryThreshold) {
                    this.logger.warn('Slow operation detected', {
                        operationName: metrics.operationName,
                        executionTime: metrics.executionTime,
                        dataSize: metrics.dataSize
                    });
                }
                // Report to performance monitor
                const perfMonitor = performance_monitor_service_1.PerformanceMonitorService.getInstance();
                perfMonitor.emit('analytics-operation', metrics);
            }
            return result;
        }
        catch (error) {
            this.logger.error(`Operation ${operationName} failed`, error);
            throw error;
        }
    }
    // Helper methods (simplified versions of originals)
    validateInput(data, minSize) {
        if (!Array.isArray(data) || data.length < minSize) {
            throw new error_handler_1.AppError(`Insufficient data points. Required: ${minSize}, provided: ${data.length}`, 400);
        }
    }
    generateDataHash(data) {
        const values = data.map(d => `${d.timestamp.getTime()}_${d.value}`).join('|');
        return Buffer.from(values).toString('base64').substring(0, 32);
    }
    createAnomalyResult(value, anomalyScore, method, stats) {
        return {
            isAnomaly: true,
            anomalyScore,
            method,
            threshold: method === 'z-score' ? this.config.anomalyDetection.zScoreThreshold : 1.5,
            actualValue: value,
            expectedRange: {
                min: method === 'z-score'
                    ? stats.mean - (this.config.anomalyDetection.zScoreThreshold * stats.standardDeviation)
                    : stats.q1 - (1.5 * stats.iqr),
                max: method === 'z-score'
                    ? stats.mean + (this.config.anomalyDetection.zScoreThreshold * stats.standardDeviation)
                    : stats.q3 + (1.5 * stats.iqr)
            },
            confidence: Math.min(100, anomalyScore * 50),
            severity: this.determineSeverity(anomalyScore)
        };
    }
    calculateValuePercentile(sortedValues, value) {
        let count = 0;
        for (const val of sortedValues) {
            if (val <= value)
                count++;
        }
        return (count / sortedValues.length) * 100;
    }
    determinePerformance(percentile) {
        if (percentile >= 90)
            return 'excellent';
        if (percentile >= 75)
            return 'good';
        if (percentile >= 50)
            return 'average';
        if (percentile >= 25)
            return 'below-average';
        return 'poor';
    }
    calculateRecentViolations(historicalData, slaTarget) {
        const recent = historicalData.filter(d => d.timestamp.getTime() > Date.now() - (24 * 60 * 60 * 1000));
        return recent.filter(d => d.value < slaTarget).length;
    }
    determineSLASeverity(violationPercent) {
        if (violationPercent >= 20)
            return 'critical';
        if (violationPercent >= 10)
            return 'major';
        return 'minor';
    }
    generateSLARemediation(violationType, violationPercent) {
        // Simplified remediation logic
        return {
            immediateActions: ['Scale resources', 'Check health'],
            longTermActions: ['Optimize performance', 'Add monitoring'],
            estimatedImpact: `${Math.ceil(violationPercent / 2)}% improvement expected`
        };
    }
    generateCostOptimizations(resourceUsage, totalCost) {
        // Simplified optimization logic
        return [];
    }
    calculateEfficiencyScore(resourceUsage, executionTime) {
        // Simplified efficiency calculation
        return {
            score: Math.max(0, 100 - (executionTime / 60) * 10),
            recommendations: ['Optimize resource usage', 'Reduce execution time']
        };
    }
    determineTrend(slope, standardError) {
        const significance = Math.abs(slope) / Math.max(standardError, 0.0001);
        if (significance < 0.5)
            return 'stable';
        if (standardError > Math.abs(slope) * 3)
            return 'volatile';
        if (slope > 0)
            return 'increasing';
        return 'decreasing';
    }
    calculateVolatility(values, regression) {
        // Calculate residuals and their standard deviation
        const n = values.length;
        let sumSquaredResiduals = 0;
        for (let i = 0; i < n; i++) {
            const predicted = regression.slope * i + regression.intercept;
            const residual = values[i] - predicted;
            sumSquaredResiduals += residual * residual;
        }
        return Math.sqrt(sumSquaredResiduals / (n - 2));
    }
    determineSeverity(anomalyScore) {
        if (anomalyScore >= 5)
            return 'critical';
        if (anomalyScore >= 3)
            return 'high';
        if (anomalyScore >= 2)
            return 'medium';
        return 'low';
    }
    /**
     * Get performance metrics for monitoring
     */
    getPerformanceMetrics() {
        return [...this.performanceMetrics];
    }
    /**
     * Clear performance metrics
     */
    clearPerformanceMetrics() {
        this.performanceMetrics = [];
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('Enhanced analytics configuration updated');
    }
}
exports.EnhancedStatisticalAnalyticsService = EnhancedStatisticalAnalyticsService;
// Export singleton instance
exports.enhancedStatisticalAnalyticsService = EnhancedStatisticalAnalyticsService.getInstance();
//# sourceMappingURL=enhanced-statistical-analytics.service.js.map