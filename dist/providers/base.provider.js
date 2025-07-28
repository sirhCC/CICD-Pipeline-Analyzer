"use strict";
/**
 * Base CI/CD Provider Interface
 * Abstract foundation for all CI/CD provider integrations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCICDProvider = void 0;
const types_1 = require("../types");
/**
 * Abstract base class for all CI/CD providers
 */
class BaseCICDProvider {
    config;
    metrics;
    constructor(config) {
        this.config = config;
        this.metrics = {
            apiCallsCount: 0,
            apiCallsSuccessRate: 100,
            averageResponseTime: 0,
            lastSyncTime: new Date(),
            errorCount: 0,
        };
    }
    /**
     * Get provider-specific metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Update provider metrics
     */
    updateMetrics(responseTime, success, error) {
        this.metrics.apiCallsCount++;
        this.metrics.averageResponseTime =
            (this.metrics.averageResponseTime * (this.metrics.apiCallsCount - 1) + responseTime) /
                this.metrics.apiCallsCount;
        if (success) {
            this.metrics.apiCallsSuccessRate =
                (this.metrics.apiCallsSuccessRate * (this.metrics.apiCallsCount - 1) + 100) /
                    this.metrics.apiCallsCount;
        }
        else {
            this.metrics.errorCount++;
            if (error) {
                this.metrics.lastError = error;
            }
            this.metrics.apiCallsSuccessRate =
                (this.metrics.apiCallsSuccessRate * (this.metrics.apiCallsCount - 1)) /
                    this.metrics.apiCallsCount;
        }
        this.metrics.lastSyncTime = new Date();
    }
    /**
     * Execute API call with metrics tracking
     */
    async executeWithMetrics(operation) {
        const startTime = Date.now();
        try {
            const result = await operation();
            this.updateMetrics(Date.now() - startTime, true);
            return result;
        }
        catch (error) {
            this.updateMetrics(Date.now() - startTime, false, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
    /**
     * Normalize pipeline status across providers
     */
    normalizePipelineStatus(providerStatus) {
        const statusMap = {
            // Common status mappings
            'success': types_1.PipelineStatus.SUCCESS,
            'completed': types_1.PipelineStatus.SUCCESS,
            'passed': types_1.PipelineStatus.SUCCESS,
            'failed': types_1.PipelineStatus.FAILED,
            'failure': types_1.PipelineStatus.FAILED,
            'error': types_1.PipelineStatus.FAILED,
            'running': types_1.PipelineStatus.RUNNING,
            'in_progress': types_1.PipelineStatus.RUNNING,
            'pending': types_1.PipelineStatus.PENDING,
            'queued': types_1.PipelineStatus.PENDING,
            'waiting': types_1.PipelineStatus.PENDING,
            'cancelled': types_1.PipelineStatus.CANCELLED,
            'canceled': types_1.PipelineStatus.CANCELLED,
            'skipped': types_1.PipelineStatus.SKIPPED,
            'timeout': types_1.PipelineStatus.TIMEOUT,
            'timed_out': types_1.PipelineStatus.TIMEOUT,
        };
        return statusMap[providerStatus.toLowerCase()] || types_1.PipelineStatus.UNKNOWN;
    }
    /**
     * Parse duration from various formats
     */
    parseDuration(startTime, endTime) {
        if (!endTime)
            return undefined;
        const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
        const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
        return Math.max(0, end.getTime() - start.getTime());
    }
    /**
     * Sanitize sensitive data from logs
     */
    sanitizeData(data) {
        const sensitiveKeys = [
            'password', 'token', 'key', 'secret', 'credential',
            'auth', 'authorization', 'bearer', 'api_key'
        ];
        if (typeof data === 'string') {
            // Mask potential secrets in strings
            return data.replace(/([a-zA-Z0-9_-]*(?:password|token|key|secret)[a-zA-Z0-9_-]*\s*[:=]\s*)([^\s\n]+)/gi, '$1***');
        }
        if (typeof data === 'object' && data !== null) {
            const sanitized = Array.isArray(data) ? [] : {};
            for (const [key, value] of Object.entries(data)) {
                const isSensitive = sensitiveKeys.some(sensitiveKey => key.toLowerCase().includes(sensitiveKey));
                if (isSensitive) {
                    sanitized[key] = '***';
                }
                else {
                    sanitized[key] = this.sanitizeData(value);
                }
            }
            return sanitized;
        }
        return data;
    }
}
exports.BaseCICDProvider = BaseCICDProvider;
//# sourceMappingURL=base.provider.js.map