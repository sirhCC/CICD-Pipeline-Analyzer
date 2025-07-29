"use strict";
/**
 * Anomaly Detection History Entity - Phase 3 Data Persistence
 * Tracks historical anomaly detection results for pattern analysis
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
exports.AnomalyHistory = exports.AnomalySeverity = exports.AnomalyMethod = void 0;
const typeorm_1 = require("typeorm");
const pipeline_entity_1 = require("./pipeline.entity");
var AnomalyMethod;
(function (AnomalyMethod) {
    AnomalyMethod["Z_SCORE"] = "z-score";
    AnomalyMethod["PERCENTILE"] = "percentile";
    AnomalyMethod["IQR"] = "iqr";
    AnomalyMethod["COMPOSITE"] = "composite";
})(AnomalyMethod || (exports.AnomalyMethod = AnomalyMethod = {}));
var AnomalySeverity;
(function (AnomalySeverity) {
    AnomalySeverity["LOW"] = "low";
    AnomalySeverity["MEDIUM"] = "medium";
    AnomalySeverity["HIGH"] = "high";
    AnomalySeverity["CRITICAL"] = "critical";
})(AnomalySeverity || (exports.AnomalySeverity = AnomalySeverity = {}));
let AnomalyHistory = class AnomalyHistory {
    id;
    pipelineId;
    pipeline;
    metric; // duration, cpu, memory, success_rate, test_coverage
    method;
    isAnomaly;
    value; // The actual metric value
    anomalyScore; // 0-1 confidence score
    severity;
    threshold; // Detection threshold used
    baseline; // Baseline value for comparison
    deviation; // Deviation from baseline
    context; // Additional context (window size, etc.)
    jobExecutionId; // Link to background job execution
    runId; // Pipeline run ID if available
    timestamp;
    createdAt;
};
exports.AnomalyHistory = AnomalyHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AnomalyHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], AnomalyHistory.prototype, "pipelineId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => pipeline_entity_1.Pipeline, { nullable: true, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pipelineId' }),
    __metadata("design:type", pipeline_entity_1.Pipeline)
], AnomalyHistory.prototype, "pipeline", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], AnomalyHistory.prototype, "metric", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AnomalyMethod
    }),
    __metadata("design:type", String)
], AnomalyHistory.prototype, "method", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean' }),
    __metadata("design:type", Boolean)
], AnomalyHistory.prototype, "isAnomaly", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 4 }),
    __metadata("design:type", Number)
], AnomalyHistory.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 4 }),
    __metadata("design:type", Number)
], AnomalyHistory.prototype, "anomalyScore", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AnomalySeverity
    }),
    __metadata("design:type", String)
], AnomalyHistory.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], AnomalyHistory.prototype, "threshold", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], AnomalyHistory.prototype, "baseline", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], AnomalyHistory.prototype, "deviation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AnomalyHistory.prototype, "context", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], AnomalyHistory.prototype, "jobExecutionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], AnomalyHistory.prototype, "runId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AnomalyHistory.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AnomalyHistory.prototype, "createdAt", void 0);
exports.AnomalyHistory = AnomalyHistory = __decorate([
    (0, typeorm_1.Entity)('anomaly_history'),
    (0, typeorm_1.Index)(['pipelineId', 'timestamp']),
    (0, typeorm_1.Index)(['metric', 'timestamp']),
    (0, typeorm_1.Index)(['severity', 'timestamp']),
    (0, typeorm_1.Index)(['isAnomaly', 'timestamp'])
], AnomalyHistory);
//# sourceMappingURL=anomaly-history.entity.js.map