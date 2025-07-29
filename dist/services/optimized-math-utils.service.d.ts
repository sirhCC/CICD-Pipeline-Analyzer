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
export interface StatisticalSummary {
    count: number;
    sum: number;
    mean: number;
    variance: number;
    standardDeviation: number;
    min: number;
    max: number;
    median: number;
    q1: number;
    q3: number;
    iqr: number;
    skewness: number;
    kurtosis: number;
}
export interface RegressionResult {
    slope: number;
    intercept: number;
    correlation: number;
    rSquared: number;
    standardError: number;
    tStatistic: number;
    pValue: number;
    confidenceInterval: {
        lower: number;
        upper: number;
    };
}
export interface MovingAverageConfig {
    windowSize: number;
    type: 'simple' | 'exponential' | 'weighted';
    alpha?: number;
}
export declare class OptimizedMathUtils {
    private static instance;
    private constructor();
    static getInstance(): OptimizedMathUtils;
    /**
     * Vectorized statistical summary with single pass computation
     */
    computeStatisticalSummary: (values: number[]) => StatisticalSummary;
    /**
     * Optimized linear regression with numerical stability
     */
    computeLinearRegression: (x: number[], y: number[], confidenceLevel?: number | undefined) => RegressionResult;
    /**
     * Fast percentile computation using interpolation
     */
    computePercentile(sortedValues: number[], percentile: number): number;
    /**
     * Optimized z-score computation for arrays
     */
    computeZScores(values: number[], mean?: number, stdDev?: number): number[];
    /**
     * Moving average with multiple algorithms
     */
    computeMovingAverage(values: number[], config: MovingAverageConfig): number[];
    /**
     * Fast mean computation
     */
    computeMean(values: number[]): number;
    /**
     * Fast standard deviation with optional mean
     */
    computeStandardDeviation(values: number[], mean?: number): number;
    /**
     * Outlier detection using IQR method
     */
    detectOutliers(values: number[], multiplier?: number): {
        outliers: number[];
        outlierIndices: number[];
        lowerBound: number;
        upperBound: number;
    };
    /**
     * Parallel computation for large arrays
     */
    computeParallel<T>(values: number[], computation: (chunk: number[]) => T, chunkSize?: number): Promise<T[]>;
    private computeSimpleMovingAverage;
    private computeExponentialMovingAverage;
    private computeWeightedMovingAverage;
    private hashArray;
    private chunkArray;
    private getTValue;
    private computeTTestPValue;
}
export declare const optimizedMathUtils: OptimizedMathUtils;
//# sourceMappingURL=optimized-math-utils.service.d.ts.map