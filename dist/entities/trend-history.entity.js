"use strict";
/**
 * Trend Analysis History Entity - Phase 3 Data Persistence
 * Stores historical trend analysis results for long-term pattern tracking
 */
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
exports.TrendHistory = exports.TrendStrength = exports.TrendDirection = void 0;
const typeorm_1 = require("typeorm");
const pipeline_entity_1 = require("./pipeline.entity");
var TrendDirection;
(function (TrendDirection) {
    TrendDirection["IMPROVING"] = "improving";
    TrendDirection["DEGRADING"] = "degrading";
    TrendDirection["STABLE"] = "stable";
    TrendDirection["VOLATILE"] = "volatile";
})(TrendDirection || (exports.TrendDirection = TrendDirection = {}));
var TrendStrength;
(function (TrendStrength) {
    TrendStrength["WEAK"] = "weak";
    TrendStrength["MODERATE"] = "moderate";
    TrendStrength["STRONG"] = "strong";
    TrendStrength["VERY_STRONG"] = "very_strong";
})(TrendStrength || (exports.TrendStrength = TrendStrength = {}));
let TrendHistory = class TrendHistory {
    id;
    pipelineId;
    pipeline;
    metric; // duration, cpu, memory, success_rate, test_coverage
    trend;
    strength;
    correlation; // Correlation coefficient
    slope; // Linear regression slope
    rSquared; // R-squared goodness of fit
    volatility; // Data volatility measure
    dataPoints; // Number of data points in analysis
    periodDays; // Analysis period in days
    prediction; // Future predictions
    confidenceInterval; // Statistical confidence bounds
    jobExecutionId; // Link to background job execution
    timestamp;
    createdAt;
};
exports.TrendHistory = TrendHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TrendHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], TrendHistory.prototype, "pipelineId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => pipeline_entity_1.Pipeline, { nullable: true, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pipelineId' }),
    __metadata("design:type", pipeline_entity_1.Pipeline)
], TrendHistory.prototype, "pipeline", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], TrendHistory.prototype, "metric", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TrendDirection
    }),
    __metadata("design:type", String)
], TrendHistory.prototype, "trend", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TrendStrength
    }),
    __metadata("design:type", String)
], TrendHistory.prototype, "strength", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 4 }),
    __metadata("design:type", Number)
], TrendHistory.prototype, "correlation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 6 }),
    __metadata("design:type", Number)
], TrendHistory.prototype, "slope", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 4 }),
    __metadata("design:type", Number)
], TrendHistory.prototype, "rSquared", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], TrendHistory.prototype, "volatility", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], TrendHistory.prototype, "dataPoints", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], TrendHistory.prototype, "periodDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TrendHistory.prototype, "prediction", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TrendHistory.prototype, "confidenceInterval", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], TrendHistory.prototype, "jobExecutionId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TrendHistory.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TrendHistory.prototype, "createdAt", void 0);
exports.TrendHistory = TrendHistory = __decorate([
    (0, typeorm_1.Entity)('trend_history'),
    (0, typeorm_1.Index)(['pipelineId', 'timestamp']),
    (0, typeorm_1.Index)(['metric', 'timestamp']),
    (0, typeorm_1.Index)(['trend', 'timestamp']),
    (0, typeorm_1.Index)(['strength', 'timestamp'])
], TrendHistory);
//# sourceMappingURL=trend-history.entity.js.map