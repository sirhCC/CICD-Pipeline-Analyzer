"use strict";
/**
 * Optimization Configuration Service - Centralized Performance Settings
 *
 * Features:
 * - Centralized configuration management
 * - Environment-specific optimizations
 * - Runtime configuration updates
 * - Performance profiling integration
 * - Auto-tuning capabilities
 *
 * @author sirhCC
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizationConfigService = exports.OptimizationConfigService = void 0;
const logger_1 = require("../shared/logger");
const events_1 = require("events");
class OptimizationConfigService extends events_1.EventEmitter {
    static instance;
    logger;
    currentProfile;
    profiles = new Map();
    performanceHistory = [];
    autoTuningConfig;
    autoTuningTimer;
    constructor() {
        super();
        this.logger = new logger_1.Logger('OptimizationConfig');
        // Initialize default profiles
        this.initializeDefaultProfiles();
        // Set default profile based on environment
        this.currentProfile = this.getDefaultProfile();
        // Auto-tuning configuration
        this.autoTuningConfig = {
            enabled: process.env.NODE_ENV === 'production',
            analysisWindow: 60, // 1 hour
            adjustmentThreshold: 10, // 10% change needed
            maxAdjustmentPercent: 20, // max 20% adjustment
            tuningInterval: 30 // 30 minutes
        };
        this.startAutoTuning();
    }
    static getInstance() {
        if (!OptimizationConfigService.instance) {
            OptimizationConfigService.instance = new OptimizationConfigService();
        }
        return OptimizationConfigService.instance;
    }
    /**
     * Get current optimization profile
     */
    getCurrentProfile() {
        return { ...this.currentProfile };
    }
    /**
     * Switch to a different optimization profile
     */
    switchProfile(profileName) {
        const profile = this.profiles.get(profileName);
        if (!profile) {
            this.logger.warn(`Profile '${profileName}' not found`);
            return false;
        }
        const oldProfile = this.currentProfile.name;
        this.currentProfile = { ...profile };
        this.logger.info('Optimization profile switched', {
            from: oldProfile,
            to: profileName
        });
        this.emit('profileChanged', {
            oldProfile: oldProfile,
            newProfile: profileName,
            config: this.currentProfile
        });
        return true;
    }
    /**
     * Create a custom profile
     */
    createCustomProfile(name, baseProfile, overrides) {
        const base = this.profiles.get(baseProfile);
        if (!base) {
            this.logger.error(`Base profile '${baseProfile}' not found`);
            return false;
        }
        const customProfile = {
            ...base,
            ...overrides,
            name,
            description: overrides.description || `Custom profile based on ${baseProfile}`
        };
        this.profiles.set(name, customProfile);
        this.logger.info(`Custom profile '${name}' created`);
        return true;
    }
    /**
     * Update current profile settings
     */
    updateCurrentProfile(updates) {
        const oldConfig = { ...this.currentProfile };
        this.currentProfile = { ...this.currentProfile, ...updates };
        this.logger.info('Current profile updated', {
            profile: this.currentProfile.name,
            changes: Object.keys(updates)
        });
        this.emit('configUpdated', {
            oldConfig,
            newConfig: this.currentProfile,
            changes: updates
        });
    }
    /**
     * Get all available profiles
     */
    getAvailableProfiles() {
        return Array.from(this.profiles.keys());
    }
    /**
     * Get profile by name
     */
    getProfile(name) {
        const profile = this.profiles.get(name);
        return profile ? { ...profile } : undefined;
    }
    /**
     * Record performance metrics for auto-tuning
     */
    recordPerformanceMetrics(metrics) {
        this.performanceHistory.push(metrics);
        // Keep only recent metrics (last 24 hours)
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        this.performanceHistory = this.performanceHistory.filter(m => m.timestamp.getTime() > cutoff);
        this.emit('metricsRecorded', metrics);
    }
    /**
     * Get performance trend analysis
     */
    getPerformanceTrend(minutes = 60) {
        const cutoff = Date.now() - (minutes * 60 * 1000);
        const recentMetrics = this.performanceHistory.filter(m => m.timestamp.getTime() > cutoff);
        if (recentMetrics.length < 10) {
            return {
                memoryTrend: 'stable',
                cpuTrend: 'stable',
                latencyTrend: 'stable',
                recommendations: ['Insufficient data for trend analysis']
            };
        }
        const memoryTrend = this.calculateTrend(recentMetrics.map(m => m.memoryUsage));
        const cpuTrend = this.calculateTrend(recentMetrics.map(m => m.cpuUsage));
        const latencyTrend = this.calculateTrend(recentMetrics.map(m => m.queryLatency));
        const recommendations = this.generateRecommendations(memoryTrend, cpuTrend, latencyTrend, recentMetrics);
        return {
            memoryTrend,
            cpuTrend,
            latencyTrend,
            recommendations
        };
    }
    /**
     * Auto-tune configuration based on performance metrics
     */
    async performAutoTuning() {
        if (!this.autoTuningConfig.enabled) {
            return false;
        }
        const trend = this.getPerformanceTrend(this.autoTuningConfig.analysisWindow);
        const adjustments = this.calculateOptimalAdjustments(trend);
        if (Object.keys(adjustments).length === 0) {
            this.logger.debug('No auto-tuning adjustments needed');
            return false;
        }
        this.logger.info('Applying auto-tuning adjustments', adjustments);
        this.updateCurrentProfile(adjustments);
        return true;
    }
    /**
     * Export current configuration for backup
     */
    exportConfiguration() {
        const profilesObject = {};
        for (const [name, profile] of this.profiles.entries()) {
            profilesObject[name] = profile;
        }
        return {
            currentProfile: this.currentProfile.name,
            profiles: profilesObject,
            autoTuningConfig: this.autoTuningConfig
        };
    }
    /**
     * Import configuration from backup
     */
    importConfiguration(config) {
        try {
            // Import profiles
            this.profiles.clear();
            for (const [name, profile] of Object.entries(config.profiles)) {
                this.profiles.set(name, profile);
            }
            // Set current profile
            if (config.currentProfile && this.profiles.has(config.currentProfile)) {
                this.currentProfile = this.profiles.get(config.currentProfile);
            }
            // Import auto-tuning config
            if (config.autoTuningConfig) {
                this.autoTuningConfig = config.autoTuningConfig;
            }
            this.logger.info('Configuration imported successfully');
            this.emit('configurationImported', config);
            return true;
        }
        catch (error) {
            this.logger.error('Failed to import configuration', error);
            return false;
        }
    }
    // Private methods
    initializeDefaultProfiles() {
        // Development profile - more debugging, less optimization
        this.profiles.set('development', {
            name: 'development',
            description: 'Optimized for development with debugging capabilities',
            memoization: {
                enabled: true,
                maxSize: 100,
                defaultTtl: 60000, // 1 minute
                enableMetrics: true
            },
            batchProcessing: {
                enabled: true,
                batchSize: 50,
                maxConcurrency: 2,
                memoryThreshold: 256,
                enableParallelProcessing: false
            },
            caching: {
                enabled: true,
                maxMemorySize: 50 * 1024 * 1024, // 50MB
                maxItems: 1000,
                defaultTtl: 300000, // 5 minutes
                enablePredictive: false,
                enableAnalytics: true
            },
            performance: {
                enabled: true,
                monitoringInterval: 10000, // 10 seconds
                memoryWarningThreshold: 0.7,
                cpuWarningThreshold: 0.8,
                slowQueryThreshold: 500
            },
            math: {
                enableVectorization: true,
                enableParallelComputation: false,
                numericalPrecision: 'standard',
                enableStatisticalCaching: true
            },
            streaming: {
                enabled: true,
                highWaterMark: 1000,
                backpressureThreshold: 5000,
                enableCompression: false
            }
        });
        // Production profile - maximum optimization
        this.profiles.set('production', {
            name: 'production',
            description: 'Optimized for production performance',
            memoization: {
                enabled: true,
                maxSize: 10000,
                defaultTtl: 300000, // 5 minutes
                enableMetrics: true
            },
            batchProcessing: {
                enabled: true,
                batchSize: 1000,
                maxConcurrency: 8,
                memoryThreshold: 1024,
                enableParallelProcessing: true
            },
            caching: {
                enabled: true,
                maxMemorySize: 500 * 1024 * 1024, // 500MB
                maxItems: 50000,
                defaultTtl: 600000, // 10 minutes
                enablePredictive: true,
                enableAnalytics: true
            },
            performance: {
                enabled: true,
                monitoringInterval: 30000, // 30 seconds
                memoryWarningThreshold: 0.8,
                cpuWarningThreshold: 0.9,
                slowQueryThreshold: 1000
            },
            math: {
                enableVectorization: true,
                enableParallelComputation: true,
                numericalPrecision: 'high',
                enableStatisticalCaching: true
            },
            streaming: {
                enabled: true,
                highWaterMark: 10000,
                backpressureThreshold: 50000,
                enableCompression: true
            }
        });
        // High-throughput profile - optimized for maximum data processing
        this.profiles.set('high-throughput', {
            name: 'high-throughput',
            description: 'Optimized for maximum data processing throughput',
            memoization: {
                enabled: true,
                maxSize: 5000,
                defaultTtl: 600000, // 10 minutes
                enableMetrics: false // Reduce overhead
            },
            batchProcessing: {
                enabled: true,
                batchSize: 5000,
                maxConcurrency: 16,
                memoryThreshold: 2048,
                enableParallelProcessing: true
            },
            caching: {
                enabled: true,
                maxMemorySize: 1024 * 1024 * 1024, // 1GB
                maxItems: 100000,
                defaultTtl: 1800000, // 30 minutes
                enablePredictive: true,
                enableAnalytics: false
            },
            performance: {
                enabled: true,
                monitoringInterval: 60000, // 1 minute
                memoryWarningThreshold: 0.9,
                cpuWarningThreshold: 0.95,
                slowQueryThreshold: 2000
            },
            math: {
                enableVectorization: true,
                enableParallelComputation: true,
                numericalPrecision: 'standard', // Trade precision for speed
                enableStatisticalCaching: true
            },
            streaming: {
                enabled: true,
                highWaterMark: 50000,
                backpressureThreshold: 100000,
                enableCompression: true
            }
        });
        this.logger.info('Default optimization profiles initialized');
    }
    getDefaultProfile() {
        const env = process.env.NODE_ENV || 'development';
        switch (env) {
            case 'production':
                return this.profiles.get('production');
            case 'test':
                return this.profiles.get('development');
            default:
                return this.profiles.get('development');
        }
    }
    startAutoTuning() {
        if (!this.autoTuningConfig.enabled) {
            return;
        }
        this.autoTuningTimer = setInterval(async () => {
            try {
                await this.performAutoTuning();
            }
            catch (error) {
                this.logger.error('Auto-tuning failed', error);
            }
        }, this.autoTuningConfig.tuningInterval * 60 * 1000);
        this.logger.info('Auto-tuning started', {
            interval: this.autoTuningConfig.tuningInterval,
            enabled: this.autoTuningConfig.enabled
        });
    }
    calculateTrend(values) {
        if (values.length < 5)
            return 'stable';
        const first = values.slice(0, Math.floor(values.length / 3));
        const last = values.slice(-Math.floor(values.length / 3));
        const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
        const lastAvg = last.reduce((a, b) => a + b, 0) / last.length;
        const changePercent = ((lastAvg - firstAvg) / firstAvg) * 100;
        if (Math.abs(changePercent) < this.autoTuningConfig.adjustmentThreshold) {
            return 'stable';
        }
        return changePercent > 0 ? 'degrading' : 'improving';
    }
    generateRecommendations(memoryTrend, cpuTrend, latencyTrend, metrics) {
        const recommendations = [];
        if (memoryTrend === 'degrading') {
            recommendations.push('Consider reducing cache sizes or batch sizes');
            recommendations.push('Enable memory compression if available');
        }
        if (cpuTrend === 'degrading') {
            recommendations.push('Consider reducing concurrent processing');
            recommendations.push('Optimize mathematical computations');
        }
        if (latencyTrend === 'degrading') {
            recommendations.push('Enable or tune memoization');
            recommendations.push('Optimize database queries');
        }
        const avgCacheHitRatio = metrics.reduce((sum, m) => sum + m.cacheHitRatio, 0) / metrics.length;
        if (avgCacheHitRatio < 0.7) {
            recommendations.push('Improve cache hit ratio by adjusting TTL or cache size');
        }
        return recommendations;
    }
    calculateOptimalAdjustments(trend) {
        const adjustments = {};
        if (trend.memoryTrend === 'degrading') {
            adjustments.batchProcessing = {
                ...this.currentProfile.batchProcessing,
                batchSize: Math.max(50, Math.floor(this.currentProfile.batchProcessing.batchSize * 0.9))
            };
        }
        if (trend.cpuTrend === 'degrading') {
            adjustments.batchProcessing = {
                ...adjustments.batchProcessing || this.currentProfile.batchProcessing,
                maxConcurrency: Math.max(1, Math.floor(this.currentProfile.batchProcessing.maxConcurrency * 0.8))
            };
        }
        return adjustments;
    }
    /**
     * Stop auto-tuning and cleanup
     */
    destroy() {
        if (this.autoTuningTimer) {
            clearInterval(this.autoTuningTimer);
        }
        this.logger.info('OptimizationConfigService destroyed');
    }
}
exports.OptimizationConfigService = OptimizationConfigService;
// Export singleton instance
exports.optimizationConfigService = OptimizationConfigService.getInstance();
//# sourceMappingURL=optimization-config.service.js.map