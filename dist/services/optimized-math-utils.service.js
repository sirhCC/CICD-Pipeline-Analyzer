"use strict";
/**
 * Optimized Mathematical Utilities - High-Performance Statistical Computations
 *
 * Features:
 * - Vectorized mathematical operations
 * - Memory-efficient algorithms
 * - Parallel computation support
 * - Numerical stability improvements
 * - Caching of expensive computations
 *
 * @author sirhCC
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizedMathUtils = exports.OptimizedMathUtils = void 0;
const memoization_service_1 = require("./memoization.service");
class OptimizedMathUtils {
    static instance;
    constructor() { }
    static getInstance() {
        if (!OptimizedMathUtils.instance) {
            OptimizedMathUtils.instance = new OptimizedMathUtils();
        }
        return OptimizedMathUtils.instance;
    }
    /**
     * Vectorized statistical summary with single pass computation
     */
    computeStatisticalSummary = memoization_service_1.memoizationService.memoize((values) => {
        if (values.length === 0) {
            throw new Error('Cannot compute statistics for empty array');
        }
        // Single pass computation for efficiency
        let sum = 0;
        let sumSquares = 0;
        let sumCubes = 0;
        let sumQuads = 0;
        let min = values[0];
        let max = values[0];
        for (const value of values) {
            sum += value;
            sumSquares += value * value;
            sumCubes += value * value * value;
            sumQuads += value * value * value * value;
            if (value < min)
                min = value;
            if (value > max)
                max = value;
        }
        const count = values.length;
        const mean = sum / count;
        const variance = (sumSquares / count) - (mean * mean);
        const standardDeviation = Math.sqrt(variance);
        // Sort once for percentile calculations
        const sorted = [...values].sort((a, b) => a - b);
        const median = this.computePercentile(sorted, 50);
        const q1 = this.computePercentile(sorted, 25);
        const q3 = this.computePercentile(sorted, 75);
        const iqr = q3 - q1;
        // Higher moments for skewness and kurtosis
        const m3 = (sumCubes / count) - 3 * mean * (sumSquares / count) + 2 * mean * mean * mean;
        const m4 = (sumQuads / count) - 4 * mean * (sumCubes / count) +
            6 * mean * mean * (sumSquares / count) - 3 * mean * mean * mean * mean;
        const skewness = standardDeviation > 0 ? m3 / Math.pow(standardDeviation, 3) : 0;
        const kurtosis = variance > 0 ? (m4 / (variance * variance)) - 3 : 0;
        return {
            count,
            sum,
            mean,
            variance,
            standardDeviation,
            min,
            max,
            median,
            q1,
            q3,
            iqr,
            skewness,
            kurtosis
        };
    }, {
        ttl: 300000, // 5 minutes
        keyGenerator: (values) => {
            // Create hash of array for memoization
            const hash = this.hashArray(values);
            return `stats_${hash}`;
        }
    });
    /**
     * Optimized linear regression with numerical stability
     */
    computeLinearRegression = memoization_service_1.memoizationService.memoize((x, y, confidenceLevel = 0.95) => {
        if (x.length !== y.length || x.length < 2) {
            throw new Error('Invalid input: arrays must have same length and at least 2 points');
        }
        const n = x.length;
        // Use numerically stable algorithm
        const xMean = this.computeMean(x);
        const yMean = this.computeMean(y);
        let sxx = 0;
        let sxy = 0;
        let syy = 0;
        for (let i = 0; i < n; i++) {
            const xDiff = x[i] - xMean;
            const yDiff = y[i] - yMean;
            sxx += xDiff * xDiff;
            sxy += xDiff * yDiff;
            syy += yDiff * yDiff;
        }
        if (sxx === 0) {
            throw new Error('Cannot compute regression: all x values are identical');
        }
        const slope = sxy / sxx;
        const intercept = yMean - slope * xMean;
        // Correlation coefficient
        const correlation = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
        const rSquared = correlation * correlation;
        // Standard error of slope
        const residualSumSquares = syy - (sxy * sxy) / sxx;
        const standardError = Math.sqrt(residualSumSquares / ((n - 2) * sxx));
        // T-statistic and p-value
        const tStatistic = slope / standardError;
        const pValue = this.computeTTestPValue(tStatistic, n - 2);
        // Confidence interval
        const tCritical = this.getTValue(n - 2, confidenceLevel);
        const marginOfError = tCritical * standardError;
        return {
            slope,
            intercept,
            correlation,
            rSquared,
            standardError,
            tStatistic,
            pValue,
            confidenceInterval: {
                lower: slope - marginOfError,
                upper: slope + marginOfError
            }
        };
    }, {
        ttl: 300000,
        keyGenerator: (x, y, confidenceLevel = 0.95) => {
            const xHash = this.hashArray(x);
            const yHash = this.hashArray(y);
            return `regression_${xHash}_${yHash}_${confidenceLevel}`;
        }
    });
    /**
     * Fast percentile computation using interpolation
     */
    computePercentile(sortedValues, percentile) {
        if (sortedValues.length === 0) {
            throw new Error('Cannot compute percentile of empty array');
        }
        if (percentile < 0 || percentile > 100) {
            throw new Error('Percentile must be between 0 and 100');
        }
        const index = (percentile / 100) * (sortedValues.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        if (upper >= sortedValues.length) {
            return sortedValues[sortedValues.length - 1];
        }
        const lowerValue = sortedValues[lower];
        const upperValue = sortedValues[upper];
        return lowerValue * (1 - weight) + upperValue * weight;
    }
    /**
     * Optimized z-score computation for arrays
     */
    computeZScores(values, mean, stdDev) {
        if (values.length === 0)
            return [];
        const actualMean = mean ?? this.computeMean(values);
        const actualStdDev = stdDev ?? this.computeStandardDeviation(values, actualMean);
        if (actualStdDev === 0) {
            return new Array(values.length).fill(0);
        }
        return values.map(value => (value - actualMean) / actualStdDev);
    }
    /**
     * Moving average with multiple algorithms
     */
    computeMovingAverage(values, config) {
        if (values.length === 0)
            return [];
        switch (config.type) {
            case 'simple':
                return this.computeSimpleMovingAverage(values, config.windowSize);
            case 'exponential':
                return this.computeExponentialMovingAverage(values, config.alpha || 0.1);
            case 'weighted':
                return this.computeWeightedMovingAverage(values, config.windowSize);
            default:
                throw new Error(`Unsupported moving average type: ${config.type}`);
        }
    }
    /**
     * Fast mean computation
     */
    computeMean(values) {
        if (values.length === 0)
            return 0;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }
    /**
     * Fast standard deviation with optional mean
     */
    computeStandardDeviation(values, mean) {
        if (values.length === 0)
            return 0;
        const actualMean = mean ?? this.computeMean(values);
        const variance = values.reduce((sum, value) => {
            const diff = value - actualMean;
            return sum + diff * diff;
        }, 0) / values.length;
        return Math.sqrt(variance);
    }
    /**
     * Outlier detection using IQR method
     */
    detectOutliers(values, multiplier = 1.5) {
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = this.computePercentile(sorted, 25);
        const q3 = this.computePercentile(sorted, 75);
        const iqr = q3 - q1;
        const lowerBound = q1 - multiplier * iqr;
        const upperBound = q3 + multiplier * iqr;
        const outliers = [];
        const outlierIndices = [];
        values.forEach((value, index) => {
            if (value < lowerBound || value > upperBound) {
                outliers.push(value);
                outlierIndices.push(index);
            }
        });
        return { outliers, outlierIndices, lowerBound, upperBound };
    }
    /**
     * Parallel computation for large arrays
     */
    async computeParallel(values, computation, chunkSize = 1000) {
        const chunks = this.chunkArray(values, chunkSize);
        // Use Promise.all for parallel execution
        return Promise.all(chunks.map(chunk => Promise.resolve(computation(chunk))));
    }
    // Private helper methods
    computeSimpleMovingAverage(values, windowSize) {
        const result = [];
        for (let i = 0; i < values.length; i++) {
            const start = Math.max(0, i - windowSize + 1);
            const window = values.slice(start, i + 1);
            result.push(this.computeMean(window));
        }
        return result;
    }
    computeExponentialMovingAverage(values, alpha) {
        if (values.length === 0)
            return [];
        const result = [values[0]];
        for (let i = 1; i < values.length; i++) {
            const ema = alpha * values[i] + (1 - alpha) * result[i - 1];
            result.push(ema);
        }
        return result;
    }
    computeWeightedMovingAverage(values, windowSize) {
        const result = [];
        for (let i = 0; i < values.length; i++) {
            const start = Math.max(0, i - windowSize + 1);
            const window = values.slice(start, i + 1);
            let weightedSum = 0;
            let weightSum = 0;
            window.forEach((value, index) => {
                const weight = index + 1; // Linear weights
                weightedSum += value * weight;
                weightSum += weight;
            });
            result.push(weightedSum / weightSum);
        }
        return result;
    }
    hashArray(values) {
        // Simple hash function for array memoization
        let hash = 0;
        const str = values.join(',');
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
    getTValue(degreesOfFreedom, confidenceLevel) {
        // Simplified t-table lookup - in production, use a proper implementation
        const tTable = {
            '0.95': 1.96,
            '0.99': 2.576,
            '0.90': 1.645
        };
        return tTable[confidenceLevel.toString()] || 1.96;
    }
    computeTTestPValue(tStatistic, degreesOfFreedom) {
        // Simplified p-value computation - in production, use a proper implementation
        const absT = Math.abs(tStatistic);
        if (absT > 2.576)
            return 0.01;
        if (absT > 1.96)
            return 0.05;
        if (absT > 1.645)
            return 0.10;
        return 0.20;
    }
}
exports.OptimizedMathUtils = OptimizedMathUtils;
// Export singleton instance
exports.optimizedMathUtils = OptimizedMathUtils.getInstance();
//# sourceMappingURL=optimized-math-utils.service.js.map