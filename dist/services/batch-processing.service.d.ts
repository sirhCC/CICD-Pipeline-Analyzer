/**
 * Batch Processing Service - Efficient Large Dataset Processing
 *
 * Features:
 * - Configurable batch sizes and processing strategies
 * - Memory-efficient streaming processing
 * - Parallel batch execution with worker pools
 * - Progress tracking and error handling
 * - Backpressure management
 * - Resource usage monitoring and throttling
 *
 * @author sirhCC
 * @version 1.0.0
 */
import { EventEmitter } from 'events';
export interface BatchConfig {
    batchSize: number;
    maxConcurrency: number;
    enableParallelProcessing: boolean;
    memoryThreshold: number;
    processingTimeout: number;
    retryAttempts: number;
    backpressureThreshold: number;
}
export interface BatchResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    processingTime: number;
    batchIndex: number;
    itemCount: number;
}
export interface BatchProgress {
    totalItems: number;
    processedItems: number;
    failedItems: number;
    currentBatch: number;
    totalBatches: number;
    percentage: number;
    estimatedTimeRemaining: number;
    memoryUsage: number;
    throughput: number;
}
export interface StreamingConfig {
    highWaterMark: number;
    objectMode: boolean;
    allowHalfOpen: boolean;
}
export declare class BatchProcessingService extends EventEmitter {
    private static instance;
    private logger;
    private config;
    private activeProcessors;
    private processingQueue;
    private workers;
    private constructor();
    static getInstance(config?: Partial<BatchConfig>): BatchProcessingService;
    /**
     * Process large dataset in batches with progress tracking
     */
    processBatches<TInput, TOutput>(data: TInput[], processor: (batch: TInput[], batchIndex: number) => Promise<TOutput[]>, options?: {
        onProgress?: (progress: BatchProgress) => void;
        onBatchComplete?: (result: BatchResult<TOutput[]>) => void;
        onError?: (error: Error, batchIndex: number) => void;
    }): Promise<TOutput[]>;
    /**
     * Stream processing for very large datasets
     */
    processStream<TInput, TOutput>(dataStream: AsyncIterable<TInput>, processor: (item: TInput) => Promise<TOutput>, options?: {
        onProgress?: (processed: number) => void;
        onError?: (error: Error, item: TInput) => void;
        streamConfig?: Partial<StreamingConfig>;
    }): AsyncGenerator<TOutput, void, unknown>;
    /**
     * Process batch with retry logic
     */
    private processBatchWithRetry;
    /**
     * Create batches from array
     */
    private createBatches;
    /**
     * Calculate estimated time of arrival
     */
    private calculateETA;
    /**
     * Calculate processing throughput
     */
    private calculateThroughput;
    /**
     * Get current memory usage
     */
    private getMemoryUsage;
    /**
     * Check if backpressure should be applied
     */
    private shouldApplyBackpressure;
    /**
     * Wait for memory to recover
     */
    private waitForMemoryRecovery;
    /**
     * Clean up completed promises from array
     */
    private cleanupCompletedPromises;
    /**
     * Check if promise is resolved
     */
    private isPromiseResolved;
    /**
     * Delay utility
     */
    private delay;
    /**
     * Get processing statistics
     */
    getStats(): {
        activeProcessors: number;
        queueLength: number;
        config: BatchConfig;
        memoryUsage: number;
    };
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<BatchConfig>): void;
    /**
     * Cleanup resources
     */
    destroy(): Promise<void>;
}
export declare const batchProcessingService: BatchProcessingService;
//# sourceMappingURL=batch-processing.service.d.ts.map