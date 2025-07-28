"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsAlert = exports.OptimizationRecommendation = exports.FailurePattern = exports.PipelineMetrics = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const pipeline_entity_1 = require("./pipeline.entity");
/**
 * Analytics metrics for pipeline performance and trends
 */
let PipelineMetrics = class PipelineMetrics extends base_entity_1.BaseEntity {
    pipelineId;
    pipeline;
    metricType; // 'success_rate', 'avg_duration', 'failure_count', etc.
    value;
    metadata; // Additional metric context
    aggregationPeriod; // 'hourly', 'daily', 'weekly', 'monthly'
    timestamp;
};
exports.PipelineMetrics = PipelineMetrics;
__decorate([
    (0, typeorm_1.Column)({ name: 'pipeline_id', type: 'uuid' }),
    __metadata("design:type", String)
], PipelineMetrics.prototype, "pipelineId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => pipeline_entity_1.Pipeline, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pipeline_id' }),
    __metadata("design:type", pipeline_entity_1.Pipeline)
], PipelineMetrics.prototype, "pipeline", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metric_type', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], PipelineMetrics.prototype, "metricType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 4 }),
    __metadata("design:type", Number)
], PipelineMetrics.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PipelineMetrics.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'daily' }),
    __metadata("design:type", String)
], PipelineMetrics.prototype, "aggregationPeriod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], PipelineMetrics.prototype, "timestamp", void 0);
exports.PipelineMetrics = PipelineMetrics = __decorate([
    (0, typeorm_1.Entity)('pipeline_metrics'),
    (0, typeorm_1.Index)(['pipelineId', 'metricType', 'timestamp']),
    (0, typeorm_1.Index)(['metricType', 'timestamp'])
], PipelineMetrics);
/**
 * Failure pattern analysis results
 */
let FailurePattern = class FailurePattern extends base_entity_1.BaseEntity {
    pipelineId;
    pipeline;
    patternType; // 'recurring_failure', 'timeout_pattern', 'dependency_failure', etc.
    description;
    confidence; // 0.0 to 1.0
    data; // Pattern-specific data
    severity; // 'low', 'medium', 'high', 'critical'
    firstSeen;
    lastSeen;
    occurrenceCount;
    detectedAt;
    active;
};
exports.FailurePattern = FailurePattern;
__decorate([
    (0, typeorm_1.Column)({ name: 'pipeline_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], FailurePattern.prototype, "pipelineId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => pipeline_entity_1.Pipeline, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pipeline_id' }),
    __metadata("design:type", pipeline_entity_1.Pipeline)
], FailurePattern.prototype, "pipeline", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pattern_type', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], FailurePattern.prototype, "patternType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], FailurePattern.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 4 }),
    __metadata("design:type", Number)
], FailurePattern.prototype, "confidence", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], FailurePattern.prototype, "data", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'low' }),
    __metadata("design:type", String)
], FailurePattern.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'first_seen', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], FailurePattern.prototype, "firstSeen", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_seen', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], FailurePattern.prototype, "lastSeen", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'occurrence_count', type: 'integer', default: 1 }),
    __metadata("design:type", Number)
], FailurePattern.prototype, "occurrenceCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'detected_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], FailurePattern.prototype, "detectedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], FailurePattern.prototype, "active", void 0);
exports.FailurePattern = FailurePattern = __decorate([
    (0, typeorm_1.Entity)('failure_patterns'),
    (0, typeorm_1.Index)(['pipelineId', 'patternType', 'detectedAt'])
], FailurePattern);
/**
 * Resource optimization recommendations
 */
let OptimizationRecommendation = class OptimizationRecommendation extends base_entity_1.BaseEntity {
    pipelineId;
    pipeline;
    recommendationType; // 'resource_scaling', 'caching', 'parallelization', etc.
    title;
    description;
    potentialSavings;
    implementationEffort; // 'low', 'medium', 'high'
    priority; // 'low', 'medium', 'high', 'critical'
    actionItems; // Specific steps to implement
    implemented;
    implementedAt;
};
exports.OptimizationRecommendation = OptimizationRecommendation;
__decorate([
    (0, typeorm_1.Column)({ name: 'pipeline_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], OptimizationRecommendation.prototype, "pipelineId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => pipeline_entity_1.Pipeline, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pipeline_id' }),
    __metadata("design:type", pipeline_entity_1.Pipeline)
], OptimizationRecommendation.prototype, "pipeline", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recommendation_type', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], OptimizationRecommendation.prototype, "recommendationType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], OptimizationRecommendation.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], OptimizationRecommendation.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'potential_savings', type: 'jsonb' }),
    __metadata("design:type", Object)
], OptimizationRecommendation.prototype, "potentialSavings", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'implementation_effort', type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], OptimizationRecommendation.prototype, "implementationEffort", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'medium' }),
    __metadata("design:type", String)
], OptimizationRecommendation.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Array)
], OptimizationRecommendation.prototype, "actionItems", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], OptimizationRecommendation.prototype, "implemented", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'implemented_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Date)
], OptimizationRecommendation.prototype, "implementedAt", void 0);
exports.OptimizationRecommendation = OptimizationRecommendation = __decorate([
    (0, typeorm_1.Entity)('optimization_recommendations'),
    (0, typeorm_1.Index)(['pipelineId', 'recommendationType', 'createdAt'])
], OptimizationRecommendation);
/**
 * Analytics alerts and notifications
 */
let AnalyticsAlert = class AnalyticsAlert extends base_entity_1.BaseEntity {
    pipelineId;
    pipeline;
    alertType; // 'performance_degradation', 'failure_spike', 'resource_waste', etc.
    title;
    message;
    severity; // 'info', 'warning', 'error', 'critical'
    data; // Alert-specific data
    thresholdValue;
    actualValue;
    acknowledged;
    acknowledgedBy;
    acknowledgedAt;
    active;
};
exports.AnalyticsAlert = AnalyticsAlert;
__decorate([
    (0, typeorm_1.Column)({ name: 'pipeline_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], AnalyticsAlert.prototype, "pipelineId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => pipeline_entity_1.Pipeline, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pipeline_id' }),
    __metadata("design:type", pipeline_entity_1.Pipeline)
], AnalyticsAlert.prototype, "pipeline", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'alert_type', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], AnalyticsAlert.prototype, "alertType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], AnalyticsAlert.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], AnalyticsAlert.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], AnalyticsAlert.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], AnalyticsAlert.prototype, "data", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'threshold_value', type: 'decimal', precision: 10, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], AnalyticsAlert.prototype, "thresholdValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actual_value', type: 'decimal', precision: 10, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], AnalyticsAlert.prototype, "actualValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], AnalyticsAlert.prototype, "acknowledged", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'acknowledged_by', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], AnalyticsAlert.prototype, "acknowledgedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'acknowledged_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Date)
], AnalyticsAlert.prototype, "acknowledgedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], AnalyticsAlert.prototype, "active", void 0);
exports.AnalyticsAlert = AnalyticsAlert = __decorate([
    (0, typeorm_1.Entity)('analytics_alerts'),
    (0, typeorm_1.Index)(['alertType', 'severity', 'createdAt']),
    (0, typeorm_1.Index)(['pipelineId', 'acknowledged'])
], AnalyticsAlert);
//# sourceMappingURL=pipeline-metrics.entity.js.map